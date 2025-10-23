import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'
import { secureLogger } from '@/lib/logging/secure-logger'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.decodedToken.uid as string

    const { participantId } = await request.json()

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    // Verify this is a demo participant ID for the authenticated user
    if (!participantId.startsWith(`pledge_demo_${userId}`)) {
      return NextResponse.json(
        { error: 'Invalid participant ID' },
        { status: 403 }
      )
    }

    // Check if tasks already exist
    const existingTasks = await adminDb
      .collection('tasks')
      .where('participantId', '==', participantId)
      .where('workflowType', '==', 'pledge')
      .get()

    if (!existingTasks.empty) {
      return NextResponse.json({
        success: true,
        message: 'Demo tasks already exist',
        taskCount: existingTasks.size
      })
    }

    // Create the 4 demo tasks
    const now = new Date()
    const batch = adminDb.batch()

    const tasks = [
      {
        participantId,
        campaignId: 'pledge_demo',
        donorId: userId,
        title: 'Step 1: Complete Donation Path Quiz',
        description: 'Answer a few questions to help us determine the best donation path for your equity.',
        type: 'quiz',
        assignedTo: userId,
        assignedRole: 'donor',
        status: 'pending',
        priority: 'high',
        dependencies: [],
        order: 1,
        workflowType: 'pledge',
        createdAt: now,
        updatedAt: now,
        metadata: {
          automatedReminders: false
        },
        comments: []
      },
      {
        participantId,
        campaignId: 'pledge_demo',
        donorId: userId,
        title: 'Step 2: Review Your Results',
        description: 'Review the recommended donation path based on your responses.',
        type: 'review_results',
        assignedTo: userId,
        assignedRole: 'donor',
        status: 'blocked',
        priority: 'high',
        dependencies: ['task_quiz'], // Will be resolved by task type
        order: 2,
        workflowType: 'pledge',
        createdAt: now,
        updatedAt: now,
        metadata: {
          automatedReminders: false
        },
        comments: []
      },
      {
        participantId,
        campaignId: 'pledge_demo',
        donorId: userId,
        title: 'Step 3: Download Required Documents',
        description: 'Download the document templates you\'ll need to complete for your donation path.',
        type: 'download_templates',
        assignedTo: userId,
        assignedRole: 'donor',
        status: 'blocked',
        priority: 'high',
        dependencies: ['task_review_results'],
        order: 3,
        workflowType: 'pledge',
        createdAt: now,
        updatedAt: now,
        metadata: {
          automatedReminders: false
        },
        comments: []
      },
      {
        participantId,
        campaignId: 'pledge_demo',
        donorId: userId,
        title: 'Step 4: Upload Completed Documents',
        description: 'Upload your completed and signed documents.',
        type: 'upload_completed_files',
        assignedTo: userId,
        assignedRole: 'donor',
        status: 'blocked',
        priority: 'high',
        dependencies: ['task_download_templates'],
        order: 4,
        workflowType: 'pledge',
        createdAt: now,
        updatedAt: now,
        metadata: {
          automatedReminders: false,
          uploadFolders: ['signed-documents']
        },
        comments: []
      }
    ]

    // Add each task to the batch
    tasks.forEach(task => {
      const taskRef = adminDb.collection('tasks').doc()
      batch.set(taskRef, task)
    })

    // Commit the batch
    await batch.commit()

    secureLogger.info('Created demo Pledge 1% tasks', {
      participantId,
      userId,
      taskCount: tasks.length
    })

    return NextResponse.json({
      success: true,
      message: 'Demo tasks created successfully',
      taskCount: tasks.length
    })

  } catch (error) {
    secureLogger.error('Error creating demo tasks', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to create demo tasks' },
      { status: 500 }
    )
  }
}
