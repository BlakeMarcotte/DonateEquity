import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface TeamInvitationEmailProps {
  inviterName: string
  organizationName: string
  subrole: string
  personalMessage?: string
  invitationUrl: string
  expiresAt: string
}

export default function TeamInvitationEmail({
  inviterName,
  organizationName,
  subrole,
  personalMessage,
  invitationUrl,
  expiresAt,
}: TeamInvitationEmailProps) {
  const subroleDisplayNames = {
    admin: 'Administrator',
    member: 'Team Member',
    marketer: 'Marketing Team Member',
    signatory: 'Signatory',
  }

  const subroleDisplay = subroleDisplayNames[subrole as keyof typeof subroleDisplayNames] || subrole

  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to join {organizationName} on Donate Equity
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Heading style={logo}>Donate Equity</Heading>
          </Section>
          
          <Section style={content}>
            <Heading style={h1}>You're invited to join {organizationName}</Heading>
            
            <Text style={text}>
              <strong>{inviterName}</strong> has invited you to join <strong>{organizationName}</strong> as a <strong>{subroleDisplay}</strong> on Donate Equity.
            </Text>

            {personalMessage && (
              <Section style={messageSection}>
                <Text style={messageLabel}>Personal message:</Text>
                <Text style={personalMessageText}>"{personalMessage}"</Text>
              </Section>
            )}

            <Section style={buttonSection}>
              <Button style={button} href={invitationUrl}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={smallText}>
              This invitation will expire on {expiresAt}. If you don't want to join this organization, you can simply ignore this email.
            </Text>

            <Text style={smallText}>
              If you're having trouble with the button above, copy and paste this URL into your web browser:
            </Text>
            <Text style={linkText}>{invitationUrl}</Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Donate Equity - Enabling pre-committed equity donations to nonprofits
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const logoSection = {
  padding: '32px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #e6ebf1',
}

const logo = {
  color: '#2563eb',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0',
}

const content = {
  padding: '32px',
}

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: '700',
  lineHeight: '1.25',
  margin: '0 0 20px',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '0 0 16px',
}

const messageSection = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const messageLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '500',
  margin: '0 0 8px',
}

const personalMessageText = {
  color: '#1f2937',
  fontSize: '16px',
  fontStyle: 'italic',
  lineHeight: '1.5',
  margin: '0',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
}

const smallText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 12px',
}

const linkText = {
  color: '#2563eb',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px',
  wordBreak: 'break-all' as const,
}

const footer = {
  borderTop: '1px solid #e6ebf1',
  padding: '32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
}