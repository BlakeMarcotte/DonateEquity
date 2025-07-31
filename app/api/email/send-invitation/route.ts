import { NextRequest, NextResponse } from 'next/server'
import { resend, EMAIL_CONFIG, EMAIL_SUBJECTS } from '@/lib/email/resend'
import { CampaignInvitationEmail } from '@/lib/email/templates/campaign-invitation'
import { generateInvitationUrl } from '@/lib/firebase/utils'
import { adminAuth } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    // Verify user is a nonprofit admin
    if (decodedToken.role !== 'nonprofit_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get request data
    const {
      inviterName,
      invitedEmail,
      campaignTitle,
      campaignDescription,
      campaignGoal,
      campaignRaised,
      message,
      invitationToken,
      isExistingUser,
    } = await request.json()

    // Validate required fields
    if (!inviterName || !invitedEmail || !campaignTitle || !invitationToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitationUrl = generateInvitationUrl(invitationToken, baseUrl)

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: invitedEmail,
      reply_to: EMAIL_CONFIG.replyTo,
      subject: EMAIL_SUBJECTS.campaignInvitation(inviterName),
      react: CampaignInvitationEmail({
        inviterName,
        invitedEmail,
        campaignTitle,
        campaignDescription,
        campaignGoal,
        campaignRaised,
        message,
        invitationUrl,
        isExistingUser,
      }),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      emailId: data?.id,
      message: 'Invitation email sent successfully'
    })
  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}