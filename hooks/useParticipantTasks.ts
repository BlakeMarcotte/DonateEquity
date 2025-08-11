import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import { Task } from '@/types/task'

export function useParticipantTasks(participantId: string | null) {
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
    
    // Query only participant-based tasks, ordered by order field
    const participantQuery = query(
      tasksRef,
      where('participantId', '==', participantId),
      orderBy('order', 'asc')
    )

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

        console.log('Participant tasks data:', tasksData.map(t => ({ id: t.id, title: t.title, type: t.type, order: t.order })))

        // Debug dependency checking
        const task5 = tasksData.find(t => t.title?.includes('Appraiser: Sign NDA'))
        if (task5) {
          console.log('Task 5 dependencies:', task5.dependencies)
          console.log('Available task IDs:', tasksData.map(t => t.id))
          console.log('Dependency statuses:', task5.dependencies?.map(depId => ({
            depId,
            status: tasksData.find(t => t.id === depId)?.status || 'NOT FOUND'
          })))
        }

        // Calculate blocking status based on dependencies
        console.log('About to calculate blocking status for tasks:', tasksData.length)
        const updatedTasks = calculateBlockingStatus(tasksData)
        console.log('Blocking status calculated, updated tasks:', updatedTasks.map(t => ({ id: t.id, title: t.title, status: t.status })))
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
  }, [participantId])

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
  const taskTypeMap = new Map<string, string>() // Maps task type to task ID
  
  // Create maps for both task IDs and task types
  tasks.forEach(task => {
    taskStatusMap.set(task.id, task.status)
    if (task.type) {
      taskTypeMap.set(task.type, task.id)
    }
  })

  console.log('calculateBlockingStatus - Task status map:', Array.from(taskStatusMap.entries()))
  console.log('calculateBlockingStatus - Task type map:', Array.from(taskTypeMap.entries()))

  return tasks.map(task => {
    // If task has dependencies, check if they're all completed
    if (task.dependencies && task.dependencies.length > 0) {
      const depStatuses = task.dependencies.map(depId => {
        let actualTaskId = depId
        let status = taskStatusMap.get(depId)
        
        // If dependency ID is not found directly, try to find by task type
        if (!status) {
          // Extract task type from dependency ID (format: participantId_taskType)
          const parts = depId.split('_')
          if (parts.length >= 2) {
            const taskType = parts.slice(1).join('_') // Handle task types with underscores
            const foundTaskId = taskTypeMap.get(taskType)
            if (foundTaskId) {
              actualTaskId = foundTaskId
              status = taskStatusMap.get(foundTaskId)
            }
          }
        }
        
        return {
          depId,
          actualTaskId,
          status: status || 'NOT FOUND'
        }
      })
      
      const allDependenciesCompleted = task.dependencies.every(depId => {
        let status = taskStatusMap.get(depId)
        
        // Debug specific task
        if (task.title?.includes('Appraiser: Sign NDA')) {
          console.log(`Checking dependency ${depId}:`, {
            directStatus: status,
            inMap: taskStatusMap.has(depId),
            mapSize: taskStatusMap.size
          })
        }
        
        // If dependency ID is not found directly, try to find by task type
        if (!status) {
          const parts = depId.split('_')
          if (parts.length >= 2) {
            const taskType = parts.slice(1).join('_')
            const foundTaskId = taskTypeMap.get(taskType)
            if (foundTaskId) {
              status = taskStatusMap.get(foundTaskId)
              if (task.title?.includes('Appraiser: Sign NDA')) {
                console.log(`Found by type mapping: ${taskType} -> ${foundTaskId}, status: ${status}`)
              }
            }
          }
        }
        
        return status === 'completed'
      })
      
      // Update status to blocked if dependencies aren't met and task isn't already completed
      const newStatus = !allDependenciesCompleted && task.status !== 'completed' ? 'blocked' : task.status
      
      if (task.title?.includes('Appraiser: Sign NDA')) {
        console.log(`calculateBlockingStatus - Task ${task.title}:`, {
          dependencies: task.dependencies,
          depStatuses,
          allDependenciesCompleted,
          currentStatus: task.status,
          newStatus
        })
      }
      
      return {
        ...task,
        status: newStatus
      }
    }
    
    return task
  })
}