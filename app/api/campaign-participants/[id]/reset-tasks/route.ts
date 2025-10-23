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
    const { id: participantId } = await params

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
    if (!participantData) {
      return NextResponse.json(
        { error: 'Invalid participant data' },
        { status: 400 }
      )
    }

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
    if (!campaignData) {
      return NextResponse.json(
        { error: 'Invalid campaign data' },
        { status: 400 }
      )
    }
    
    const batch = adminDb.batch()

    // Delete all existing tasks
    tasksSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // Recreate initial tasks matching the new step structure
    // Task 1: Donor - Choose Appraisal Method (Invite Appraiser or AI Appraisal)
    const inviteAppraiserTaskId = `${participantId}_invite_appraiser`
    const inviteAppraiserTask = {
      id: inviteAppraiserTaskId,
      participantId: participantId,
      campaignId: participantData.campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Donor: Invite Appraiser or AI Appraisal',
      description: 'Choose your preferred appraisal method: invite a professional appraiser or use our AI-powered appraisal service.',
      type: 'invitation',
      status: 'pending',
      priority: 'high',
      order: 1,
      dependencies: [],
      metadata: {
        invitationType: 'appraiser',
        role: 'appraiser'
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    // Task 2: Donor - Sign NDA
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
      status: 'blocked',
      priority: 'high',
      order: 2,
      dependencies: [inviteAppraiserTaskId],
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

    // Task 3: Donor - Commitment Decision
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
      order: 3,
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
        ]
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    // Task 4: Donor - Upload Company Information (File Upload)
    const companyInfoTaskId = `${participantId}_company_info`
    const companyInfoTask = {
      id: companyInfoTaskId,
      participantId: participantId,
      campaignId: participantData.campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Donor: Upload Company Information (File Upload)',
      description: 'Upload your company information and financial documents for the appraisal process.',
      type: 'document_upload',
      status: 'blocked',
      priority: 'high',
      order: 4,
      dependencies: [commitmentTaskId],
      metadata: {
        documentTypes: ['company_info', 'financial_statements'],
        documentPath: `participants/${participantId}/financial/`,
        requiresApproval: false,
        uploadFolders: ['legal', 'financial']
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    // Add tasks to batch
    const inviteAppraiserTaskRef = adminDb.collection('tasks').doc(inviteAppraiserTaskId)
    const signNDATaskRef = adminDb.collection('tasks').doc(signNDATaskId)
    const commitmentTaskRef = adminDb.collection('tasks').doc(commitmentTaskId)
    const companyInfoTaskRef = adminDb.collection('tasks').doc(companyInfoTaskId)
    batch.set(inviteAppraiserTaskRef, inviteAppraiserTask)
    batch.set(signNDATaskRef, signNDATask)
    batch.set(commitmentTaskRef, commitmentTask)
    batch.set(companyInfoTaskRef, companyInfoTask)

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
      tasksCreated: 4
    })

  } catch (error) {
    console.error('Error resetting participant tasks:', error)
    return NextResponse.json(
      { error: `Failed to reset tasks: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}