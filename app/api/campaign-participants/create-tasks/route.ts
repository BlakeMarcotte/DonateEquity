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
    await adminAuth.verifyIdToken(token)
    
    const { campaignId, participantId } = await request.json()

    if (!campaignId || !participantId) {
      return NextResponse.json(
        { error: 'Campaign ID and participant ID are required' },
        { status: 400 }
      )
    }

    // Get campaign and participant data
    const [campaignDoc, participantDoc] = await Promise.all([
      adminDb.collection('campaigns').doc(campaignId).get(),
      adminDb.collection('campaign_participants').doc(participantId).get()
    ])

    if (!campaignDoc.exists || !participantDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign or participant not found' },
        { status: 404 }
      )
    }

    const campaignData = campaignDoc.data()
    const participantData = participantDoc.data()
    
    if (!campaignData || !participantData) {
      return NextResponse.json(
        { error: 'Invalid campaign or participant data' },
        { status: 400 }
      )
    }

    // Create complete task workflow matching the specified order
    const batch = adminDb.batch()
    const tasksToCreate = []

    // Task 1: Donor - Sign NDA
    const signNDATaskId = `${participantId}_sign_nda`
    const signNDATask = {
      id: signNDATaskId,
      participantId: participantId,
      campaignId: campaignId,
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

    const signNDATaskRef = adminDb.collection('tasks').doc(signNDATaskId)
    batch.set(signNDATaskRef, signNDATask)
    tasksToCreate.push(signNDATask)

    // Task 2: Donor - Commitment Decision
    const commitmentTaskId = `${participantId}_commitment_decision`
    const commitmentTask = {
      id: commitmentTaskId,
      participantId: participantId,
      campaignId: campaignId,
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

    const commitmentTaskRef = adminDb.collection('tasks').doc(commitmentTaskId)
    batch.set(commitmentTaskRef, commitmentTask)
    tasksToCreate.push(commitmentTask)

    // Task 3: Donor - Invite Appraiser
    const inviteAppraiserTaskId = `${participantId}_invite_appraiser`
    const inviteAppraiserTask = {
      id: inviteAppraiserTaskId,
      participantId: participantId,
      campaignId: campaignId,
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

    const inviteAppraiserTaskRef = adminDb.collection('tasks').doc(inviteAppraiserTaskId)
    batch.set(inviteAppraiserTaskRef, inviteAppraiserTask)
    tasksToCreate.push(inviteAppraiserTask)

    // Task 4: Donor - Upload Company Information (File Upload)
    const companyInfoTaskId = `${participantId}_company_info`
    const companyInfoTask = {
      id: companyInfoTaskId,
      participantId: participantId,
      campaignId: campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Donor: Upload Company Information (File Upload)',
      description: 'Upload your company information and financial documents for the appraisal process.',
      type: 'document_upload',
      status: 'blocked',
      priority: 'high',
      order: 4,
      dependencies: [inviteAppraiserTaskId],
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

    const companyInfoTaskRef = adminDb.collection('tasks').doc(companyInfoTaskId)
    batch.set(companyInfoTaskRef, companyInfoTask)
    tasksToCreate.push(companyInfoTask)

    // Task 5: Appraiser - Sign NDA
    const appraiserNDATaskId = `${participantId}_appraiser_sign_nda`
    const appraiserNDATask = {
      id: appraiserNDATaskId,
      participantId: participantId,
      campaignId: campaignId,
      donorId: participantData.userId,
      assignedTo: null, // Will be set when appraiser accepts invitation
      assignedRole: 'appraiser',
      title: 'Appraiser: Sign NDA',
      description: 'Review and digitally sign the Non-Disclosure Agreement to access donor information.',
      type: 'docusign_signature',
      status: 'blocked',
      priority: 'high',
      order: 5,
      dependencies: [companyInfoTaskId],
      metadata: {
        documentPath: '/public/nda-appraiser.pdf',
        documentName: 'Appraiser NDA',
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

    const appraiserNDATaskRef = adminDb.collection('tasks').doc(appraiserNDATaskId)
    batch.set(appraiserNDATaskRef, appraiserNDATask)
    tasksToCreate.push(appraiserNDATask)

    // Task 6: Appraiser - Upload Documents (File Upload)
    const appraiserUploadTaskId = `${participantId}_appraiser_upload`
    const appraiserUploadTask = {
      id: appraiserUploadTaskId,
      participantId: participantId,
      campaignId: campaignId,
      donorId: participantData.userId,
      assignedTo: null, // Will be set when appraiser accepts invitation
      assignedRole: 'appraiser',
      title: 'Appraiser: Upload Documents (File Upload)',
      description: 'Upload appraisal documents and valuation reports.',
      type: 'document_upload',
      status: 'blocked',
      priority: 'high',
      order: 6,
      dependencies: [appraiserNDATaskId],
      metadata: {
        documentTypes: ['appraisal_report', 'valuation_documents'],
        documentPath: `participants/${participantId}/appraisals/`,
        requiresApproval: false,
        uploadFolders: ['appraisals']
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    const appraiserUploadTaskRef = adminDb.collection('tasks').doc(appraiserUploadTaskId)
    batch.set(appraiserUploadTaskRef, appraiserUploadTask)
    tasksToCreate.push(appraiserUploadTask)

    // Task 7: Donor - Approve Documents
    const donorApproveTaskId = `${participantId}_donor_approve`
    const donorApproveTask = {
      id: donorApproveTaskId,
      participantId: participantId,
      campaignId: campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Donor: Approve Documents',
      description: 'Review and approve the appraisal documents and valuation reports.',
      type: 'document_review',
      status: 'blocked',
      priority: 'medium',
      order: 7,
      dependencies: [appraiserUploadTaskId],
      metadata: {
        documentIds: [],
        approvalRequired: true,
        automatedReminders: true
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    const donorApproveTaskRef = adminDb.collection('tasks').doc(donorApproveTaskId)
    batch.set(donorApproveTaskRef, donorApproveTask)
    tasksToCreate.push(donorApproveTask)

    // Task 8: Nonprofit - Approve Documents
    const nonprofitApproveTaskId = `${participantId}_nonprofit_approve`
    const nonprofitApproveTask = {
      id: nonprofitApproveTaskId,
      participantId: participantId,
      campaignId: campaignId,
      donorId: participantData.userId,
      assignedTo: campaignData.createdBy,
      assignedRole: 'nonprofit_admin',
      title: 'Nonprofit: Approve Documents',
      description: 'Review and approve all donation documentation and appraisal reports.',
      type: 'document_review',
      status: 'blocked',
      priority: 'high',
      order: 8,
      dependencies: [donorApproveTaskId],
      metadata: {
        documentIds: [],
        approvalRequired: true,
        automatedReminders: true
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    const nonprofitApproveTaskRef = adminDb.collection('tasks').doc(nonprofitApproveTaskId)
    batch.set(nonprofitApproveTaskRef, nonprofitApproveTask)
    tasksToCreate.push(nonprofitApproveTask)

    // Task 9: Nonprofit - Upload Documents (File Upload)
    const nonprofitUploadTaskId = `${participantId}_nonprofit_upload`
    const nonprofitUploadTask = {
      id: nonprofitUploadTaskId,
      participantId: participantId,
      campaignId: campaignId,
      donorId: participantData.userId,
      assignedTo: campaignData.createdBy,
      assignedRole: 'nonprofit_admin',
      title: 'Nonprofit: Upload Documents (File Upload)',
      description: 'Upload final donation receipt and acknowledgement documents.',
      type: 'document_upload',
      status: 'blocked',
      priority: 'medium',
      order: 9,
      dependencies: [nonprofitApproveTaskId],
      metadata: {
        documentTypes: ['donation_receipt', 'acknowledgement'],
        documentPath: `participants/${participantId}/signed-documents/`,
        requiresApproval: false,
        uploadFolders: ['signed-documents']
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    const nonprofitUploadTaskRef = adminDb.collection('tasks').doc(nonprofitUploadTaskId)
    batch.set(nonprofitUploadTaskRef, nonprofitUploadTask)
    tasksToCreate.push(nonprofitUploadTask)

    // Execute batch to create all initial tasks
    await batch.commit()

    return NextResponse.json({
      success: true,
      tasksCreated: tasksToCreate.length,
      participantId: participantId,
      message: 'Initial tasks created successfully'
    })

  } catch (error) {
    console.error('Error creating participant tasks:', error)
    return NextResponse.json(
      { error: `Failed to create tasks: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}