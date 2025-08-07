import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { Task } from '@/types/task'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    const resolvedParams = await params
    const taskId = resolvedParams.id

    // Get the task to verify permissions
    const taskRef = adminDb.collection('tasks').doc(taskId)
    const taskDoc = await taskRef.get()
    
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const taskData = taskDoc.data()
    
    // Verify user can complete this task
    const canComplete = (
      // Direct assignment
      taskData?.assignedTo === decodedToken.uid ||
      // Mock user assignment
      (taskData?.assignedTo?.startsWith('mock-') && taskData?.assignedRole === decodedToken.role) ||
      // Role-based assignment (for appraisers with null assignedTo)
      (taskData?.assignedRole === decodedToken.role && (taskData?.assignedTo === null || taskData?.assignedTo === undefined))
    )

    if (!canComplete) {
      return NextResponse.json({ error: 'You are not authorized to complete this task' }, { status: 403 })
    }

    // Parse completion data from request body
    const body = await request.json().catch(() => ({}))
    const completionData = body.completionData || {}

    // Complete the task
    await taskRef.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedBy: decodedToken.uid,
      ...(Object.keys(completionData).length > 0 && { completionData })
    })

    // Update dependent tasks
    if (taskData?.donationId) {
      await updateDependentTasks(taskId, taskData.donationId)
    }

    return NextResponse.json({
      success: true,
      message: 'Task completed successfully'
    })

  } catch (error) {
    console.error('Error completing task:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to update dependent tasks when a task is completed
async function updateDependentTasks(completedTaskId: string, donationId: string) {
  try {
    console.log(`Starting dependency update for completed task: ${completedTaskId}`)
    
    // Get all tasks for this donation
    const tasksQuery = adminDb.collection('tasks').where('donationId', '==', donationId)
    const tasksSnapshot = await tasksQuery.get()
    
    const allTasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[]

    console.log(`Found ${allTasks.length} total tasks for donation ${donationId}`)
    console.log('All tasks:', allTasks.map(t => ({ 
      id: t.id, 
      title: t.title, 
      status: t.status, 
      dependencies: t.dependencies,
      order: t.order 
    })))

    // Find tasks that depend on the completed task
    const dependentTasks = allTasks.filter(task => 
      task.dependencies && task.dependencies.includes(completedTaskId)
    )

    console.log(`Found ${dependentTasks.length} dependent tasks:`, dependentTasks.map(t => ({ 
      id: t.id, 
      title: t.title, 
      status: t.status, 
      dependencies: t.dependencies 
    })))

    // For each dependent task, check if all its dependencies are now completed
    const batch = adminDb.batch()
    let updatesCount = 0

    for (const task of dependentTasks) {
      console.log(`Checking task: ${task.title} (status: ${task.status})`)
      
      if (task.status === 'completed') {
        console.log(`Skipping already completed task: ${task.title}`)
        continue
      }

      const allDependenciesCompleted = task.dependencies?.every((depId: string) => {
        const depTask = allTasks.find(t => t.id === depId)
        console.log(`Dependency ${depId}: ${depTask ? `found (status: ${depTask.status})` : 'not found'}`)
        return depTask?.status === 'completed'
      })

      console.log(`All dependencies completed for ${task.title}: ${allDependenciesCompleted}`)

      if (allDependenciesCompleted && task.status === 'blocked') {
        // Unblock the task
        const taskRef = adminDb.collection('tasks').doc(task.id)
        batch.update(taskRef, {
          status: 'pending',
          updatedAt: FieldValue.serverTimestamp()
        })
        updatesCount++
        console.log(`Unblocking task: ${task.title}`)
      } else {
        console.log(`Cannot unblock ${task.title}: allDepCompleted=${allDependenciesCompleted}, status=${task.status}`)
      }
    }

    if (updatesCount > 0) {
      await batch.commit()
      console.log(`Updated ${updatesCount} dependent tasks`)
    } else {
      console.log('No tasks were unblocked')
    }

  } catch (error) {
    console.error('Error updating dependent tasks:', error)
    throw error
  }
}