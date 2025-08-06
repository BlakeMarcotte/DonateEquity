import { renderAsync } from '@react-email/components'
import { resend, EMAIL_CONFIG, EMAIL_SUBJECTS } from './resend'
import TeamInvitationEmail from './templates/team-invitation'

interface SendTeamInvitationEmailProps {
  to: string
  inviterName: string
  organizationName: string
  subrole: string
  personalMessage?: string
  invitationUrl: string
  expiresAt: Date
}

export async function sendTeamInvitationEmail({
  to,
  inviterName,
  organizationName,
  subrole,
  personalMessage,
  invitationUrl,
  expiresAt,
}: SendTeamInvitationEmailProps) {
  try {
    // Format expiration date
    const formattedExpiresAt = expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })

    // Render the email template
    const emailHtml = await renderAsync(TeamInvitationEmail({
      inviterName,
      organizationName,
      subrole,
      personalMessage,
      invitationUrl,
      expiresAt: formattedExpiresAt,
    }))

    // Ensure emailHtml is a string
    if (typeof emailHtml !== 'string' || !emailHtml) {
      throw new Error('Failed to render email template - HTML content is not a valid string')
    }

    console.log('Rendered email HTML length:', emailHtml.length)

    // Send the email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [to],
      subject: EMAIL_SUBJECTS.teamInvitation(inviterName, organizationName),
      html: emailHtml,
      replyTo: EMAIL_CONFIG.replyTo,
      tags: [
        { name: 'category', value: 'team-invitation' },
        { name: 'organization', value: organizationName.replace(/[^a-zA-Z0-9_-]/g, '_') },
      ],
    })

    if (result.error) {
      console.error('Failed to send team invitation email:', result.error)
      throw new Error(`Email sending failed: ${result.error.message}`)
    }

    console.log('Team invitation email sent successfully:', {
      emailId: result.data?.id,
      to,
      inviterName,
      organizationName,
    })

    return {
      success: true,
      emailId: result.data?.id,
    }
  } catch (error) {
    console.error('Error sending team invitation email:', error)
    throw error
  }
}