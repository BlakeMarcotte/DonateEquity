import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
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

    // Convert Firestore timestamps to ISO strings
    const invitation = {
      id: invitationDoc.id,
      ...invitationData,
      invitedAt: invitationData.invitedAt?.toDate?.()?.toISOString() || invitationData.invitedAt,
      expiresAt: invitationData.expiresAt?.toDate?.()?.toISOString() || invitationData.expiresAt,
      respondedAt: invitationData.respondedAt?.toDate?.()?.toISOString() || invitationData.respondedAt
    }

    return NextResponse.json({
      success: true,
      invitation
    })

  } catch (error) {
    console.error('Error fetching appraiser invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}