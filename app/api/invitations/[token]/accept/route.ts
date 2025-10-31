import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'
import { FieldValue } from 'firebase-admin/firestore'
import {
  canAcceptInvitation,
  type AppraiserInvitation,
} from '@/types/appraiser-invitation'

/**
 * POST /api/invitations/[token]/accept
 * Accept an appraiser invitation
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
      secureLogger.warn('Unauthorized accept attempt - no token', {
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
      secureLogger.warn('Unauthorized accept attempt - invalid token', {
        invitationToken: token,
        error,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decodedToken.uid
    const userEmail = decodedToken.email
    const userRole = decodedToken.role as string | undefined

    // 2. FIND INVITATION BY TOKEN
    const invitationsQuery = await adminDb
      .collection('appraiser_invitations')
      .where('invitationToken', '==', token)
      .limit(1)
      .get()

    if (invitationsQuery.empty) {
      secureLogger.warn('Accept attempt - invitation not found', {
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
      secureLogger.warn('Accept attempt - email mismatch', {
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

    // 4. CHECK IF INVITATION CAN BE ACCEPTED
    if (!canAcceptInvitation(invitation)) {
      const reason =
        invitation.status !== 'pending'
          ? `Invitation has already been ${invitation.status}`
          : 'Invitation has expired'

      secureLogger.warn('Accept attempt - cannot accept', {
        userId,
        invitationId: invitation.id,
        status: invitation.status,
        reason,
      })

      return NextResponse.json({ error: reason }, { status: 400 })
    }

    // 5. CHECK IF ALREADY ACCEPTED (edge case: duplicate request)
    if (invitation.status === 'accepted' && invitation.acceptedBy === userId) {
      secureLogger.info('Invitation already accepted by this user', {
        userId,
        invitationId: invitation.id,
        donationId: invitation.donationId,
      })

      // Return success with redirect URL
      return NextResponse.json({
        success: true,
        message: 'Invitation already accepted',
        redirectUrl: '/my-tasks',
      })
    }

    const now = FieldValue.serverTimestamp()

    // 6. USE FIRESTORE BATCH FOR ATOMIC UPDATES
    const batch = adminDb.batch()

    // 6a. UPDATE INVITATION STATUS
    batch.update(invitationDoc.ref, {
      status: 'accepted',
      acceptedBy: userId,
      respondedAt: now,
    })

    // 6b. GET DONATION DOCUMENT
    const donationRef = adminDb.collection('donations').doc(invitation.donationId)
    const donationDoc = await donationRef.get()

    if (!donationDoc.exists) {
      secureLogger.error('Donation not found for invitation', null, {
        userId,
        invitationId: invitation.id,
        donationId: invitation.donationId,
      })
      return NextResponse.json({ error: 'Associated donation not found' }, { status: 404 })
    }

    const donationData = donationDoc.data()

    // 6c. UPDATE DONATION WITH APPRAISER ID
    batch.update(donationRef, {
      appraiserId: userId,
      appraiserEmail: invitation.appraiserEmail,
      appraiserAssignedAt: now,
    })

    // 6d. UPDATE APPRAISER TASKS - Assign to this user
    const appraiserTasksQuery = await adminDb
      .collection('tasks')
      .where('donationId', '==', invitation.donationId)
      .where('assignedRole', '==', 'appraiser')
      .get()

    appraiserTasksQuery.docs.forEach((taskDoc: FirebaseFirestore.QueryDocumentSnapshot) => {
      batch.update(taskDoc.ref, {
        assignedTo: userId,
      })
    })

    secureLogger.info('Updating appraiser tasks', {
      userId,
      invitationId: invitation.id,
      donationId: invitation.donationId,
      taskCount: appraiserTasksQuery.size,
    })

    // 6e. SET USER ROLE TO APPRAISER (if not already set)
    if (!userRole || userRole === '') {
      try {
        await adminAuth.setCustomUserClaims(userId, {
          role: 'appraiser',
        })
        secureLogger.info('User role set to appraiser', {
          userId,
          invitationId: invitation.id,
        })
      } catch (error) {
        secureLogger.error('Failed to set user role', error, {
          userId,
          invitationId: invitation.id,
        })
        // Don't fail the request - role can be set manually
      }
    }

    // 7. COMMIT BATCH
    await batch.commit()

    secureLogger.info('Appraiser invitation accepted', {
      userId,
      invitationId: invitation.id,
      donationId: invitation.donationId,
      campaignId: donationData?.campaignId,
    })

    // 8. AUDIT LOG
    await adminDb.collection('audit_logs').add({
      userId,
      action: 'appraiser_invitation_accepted',
      resourceType: 'appraiser_invitation',
      resourceId: invitation.id,
      metadata: {
        donationId: invitation.donationId,
        campaignId: donationData?.campaignId,
      },
      timestamp: now,
      ip: request.headers.get('x-forwarded-for'),
    })

    // 9. RETURN SUCCESS WITH REDIRECT
    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      redirectUrl: '/my-tasks',
      donationId: invitation.donationId,
    })
  } catch (error) {
    secureLogger.error('Error accepting invitation', error, {
      invitationToken: token,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
