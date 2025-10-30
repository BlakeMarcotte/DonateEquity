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
    const { id: donationId } = await params

    if (!donationId) {
      return NextResponse.json(
        { error: 'Donation ID is required' },
        { status: 400 }
      )
    }

    // Get the donation record to verify ownership and get campaign info
    const donationDoc = await adminDb.collection('donations').doc(donationId).get()
    if (!donationDoc.exists) {
      return NextResponse.json(
        { error: 'Donation record not found' },
        { status: 404 }
      )
    }

    const donationData = donationDoc.data()
    if (!donationData) {
      return NextResponse.json(
        { error: 'Invalid donation data' },
        { status: 400 }
      )
    }

    // Verify the user owns this donation record
    if (donationData.donorId !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You can only reset your own tasks' },
        { status: 403 }
      )
    }

    // Get all tasks for this donation
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('donationId', '==', donationId)
      .get()

    if (tasksSnapshot.empty) {
      return NextResponse.json(
        { error: 'No tasks found for this donation' },
        { status: 404 }
      )
    }

    // Get campaign data for recreating tasks
    const campaignDoc = await adminDb.collection('campaigns').doc(donationData.campaignId).get()
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

    // Recreate initial tasks with the new order (Invite Appraiser first for easier testing)
    const tasksToCreate = [
      {
        id: `${donationId}_invite_appraiser`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: decodedToken.uid,
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
        createdBy: decodedToken.uid
      },
      {
        id: `${donationId}_sign_nda`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        title: 'Donor: Sign NDA',
        description: 'Review and digitally sign the Non-Disclosure Agreement before proceeding with the donation process.',
        type: 'docusign_signature',
        status: 'blocked',
        priority: 'high',
        order: 2,
        dependencies: [`${donationId}_invite_appraiser`],
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
        createdBy: decodedToken.uid
      },
      {
        id: `${donationId}_commitment_decision`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        title: 'Donor: Commitment',
        description: 'Choose when you want to make your donation commitment: now or after appraisal.',
        type: 'commitment_decision',
        status: 'blocked',
        priority: 'high',
        order: 3,
        dependencies: [`${donationId}_sign_nda`],
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
        createdBy: decodedToken.uid
      },
      {
        id: `${donationId}_company_info`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        title: 'Donor: Upload Company Information (File Upload)',
        description: 'Upload your company information and financial documents for the appraisal process.',
        type: 'document_upload',
        status: 'blocked',
        priority: 'high',
        order: 4,
        dependencies: [`${donationId}_commitment_decision`],
        metadata: {
          documentTypes: ['company_info', 'financial_statements'],
          documentPath: `donations/${donationId}/financial/`,
          requiresApproval: false,
          uploadFolders: ['legal', 'financial']
        },
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: decodedToken.uid
      },
      {
        id: `${donationId}_appraiser_sign_nda`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: null,
        assignedRole: 'appraiser',
        title: 'Appraiser: Sign NDA',
        description: 'Review and digitally sign the Non-Disclosure Agreement to access donor information.',
        type: 'docusign_signature',
        status: 'blocked',
        priority: 'high',
        order: 5,
        dependencies: [`${donationId}_company_info`],
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
        createdBy: decodedToken.uid
      },
      {
        id: `${donationId}_appraiser_upload`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: null,
        assignedRole: 'appraiser',
        title: 'Appraiser: Upload Documents (File Upload)',
        description: 'Upload appraisal documents and valuation reports.',
        type: 'document_upload',
        status: 'blocked',
        priority: 'high',
        order: 6,
        dependencies: [`${donationId}_appraiser_sign_nda`],
        metadata: {
          documentTypes: ['appraisal_report', 'valuation_documents'],
          documentPath: `donations/${donationId}/appraisals/`,
          requiresApproval: false,
          uploadFolders: ['appraisals']
        },
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: decodedToken.uid
      },
      {
        id: `${donationId}_donor_approve`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        title: 'Donor: Approve Documents',
        description: 'Review and approve the appraisal documents and valuation reports.',
        type: 'document_review',
        status: 'blocked',
        priority: 'medium',
        order: 7,
        dependencies: [`${donationId}_appraiser_upload`],
        metadata: {
          documentIds: [],
          approvalRequired: true,
          automatedReminders: true
        },
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: decodedToken.uid
      },
      {
        id: `${donationId}_nonprofit_approve`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: campaignData.createdBy,
        assignedRole: 'nonprofit_admin',
        title: 'Nonprofit: Approve Documents',
        description: 'Review and approve all donation documentation and appraisal reports.',
        type: 'document_review',
        status: 'blocked',
        priority: 'high',
        order: 8,
        dependencies: [`${donationId}_donor_approve`],
        metadata: {
          documentIds: [],
          approvalRequired: true,
          automatedReminders: true
        },
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: decodedToken.uid
      },
      {
        id: `${donationId}_nonprofit_upload`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: campaignData.createdBy,
        assignedRole: 'nonprofit_admin',
        title: 'Nonprofit: Upload Documents (File Upload)',
        description: 'Upload final donation receipt and acknowledgement documents.',
        type: 'document_upload',
        status: 'blocked',
        priority: 'medium',
        order: 9,
        dependencies: [`${donationId}_nonprofit_approve`],
        metadata: {
          documentTypes: ['donation_receipt', 'acknowledgement'],
          documentPath: `donations/${donationId}/signed-documents/`,
          requiresApproval: false,
          uploadFolders: ['signed-documents']
        },
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: decodedToken.uid
      }
    ]

    // Add all tasks to batch
    for (const task of tasksToCreate) {
      const taskRef = adminDb.collection('tasks').doc(task.id)
      batch.set(taskRef, task)
    }

    // Reset donation status if needed
    batch.update(donationDoc.ref, {
      status: 'pending',
      updatedAt: new Date()
    })

    // Execute all operations
    await batch.commit()

    return NextResponse.json({
      success: true,
      message: 'Tasks have been reset successfully',
      tasksDeleted: tasksSnapshot.docs.length,
      tasksCreated: tasksToCreate.length
    })

  } catch (error) {
    console.error('Error resetting donation tasks:', error)
    return NextResponse.json(
      { error: `Failed to reset tasks: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
