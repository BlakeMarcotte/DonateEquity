import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import { Task } from '@/types/task'

export function useParticipantTasks(participantId: string | null, donationId?: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!participantId) {
      console.log('No participantId provided to useParticipantTasks')
      setTasks([])
      setLoading(false)
      return
    }

    console.log('useParticipantTasks: Querying tasks for participant:', participantId)
    const tasksRef = collection(db, 'tasks')
    
    // Query for both participant tasks and donation tasks if available
    const queries = []
    
    // Always query participant-based tasks
    const participantQuery = query(
      tasksRef,
      where('participantId', '==', participantId),
      orderBy('createdAt', 'asc')
    )
    queries.push(participantQuery)
    
    // Also query donation-based tasks if we have a donationId
    if (donationId) {
      const donationQuery = query(
        tasksRef,
        where('donationId', '==', donationId),
        orderBy('order', 'asc')
      )
      queries.push(donationQuery)
    }

    // Use the first query for now (participant tasks)
    const unsubscribe = onSnapshot(
      participantQuery,
      (snapshot) => {
        console.log('Participant tasks snapshot received:', snapshot.docs.length, 'tasks')
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
          dueDate: doc.data().dueDate?.toDate?.() || null,
          completedAt: doc.data().completedAt?.toDate?.() || null,
        })) as Task[]

        console.log('Participant tasks data:', tasksData.map(t => ({ id: t.id, title: t.title, type: t.type })))

        // Calculate blocking status based on dependencies
        const updatedTasks = calculateBlockingStatus(tasksData)
        setTasks(updatedTasks)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching participant tasks:', err)
        setError('Failed to fetch tasks')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [participantId, donationId])

  const completeTask = async (taskId: string, completionData?: any) => {
    try {
      // Use API route for task completion to handle permissions and dependencies server-side
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({ completionData })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to complete task')
      }

      // The real-time listener will automatically update the UI
    } catch (error) {
      console.error('Error completing task:', error)
      throw error
    }
  }

  const handleCommitmentDecision = async (taskId: string, decision: 'commit_now' | 'commit_after_appraisal', commitmentData?: any) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/commitment-decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({ decision, commitmentData })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process commitment decision')
      }

      // The real-time listener will automatically update the UI
    } catch (error) {
      console.error('Error processing commitment decision:', error)
      throw error
    }
  }

  return {
    tasks,
    loading,
    error,
    completeTask,
    handleCommitmentDecision
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