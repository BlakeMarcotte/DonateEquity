import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Invitation Accept API Called ===')
    console.log('Request URL:', request.url)
    console.log('Request method:', request.method)

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth header found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    console.log('User token decoded:', { uid: decodedToken.uid, email: decodedToken.email, role: decodedToken.role })
    
    const { invitationId, invitationToken } = await request.json()
    
    if (!invitationId && !invitationToken) {
      return NextResponse.json(
        { error: 'Missing invitation ID or token' },
        { status: 400 }
      )
    }

    // Get the invitation
    let invitationDoc
    if (invitationId) {
      invitationDoc = await adminDb.collection('campaign_invitations').doc(invitationId).get()
    } else {
      // Find by token
      const invitationsQuery = await adminDb
        .collection('campaign_invitations')
        .where('invitationToken', '==', invitationToken)
        .where('status', '==', 'pending')
        .limit(1)
        .get()
      
      if (!invitationsQuery.empty) {
        invitationDoc = invitationsQuery.docs[0]
      }
    }

    if (!invitationDoc || !invitationDoc.exists) {
      console.log('Invitation not found:', { invitationId, invitationToken })
      return NextResponse.json(
        { error: 'Invitation not found or already processed' },
        { status: 404 }
      )
    }

    const invitationData = invitationDoc.data()
    if (!invitationData) {
      return NextResponse.json(
        { error: 'Invitation data not found' },
        { status: 404 }
      )
    }
    
    console.log('Invitation data:', { 
      invitedEmail: invitationData.invitedEmail, 
      invitedUserId: invitationData.invitedUserId,
      status: invitationData.status 
    })
    
    // Check if invitation is expired
    if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Get user profile to check email match
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()
    
    console.log('User data:', { 
      userEmail: userData?.email, 
      tokenEmail: decodedToken.email,
      invitedEmail: invitationData.invitedEmail 
    })
    
    // Verify that the user's email matches the invitation email (if no userId is set)
    const userEmail = (userData?.email || decodedToken.email)?.toLowerCase()
    const invitedEmail = invitationData.invitedEmail?.toLowerCase()
    
    if (!invitationData.invitedUserId && userEmail !== invitedEmail) {
      console.log('Email mismatch:', { userEmail, invitedEmail, invitedUserId: invitationData.invitedUserId })
      return NextResponse.json(
        { error: `This invitation was sent to ${invitationData.invitedEmail}, but you're logged in as ${userEmail}` },
        { status: 403 }
      )
    }

    // Set user role to donor if they don't have a role yet
    const currentRole = decodedToken.role
    if (!currentRole || currentRole === 'donor') {
      try {
        // Update custom claims
        await adminAuth.setCustomUserClaims(decodedToken.uid, {
          ...decodedToken,
          role: 'donor'
        })

        // Update user profile document
        await adminDb.collection('users').doc(decodedToken.uid).update({
          role: 'donor',
          updatedAt: new Date()
        })

        console.log('Set user role to donor:', decodedToken.uid)
      } catch (roleError) {
        console.error('Error setting user role to donor:', roleError)
        // Don't fail the invitation if role setting fails
      }
    }

    // Update the invitation and create campaign participant record
    const batch = adminDb.batch()
    let donationId = ''

    try {
      // Update the invitation
      batch.update(invitationDoc.ref, {
        invitedUserId: decodedToken.uid,
        status: 'accepted',
        respondedAt: new Date(),
        updatedAt: new Date()
      })

      // Get campaign details for donation creation
      const campaignRef = adminDb.collection('campaigns').doc(invitationData.campaignId)
      const campaignDoc = await campaignRef.get()

      if (!campaignDoc.exists) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }

      const campaignData = campaignDoc.data()
      if (!campaignData) {
        return NextResponse.json(
          { error: 'Campaign data not found' },
          { status: 404 }
        )
      }

      // Create a donation record instead of just a participant record
      // This represents the donor's commitment to the campaign
      const donationRef = adminDb.collection('donations').doc()
      donationId = donationRef.id

      // Get donor's organization info if available
      let donorOrganizationName = 'Individual Donor'
      let donorOrganizationId = null

      if (userData?.organizationId) {
        donorOrganizationId = userData.organizationId
        try {
          const orgDoc = await adminDb.collection('organizations').doc(donorOrganizationId).get()
          if (orgDoc.exists) {
            donorOrganizationName = orgDoc.data()?.name || 'Unknown Organization'
          }
        } catch (orgError) {
          console.error('Error fetching donor organization:', orgError)
        }
      }

      const donationData = {
        campaignId: invitationData.campaignId,
        campaignTitle: campaignData.title,
        donorId: decodedToken.uid,
        donorName: userData?.displayName || userEmail || 'Unknown Donor',
        donorEmail: userEmail || '',
        nonprofitAdminId: campaignData.createdBy,
        amount: 0, // Initial amount, to be set later
        donationType: 'equity',
        status: 'pending', // Pending until donor provides commitment details
        message: invitationData.message || '',
        isAnonymous: false,

        // Equity-specific fields
        commitmentDetails: {
          donorOrganizationId: donorOrganizationId,
          donorOrganizationName: donorOrganizationName,
          estimatedValue: 0
        },
        requiresAppraisal: true,
        appraiserId: null,
        appraiserEmail: null,
        appraisalStatus: 'not_required' as const, // Will change when commitment is made

        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,

        // Organization context
        organizationId: campaignData.organizationId,
        organizationName: campaignData.organizationName,

        // Metadata
        invitationId: invitationDoc.id,
        inviterUserId: invitationData.inviterUserId,
        invitedVia: 'invitation'
      }

      console.log('Creating donation record:', {
        donationId: donationRef.id,
        campaignId: invitationData.campaignId,
        donorId: decodedToken.uid,
        status: 'pending'
      })

      batch.set(donationRef, donationData)

      // Execute batch
      await batch.commit()
      console.log('Successfully updated invitation and created donation record:', {
        invitationId: invitationDoc.id,
        donationId: donationRef.id,
        userId: decodedToken.uid
      })

      // Verify donation was created
      const verifyDonation = await donationRef.get()
      if (verifyDonation.exists) {
        console.log('Verified donation record exists:', verifyDonation.data())
      } else {
        console.error('WARNING: Donation record was not created!')
      }
    } catch (updateError) {
      console.error('Error updating invitation or creating participant record:', updateError)
      return NextResponse.json(
        { error: `Failed to process invitation acceptance: ${updateError instanceof Error ? updateError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      requiresTokenRefresh: !currentRole, // Let client know to refresh token if role was just set
      data: {
        campaignId: invitationData.campaignId,
        donationId: donationId,
        donorId: decodedToken.uid
      }
    })
  } catch (error: unknown) {
    console.error('Error accepting invitation:', error)
    
    // Check if it's a Firebase permission error
    const firebaseError = error as { code?: string }
    if (firebaseError.code === 'permission-denied') {
      return NextResponse.json(
        { error: 'Permission denied. You may not have access to this invitation.' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: `Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}