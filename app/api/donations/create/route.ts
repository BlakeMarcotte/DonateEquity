import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Only donors can create donations
    if (decodedToken.role !== 'donor') {
      return NextResponse.json({ error: 'Only donors can create donations' }, { status: 403 })
    }

    const {
      campaignId,
      amount,
      message
    } = await request.json()

    // Validate required fields
    if (!campaignId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: campaignId, amount' },
        { status: 400 }
      )
    }

    // Validate amount
    const donationAmount = parseFloat(amount)
    if (isNaN(donationAmount) || donationAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid donation amount' },
        { status: 400 }
      )
    }

    // Verify campaign exists and is active
    const campaignRef = adminDb.collection('campaigns').doc(campaignId)
    const campaignDoc = await campaignRef.get()
    
    if (!campaignDoc.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const campaignData = campaignDoc.data()
    if (campaignData?.status !== 'active') {
      return NextResponse.json({ error: 'Campaign is not accepting donations' }, { status: 400 })
    }

    // Get user profile and organization info
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userProfile = userDoc.data()

    console.log('User profile:', JSON.stringify(userProfile, null, 2))
    console.log('Decoded token:', JSON.stringify(decodedToken, null, 2))

    // Get donor's organization info - check multiple sources
    let donorOrganizationName = 'Individual Donor'
    let donorOrganizationId = null
    
    // Priority order: custom claims -> user profile
    if (decodedToken.organizationId) {
      donorOrganizationId = decodedToken.organizationId
    } else if (userProfile?.organizationId) {
      donorOrganizationId = userProfile.organizationId
    }
    
    if (donorOrganizationId) {
      try {
        const orgDoc = await adminDb.collection('organizations').doc(donorOrganizationId).get()
        if (orgDoc.exists) {
          donorOrganizationName = orgDoc.data()?.name || 'Unknown Organization'
        }
        console.log('Found organization:', donorOrganizationName)
      } catch (orgError) {
        console.error('Error fetching donor organization:', orgError)
      }
    } else {
      console.log('No organizationId found for user:', decodedToken.uid)
    }

    // Create donation document - all donations are equity commitments
    const donationData = {
      campaignId,
      donorId: decodedToken.uid,
      donorName: userProfile?.displayName || 'Unknown Donor',
      donorEmail: userProfile?.email || '',
      nonprofitAdminId: campaignData.createdBy,
      amount: donationAmount,
      donationType: 'equity',
      status: 'pending', // All equity donations start as pending
      message: message || '',
      
      // Simplified commitment details - just organization info
      commitmentDetails: {
        donorOrganizationId: donorOrganizationId,
        donorOrganizationName: donorOrganizationName,
        estimatedValue: donationAmount
      },
      
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      
      // All equity donations require appraisal
      requiresAppraisal: true,
      appraiserId: null,
      appraisalStatus: 'pending',
      
      // Metadata
      organizationId: campaignData.organizationId,
      organizationName: campaignData.organizationName
    }

    // Create the donation
    const donationRef = await adminDb.collection('donations').add(donationData)

    // Update campaign statistics
    const increment = FieldValue.increment(donationAmount)
    const incrementDonor = FieldValue.increment(1)
    
    await campaignRef.update({
      currentAmount: increment,
      donorCount: incrementDonor,
      updatedAt: FieldValue.serverTimestamp()
    })

    // Create initial shared task list in specific workflow order
    // Order: 1. Sign NDA 2. Invite Appraiser 3. Company Info 4. Upload Docs 5. etc.
    const tasks = [
      // Task 1: Donor - Sign General NDA (moved to first for easier testing)
      {
        donationId: donationRef.id,
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
        donationId: donationRef.id,
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
        donationId: donationRef.id,
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
        donationId: donationRef.id,
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
        donationId: donationRef.id,
        title: 'Initial Equity Assessment',
        description: 'Review company information and uploaded documents to assess equity valuation requirements',
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
        donationId: donationRef.id,
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
        donationId: donationRef.id,
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
        donationId: donationRef.id,
        title: 'Process Donation Request',
        description: 'Review donation request and coordinate documentation workflow',
        type: 'document_review',
        assignedTo: campaignData.createdBy,
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
        donationId: donationRef.id,
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
        donationId: donationRef.id,
        title: 'Finalize Donation Receipt',
        description: 'Generate and send final donation receipt and acknowledgement',
        type: 'other',
        assignedTo: campaignData.createdBy,
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

    // Create tasks in global tasks collection
    const createdTasks = []
    for (const task of tasks) {
      const taskRef = await adminDb.collection('tasks').add(task)
      createdTasks.push({ id: taskRef.id, ...task })
    }

    // Set up sequential dependencies for the 10-task workflow
    // Task 1: Donor (Sign NDA) - no dependencies (can start immediately)
    // Task 2: Donor (Invite Appraiser) - depends on Task 1
    // Task 3: Donor (Company Info) - depends on Task 2
    // Task 4: Donor (Upload Documents) - depends on Task 3
    // Task 5: Appraiser (Initial Assessment) - depends on Task 4
    // Task 6: Donor (Review Assessment) - depends on Task 5
    // Task 7: Appraiser (Full Appraisal) - depends on Task 6
    // Task 8: Nonprofit (Process Request) - depends on Task 7
    // Task 9: Donor (Review Final Docs) - depends on Task 8
    // Task 10: Nonprofit (Finalize Receipt) - depends on Task 9

    if (createdTasks.length === 10) {
      // Task 2 depends on Task 1
      await adminDb.collection('tasks').doc(createdTasks[1].id).update({
        dependencies: [createdTasks[0].id]
      })
      
      // Task 3 depends on Task 2
      await adminDb.collection('tasks').doc(createdTasks[2].id).update({
        dependencies: [createdTasks[1].id]
      })
      
      // Task 4 depends on Task 3
      await adminDb.collection('tasks').doc(createdTasks[3].id).update({
        dependencies: [createdTasks[2].id]
      })
      
      // Task 5 depends on Task 4
      await adminDb.collection('tasks').doc(createdTasks[4].id).update({
        dependencies: [createdTasks[3].id]
      })
      
      // Task 6 depends on Task 5
      await adminDb.collection('tasks').doc(createdTasks[5].id).update({
        dependencies: [createdTasks[4].id]
      })
      
      // Task 7 depends on Task 6
      await adminDb.collection('tasks').doc(createdTasks[6].id).update({
        dependencies: [createdTasks[5].id]
      })
      
      // Task 8 depends on Task 7
      await adminDb.collection('tasks').doc(createdTasks[7].id).update({
        dependencies: [createdTasks[6].id]
      })
      
      // Task 9 depends on Task 8
      await adminDb.collection('tasks').doc(createdTasks[8].id).update({
        dependencies: [createdTasks[7].id]
      })
      
      // Task 10 depends on Task 9
      await adminDb.collection('tasks').doc(createdTasks[9].id).update({
        dependencies: [createdTasks[8].id]
      })
    }

    console.log('Created donation tasks:', createdTasks.length, 'tasks')

    return NextResponse.json({
      success: true,
      donationId: donationRef.id,
      message: 'Equity commitment created successfully! An appraiser will be assigned to process your donation.',
      donation: {
        id: donationRef.id,
        amount: donationAmount,
        donationType: 'equity',
        status: donationData.status,
        requiresAppraisal: donationData.requiresAppraisal
      }
    })

  } catch (error) {
    console.error('Error creating donation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}