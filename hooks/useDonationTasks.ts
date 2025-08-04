import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, addDoc, Timestamp, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Task } from '@/types/task'

export interface DonationTaskWorkflowUser {
  uid: string
  role: 'donor' | 'nonprofit_admin' | 'appraiser'
  organizationId?: string
}

// Basic task templates for the three roles
const createBasicTaskTemplates = (donationId: string, campaignId: string, donorId: string, nonprofitAdminId: string): Omit<Task, 'id'>[] => {
  const now = new Date()
  
  return [
    // Donor tasks
    {
      donationId,
      title: 'Provide Company Information',
      description: 'Submit basic company information and documentation for equity valuation',
      type: 'document_upload',
      assignedTo: donorId,
      assignedRole: 'donor',
      status: 'pending',
      priority: 'high',
      dependencies: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        documentIds: [],
        approvalRequired: false,
        automatedReminders: true
      },
      comments: []
    },
    {
      donationId,
      title: 'Review Final Documentation',
      description: 'Review and approve all finalized donation documentation',
      type: 'document_review',
      assignedTo: donorId,
      assignedRole: 'donor',
      status: 'blocked', // Will be unblocked when appraiser completes their task
      priority: 'medium',
      dependencies: [], // We'll set this programmatically
      createdAt: now,
      updatedAt: now,
      metadata: {
        documentIds: [],
        approvalRequired: true,
        automatedReminders: true
      },
      comments: []
    },
    
    // Nonprofit Admin tasks
    {
      donationId,
      title: 'Process Donation Request',
      description: 'Review donation request and coordinate with appraiser',
      type: 'document_review',
      assignedTo: nonprofitAdminId,
      assignedRole: 'nonprofit_admin',
      status: 'pending',
      priority: 'high',
      dependencies: [],
      createdAt: now,
      updatedAt: now,
      metadata: {
        documentIds: [],
        approvalRequired: false,
        automatedReminders: true
      },
      comments: []
    },
    {
      donationId,
      title: 'Finalize Donation Receipt',
      description: 'Generate and send final donation receipt and acknowledgement',
      type: 'other',
      assignedTo: nonprofitAdminId,
      assignedRole: 'nonprofit_admin',
      status: 'blocked', // Will be unblocked when appraiser completes their task
      priority: 'medium',
      dependencies: [], // We'll set this programmatically
      createdAt: now,
      updatedAt: now,
      metadata: {
        documentIds: [],
        approvalRequired: false,
        automatedReminders: true
      },
      comments: []
    },
    
    // Appraiser tasks
    {
      donationId,
      title: 'Conduct Equity Appraisal',
      description: 'Perform professional appraisal of donated equity',
      type: 'appraisal_submission',
      assignedTo: 'mock-appraiser-user', // Will be assigned to real appraiser later
      assignedRole: 'appraiser',
      status: 'pending',
      priority: 'high',
      dependencies: [], // Will depend on donor providing company info
      createdAt: now,
      updatedAt: now,
      metadata: {
        documentIds: [],
        signatureRequired: true,
        automatedReminders: true
      },
      comments: []
    }
  ]
}

export function useDonationTasks(donationId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!donationId) {
      setTasks([])
      setLoading(false)
      return
    }

    const tasksRef = collection(db, 'tasks')
    const q = query(
      tasksRef,
      where('donationId', '==', donationId),
      orderBy('createdAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
          dueDate: doc.data().dueDate?.toDate?.() || null,
          completedAt: doc.data().completedAt?.toDate?.() || null,
        })) as Task[]

        // Calculate blocking status based on dependencies
        const updatedTasks = calculateBlockingStatus(tasksData)
        setTasks(updatedTasks)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching donation tasks:', err)
        setError('Failed to fetch tasks')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [donationId])

  const completeTask = async (taskId: string, completionData?: any) => {
    try {
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, {
        status: 'completed',
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        ...(completionData && { completionData })
      })

      // Check for dependent tasks and unblock them if all their dependencies are now completed
      await updateDependentTasks(taskId, donationId)
    } catch (error) {
      console.error('Error completing task:', error)
      throw error
    }
  }

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, {
        status,
        updatedAt: Timestamp.now(),
        ...(status === 'completed' && { completedAt: Timestamp.now() })
      })
    } catch (error) {
      console.error('Error updating task status:', error)
      throw error
    }
  }

  return {
    tasks,
    loading,
    error,
    completeTask,
    updateTaskStatus
  }
}

