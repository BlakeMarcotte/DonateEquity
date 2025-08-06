export interface CampaignParticipant {
  id: string
  campaignId: string
  userId: string
  userRole: 'donor' | 'nonprofit_admin' | 'appraiser'
  status: 'interested' | 'committed' | 'donated' | 'withdrawn'
  joinedAt: Date
  joinedVia: 'invitation' | 'browse' | 'direct' | 'referral'
  invitationId?: string
  inviterUserId?: string
  metadata: {
    invitedEmail?: string
    inviterName?: string
    referralSource?: string
    notes?: string
  }
  createdAt: Date
  updatedAt: Date
}

export type ParticipantStatus = CampaignParticipant['status']
export type JoinMethod = CampaignParticipant['joinedVia']