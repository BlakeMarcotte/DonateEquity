import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json(
        { error: 'Missing invitation token' },
        { status: 400 }
      )
    }

    console.log('Looking up invitation by token:', token)

    // Find invitation by token using Admin SDK (bypasses Firestore rules)
    const invitationsQuery = await adminDb
      .collection('campaign_invitations')
      .where('invitationToken', '==', token)
      .where('status', '==', 'pending')
      .limit(1)
      .get()
    
    if (invitationsQuery.empty) {
      console.log('Invitation not found for token:', token)
      return NextResponse.json(
        { error: 'Invitation not found or expired' },
        { status: 404 }
      )
    }

    const invitationDoc = invitationsQuery.docs[0]
    const invitationData = invitationDoc.data()
    
    console.log('Found invitation:', { 
      id: invitationDoc.id, 
      invitedEmail: invitationData.invitedEmail,
      status: invitationData.status 
    })

    // Check if invitation is expired
    if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Return invitation data
    const invitation = {
      id: invitationDoc.id,
      campaignId: invitationData.campaignId,
      invitedEmail: invitationData.invitedEmail,
      inviterUserId: invitationData.inviterUserId,
      inviterName: invitationData.inviterName,
      organizationId: invitationData.organizationId,
      status: invitationData.status,
      message: invitationData.message || '',
      invitedAt: invitationData.invitedAt?.toDate()?.toISOString(),
      expiresAt: invitationData.expiresAt?.toDate()?.toISOString(),
      respondedAt: invitationData.respondedAt?.toDate()?.toISOString(),
      invitationToken: invitationData.invitationToken,
      userExists: invitationData.userExists,
      invitedUserId: invitationData.invitedUserId || null,
    }

    return NextResponse.json({ invitation })
  } catch (error) {
    console.error('Error getting invitation by token:', error)
    return NextResponse.json(
      { error: 'Failed to get invitation' },
      { status: 500 }
    )
  }
}