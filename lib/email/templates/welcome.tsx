import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  userFirstName: string
  userRole: string
}

export const WelcomeEmail = ({
  userFirstName,
  userRole,
}: WelcomeEmailProps) => {
  const previewText = `Welcome to Donate Equity, ${userFirstName}!`

  const getRoleSpecificContent = () => {
    switch (userRole) {
      case 'donor':
        return {
          heading: 'Ready to Make a Meaningful Impact?',
          description: 'As a donor on Donate Equity, you can pledge equity donations to causes you care about and maximize your philanthropic impact.',
          features: [
            'Browse campaigns from verified nonprofits',
            'Pre-commit equity donations for future liquidity events',
            'Track your donation impact and tax benefits',
            'Connect with nonprofit administrators',
          ],
          ctaText: 'Browse Campaigns',
          ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://donateequity.com'}/dashboard`,
        }
      case 'nonprofit_admin':
        return {
          heading: 'Start Raising Funds Through Equity Donations',
          description: 'As a nonprofit administrator, you can create campaigns and connect with donors ready to make equity commitments.',
          features: [
            'Create compelling fundraising campaigns',
            'Invite potential donors to support your cause',
            'Manage donation workflows and documentation',
            'Track campaign progress and donor engagement',
          ],
          ctaText: 'Create Your First Campaign',
          ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://donateequity.com'}/campaigns`,
        }
      case 'appraiser':
        return {
          heading: 'Welcome to Our Professional Network',
          description: 'As an appraiser, you play a crucial role in facilitating equity donations with accurate valuations.',
          features: [
            'Receive appraisal requests from campaigns',
            'Submit professional valuations',
            'Collaborate with donors and nonprofits',
            'Manage your appraisal workflow',
          ],
          ctaText: 'View Dashboard',
          ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://donateequity.com'}/dashboard`,
        }
      default:
        return {
          heading: 'Welcome to Donate Equity',
          description: 'Start making a difference through equity donations.',
          features: [
            'Connect with nonprofits',
            'Make meaningful donations',
            'Track your impact',
            'Maximize tax benefits',
          ],
          ctaText: 'Get Started',
          ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://donateequity.com'}/dashboard`,
        }
    }
  }

  const roleContent = getRoleSpecificContent()

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

          {/* Welcome Message */}
          <Heading style={heading}>Welcome, {userFirstName}!</Heading>
          
          <Text style={paragraph}>
            Thank you for joining Donate Equity. We're excited to have you as part of our community working to make equity donations more accessible and impactful.
          </Text>

          {/* Role-specific Content */}
          <Section style={roleSection}>
            <Heading style={subheading}>{roleContent.heading}</Heading>
            <Text style={paragraph}>{roleContent.description}</Text>
            
            <Text style={featuresHeading}>Here's what you can do:</Text>
            <ul style={featuresList}>
              {roleContent.features.map((feature, index) => (
                <li key={index} style={featureItem}>
                  <Text style={featureText}>{feature}</Text>
                </li>
              ))}
            </ul>
          </Section>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Button style={button} href={roleContent.ctaUrl}>
              {roleContent.ctaText}
            </Button>
          </Section>

          {/* Getting Started Tips */}
          <Section style={tipsSection}>
            <Heading style={tipsHeading}>Getting Started Tips</Heading>
            <Text style={paragraph}>
              • Complete your profile to build trust with other users<br />
              • Explore our resources section for helpful guides<br />
              • Join our community to connect with others<br />
              • Contact support if you need any assistance
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Text style={footer}>
            Need help? Our support team is here for you at{' '}
            <Link href="mailto:support@donateequity.com" style={link}>
              support@donateequity.com
            </Link>
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

const subheading = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 16px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#374151',
  padding: '0 20px',
  margin: '0 0 16px',
}

const roleSection = {
  padding: '24px 20px',
  margin: '0',
}

const featuresHeading = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#111827',
  margin: '16px 0 8px 20px',
}

const featuresList = {
  margin: '0 0 0 20px',
  padding: '0 20px',
}

const featureItem = {
  marginBottom: '8px',
}

const featureText = {
  fontSize: '15px',
  lineHeight: '1.5',
  color: '#4b5563',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const tipsSection = {
  backgroundColor: '#f3f4f6',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 20px',
}

const tipsHeading = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#111827',
  margin: '0 0 12px',
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

export default WelcomeEmail