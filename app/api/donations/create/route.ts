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
      message,
      isAnonymous = false
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
        if (orgDoc.exists()) {
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
      donorName: isAnonymous ? 'Anonymous' : userProfile?.displayName || 'Unknown Donor',
      donorEmail: userProfile?.email || '',
      nonprofitAdminId: campaignData.createdBy,
      amount: donationAmount,
      donationType: 'equity',
      status: 'pending', // All equity donations start as pending
      message: message || '',
      isAnonymous,
      
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

    // Create initial shared task list for all three roles
    const tasks = [
      // Donor tasks
      {
        donationId: donationRef.id,
        title: 'Provide Company Information',
        description: 'Submit basic company information and documentation for equity valuation',
        type: 'document_upload',
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        status: 'pending',
        priority: 'high',
        dependencies: [],
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
      {
        donationId: donationRef.id,
        title: 'Review Final Documentation',
        description: 'Review and approve all finalized donation documentation',
        type: 'document_review',
        assignedTo: decodedToken.uid,
        assignedRole: 'donor',
        status: 'blocked',
        priority: 'medium',
        dependencies: [], // Will be set after appraiser task is created
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
      
      // Nonprofit Admin tasks
      {
        donationId: donationRef.id,
        title: 'Process Donation Request',
        description: 'Review donation request and coordinate with appraiser',
        type: 'document_review',
        assignedTo: campaignData.createdBy,
        assignedRole: 'nonprofit_admin',
        status: 'pending',
        priority: 'high',
        dependencies: [],
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
      {
        donationId: donationRef.id,
        title: 'Finalize Donation Receipt',
        description: 'Generate and send final donation receipt and acknowledgement',
        type: 'other',
        assignedTo: campaignData.createdBy,
        assignedRole: 'nonprofit_admin',
        status: 'blocked',
        priority: 'medium',
        dependencies: [], // Will be set after appraiser task is created
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
      
      // Appraiser task
      {
        donationId: donationRef.id,
        title: 'Conduct Equity Appraisal',
        description: 'Perform professional appraisal of donated equity',
        type: 'appraisal_submission',
        assignedTo: 'mock-appraiser-user', // Will be assigned to real appraiser later
        assignedRole: 'appraiser',
        status: 'pending',
        priority: 'high',
        dependencies: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
        metadata: {
          documentIds: [],
          signatureRequired: true,
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

    // Set up dependencies - donor and nonprofit final tasks depend on appraiser task
    const appraisalTask = createdTasks.find(t => t.type === 'appraisal_submission')
    const donorReviewTask = createdTasks.find(t => t.assignedRole === 'donor' && t.type === 'document_review')
    const nonprofitReceiptTask = createdTasks.find(t => t.assignedRole === 'nonprofit_admin' && t.title.includes('Receipt'))

    if (appraisalTask && donorReviewTask) {
      await adminDb.collection('tasks').doc(donorReviewTask.id).update({
        dependencies: [appraisalTask.id]
      })
    }

    if (appraisalTask && nonprofitReceiptTask) {
      await adminDb.collection('tasks').doc(nonprofitReceiptTask.id).update({
        dependencies: [appraisalTask.id]
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