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
    
    // Only donors can reset their own donation tasks
    if (decodedToken.role !== 'donor') {
      return NextResponse.json({ error: 'Only donors can reset task lists' }, { status: 403 })
    }

    const resolvedParams = await params
    const donationId = resolvedParams.id

    // Verify donation exists and belongs to the user
    const donationRef = adminDb.collection('donations').doc(donationId)
    const donationDoc = await donationRef.get()
    
    if (!donationDoc.exists) {
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    const donationData = donationDoc.data()
    if (donationData?.donorId !== decodedToken.uid) {
      return NextResponse.json({ error: 'You can only reset tasks for your own donations' }, { status: 403 })
    }

    // Delete all existing tasks for this donation
    const tasksQuery = adminDb.collection('tasks').where('donationId', '==', donationId)
    const tasksSnapshot = await tasksQuery.get()
    
    const batch = adminDb.batch()
    tasksSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref)
    })
    
    await batch.commit()
    console.log(`Deleted ${tasksSnapshot.docs.length} existing tasks for donation ${donationId}`)

    // Get campaign and user data for task recreation
    const campaignRef = adminDb.collection('campaigns').doc(donationData.campaignId)
    const campaignDoc = await campaignRef.get()
    const campaignData = campaignDoc.data()

    // Recreate the 10-task workflow with NDA as Task 1
    const tasks = [
      // Task 1: Donor - Sign General NDA (moved to first for easier testing)
      {
        donationId: donationId,
        title: 'Sign General NDA',
        description: 'Review and digitally sign the general Non-Disclosure Agreement before proceeding with the donation process',
        type: 'docusign_signature',
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        status: 'pending', // Can start immediately
        priority: 'high',
        dependencies: [],
        order: 1,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentPath: '/public/nda-general.pdf',
          documentName: 'General NDA',
          envelopeId: null,
          signedAt: null,
          signingUrl: null,
          automatedReminders: true
        },
        comments: []
      },
      
      // Task 2: Donor - Invite Appraiser to Platform
      {
        donationId: donationId,
        title: 'Invite Appraiser to Platform',
        description: 'Send an invitation to a qualified appraiser to join the platform and assess your equity donation',
        type: 'invitation',
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        status: 'blocked', // Blocked until NDA is signed
        priority: 'high',
        dependencies: [], // Will be set programmatically
        order: 2,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          invitationSent: false,
          appraiserEmail: null,
          appraiserInvited: null,
          invitationToken: null,
          automatedReminders: true
        },
        comments: []
      },
      
      // Task 3: Donor - Provide Company Information
      {
        donationId: donationId,
        title: 'Provide Company Information',
        description: 'Submit basic company information and documentation for equity valuation',
        type: 'document_upload',
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        status: 'blocked', // Blocked until NDA is signed
        priority: 'high',
        dependencies: [], // Will be set programmatically
        order: 3,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentIds: [],
          approvalRequired: false,
          automatedReminders: true
        },
        comments: []
      },
      
      // Task 4: Donor - Upload Supporting Documents
      {
        donationId: donationId,
        title: 'Upload Supporting Documents',
        description: 'Upload additional financial documents, legal agreements, and supporting materials for the equity donation',
        type: 'document_upload',
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        status: 'blocked', // Blocked until donor provides company info
        priority: 'high',
        dependencies: [], // Will be set programmatically
        order: 4,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentIds: [],
          approvalRequired: false,
          automatedReminders: true,
          uploadFolders: ['legal', 'financial', 'general']
        },
        comments: []
      },
      
      // Task 5: Appraiser - Initial Equity Assessment
      {
        donationId: donationId,
        title: 'Initial Equity Assessment',
        description: 'Review company information and assess equity valuation requirements',
        type: 'appraisal_review',
        assignedTo: null, // Will be set when appraiser accepts invitation
        assignedRole: 'appraiser',
        status: 'blocked', // Blocked until donor uploads supporting documents
        priority: 'high',
        dependencies: [], // Will be set programmatically
        order: 5,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentIds: [],
          approvalRequired: false,
          automatedReminders: true
        },
        comments: []
      },
      
      // Task 6: Donor - Review Initial Assessment
      {
        donationId: donationId,
        title: 'Review Initial Assessment',
        description: 'Review and approve the initial equity assessment before full appraisal',
        type: 'document_review',
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        status: 'blocked', // Blocked until appraiser completes initial assessment
        priority: 'medium',
        dependencies: [], // Will be set programmatically
        order: 6,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentIds: [],
          approvalRequired: true,
          automatedReminders: true
        },
        comments: []
      },
      
      // Task 7: Appraiser - Conduct Equity Appraisal
      {
        donationId: donationId,
        title: 'Conduct Equity Appraisal',
        description: 'Perform professional appraisal of donated equity based on approved assessment',
        type: 'appraisal_submission',
        assignedTo: null, // Will be set when appraiser accepts invitation
        assignedRole: 'appraiser',
        status: 'blocked', // Blocked until donor reviews initial assessment
        priority: 'high',
        dependencies: [], // Will be set programmatically
        order: 7,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentIds: [],
          signatureRequired: true,
          automatedReminders: true
        },
        comments: []
      },
      
      // Task 8: Nonprofit - Process Donation Request
      {
        donationId: donationId,
        title: 'Process Donation Request',
        description: 'Review donation request and coordinate documentation workflow',
        type: 'document_review',
        assignedTo: campaignData?.createdBy,
        assignedRole: 'nonprofit_admin',
        status: 'blocked', // Blocked until appraiser completes full appraisal
        priority: 'high',
        dependencies: [], // Will be set programmatically
        order: 8,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentIds: [],
          approvalRequired: false,
          automatedReminders: true
        },
        comments: []
      },
      
      // Task 9: Donor - Review Final Documentation
      {
        donationId: donationId,
        title: 'Review Final Documentation',
        description: 'Review and approve all finalized donation documentation',
        type: 'document_review',
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        status: 'blocked', // Blocked until nonprofit processes request
        priority: 'medium',
        dependencies: [], // Will be set programmatically
        order: 9,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentIds: [],
          approvalRequired: true,
          automatedReminders: true
        },
        comments: []
      },

      // Task 10: Nonprofit - Finalize Donation Receipt
      {
        donationId: donationId,
        title: 'Finalize Donation Receipt',
        description: 'Generate and send final donation receipt and acknowledgement',
        type: 'other',
        assignedTo: campaignData?.createdBy,
        assignedRole: 'nonprofit_admin',
        status: 'blocked', // Blocked until donor reviews final documentation
        priority: 'medium',
        dependencies: [], // Will be set programmatically
        order: 10,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentIds: [],
          approvalRequired: false,
          automatedReminders: true
        },
        comments: []
      }
    ]

    // Create new tasks
    const createdTasks = []
    const newBatch = adminDb.batch()
    
    for (const task of tasks) {
      const taskRef = adminDb.collection('tasks').doc()
      newBatch.set(taskRef, task)
      createdTasks.push({ id: taskRef.id, ...task })
    }
    
    await newBatch.commit()

    // Set up sequential dependencies for the 10-task workflow
    if (createdTasks.length === 10) {
      const depBatch = adminDb.batch()
      
      // Task 2 depends on Task 1 (Invite Appraiser depends on NDA)
      depBatch.update(adminDb.collection('tasks').doc(createdTasks[1].id), {
        dependencies: [createdTasks[0].id]
      })
      
      // Task 3 depends on Task 2 (Company info depends on Appraiser invitation)
      depBatch.update(adminDb.collection('tasks').doc(createdTasks[2].id), {
        dependencies: [createdTasks[1].id]
      })
      
      // Task 4 depends on Task 3 (Upload Documents depends on Company info)
      depBatch.update(adminDb.collection('tasks').doc(createdTasks[3].id), {
        dependencies: [createdTasks[2].id]
      })
      
      // Task 5 depends on Task 4 (Appraiser assessment depends on uploaded documents)
      depBatch.update(adminDb.collection('tasks').doc(createdTasks[4].id), {
        dependencies: [createdTasks[3].id]
      })
      
      // Task 6 depends on Task 5 (Donor review depends on initial assessment)
      depBatch.update(adminDb.collection('tasks').doc(createdTasks[5].id), {
        dependencies: [createdTasks[4].id]
      })
      
      // Task 7 depends on Task 6 (Full appraisal depends on donor review)
      depBatch.update(adminDb.collection('tasks').doc(createdTasks[6].id), {
        dependencies: [createdTasks[5].id]
      })
      
      // Task 8 depends on Task 7 (Nonprofit processing depends on appraisal)
      depBatch.update(adminDb.collection('tasks').doc(createdTasks[7].id), {
        dependencies: [createdTasks[6].id]
      })
      
      // Task 9 depends on Task 8 (Final review depends on nonprofit processing)
      depBatch.update(adminDb.collection('tasks').doc(createdTasks[8].id), {
        dependencies: [createdTasks[7].id]
      })
      
      // Task 10 depends on Task 9 (Receipt depends on final review)
      depBatch.update(adminDb.collection('tasks').doc(createdTasks[9].id), {
        dependencies: [createdTasks[8].id]
      })
      
      await depBatch.commit()
    }

    // Reset donation appraisal status
    await donationRef.update({
      appraiserId: null,
      appraiserEmail: null,
      appraisalStatus: 'pending',
      updatedAt: FieldValue.serverTimestamp()
    })

    console.log('Created new donation tasks:', createdTasks.length, 'tasks')

    return NextResponse.json({
      success: true,
      message: 'Task list reset successfully! You can now start the workflow from the beginning.',
      tasksCreated: createdTasks.length
    })

  } catch (error) {
    console.error('Error resetting donation tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}