// Helper function to calculate if tasks are blocked by dependencies
function calculateBlockingStatus(tasks: Task[]): Task[] {
  const taskStatusMap = new Map<string, Task['status']>()
  
  // Create a map of task IDs to their statuses
  tasks.forEach(task => {
    taskStatusMap.set(task.id, task.status)
  })

  return tasks.map(task => {
    // If task has dependencies, check if they're all completed
    if (task.dependencies && task.dependencies.length > 0) {
      const allDependenciesCompleted = task.dependencies.every(depId => 
        taskStatusMap.get(depId) === 'completed'
      )
      
      // Update status to blocked if dependencies aren't met and task isn't already completed
      const newStatus = !allDependenciesCompleted && task.status !== 'completed' ? 'blocked' : task.status
      
      return {
        ...task,
        status: newStatus
      }
    }
    
    return task
  })
}

// Hook for creating donation workflow tasks
export function useDonationTaskWorkflow() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createDonationTasks = async (
    donationId: string, 
    campaignId: string, 
    donorId: string, 
    nonprofitAdminId: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const taskTemplates = createBasicTaskTemplates(donationId, campaignId, donorId, nonprofitAdminId)
      const tasksRef = collection(db, 'tasks')
      
      // Create all tasks
      const createdTasks: Task[] = []
      for (const template of taskTemplates) {
        const docRef = await addDoc(tasksRef, {
          ...template,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        })
        createdTasks.push({ ...template, id: docRef.id } as Task)
      }

      // Set up dependencies between tasks
      // Donor's "Review Final Documentation" depends on appraiser's "Conduct Equity Appraisal"
      // Nonprofit's "Finalize Donation Receipt" depends on appraiser's "Conduct Equity Appraisal"
      const appraisalTask = createdTasks.find(t => t.type === 'appraisal_submission')
      const donorReviewTask = createdTasks.find(t => t.assignedRole === 'donor' && t.type === 'document_review')
      const nonprofitReceiptTask = createdTasks.find(t => t.assignedRole === 'nonprofit_admin' && t.title.includes('Receipt'))

      if (appraisalTask && donorReviewTask) {
        await updateDoc(doc(db, 'tasks', donorReviewTask.id), {
          dependencies: [appraisalTask.id],
          status: 'blocked'
        })
      }

      if (appraisalTask && nonprofitReceiptTask) {
        await updateDoc(doc(db, 'tasks', nonprofitReceiptTask.id), {
          dependencies: [appraisalTask.id],
          status: 'blocked'
        })
      }

      console.log('Created donation tasks successfully:', createdTasks.length, 'tasks')
      return createdTasks

    } catch (err) {
      console.error('Error creating donation tasks:', err)
      setError('Failed to create donation tasks')
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    createDonationTasks,
    loading,
    error
  }
}

// Helper function to update dependent tasks when a task is completed
async function updateDependentTasks(completedTaskId: string, donationId: string | null) {
  if (!donationId) return

  try {
    // Get all tasks for this donation
    const tasksRef = collection(db, 'tasks')
    const q = query(tasksRef, where('donationId', '==', donationId))
    const snapshot = await getDocs(q)
    
    const allTasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[]

    // Find tasks that depend on the completed task
    const dependentTasks = allTasks.filter(task => 
      task.dependencies && task.dependencies.includes(completedTaskId)
    )

    // For each dependent task, check if all its dependencies are now completed
    for (const task of dependentTasks) {
      if (task.status === 'completed') continue // Skip already completed tasks

      const allDependenciesCompleted = task.dependencies?.every(depId => {
        const depTask = allTasks.find(t => t.id === depId)
        return depTask?.status === 'completed'
      })

      if (allDependenciesCompleted && task.status === 'blocked') {
        // Unblock the task
        const taskRef = doc(db, 'tasks', task.id)
        await updateDoc(taskRef, {
          status: 'pending',
          updatedAt: Timestamp.now()
        })
        console.log(`Unblocked task: ${task.title}`)
      }
    }
  } catch (error) {
    console.error('Error updating dependent tasks:', error)
  }
}