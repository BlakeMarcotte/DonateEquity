import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Invitation Accept API Called ===')
    
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

    // Update the invitation to link it to the user and accept it
    try {
      await invitationDoc.ref.update({
        invitedUserId: decodedToken.uid,
        status: 'accepted',
        respondedAt: new Date(),
        updatedAt: new Date()
      })
      console.log('Successfully updated invitation:', invitationDoc.id)
    } catch (updateError) {
      console.error('Error updating invitation document:', updateError)
      return NextResponse.json(
        { error: `Failed to update invitation: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      campaignId: invitationData.campaignId,
      message: 'Invitation accepted successfully'
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    
    // Check if it's a Firebase permission error
    if (error.code === 'permission-denied') {
      return NextResponse.json(
        { error: 'Permission denied. You may not have access to this invitation.' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: `Failed to accept invitation: ${error.message}` },
      { status: 500 }
    )
  }
}