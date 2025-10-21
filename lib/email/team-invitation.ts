import { renderAsync } from '@react-email/components'
import { resend, EMAIL_CONFIG, EMAIL_SUBJECTS } from './resend'
import TeamInvitationEmail from './templates/team-invitation'
import { secureLogger } from '@/lib/logging/secure-logger'

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

    secureLogger.info('Rendered email HTML length', { length: emailHtml.length })

    // Send the email
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [to],
      subject: EMAIL_SUBJECTS.teamInvitation(inviterName, organizationName),
      html: emailHtml,
      replyTo: EMAIL_CONFIG.replyTo,
    })

    if (result.error) {
      secureLogger.error('Failed to send team invitation email', result.error, { to, organizationName })
      throw new Error(`Email sending failed: ${(result.error as Error)?.message || 'Unknown error'}`)
    }

    secureLogger.info('Team invitation email sent successfully', {
      emailId: result.data?.id,
      to,
      organizationName,
    })

    return {
      success: true,
      emailId: result.data?.id,
    }
  } catch (error) {
    secureLogger.error('Error sending team invitation email', error, { to, organizationName })
    throw error
  }
}