export interface Campaign {
  id: string
  title: string
  description: string
  organizationId: string
  organizationName: string
  goal: number
  currentAmount: number
  donorCount: number
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  category: string
  tags: string[]
  images: {
    hero: string
    gallery: string[]
  }
  createdBy: string
  createdAt: Date
  updatedAt: Date
  startDate: Date
  endDate?: Date
  visibility: 'public' | 'private' | 'unlisted'
  settings: {
    minimumDonation?: number
    maximumDonation?: number
    allowRecurring: boolean
  }
}

export interface CampaignStats {
  campaignId: string
  totalRaised: number
  commitmentCount: number
  uniqueDonors: number
  averageDonation: number
  completionPercentage: number
  recentActivity: Activity[]
}

export interface Activity {
  id: string
  type: 'donation' | 'update' | 'milestone'
  description: string
  timestamp: Date
  userId?: string
  amount?: number
}