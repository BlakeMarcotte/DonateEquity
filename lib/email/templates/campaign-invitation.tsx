import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface CampaignInvitationEmailProps {
  inviterName: string
  invitedEmail: string
  campaignTitle: string
  campaignDescription: string
  campaignGoal: number
  campaignRaised: number
  message?: string
  invitationUrl: string
  isExistingUser: boolean
}

export const CampaignInvitationEmail = ({
  inviterName,
  invitedEmail,
  campaignTitle,
  campaignDescription,
  campaignGoal,
  campaignRaised,
  message,
  invitationUrl,
  isExistingUser,
}: CampaignInvitationEmailProps) => {
  const previewText = `${inviterName} invited you to support "${campaignTitle}"`
  const progressPercentage = Math.min((campaignRaised / campaignGoal) * 100, 100)

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoContainer}>
            <Heading style={logo}>💙 Donate Equity</Heading>
          </Section>

          {/* Main Content */}
          <Heading style={heading}>You're Invited to Make a Difference!</Heading>
          
          <Text style={paragraph}>
            Hi{invitedEmail ? ` ${invitedEmail.split('@')[0]}` : ''},
          </Text>
          
          <Text style={paragraph}>
            <strong>{inviterName}</strong> has invited you to support their fundraising campaign on Donate Equity.
          </Text>

          {/* Campaign Card */}
          <Section style={campaignCard}>
            <Heading style={campaignTitle}>{campaignTitle}</Heading>
            <Text style={campaignDescriptionStyle}>{campaignDescription}</Text>
            
            {/* Progress Bar */}
            <Section style={progressContainer}>
              <Text style={progressText}>
                Campaign Progress: {progressPercentage.toFixed(0)}%
              </Text>
              <div style={progressBar}>
                <div 
                  style={{
                    ...progressFill,
                    width: `${progressPercentage}%`
                  }}
                />
              </div>
              <Text style={progressStats}>
                ${campaignRaised.toLocaleString()} raised of ${campaignGoal.toLocaleString()} goal
              </Text>
            </Section>
          </Section>

          {/* Personal Message */}
          {message && (
            <Section style={messageBox}>
              <Text style={messageLabel}>Personal message from {inviterName}:</Text>
              <Text style={messageText}>{message}</Text>
            </Section>
          )}

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Button style={button} href={invitationUrl}>
              {isExistingUser ? 'View Invitation' : 'Accept Invitation'}
            </Button>
          </Section>

          {/* Additional Info */}
          <Text style={paragraph}>
            {isExistingUser 
              ? `You already have an account with us. Click the button above to view this invitation in your dashboard.`
              : `New to Donate Equity? Accepting this invitation will guide you through creating your account.`}
          </Text>

          <Hr style={hr} />

          {/* Footer */}
          <Text style={footer}>
            This invitation will expire in 7 days. If you have any questions, please contact our support team.
          </Text>
          
          <Text style={footer}>
            <Link href="https://donateequity.com" style={link}>
              Donate Equity
            </Link>{' '}
            | Making equity donations simple and impactful
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  maxWidth: '600px',
}

const logoContainer = {
  padding: '32px 20px',
  textAlign: 'center' as const,
}

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#2563eb',
  margin: '0',
}

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#111827',
  textAlign: 'center' as const,
  padding: '0 20px',
  margin: '0 0 32px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#374151',
  padding: '0 20px',
  margin: '0 0 16px',
}

const campaignCard = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 20px',
}

const campaignTitle = {
  fontSize: '20px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 8px',
}

const campaignDescriptionStyle = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#4b5563',
  margin: '0 0 16px',
}

const progressContainer = {
  marginTop: '16px',
}

const progressText = {
  fontSize: '14px',
  color: '#374151',
  margin: '0 0 8px',
}

const progressBar = {
  backgroundColor: '#e5e7eb',
  borderRadius: '9999px',
  height: '12px',
  overflow: 'hidden',
  marginBottom: '8px',
}

const progressFill = {
  backgroundColor: '#2563eb',
  height: '100%',
  transition: 'width 0.3s ease',
}

const progressStats = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '0',
}

const messageBox = {
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 20px',
}

const messageLabel = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1e40af',
  margin: '0 0 8px',
}

const messageText = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#1e3a8a',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#16a34a',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const hr = {
  borderColor: '#e5e7eb',
  margin: '32px 20px',
}

const footer = {
  fontSize: '14px',
  lineHeight: '1.5',
  color: '#6b7280',
  textAlign: 'center' as const,
  padding: '0 20px',
  margin: '0 0 8px',
}

const link = {
  color: '#2563eb',
  textDecoration: 'underline',
}

export default CampaignInvitationEmail