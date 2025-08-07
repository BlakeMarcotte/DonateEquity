import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    const { participantId } = await request.json()

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    // Get the participant record
    const participantDoc = await adminDb.collection('campaign_participants').doc(participantId).get()
    if (!participantDoc.exists) {
      return NextResponse.json(
        { error: 'Participant record not found' },
        { status: 404 }
      )
    }

    const participantData = participantDoc.data()

    // Verify the user owns this participant record
    if (participantData.userId !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You can only migrate your own tasks' },
        { status: 403 }
      )
    }

    // Get campaign data
    const campaignDoc = await adminDb.collection('campaigns').doc(participantData.campaignId).get()
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = campaignDoc.data()

    // Check if tasks already exist with the new structure
    const existingTasksSnapshot = await adminDb
      .collection('tasks')
      .where('participantId', '==', participantId)
      .get()

    // If participant already has tasks with participantId, they're already migrated
    if (!existingTasksSnapshot.empty) {
      // Check if they have the new task structure
      const hasNewStructure = existingTasksSnapshot.docs.some(doc => 
        doc.data().title?.includes('Donor: Sign NDA')
      )
      
      if (hasNewStructure) {
        return NextResponse.json({
          success: true,
          message: 'Tasks are already using the new structure',
          tasksCount: existingTasksSnapshot.docs.length
        })
      }
    }

    // Delete all existing tasks (both old donation-based and any participant-based)
    const batch = adminDb.batch()
    
    // Delete participant-based tasks
    existingTasksSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Also check for old donation-based tasks if there's a donationId
    if (participantData.donationId) {
      const donationTasksSnapshot = await adminDb
        .collection('tasks')
        .where('donationId', '==', participantData.donationId)
        .get()
      
      donationTasksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref)
      })
    }

    // Create the new 9-step task structure (first 3 tasks)
    // Task 1: Donor - Sign NDA
    const signNDATaskId = `${participantId}_sign_nda`
    const signNDATask = {
      id: signNDATaskId,
      participantId: participantId,
      campaignId: participantData.campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Donor: Sign NDA',
      description: 'Review and digitally sign the Non-Disclosure Agreement before proceeding with the donation process.',
      type: 'docusign_signature',
      status: 'pending',
      priority: 'high',
      order: 1,
      dependencies: [],
      metadata: {
        documentPath: '/public/nda-general.pdf',
        documentName: 'General NDA',
        envelopeId: null,
        signedAt: null,
        signingUrl: null,
        automatedReminders: true
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    // Task 2: Donor - Commitment
    const commitmentTaskId = `${participantId}_commitment_decision`
    const commitmentTask = {
      id: commitmentTaskId,
      participantId: participantId,
      campaignId: participantData.campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Donor: Commitment',
      description: 'Choose when you want to make your donation commitment: now or after appraisal.',
      type: 'commitment_decision',
      status: 'blocked',
      priority: 'high',
      order: 2,
      dependencies: [signNDATaskId],
      metadata: {
        options: [
          {
            id: 'commit_now',
            label: 'Make Commitment Now',
            description: 'I\'m ready to commit to a donation amount now and proceed with the workflow.'
          },
          {
            id: 'commit_after_appraisal',
            label: 'Make Commitment After Appraisal',
            description: 'I want to see the appraisal results before making my commitment decision.'
          }
        ],
        campaignTitle: campaignData.title,
        organizationName: campaignData.organizationName
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    // Task 3: Donor - Invite Appraiser
    const inviteAppraiserTaskId = `${participantId}_invite_appraiser`
    const inviteAppraiserTask = {
      id: inviteAppraiserTaskId,
      participantId: participantId,
      campaignId: participantData.campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Donor: Invite Appraiser',
      description: 'Invite a professional appraiser to join the platform and conduct your equity valuation.',
      type: 'invitation',
      status: 'blocked',
      priority: 'high',
      order: 3,
      dependencies: [commitmentTaskId],
      metadata: {
        invitationType: 'appraiser',
        role: 'appraiser'
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    // Add new tasks to batch
    const signNDATaskRef = adminDb.collection('tasks').doc(signNDATaskId)
    const commitmentTaskRef = adminDb.collection('tasks').doc(commitmentTaskId)
    const inviteAppraiserTaskRef = adminDb.collection('tasks').doc(inviteAppraiserTaskId)

    batch.set(signNDATaskRef, signNDATask)
    batch.set(commitmentTaskRef, commitmentTask)
    batch.set(inviteAppraiserTaskRef, inviteAppraiserTask)

    // Reset participant status
    batch.update(participantDoc.ref, {
      status: 'interested',
      updatedAt: new Date(),
      'metadata.commitmentTiming': null,
      'metadata.taskStructureVersion': '9-step'
    })

    // Execute all operations
    await batch.commit()

    return NextResponse.json({
      success: true,
      message: 'Tasks have been migrated to the new 9-step structure',
      tasksCreated: 3,
      participantId: participantId
    })

  } catch (error: any) {
    console.error('Error migrating participant tasks:', error)
    return NextResponse.json(
      { error: `Failed to migrate tasks: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}