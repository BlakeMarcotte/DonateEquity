export interface Organization {
  id: string
  name: string
  type: 'nonprofit' | 'appraiser_firm'
  status: 'pending' | 'verified' | 'suspended'
  taxId: string
  description: string
  website?: string
  logo?: string
  contactInfo: {
    email: string
    phone: string
    address: Address
  }
  verificationDocuments: VerificationDocument[]
  settings: OrganizationSettings
  inviteCodes: {
    admin?: string           // For nonprofit admins with admin subrole
    member?: string          // For nonprofit admins with member subrole
    appraiser?: string       // For appraiser role
    donor?: string           // For donor role
  }
  inviteCodesGeneratedAt: {
    admin?: Date
    member?: Date
    appraiser?: Date
    donor?: Date
  }
  createdAt: Date
  updatedAt: Date
  verifiedAt?: Date
  metadata: {
    ein?: string // For nonprofits
    licenseNumber?: string // For appraisers
    certifications?: string[]
  }
}

export interface Address {
  street1: string
  street2?: string
  city: string
  state: string
  zipCode: string
  country: string
}

export interface VerificationDocument {
  id: string
  type: '501c3' | 'license' | 'insurance' | 'other'
  name: string
  url: string
  uploadedAt: Date
  uploadedBy: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt?: Date
  reviewedBy?: string
  reviewNotes?: string
}

export interface OrganizationSettings {
  autoApproveAmount: number
  requiresApprovalAbove: number
  notificationPreferences: {
    newDonations: boolean
    taskUpdates: boolean
    weeklyReports: boolean
    monthlyStatements: boolean
  }
  paymentSettings?: {
    bankAccount?: {
      accountNumber: string
      routingNumber: string
      accountType: 'checking' | 'savings'
    }
    preferredPaymentMethod: 'ach' | 'wire' | 'check'
  }
}