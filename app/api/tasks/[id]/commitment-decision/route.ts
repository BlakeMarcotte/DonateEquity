import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

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
    
    const { decision, commitmentData } = await request.json()
    const { id: taskId } = await params

    if (!decision || !['commit_now', 'commit_after_appraisal'].includes(decision)) {
      return NextResponse.json(
        { error: 'Valid decision is required' },
        { status: 400 }
      )
    }

    // Get the task
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get()
    if (!taskDoc.exists) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    const taskData = taskDoc.data()

    // Verify the user can complete this task
    if (taskData.assignedTo !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You are not assigned to this task' },
        { status: 403 }
      )
    }

    // Verify this is a commitment decision task
    if (taskData.type !== 'commitment_decision') {
      return NextResponse.json(
        { error: 'This task is not a commitment decision task' },
        { status: 400 }
      )
    }

    const batch = adminDb.batch()

    // Complete the commitment decision task
    const taskRef = adminDb.collection('tasks').doc(taskId)
    const updateData: any = {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      'metadata.decision': decision,
      'metadata.decidedAt': new Date()
    }

    // If commitment data is provided, store it in metadata
    if (commitmentData) {
      updateData['metadata.commitmentData'] = commitmentData
    }

    batch.update(taskRef, updateData)

    if (decision === 'commit_now') {
      // Create donation commitment task immediately
      const commitmentTaskId = `${taskData.participantId}_donation_commitment`
      const commitmentTaskRef = adminDb.collection('tasks').doc(commitmentTaskId)
      
      batch.set(commitmentTaskRef, {
        id: commitmentTaskId,
        participantId: taskData.participantId,
        campaignId: taskData.campaignId,
        donorId: taskData.donorId,
        assignedTo: taskData.donorId,
        assignedRole: 'donor',
        title: 'Create Donation Commitment',
        description: 'Specify your donation amount and complete your commitment.',
        type: 'donation_commitment',
        status: 'blocked', // Will be unblocked after company info
        priority: 'high',
        order: 1.5, // Insert between commitment decision and company info
        dependencies: [taskId],
        metadata: {
          requiresAmount: true,
          createsDonationRecord: true
        },
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: taskData.donorId
      })
    } else {
      // Decision is 'commit_after_appraisal'
      // We'll create the commitment task later after appraisal is done
      // For now, just mark that commitment will be needed later
      const participantRef = adminDb.collection('campaign_participants').doc(taskData.participantId)
      batch.update(participantRef, {
        status: 'awaiting_appraisal',
        'metadata.commitmentTiming': 'after_appraisal',
        updatedAt: new Date()
      })
    }

    await batch.commit()

    return NextResponse.json({
      success: true,
      decision: decision,
      message: decision === 'commit_now' 
        ? 'Commitment task created. You can now specify your donation amount.'
        : 'You will be asked for your commitment after the appraisal is complete.'
    })

  } catch (error) {
    console.error('Error processing commitment decision:', error)
    return NextResponse.json(
      { error: `Failed to process decision: ${error.message}` },
      { status: 500 }
    )
  }
}