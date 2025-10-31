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

    // Create or get campaign participant document
    const participantId = `${campaignId}_${decodedToken.uid}`
    const participantRef = adminDb.collection('campaign_participants').doc(participantId)
    const participantDoc = await participantRef.get()

    if (!participantDoc.exists) {
      // Create new participant if doesn't exist
      await participantRef.set({
        campaignId,
        userId: decodedToken.uid,
        userEmail: userProfile?.email || '',
        userName: userProfile?.displayName || 'Unknown User',
        role: 'donor',
        status: 'active',
        joinedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
    }

    // Create donation document - all donations are equity commitments
    const donationData = {
      campaignId,
      campaignTitle: campaignData.title || '',
      donorId: decodedToken.uid,
      donorName: userProfile?.displayName || 'Unknown Donor',
      donorEmail: userProfile?.email || '',
      nonprofitAdminId: campaignData.createdBy,
      participantId, // Link to campaign_participants
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

    console.log('Donation and participant created successfully - tasks will be created via participant workflow')

    return NextResponse.json({
      success: true,
      donationId: donationRef.id,
      participantId, // Return the participantId for reference
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