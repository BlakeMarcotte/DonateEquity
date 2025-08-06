import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc, addDoc, collection, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { authenticateUser } from '@/lib/firebase/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await authenticateUser(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { invitationId, acceptanceData } = body

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Get the invitation document
    const invitationRef = doc(db, 'campaign_invitations', invitationId)
    const invitationDoc = await getDoc(invitationRef)

    if (!invitationDoc.exists()) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const invitationData = invitationDoc.data()

    // Verify the user is accepting their own invitation
    if (invitationData.invitedUserId !== authResult.user.uid && 
        invitationData.invitedEmail !== authResult.user.email) {
      return NextResponse.json({ error: 'Not authorized to accept this invitation' }, { status: 403 })
    }

    // Check if invitation is still pending
    if (invitationData.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation has already been processed' }, { status: 400 })
    }

    // Update invitation status to accepted
    await updateDoc(invitationRef, {
      status: 'accepted',
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Link the user if it wasn't already linked
      ...(invitationData.invitedUserId !== authResult.user.uid && {
        invitedUserId: authResult.user.uid
      })
    })

    // Create campaign participant record  
    const participantData = {
      campaignId: invitationData.campaignId,
      userId: authResult.user.uid, // Using userId to match your data structure
      invitedEmail: authResult.user.email,
      inviterName: authResult.user.displayName || authResult.user.email?.split('@')[0] || 'User',
      userRole: 'donor', // Adding userRole field seen in your data
      joinedAt: serverTimestamp(),
      joinedVia: 'invitation', // Adding joinedVia field seen in your data
      status: 'interested', // Initial status
      invitationId: invitationId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Store any additional acceptance data
      ...(acceptanceData && { acceptanceData })
    }

    const participantRef = await addDoc(collection(db, 'campaign_participants'), participantData)

    // Optional: Create initial tasks for the participant
    // This could be moved to a separate function or Cloud Function
    try {
      // You can add task creation logic here if needed
      console.log('Participant created successfully:', participantRef.id)
    } catch (taskError) {
      console.warn('Failed to create initial tasks:', taskError)
      // Don't fail the whole operation if task creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted and participant created successfully',
      data: {
        invitationId,
        participantId: participantRef.id,
        campaignId: invitationData.campaignId
      }
    })

  } catch (error) {
    console.error('Error accepting invitation and creating participant:', error)
    return NextResponse.json(
      { error: 'Failed to process invitation acceptance' },
      { status: 500 }
    )
  }
}