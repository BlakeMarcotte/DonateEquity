import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase/config'
import { Task, TaskCompletionData, CommitmentData } from '@/types/task'
import { secureLogger } from '@/lib/logging/secure-logger'

export function useParticipantTasks(participantId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [monitoringDocuSign, setMonitoringDocuSign] = useState(false)

  useEffect(() => {
    // When participantId changes, reset to loading state
    setLoading(true)

    if (!participantId) {
      secureLogger.info('No participantId provided to useParticipantTasks')
      setTasks([])
      setLoading(false)
      return
    }

    secureLogger.info('Querying tasks for participant', {
      participantId
    })
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
        secureLogger.info('Participant tasks snapshot received', {
          taskCount: snapshot.docs.length
        })
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
          dueDate: doc.data().dueDate?.toDate?.() || null,
          completedAt: doc.data().completedAt?.toDate?.() || null,
        })) as Task[]

        secureLogger.info('Participant tasks data loaded', {
          tasks: tasksData.map(t => ({ id: t.id, title: t.title, type: t.type, order: t.order }))
        })

        // Use debug utility for detailed analysis
        secureLogger.info('Tasks loaded for participant', {
          participantId,
          taskCount: tasksData.length
        })

        // Calculate blocking status based on dependencies
        secureLogger.info('Calculating blocking status for tasks', {
          taskCount: tasksData.length
        })
        const updatedTasks = calculateBlockingStatus(tasksData)
        secureLogger.info('Blocking status calculated', {
          updatedTasks: updatedTasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
        })
        setTasks(updatedTasks)
        setLoading(false)
        setError(null)
      },
      (err) => {
        secureLogger.error('Error fetching participant tasks', err instanceof Error ? err : new Error(String(err)), {
          participantId
        })
        setError('Failed to fetch tasks')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [participantId])

  const completeTask = async (taskId: string, completionData?: TaskCompletionData) => {
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
      secureLogger.error('Error completing task', error instanceof Error ? error : new Error(String(error)), {
        taskId,
        participantId
      })
      throw error
    }
  }

  const handleCommitmentDecision = async (taskId: string, decision: 'commit_now' | 'commit_after_appraisal', commitmentData?: CommitmentData) => {
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
      secureLogger.error('Error processing commitment decision', error instanceof Error ? error : new Error(String(error)), {
        taskId,
        participantId
      })
      throw error
    }
  }

  // Enhanced DocuSign monitoring function
  const checkDocuSignCompletion = useCallback(async () => {
    if (!participantId || monitoringDocuSign) {
      return
    }

    // Find incomplete DocuSign tasks
    const incompleteDocuSignTasks = tasks.filter(task => 
      task.type === 'docusign_signature' && 
      (task.status === 'pending' || task.status === 'in_progress') &&
      (task.metadata as any)?.docuSignEnvelopeId
    )

    if (incompleteDocuSignTasks.length === 0) {
      return
    }

    setMonitoringDocuSign(true)
    secureLogger.info('Checking DocuSign completion status', {
      participantId,
      incompleteTasksCount: incompleteDocuSignTasks.length
    })

    try {
      const response = await fetch('/api/tasks/monitor-docusign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to check DocuSign completion')
      }

      const result = await response.json()
      secureLogger.info('DocuSign monitoring result', result)
      
      // Tasks will update automatically via Firestore listeners
    } catch (error) {
      secureLogger.error('Error checking DocuSign completion', error instanceof Error ? error : new Error(String(error)))
    } finally {
      setMonitoringDocuSign(false)
    }
  }, [participantId, tasks, monitoringDocuSign])

  // Auto-check DocuSign tasks every 30 seconds if there are incomplete ones
  useEffect(() => {
    const hasIncompleteDocuSign = tasks.some(task => 
      task.type === 'docusign_signature' && 
      (task.status === 'pending' || task.status === 'in_progress') &&
      (task.metadata as any)?.docuSignEnvelopeId
    )

    if (!hasIncompleteDocuSign || monitoringDocuSign) {
      return
    }

    const interval = setInterval(() => {
      checkDocuSignCompletion()
    }, 30000) // Check every 30 seconds

    // Also check immediately if we have incomplete tasks
    const immediateCheck = setTimeout(() => {
      checkDocuSignCompletion()
    }, 1000)

    return () => {
      clearInterval(interval)
      clearTimeout(immediateCheck)
    }
  }, [tasks, checkDocuSignCompletion, monitoringDocuSign])

  return {
    tasks,
    loading,
    error,
    completeTask,
    handleCommitmentDecision,
    checkDocuSignCompletion,
    monitoringDocuSign
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

  secureLogger.info('Calculating blocking status', {
    taskStatusMap: Array.from(taskStatusMap.entries()),
    taskTypeMap: Array.from(taskTypeMap.entries())
  })

  return tasks.map(task => {
    // If task has dependencies, check if they're all completed
    if (task.dependencies && task.dependencies.length > 0) {
      const allDependenciesCompleted = task.dependencies.every(depId => {
        let status = taskStatusMap.get(depId)
        
        // Debug specific task
        if (task.title?.includes('Appraiser: Sign NDA')) {
          secureLogger.info('Checking task dependency', {
            dependencyId: depId,
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
                secureLogger.info('Found task by type mapping', {
                  taskType,
                  foundTaskId,
                  status
                })
              }
            }
          }
        }
        
        // Additional check: sometimes the completed status might be a string 'completed' vs an enum
        const isCompleted = (status as string) === 'completed' || (status as string) === 'complete'
        
        if (task.title?.includes('Appraiser: Sign NDA')) {
          secureLogger.info('Dependency final check', {
            dependencyId: depId,
            status,
            isCompleted
          })
        }
        
        return isCompleted
      })
      
      // Update status based on dependencies
      let newStatus = task.status
      if (task.status !== 'completed') {
        if (!allDependenciesCompleted) {
          newStatus = 'blocked'
        } else if (task.status === 'blocked' && allDependenciesCompleted) {
          // Unblock the task when all dependencies are met
          newStatus = 'pending'
        }
      }
      
      // Only log for debugging specific issues
      // if (task.title?.includes('Appraiser: Sign NDA')) {
      // Debug logging for task status calculation
      // secureLogger.info('Task status calculation', {
      //   taskTitle: task.title,
      //   dependencies: task.dependencies,
      //   depStatuses,
      //   allDependenciesCompleted,
      //   currentStatus: task.status,
      //   newStatus
      //   })
      // }
      
      return {
        ...task,
        status: newStatus
      }
    }
    
    return task
  })
}