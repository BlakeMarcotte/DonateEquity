import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
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
    if (decodedToken.role !== 'appraiser') {
      return NextResponse.json({ error: 'Only appraisers can accept appraiser invitations' }, { status: 403 })
    }

    const token = params.token

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find invitation by token
    const invitationsQuery = adminDb.collection('appraiser_invitations')
      .where('invitationToken', '==', token)
      .limit(1)

    const invitationsSnapshot = await invitationsQuery.get()

    if (invitationsSnapshot.empty) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const invitationDoc = invitationsSnapshot.docs[0]
    const invitationData = invitationDoc.data()

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
    
    // Update all appraiser tasks to assign to this user
    const appraiserTasksQuery = adminDb.collection('tasks')
      .where('donationId', '==', donationId)
      .where('assignedRole', '==', 'appraiser')

    const appraiserTasksSnapshot = await appraiserTasksQuery.get()
    
    const batch = adminDb.batch()
    
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

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully! You have been assigned as the appraiser for this donation.',
      donationId: donationId
    })

  } catch (error) {
    console.error('Error accepting appraiser invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}