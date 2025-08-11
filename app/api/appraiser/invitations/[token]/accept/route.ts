import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(authToken)
    
    // Only appraisers can accept appraiser invitations
    // Allow new users who don't have a role set yet, but if they do have a role, it must be appraiser
    if (decodedToken.role && decodedToken.role !== 'appraiser') {
      return NextResponse.json({ error: 'Only appraisers can accept appraiser invitations' }, { status: 403 })
    }

    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find invitation by token
    console.log('Looking for invitation with token:', token)
    const invitationsQuery = adminDb.collection('appraiser_invitations')
      .where('invitationToken', '==', token)
      .limit(1)

    const invitationsSnapshot = await invitationsQuery.get()
    console.log('Found invitations:', invitationsSnapshot.docs.length)

    if (invitationsSnapshot.empty) {
      console.log('No invitation found for token:', token)
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const invitationDoc = invitationsSnapshot.docs[0]
    const invitationData = invitationDoc.data()
    console.log('Invitation data:', { 
      donationId: invitationData.donationId, 
      appraiserEmail: invitationData.appraiserEmail,
      status: invitationData.status
    })

    // Verify the invitation is for the authenticated user
    if (invitationData.appraiserEmail !== decodedToken.email) {
      return NextResponse.json({ error: 'This invitation is not for your account' }, { status: 403 })
    }

    // Check if invitation is still valid
    const now = new Date()
    const expiresAt = invitationData.expiresAt?.toDate?.() || new Date(invitationData.expiresAt)
    
    if (now > expiresAt) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 })
    }

    // Check if already accepted
    if (invitationData.status === 'accepted') {
      return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 400 })
    }

    // Update invitation status
    await invitationDoc.ref.update({
      status: 'accepted',
      respondedAt: FieldValue.serverTimestamp(),
      acceptedBy: decodedToken.uid
    })

    // Find and update appraiser tasks for this donation
    const donationId = invitationData.donationId
    console.log('Processing invitation for donationId:', donationId)
    const batch = adminDb.batch()
    
    // Handle both participant-based (new) and donation-based (legacy) tasks
    let isParticipantBased = false
    let participantId = null
    
    if (donationId.includes('_')) {
      // This is a participantId (new system)
      isParticipantBased = true
      participantId = donationId
      console.log('Detected participant-based system, participantId:', participantId)
      
      // Update participant-based appraiser tasks
      const participantTasksQuery = adminDb.collection('tasks')
        .where('participantId', '==', participantId)
        .where('assignedRole', '==', 'appraiser')

      const participantTasksSnapshot = await participantTasksQuery.get()
      console.log(`Found ${participantTasksSnapshot.docs.length} appraiser tasks for participant:`, participantId)
      
      participantTasksSnapshot.docs.forEach(taskDoc => {
        console.log('Updating task:', taskDoc.id)
        batch.update(taskDoc.ref, {
          assignedTo: decodedToken.uid,
          updatedAt: FieldValue.serverTimestamp()
        })
      })
      
      // Update the donor participant record
      const donorParticipantRef = adminDb.collection('campaign_participants').doc(participantId)
      console.log('Updating donor participant record:', participantId)
      batch.update(donorParticipantRef, {
        appraiserId: decodedToken.uid,
        appraiserEmail: decodedToken.email,
        appraisalStatus: 'appraiser_assigned',
        updatedAt: FieldValue.serverTimestamp()
      })
      
      // Create a separate appraiser participant record so they can access the campaign
      const [campaignId, donorUserId] = participantId.split('_')
      const appraiserParticipantId = `${campaignId}_${decodedToken.uid}`
      console.log('Creating appraiser participant record:', appraiserParticipantId)
      console.log('Campaign ID:', campaignId, 'Donor User ID:', donorUserId, 'Appraiser ID:', decodedToken.uid)
      
      const appraiserParticipantRef = adminDb.collection('campaign_participants').doc(appraiserParticipantId)
      batch.set(appraiserParticipantRef, {
        campaignId: campaignId,
        userId: decodedToken.uid,
        userEmail: decodedToken.email,
        role: 'appraiser',
        status: 'active',
        joinedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        // Link to the donor they're appraising for
        linkedDonorParticipantId: participantId,
        linkedDonorId: donorUserId
      })
    } else {
      // Legacy donation-based system
      // Update all appraiser tasks to assign to this user
      const appraiserTasksQuery = adminDb.collection('tasks')
        .where('donationId', '==', donationId)
        .where('assignedRole', '==', 'appraiser')

      const appraiserTasksSnapshot = await appraiserTasksQuery.get()
      
      appraiserTasksSnapshot.docs.forEach(taskDoc => {
        batch.update(taskDoc.ref, {
          assignedTo: decodedToken.uid,
          updatedAt: FieldValue.serverTimestamp()
        })
      })

      // Update the donation record to include appraiser info
      const donationRef = adminDb.collection('donations').doc(donationId)
      batch.update(donationRef, {
        appraiserId: decodedToken.uid,
        appraiserEmail: decodedToken.email,
        appraisalStatus: 'appraiser_assigned',
        updatedAt: FieldValue.serverTimestamp()
      })
    }

    console.log('Committing batch operations...')
    await batch.commit()
    console.log('Batch committed successfully')

    // Track if we need to update the user's role
    let roleUpdated = false
    
    // If user doesn't have appraiser role yet, set it now
    if (!decodedToken.role || decodedToken.role !== 'appraiser') {
      const customClaims = {
        ...decodedToken,
        role: 'appraiser',
        permissions: ['view_assigned_tasks', 'submit_appraisals', 'manage_own_profile']
      }
      
      await adminAuth.setCustomUserClaims(decodedToken.uid, customClaims)
      
      // Also update the user document
      const userRef = adminDb.collection('users').doc(decodedToken.uid)
      await userRef.set({
        role: 'appraiser',
        permissions: ['view_assigned_tasks', 'submit_appraisals', 'manage_own_profile'],
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true })
      
      roleUpdated = true
    }

    // Determine the correct redirect URL based on whether it's participant-based or donation-based
    let redirectUrl
    if (isParticipantBased) {
      // Extract campaign and user IDs from participantId (format: campaignId_userId)
      const [campaignId] = participantId.split('_')
      redirectUrl = `/campaigns/${campaignId}/participants/${participantId}/tasks`
    } else {
      redirectUrl = `/donations/${donationId}/tasks`
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully! You have been assigned as the appraiser for this donation.',
      donationId: donationId,
      participantId: isParticipantBased ? participantId : null,
      redirectUrl: redirectUrl,
      isParticipantBased: isParticipantBased,
      roleUpdated: roleUpdated
    })

  } catch (error) {
    console.error('Error accepting appraiser invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}