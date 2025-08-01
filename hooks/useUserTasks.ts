import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy, or } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Task } from '@/types/task'

export function useUserTasks(userId: string | null, userRole?: string) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setTasks([])
      setLoading(false)
      return
    }

    const tasksRef = collection(db, 'tasks')
    
    // Query for tasks assigned to this user OR tasks assigned to mock users for their role
    const q = query(
      tasksRef,
      or(
        where('assignedTo', '==', userId),
        ...(userRole ? [where('assignedTo', '==', `mock-${userRole}-user`)] : [])
      ),
      orderBy('createdAt', 'desc')
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

        setTasks(tasksData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching user tasks:', err)
        setError('Failed to fetch tasks')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId, userRole])

  // Filter tasks by status
  const pendingTasks = tasks.filter(task => task.status === 'pending')
  const inProgressTasks = tasks.filter(task => task.status === 'in_progress')
  const completedTasks = tasks.filter(task => task.status === 'completed')
  const blockedTasks = tasks.filter(task => task.status === 'blocked')

  return {
    tasks,
    pendingTasks,
    inProgressTasks,
    completedTasks,
    blockedTasks,
    loading,
    error
  }
}