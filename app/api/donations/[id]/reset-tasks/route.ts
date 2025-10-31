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

    // Recreate initial tasks with the new order for demo flow
    const tasksToCreate = [
      // Task 1: Nonprofit Sign NDA
      {
        id: `${donationId}_nonprofit_sign_nda`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: campaignData.createdBy,
        assignedRole: 'nonprofit_admin',
        title: 'Nonprofit: Sign NDA',
        description: 'Review and digitally sign the Non-Disclosure Agreement to participate in the donation process.',
        type: 'docusign_signature',
        status: 'pending',
        priority: 'high',
        order: 1,
        dependencies: [],
        metadata: {
          documentPath: '/public/nda-nonprofit.pdf',
          documentName: 'Nonprofit NDA',
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
      // Task 2: Donor Sign NDA
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
        dependencies: [`${donationId}_nonprofit_sign_nda`],
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
      // Task 3: Donor Invite Appraiser
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
        status: 'blocked',
        priority: 'high',
        order: 3,
        dependencies: [`${donationId}_sign_nda`],
        metadata: {
          invitationType: 'appraiser',
          role: 'appraiser'
        },
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: decodedToken.uid
      },
      // Task 4: Appraiser Sign NDA
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
        order: 4,
        dependencies: [`${donationId}_invite_appraiser`],
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
      // Task 5: Nonprofit Upload Documents
      {
        id: `${donationId}_nonprofit_upload`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: campaignData.createdBy,
        assignedRole: 'nonprofit_admin',
        title: 'Nonprofit: Upload Documents (File Upload)',
        description: 'Upload organizational documents including 501(c)(3) letter, W-9, and bank information.',
        type: 'document_upload',
        status: 'blocked',
        priority: 'high',
        order: 5,
        dependencies: [`${donationId}_appraiser_sign_nda`],
        metadata: {
          documentTypes: ['501c3_letter', 'w9', 'bank_info'],
          documentPath: `donations/${donationId}/nonprofit-documents/`,
          requiresApproval: false,
          uploadFolders: ['nonprofit-documents']
        },
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: decodedToken.uid
      },
      // Task 6: Appraiser Upload Documents
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
        dependencies: [`${donationId}_nonprofit_upload`],
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
      // Task 7: Donor Review Documents
      {
        id: `${donationId}_donor_approve`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        title: 'Donor: Review Documents',
        description: 'Review and approve the appraisal documents and nonprofit documentation.',
        type: 'document_review',
        status: 'blocked',
        priority: 'high',
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
      // Task 8: Donor Sign Documents
      {
        id: `${donationId}_donor_sign_documents`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        title: 'Donor: Sign Documents',
        description: 'Review and digitally sign the donation agreement documents.',
        type: 'docusign_signature',
        status: 'blocked',
        priority: 'high',
        order: 8,
        dependencies: [`${donationId}_donor_approve`],
        metadata: {
          documentPath: '/public/donation-agreement.pdf',
          documentName: 'Donation Agreement',
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
      // Task 9: Nonprofit Sign Documents
      {
        id: `${donationId}_nonprofit_sign_documents`,
        donationId: donationId,
        campaignId: donationData.campaignId,
        donorId: decodedToken.uid,
        assignedTo: campaignData.createdBy,
        assignedRole: 'nonprofit_admin',
        title: 'Nonprofit: Sign Documents',
        description: 'Review and digitally sign the donation acceptance documents.',
        type: 'docusign_signature',
        status: 'blocked',
        priority: 'high',
        order: 9,
        dependencies: [`${donationId}_donor_sign_documents`],
        metadata: {
          documentPath: '/public/donation-acceptance.pdf',
          documentName: 'Donation Acceptance',
          envelopeId: null,
          signedAt: null,
          signingUrl: null,
          automatedReminders: true
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
