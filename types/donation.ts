export interface Donation {
  id: string
  campaignId: string
  campaignTitle?: string
  donorId: string
  donorName: string
  donorEmail: string
  nonprofitAdminId: string
  amount: number
  donationType: 'equity' | 'cash'
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  message?: string
  isAnonymous: boolean
  
  // Equity-specific fields
  commitmentDetails?: EquityCommitmentDetails
  requiresAppraisal: boolean
  appraiserId?: string | null
  appraiserEmail?: string | null
  appraisalStatus: 'not_required' | 'pending' | 'in_progress' | 'completed' | 'appraiser_assigned'
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  completedAt?: Date | null
  
  // Organization context
  organizationId: string
  organizationName: string
}

export interface EquityCommitmentDetails {
  donorOrganizationId?: string | null
  donorOrganizationName: string
  estimatedValue: number
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

// Form data types for donation creation
export interface DonationFormData {
  campaignId: string
  amount: string
  message?: string
  isAnonymous: boolean
}

export interface CreateDonationRequest {
  campaignId: string
  amount: number
  message?: string
  isAnonymous?: boolean
}

export interface CreateDonationResponse {
  success: boolean
  donationId?: string
  message: string
  donation?: {
    id: string
    amount: number
    donationType: 'equity'
    status: string
    requiresAppraisal: boolean
  }
  error?: string
}