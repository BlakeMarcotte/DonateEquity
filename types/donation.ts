export interface Donation {
  id: string
  campaignId: string
  campaignTitle: string
  donorId: string
  donorName: string
  donorEmail: string
  amount: number
  status: 'pending' | 'committed' | 'processing' | 'completed' | 'cancelled'
  type: 'equity' | 'cash'
  commitmentDetails: EquityCommitment | CashDonation
  nonprofitAdminId?: string
  appraiserId?: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  notes?: string
  metadata: {
    ipAddress?: string
    userAgent?: string
    source?: 'web' | 'mobile' | 'api'
  }
}

export interface EquityCommitment {
  type: 'equity'
  companyName: string
  equityType: 'stock' | 'options' | 'rsus' | 'warrants' | 'other'
  quantity: number
  estimatedValue: number
  vestingSchedule?: VestingSchedule
  liquidityEvent: {
    type: 'ipo' | 'acquisition' | 'secondary_sale' | 'other'
    expectedDate?: Date
    conditions: string[]
  }
  restrictions?: string[]
}

export interface VestingSchedule {
  startDate: Date
  endDate: Date
  cliffDate?: Date
  vestedQuantity: number
  unvestedQuantity: number
  vestingFrequency: 'monthly' | 'quarterly' | 'annually'
}

export interface CashDonation {
  type: 'cash'
  amount: number
  currency: string
  paymentMethod: 'credit_card' | 'bank_transfer' | 'check' | 'other'
  transactionId?: string
  processingFee?: number
}