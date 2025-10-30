import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'
import { v4 as uuidv4 } from 'uuid'
import { Resend } from 'resend'
import {
  createAppraiserInvitationSchema,
  type AppraiserInvitation,
} from '@/types/appraiser-invitation'
import { FieldValue } from 'firebase-admin/firestore'

const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST /api/donations/[id]/invitations
 * Create and send an appraiser invitation for a donation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: donationId } = await params

  try {

    // 1. AUTHENTICATE - Verify user is authenticated
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      secureLogger.warn('Unauthorized invitation attempt - no token', {
        donationId,
        ip: request.headers.get('x-forwarded-for'),
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      secureLogger.warn('Unauthorized invitation attempt - invalid token', {
        donationId,
        error,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = decodedToken.uid

    // 2. VALIDATE INPUT
    const body = await request.json()
    const validationResult = createAppraiserInvitationSchema.safeParse({
      ...body,
      donationId, // Ensure donationId from URL is used
    })

    if (!validationResult.success) {
      secureLogger.warn('Invalid invitation data', {
        userId,
        donationId,
        errors: validationResult.error.issues,
      })
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { appraiserEmail, appraiserName, personalMessage } = validationResult.data

    // 3. CHECK PERMISSIONS - Verify user owns this donation
    const donationRef = adminDb.collection('donations').doc(donationId)
    const donationDoc = await donationRef.get()

    if (!donationDoc.exists) {
      secureLogger.warn('Invitation attempt for non-existent donation', {
        userId,
        donationId,
      })
      return NextResponse.json({ error: 'Donation not found' }, { status: 404 })
    }

    const donationData = donationDoc.data()
    if (donationData?.donorId !== userId) {
      secureLogger.warn('Unauthorized invitation attempt - not donation owner', {
        userId,
        donationId,
        actualOwnerId: donationData?.donorId,
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. CHECK IF APPRAISER ALREADY ASSIGNED
    if (donationData.appraiserId) {
      secureLogger.info('Invitation attempt but appraiser already assigned', {
        userId,
        donationId,
        existingAppraiserId: donationData.appraiserId,
      })
      return NextResponse.json(
        { error: 'An appraiser is already assigned to this donation' },
        { status: 400 }
      )
    }

    // 5. CHECK IF ACTIVE INVITATION EXISTS
    const existingInvitationsQuery = await adminDb
      .collection('appraiser_invitations')
      .where('donationId', '==', donationId)
      .where('status', '==', 'pending')
      .get()

    if (!existingInvitationsQuery.empty) {
      secureLogger.info('Active invitation already exists', {
        userId,
        donationId,
        existingInvitationId: existingInvitationsQuery.docs[0].id,
      })
      return NextResponse.json(
        { error: 'An active invitation already exists for this donation' },
        { status: 400 }
      )
    }

    // 6. GET INVITER INFORMATION
    const inviterUser = await adminAuth.getUser(userId)
    const inviterName = inviterUser.displayName || 'A donor'
    const inviterEmail = inviterUser.email || ''

    // 7. CHECK IF APPRAISER EMAIL EXISTS IN SYSTEM
    let userExists = false
    let existingUserId: string | null = null

    try {
      const existingUser = await adminAuth.getUserByEmail(appraiserEmail)
      userExists = true
      existingUserId = existingUser.uid
      secureLogger.info('Inviting existing user as appraiser', {
        userId,
        donationId,
        appraiserUserId: existingUserId,
      })
    } catch {
      // User doesn't exist - they'll need to register
      secureLogger.info('Inviting new user as appraiser', {
        userId,
        donationId,
        appraiserEmail,
      })
    }

    // 8. GENERATE INVITATION TOKEN
    const invitationToken = uuidv4()

    // 9. CREATE INVITATION DOCUMENT
    const now = FieldValue.serverTimestamp()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    const invitationData: Omit<AppraiserInvitation, 'id' | 'invitedAt' | 'expiresAt'> & {
      invitedAt: typeof now
      expiresAt: Date
    } = {
      donationId,
      appraiserEmail,
      appraiserName: appraiserName || null,
      inviterUserId: userId,
      inviterName,
      inviterEmail,
      personalMessage: personalMessage || '',
      invitationToken,
      status: 'pending',
      userExists,
      existingUserId,
      invitedAt: now,
      respondedAt: null,
      expiresAt,
    }

    const invitationRef = await adminDb
      .collection('appraiser_invitations')
      .add(invitationData)

    secureLogger.info('Appraiser invitation created', {
      userId,
      donationId,
      invitationId: invitationRef.id,
      appraiserEmail,
      userExists,
    })

    // 10. UPDATE INVITATION TASK TO COMPLETED
    const tasksQuery = await adminDb
      .collection('tasks')
      .where('donationId', '==', donationId)
      .where('type', '==', 'invitation')
      .where('assignedRole', '==', 'donor')
      .get()

    if (!tasksQuery.empty) {
      const taskDoc = tasksQuery.docs[0]
      await taskDoc.ref.update({
        status: 'completed',
        completedAt: now,
        'metadata.invitationSent': true,
        'metadata.appraiserEmail': appraiserEmail,
        'metadata.invitationToken': invitationToken,
        'metadata.appraisalMethod': 'invite_appraiser',
      })

      secureLogger.info('Invitation task marked as completed', {
        userId,
        donationId,
        taskId: taskDoc.id,
      })

      // 11. UNBLOCK NEXT TASK (Sign NDA)
      const nextTasksQuery = await adminDb
        .collection('tasks')
        .where('donationId', '==', donationId)
        .where('order', '==', 2)
        .get()

      if (!nextTasksQuery.empty) {
        for (const nextTaskDoc of nextTasksQuery.docs) {
          await nextTaskDoc.ref.update({
            status: 'pending',
            blockedBy: null,
          })
        }
        secureLogger.info('Next task unblocked', {
          userId,
          donationId,
          unlockedTaskCount: nextTasksQuery.size,
        })
      }
    }

    // 12. SEND EMAIL INVITATION
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const invitationUrl = userExists
      ? `${baseUrl}/invitations/${invitationToken}`
      : `${baseUrl}/auth/register?appraiserInvitation=${invitationToken}&email=${encodeURIComponent(appraiserEmail)}`

    const emailSubject = userExists
      ? `${inviterName} has invited you to appraise an equity donation`
      : `${inviterName} has invited you to join Donate Equity as an appraiser`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Appraiser Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Donate Equity</h1>
          </div>

          <div style="background: #ffffff; padding: 40px; border: 1px solid #e1e1e1; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">You've been invited to appraise an equity donation</h2>

            <p style="font-size: 16px; color: #555;">
              <strong>${inviterName}</strong> (${inviterEmail}) has invited you to serve as an appraiser for their equity donation on Donate Equity.
            </p>

            ${personalMessage ? `
              <div style="background: #f7f7f7; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; font-style: italic; color: #555;">"${personalMessage}"</p>
              </div>
            ` : ''}

            <p style="font-size: 16px; color: #555;">
              As an appraiser, you will review company financials and documentation to provide a fair market valuation of the equity being donated.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationUrl}"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; font-size: 16px;">
                ${userExists ? 'View Invitation' : 'Create Account & Accept'}
              </a>
            </div>

            <p style="font-size: 14px; color: #777;">
              This invitation will expire in 7 days. If you have any questions, please contact ${inviterEmail}.
            </p>

            ${!userExists ? `
              <div style="background: #fff8e6; border: 1px solid #ffd666; border-radius: 6px; padding: 15px; margin-top: 20px;">
                <p style="margin: 0; font-size: 14px; color: #8b6914;">
                  <strong>First time on Donate Equity?</strong> Clicking the button above will take you to create your account. Your appraiser role will be set up automatically.
                </p>
              </div>
            ` : ''}
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>This is an automated message from Donate Equity. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Donate Equity. All rights reserved.</p>
          </div>
        </body>
      </html>
    `

    try {
      await resend.emails.send({
        from: 'Donate Equity <noreply@donateequity.com>',
        to: appraiserEmail,
        subject: emailSubject,
        html: emailHtml,
      })

      secureLogger.info('Invitation email sent', {
        userId,
        donationId,
        invitationId: invitationRef.id,
        appraiserEmail,
      })
    } catch (error) {
      secureLogger.error('Failed to send invitation email', error, {
        userId,
        donationId,
        invitationId: invitationRef.id,
        appraiserEmail,
      })
      // Don't fail the request - invitation is created
    }

    // 13. AUDIT LOG
    await adminDb.collection('audit_logs').add({
      userId,
      action: 'appraiser_invitation_created',
      resourceType: 'appraiser_invitation',
      resourceId: invitationRef.id,
      metadata: {
        donationId,
        appraiserEmail,
        userExists,
      },
      timestamp: now,
      ip: request.headers.get('x-forwarded-for'),
    })

    return NextResponse.json(
      {
        success: true,
        invitationId: invitationRef.id,
        message: 'Invitation sent successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    secureLogger.error('Error creating appraiser invitation', error, {
      donationId,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
