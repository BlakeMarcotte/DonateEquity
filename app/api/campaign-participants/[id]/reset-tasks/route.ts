import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const participantId = params.id

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    // Get the participant record to verify ownership and get campaign info
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
        { error: 'You can only reset your own tasks' },
        { status: 403 }
      )
    }

    // Get all tasks for this participant
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('participantId', '==', participantId)
      .get()

    if (tasksSnapshot.empty) {
      return NextResponse.json(
        { error: 'No tasks found for this participant' },
        { status: 404 }
      )
    }

    // Get campaign data for recreating tasks
    const campaignDoc = await adminDb.collection('campaigns').doc(participantData.campaignId).get()
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = campaignDoc.data()
    const batch = adminDb.batch()

    // Delete all existing tasks
    tasksSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Recreate initial tasks
    // Task 1: Donation Commitment Decision
    const commitmentTaskId = `${participantId}_commitment_decision`
    const commitmentTask = {
      id: commitmentTaskId,
      participantId: participantId,
      campaignId: participantData.campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Donation Commitment Decision',
      description: 'Choose when you want to make your donation commitment: now or after appraisal.',
      type: 'commitment_decision',
      status: 'pending',
      priority: 'high',
      order: 1,
      dependencies: [],
      metadata: {
        options: [
          {
            id: 'commit_now',
            label: 'Make Commitment Now',
            description: 'I\'m ready to commit to a donation amount now and proceed with the workflow.'
          },
          {
            id: 'commit_after_appraisal',
            label: 'Wait for Appraisal',
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

    // Task 2: Company Information
    const companyInfoTaskId = `${participantId}_company_info`
    const companyInfoTask = {
      id: companyInfoTaskId,
      participantId: participantId,
      campaignId: participantData.campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Provide Company Information',
      description: 'Upload your company information and details for the appraisal process.',
      type: 'document_upload',
      status: 'blocked',
      priority: 'high',
      order: 2,
      dependencies: [commitmentTaskId],
      metadata: {
        documentTypes: ['company_info', 'financial_statements'],
        documentPath: `participants/${participantId}/company_info/`,
        requiresApproval: false
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    // Task 3: Invite Appraiser
    const inviteAppraiserTaskId = `${participantId}_invite_appraiser`
    const inviteAppraiserTask = {
      id: inviteAppraiserTaskId,
      participantId: participantId,
      campaignId: participantData.campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Invite Appraiser to Platform',
      description: 'Invite a professional appraiser to conduct your equity valuation.',
      type: 'invitation',
      status: 'blocked',
      priority: 'high',
      order: 3,
      dependencies: [companyInfoTaskId],
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
    const commitmentTaskRef = adminDb.collection('tasks').doc(commitmentTaskId)
    const companyInfoTaskRef = adminDb.collection('tasks').doc(companyInfoTaskId)
    const inviteAppraiserTaskRef = adminDb.collection('tasks').doc(inviteAppraiserTaskId)

    batch.set(commitmentTaskRef, commitmentTask)
    batch.set(companyInfoTaskRef, companyInfoTask)
    batch.set(inviteAppraiserTaskRef, inviteAppraiserTask)

    // Reset participant status
    batch.update(participantDoc.ref, {
      status: 'interested',
      updatedAt: new Date(),
      'metadata.commitmentTiming': null
    })

    // Execute all operations
    await batch.commit()

    return NextResponse.json({
      success: true,
      message: 'Tasks have been reset successfully',
      tasksDeleted: tasksSnapshot.docs.length,
      tasksCreated: 3
    })

  } catch (error) {
    console.error('Error resetting participant tasks:', error)
    return NextResponse.json(
      { error: `Failed to reset tasks: ${error.message}` },
      { status: 500 }
    )
  }
}