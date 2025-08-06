// Campaign Invitation Types

export interface CampaignInvitation {
  id: string
  campaignId: string
  campaignTitle?: string
  invitedEmail: string
  inviterUserId: string
  inviterName: string
  organizationId: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  message?: string
  invitedAt: Date
  respondedAt?: Date
  expiresAt: Date
  // Token for unauthenticated users to accept invitation
  invitationToken: string
  // Whether the invited user already exists on the platform
  userExists: boolean
  // If user exists, their user ID
  invitedUserId?: string
}

export interface CampaignInvitationCreate {
  campaignId: string
  invitedEmail: string
  message?: string
}

export interface Notification {
  id: string
  userId: string
  type: 'campaign_invitation' | 'donation_received' | 'campaign_update' | 'system'
  title: string
  message: string
  data?: {
    campaignId?: string
    invitationId?: string
    donationId?: string
    [key: string]: any
  }
  read: boolean
  createdAt: Date
  expiresAt?: Date
}

export interface NotificationCreate {
  userId: string
  type: Notification['type']
  title: string
  message: string
  data?: Notification['data']
  expiresAt?: Date
}