import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'
import { FieldValue } from 'firebase-admin/firestore'
import { type AppraiserInvitation } from '@/types/appraiser-invitation'

/**
 * POST /api/invitations/[token]/decline
 * Decline an appraiser invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {

    // 1. AUTHENTICATE
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      secureLogger.warn('Unauthorized decline attempt - no token', {
        invitationToken: token,
        ip: request.headers.get('x-forwarded-for'),
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authToken = authHeader.split('Bearer ')[1]
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(authToken)
    } catch (error) {
      secureLogger.warn('Unauthorized decline attempt - invalid token', {
        invitationToken: token,
        error,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    // 2. FIND INVITATION BY TOKEN
    const invitationsQuery = await adminDb
      .collection('appraiser_invitations')
      .where('invitationToken', '==', token)
      .limit(1)
      .get()

    if (invitationsQuery.empty) {
      secureLogger.warn('Decline attempt - invitation not found', {
        userId,
        invitationToken: token,
      })
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const invitationDoc = invitationsQuery.docs[0]
    const invitation = {
      id: invitationDoc.id,
      ...invitationDoc.data(),
    } as AppraiserInvitation

    // 3. VERIFY EMAIL MATCHES
    if (invitation.appraiserEmail.toLowerCase() !== userEmail?.toLowerCase()) {
      secureLogger.warn('Decline attempt - email mismatch', {
        userId,
        invitationId: invitation.id,
        expectedEmail: invitation.appraiserEmail,
        actualEmail: userEmail,
      })
      return NextResponse.json(
        { error: 'This invitation was sent to a different email address' },
        { status: 403 }
      )
    }

    // 4. CHECK IF INVITATION IS PENDING
    if (invitation.status !== 'pending') {
      secureLogger.warn('Decline attempt - invitation not pending', {
        userId,
        invitationId: invitation.id,
        status: invitation.status,
      })
      return NextResponse.json(
        { error: `Invitation has already been ${invitation.status}` },
        { status: 400 }
      )
    }

    const now = FieldValue.serverTimestamp()

    // 5. UPDATE INVITATION STATUS
    await invitationDoc.ref.update({
      status: 'declined',
      declinedBy: userId,
      respondedAt: now,
    })

    secureLogger.info('Appraiser invitation declined', {
      userId,
      invitationId: invitation.id,
      donationId: invitation.donationId,
    })

    // 6. AUDIT LOG
    await adminDb.collection('audit_logs').add({
      userId,
      action: 'appraiser_invitation_declined',
      resourceType: 'appraiser_invitation',
      resourceId: invitation.id,
      metadata: {
        donationId: invitation.donationId,
      },
      timestamp: now,
      ip: request.headers.get('x-forwarded-for'),
    })

    // 7. RETURN SUCCESS
    return NextResponse.json({
      success: true,
      message: 'Invitation declined',
    })
  } catch (error) {
    secureLogger.error('Error declining invitation', error, {
      invitationToken: token,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
