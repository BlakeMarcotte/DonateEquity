import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

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
    if (!taskData) {
      return NextResponse.json(
        { error: 'Task data not found' },
        { status: 404 }
      )
    }

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

    // Get the effective ID (supports both participantId and donationId)
    const effectiveId = taskData.participantId || taskData.donationId
    if (!effectiveId) {
      return NextResponse.json(
        { error: 'Task missing participantId or donationId' },
        { status: 400 }
      )
    }

    const batch = adminDb.batch()

    // Complete the commitment decision task
    const taskRef = adminDb.collection('tasks').doc(taskId)
    const updateData = {
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      'metadata.decision': decision,
      'metadata.decidedAt': new Date()
    }

    // If commitment data is provided, store it in metadata  
    if (commitmentData) {
      (updateData as Record<string, unknown>)['metadata.commitmentData'] = commitmentData
    }

    batch.update(taskRef, updateData as { [key: string]: FieldValue | Partial<unknown> | undefined })

    if (decision === 'commit_now') {
      // Update or create donation record with the SAME ID as effectiveId
      // This ensures tasks remain associated with the same ID
      const donationRef = adminDb.collection('donations').doc(effectiveId)
      const donationDoc = await donationRef.get()

      const donationData = {
        campaignId: taskData.campaignId,
        donorId: taskData.donorId,
        donorName: decodedToken.name || decodedToken.email?.split('@')[0] || 'Anonymous',
        donorEmail: decodedToken.email,
        amount: commitmentData?.amount || 0,
        commitmentType: commitmentData?.type || 'dollar',
        status: 'committed',
        requiresAppraisal: true,
        participantId: effectiveId,
        updatedAt: new Date(),
        metadata: {
          commitmentData,
          source: 'commitment_decision_task'
        }
      }

      if (donationDoc.exists) {
        // Update existing donation
        batch.update(donationRef, donationData)
      } else {
        // Create new donation with the same ID
        batch.set(donationRef, {
          ...donationData,
          createdAt: new Date()
        })
      }

      // When committing now, unblock the next task in the workflow (Invite Appraiser)
      // Query by the same field type as the current task
      const queryField = taskData.participantId ? 'participantId' : 'donationId'
      const tasksSnapshot = await adminDb
        .collection('tasks')
        .where(queryField, '==', effectiveId)
        .where('dependencies', 'array-contains', taskId)
        .get()

      // Unblock dependent tasks (no need to update ID since we're using the same one)
      tasksSnapshot.docs.forEach((taskDoc) => {
        const nextTaskRef = adminDb.collection('tasks').doc(taskDoc.id)
        batch.update(nextTaskRef, {
          status: 'pending',
          updatedAt: new Date()
        })
      })

      // Update participant status to committed (only if participant record exists)
      if (taskData.participantId) {
        const participantRef = adminDb.collection('campaign_participants').doc(effectiveId)
        const participantDoc = await participantRef.get()
        if (participantDoc.exists) {
          batch.update(participantRef, {
            status: 'committed',
            'metadata.commitmentTiming': 'now',
            'metadata.donationId': effectiveId, // Same ID
            updatedAt: new Date()
          })
        }
      }
    } else {
      // Decision is 'commit_after_appraisal'
      // Create the conditional "Donor: Makes Equity Commitment" task to be completed after appraisal
      const conditionalCommitmentTaskId = `${effectiveId}_make_equity_commitment`

      // Find the "Donor: Approve Documents" task to set as dependency
      const donorApproveTaskId = `${effectiveId}_donor_approve`

      // Create the conditional commitment task
      const conditionalCommitmentTask = {
        id: conditionalCommitmentTaskId,
        participantId: effectiveId,
        campaignId: taskData.campaignId,
        donorId: taskData.donorId,
        assignedTo: taskData.donorId,
        assignedRole: 'donor',
        title: 'Donor: Makes Equity Commitment',
        description: 'Based on the appraisal results, make your final equity donation commitment.',
        type: 'commitment_decision',
        status: 'blocked',
        priority: 'high',
        order: 7.5, // Between "Donor: Approve Documents" (7) and "Nonprofit: Approve Documents" (8)
        dependencies: [donorApproveTaskId],
        metadata: {
          isConditionalCommitment: true,
          originalDecision: 'commit_after_appraisal',
          options: [
            {
              id: 'make_commitment',
              label: 'Make Equity Commitment',
              description: 'Proceed with the equity donation based on the appraisal.'
            },
            {
              id: 'decline_commitment',
              label: 'Decline Commitment',
              description: 'Choose not to proceed with the donation at this time.'
            }
          ],
          campaignTitle: taskData.metadata?.campaignTitle,
          organizationName: taskData.metadata?.organizationName
        },
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: taskData.donorId
      }

      const conditionalCommitmentTaskRef = adminDb.collection('tasks').doc(conditionalCommitmentTaskId)
      batch.set(conditionalCommitmentTaskRef, conditionalCommitmentTask)

      // Update the "Nonprofit: Approve Documents" task to depend on the new conditional commitment task
      const nonprofitApproveTaskId = `${effectiveId}_nonprofit_approve`
      const nonprofitApproveTaskRef = adminDb.collection('tasks').doc(nonprofitApproveTaskId)
      batch.update(nonprofitApproveTaskRef, {
        dependencies: [conditionalCommitmentTaskId], // Now depends on the commitment instead of donor approval
        updatedAt: new Date()
      })

      // Also unblock the next task (Invite Appraiser) so the appraisal process can begin
      // Query by the same field type as the current task
      const queryField = taskData.participantId ? 'participantId' : 'donationId'
      const tasksSnapshot = await adminDb
        .collection('tasks')
        .where(queryField, '==', effectiveId)
        .where('dependencies', 'array-contains', taskId)
        .get()

      // Unblock dependent tasks so appraisal process can begin
      tasksSnapshot.docs.forEach((taskDoc) => {
        const nextTaskRef = adminDb.collection('tasks').doc(taskDoc.id)
        batch.update(nextTaskRef, {
          status: 'pending',
          updatedAt: new Date()
        })
      })

      // Mark participant as awaiting appraisal (only if participant record exists)
      if (taskData.participantId) {
        const participantRef = adminDb.collection('campaign_participants').doc(effectiveId)
        const participantDoc = await participantRef.get()
        if (participantDoc.exists) {
          batch.update(participantRef, {
            status: 'awaiting_appraisal',
            'metadata.commitmentTiming': 'after_appraisal',
            updatedAt: new Date()
          })
        }
      }
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
      { error: `Failed to process decision: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}