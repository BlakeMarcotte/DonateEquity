import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'
import {
  serializeAppraiserInvitation,
  type AppraiserInvitation,
} from '@/types/appraiser-invitation'

/**
 * GET /api/invitations/[token]
 * Retrieve invitation details by token (public endpoint)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  try {

    // 1. VALIDATE TOKEN FORMAT (basic check)
    if (!token || token.length < 10) {
      secureLogger.warn('Invalid invitation token format', { token })
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    // 2. FIND INVITATION BY TOKEN
    const invitationsQuery = await adminDb
      .collection('appraiser_invitations')
      .where('invitationToken', '==', token)
      .limit(1)
      .get()

    if (invitationsQuery.empty) {
      secureLogger.warn('Invitation not found', { token })
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    const invitationDoc = invitationsQuery.docs[0]
    const invitationData = {
      id: invitationDoc.id,
      ...invitationDoc.data(),
    } as AppraiserInvitation

    // 3. SERIALIZE TIMESTAMPS
    const serialized = serializeAppraiserInvitation(invitationData)

    // 4. LOG ACCESS (for security monitoring)
    secureLogger.info('Invitation retrieved', {
      invitationId: invitationDoc.id,
      donationId: invitationData.donationId,
      status: invitationData.status,
      ip: request.headers.get('x-forwarded-for'),
    })

    // 5. RETURN INVITATION DATA
    return NextResponse.json({
      success: true,
      invitation: serialized,
    })
  } catch (error) {
    secureLogger.error('Error retrieving invitation', error, {
      token,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
