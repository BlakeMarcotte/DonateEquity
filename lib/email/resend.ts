import { Resend } from 'resend'

// Check if we have a Resend API key
const hasResendKey = !!process.env.RESEND_API_KEY

if (!hasResendKey) {
  console.warn('Warning: RESEND_API_KEY is not set in environment variables. Email sending will be disabled.')
}

// Create Resend instance only if we have an API key
// In development without a key, we'll mock the functionality
export const resend = hasResendKey 
  ? new Resend(process.env.RESEND_API_KEY)
  : {
      // Mock Resend object for development without API key
      emails: {
        send: async (data: any) => {
          console.log('Mock email send:', data)
          return { 
            data: { id: 'mock-email-id' }, 
            error: null 
          }
        }
      }
    } as any

// Email configuration
export const EMAIL_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL || 'Donate Equity <noreply@bpnsolutions.com>', // Using verified domain
  replyTo: process.env.RESEND_REPLY_TO || 'support@bpnsolutions.com', // Using verified domain
}

// Email subjects
export const EMAIL_SUBJECTS = {
  campaignInvitation: (inviterName: string) => `${inviterName} invited you to support their campaign`,
  campaignInvitationAccepted: (donorName: string) => `${donorName} accepted your campaign invitation`,
  campaignInvitationDeclined: (donorName: string) => `${donorName} declined your campaign invitation`,
  donationReceived: (donorName: string) => `New donation from ${donorName}`,
  teamInvitation: (inviterName: string, organizationName: string) => `${inviterName} invited you to join ${organizationName}`,
}