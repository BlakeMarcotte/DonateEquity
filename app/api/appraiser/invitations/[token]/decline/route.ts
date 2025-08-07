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
    
    const { token } = await params

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

    // Check if already responded to
    if (invitationData.status !== 'pending') {
      return NextResponse.json({ error: 'This invitation has already been responded to' }, { status: 400 })
    }

    // Update invitation status
    await invitationDoc.ref.update({
      status: 'declined',
      respondedAt: FieldValue.serverTimestamp(),
      declinedBy: decodedToken.uid
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation declined successfully.'
    })

  } catch (error) {
    console.error('Error declining appraiser invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}