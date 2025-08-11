import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { Resend } from 'resend'
import { v4 as uuidv4 } from 'uuid'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Only donors can invite appraisers
    if (decodedToken.role !== 'donor') {
      return NextResponse.json({ error: 'Only donors can invite appraisers' }, { status: 403 })
    }

    const {
      donationId,
      appraiserEmail,
      appraiserName,
      personalMessage
    } = await request.json()

    // Validate required fields
    if (!donationId || !appraiserEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: donationId, appraiserEmail' },
        { status: 400 }
      )
    }

    // Validate participant/donation exists and belongs to the user
    let participantData = null
    let donationData = null
    
    // First try to find as participantId (new system)
    if (donationId.includes('_')) { // participantId format: campaignId_userId
      const participantRef = adminDb.collection('campaign_participants').doc(donationId)
      const participantDoc = await participantRef.get()
      
      if (participantDoc.exists) {
        participantData = participantDoc.data()
        if (participantData?.userId !== decodedToken.uid) {
          return NextResponse.json({ error: 'You can only invite appraisers for your own participation' }, { status: 403 })
        }
      }
    }
    
    // If not found as participant, try as donation (legacy system)
    if (!participantData) {
      const donationRef = adminDb.collection('donations').doc(donationId)
      const donationDoc = await donationRef.get()
      
      if (!donationDoc.exists) {
        return NextResponse.json({ error: 'Donation or participation record not found' }, { status: 404 })
      }

      donationData = donationDoc.data()
      if (donationData?.donorId !== decodedToken.uid) {
        return NextResponse.json({ error: 'You can only invite appraisers for your own donations' }, { status: 403 })
      }
    }

    // Get user profile for inviter information
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userProfile = userDoc.data()

    // Check if the appraiser email already has an account
    let existingUser = null
    try {
      existingUser = await adminAuth.getUserByEmail(appraiserEmail)
    } catch {
      // User doesn't exist, which is fine
      console.log('User not found (expected for new users):', appraiserEmail)
    }

    // Generate unique invitation token
    const invitationToken = uuidv4()

    // Create invitation record
    const invitationData = {
      donationId,
      appraiserEmail,
      appraiserName: appraiserName || null,
      inviterUserId: decodedToken.uid,
      inviterName: userProfile?.displayName || 'Unknown User',
      inviterEmail: userProfile?.email || '',
      personalMessage: personalMessage || '',
      invitationToken,
      status: 'pending',
      userExists: !!existingUser,
      existingUserId: existingUser?.uid || null,
      invitedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      respondedAt: null
    }

    const invitationRef = await adminDb.collection('appraiser_invitations').add(invitationData)

    // Update the invitation task to mark it as completed
    let tasksQuery
    
    // First try to find tasks by participantId (new system)
    if (participantData) {
      tasksQuery = adminDb.collection('tasks')
        .where('participantId', '==', donationId)
        .where('type', '==', 'invitation')
        .where('assignedRole', '==', 'donor')
    } else {
      // Legacy system - find by donationId
      tasksQuery = adminDb.collection('tasks')
        .where('donationId', '==', donationId)
        .where('type', '==', 'invitation')
        .where('assignedRole', '==', 'donor')
    }
    
    const tasksSnapshot = await tasksQuery.get()
    
    if (!tasksSnapshot.empty) {
      const firstTask = tasksSnapshot.docs[0]
      await firstTask.ref.update({
        'metadata.invitationSent': true,
        'metadata.appraiserEmail': appraiserEmail,
        'metadata.appraiserInvited': appraiserName || appraiserEmail,
        'metadata.invitationToken': invitationToken,
        status: 'completed',
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })

      // Find and unblock the next task (Upload Company Information)
      let nextTaskQuery
      if (participantData) {
        nextTaskQuery = adminDb.collection('tasks')
          .where('participantId', '==', donationId)
          .where('dependencies', 'array-contains', firstTask.id)
      } else {
        nextTaskQuery = adminDb.collection('tasks')
          .where('donationId', '==', donationId)
          .where('dependencies', 'array-contains', firstTask.id)
      }
      
      const nextTaskSnapshot = await nextTaskQuery.get()
      
      if (!nextTaskSnapshot.empty) {
        const nextTask = nextTaskSnapshot.docs[0]
        await nextTask.ref.update({
          status: 'pending',
          updatedAt: FieldValue.serverTimestamp()
        })
      }
    }

    // Prepare email content based on whether user exists
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const isExistingUser = !!existingUser
    
    let emailSubject: string
    let emailHtml: string
    let ctaUrl: string

    if (isExistingUser) {
      // Existing user - sign in and view donation
      emailSubject = `${userProfile?.displayName || 'A donor'} has invited you to appraise an equity donation`
      ctaUrl = `${baseUrl}/auth/login?redirect=/appraiser/invitations/${invitationToken}`
      
      emailHtml = `
        <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #2563eb; font-size: 28px; font-weight: 700; margin: 0;">Donate Equity</h1>
          </div>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 32px;">
            <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 24px 0;">
              You've been invited to appraise an equity donation
            </h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              <strong>${userProfile?.displayName || 'A donor'}</strong> has invited you to appraise their equity donation on the Donate Equity platform.
            </p>
            
            ${personalMessage ? `
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="color: #374151; font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">Personal message:</p>
                <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0; font-style: italic;">"${personalMessage}"</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${ctaUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Sign In & View Invitation
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              This invitation will expire in 7 days. If you have any questions, please contact support.
            </p>
          </div>
          
          <div style="text-align: center; color: #9ca3af; font-size: 12px;">
            <p>© 2024 Donate Equity. All rights reserved.</p>
          </div>
        </div>
      `
    } else {
      // New user - sign up and view donation
      emailSubject = `${userProfile?.displayName || 'A donor'} has invited you to join Donate Equity as an appraiser`
      ctaUrl = `${baseUrl}/appraiser/invitations/${invitationToken}`
      
      emailHtml = `
        <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #2563eb; font-size: 28px; font-weight: 700; margin: 0;">Donate Equity</h1>
          </div>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; margin-bottom: 32px;">
            <h2 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0 0 24px 0;">
              You've been invited to join Donate Equity
            </h2>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              <strong>${userProfile?.displayName || 'A donor'}</strong> has invited you to join Donate Equity as an appraiser to assess their equity donation.
            </p>
            
            ${personalMessage ? `
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
                <p style="color: #374151; font-size: 14px; font-weight: 500; margin: 0 0 8px 0;">Personal message:</p>
                <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0; font-style: italic;">"${personalMessage}"</p>
              </div>
            ` : ''}
            
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #166534; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">About Donate Equity</h3>
              <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 0;">
                Donate Equity is a platform that enables donors to pre-commit equity donations to nonprofits upon liquidity events. As an appraiser, you'll help provide professional valuations for these important charitable contributions.
              </p>
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${ctaUrl}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Create Account & Get Started
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              This invitation will expire in 7 days. If you have any questions, please contact support.
            </p>
          </div>
          
          <div style="text-align: center; color: #9ca3af; font-size: 12px;">
            <p>© 2024 Donate Equity. All rights reserved.</p>
          </div>
        </div>
      `
    }

    // Send the email
    let emailSent = false
    let emailError = null
    try {
      console.log('Attempting to send email to:', appraiserEmail)
      console.log('Email subject:', emailSubject)
      console.log('Resend API key present:', !!process.env.RESEND_API_KEY)
      
      const emailResult = await resend.emails.send({
        from: 'Donate Equity <noreply@bpnsolutions.com>', // Using your verified domain
        to: [appraiserEmail],
        subject: emailSubject,
        html: emailHtml
      })
      
      console.log('Email sent successfully:', emailResult)
      emailSent = true
    } catch (error) {
      console.error('Error sending invitation email:', error)
      emailError = error instanceof Error ? error.message : 'Unknown email error'
      emailSent = false
    }

    return NextResponse.json({
      success: true,
      invitationId: invitationRef.id,
      message: emailSent 
        ? (isExistingUser 
          ? 'Invitation sent successfully! The appraiser will receive an email to sign in and view the donation.'
          : 'Invitation sent successfully! The appraiser will receive an email to create an account and get started.')
        : 'Invitation created but email failed to send. Please contact the appraiser directly.',
      userExists: isExistingUser,
      emailSent,
      emailError,
      invitation: {
        id: invitationRef.id,
        appraiserEmail,
        appraiserName: appraiserName || null,
        status: 'pending',
        expiresAt: invitationData.expiresAt
      }
    })

  } catch (error) {
    console.error('Error sending appraiser invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}