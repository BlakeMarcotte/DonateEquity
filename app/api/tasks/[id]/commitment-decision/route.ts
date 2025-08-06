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
      // Create donation record with commitment data
      const donationData = {
        campaignId: taskData.campaignId,
        donorId: taskData.donorId,
        donorName: decodedToken.name || decodedToken.email?.split('@')[0] || 'Anonymous',
        donorEmail: decodedToken.email,
        amount: commitmentData?.amount || 0,
        commitmentType: commitmentData?.type || 'dollar',
        status: 'committed',
        requiresAppraisal: true,
        participantId: taskData.participantId,
        createdAt: new Date(),
        metadata: {
          commitmentData,
          source: 'commitment_decision_task'
        }
      }

      const donationRef = adminDb.collection('donations').doc()
      batch.set(donationRef, donationData)

      // Find and unblock the next task (Provide Company Information)
      const tasksSnapshot = await adminDb
        .collection('tasks')
        .where('participantId', '==', taskData.participantId)
        .where('dependencies', 'array-contains', taskId)
        .get()

      tasksSnapshot.docs.forEach((taskDoc) => {
        const nextTaskRef = adminDb.collection('tasks').doc(taskDoc.id)
        batch.update(nextTaskRef, {
          status: 'pending',
          donationId: donationRef.id,
          updatedAt: new Date()
        })
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
        ? 'Commitment recorded successfully. You can now proceed with providing company information.'
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