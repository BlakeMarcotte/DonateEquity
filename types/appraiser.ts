export interface AppraiserProfile {
  uid: string
  email: string
  displayName: string
  phoneNumber?: string
  // Experience and credentials
  yearsOfExperience?: number
  specializations?: string[] // e.g., 'Private Company Valuations', 'Equity Appraisals', etc.
  certifications?: AppraiserCertification[]
  licenseNumber?: string
  firmName?: string
  firmWebsite?: string
  firmAddress?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  // Appraiser packet - documents they require
  requiredDocuments?: AppraiserDocumentRequirement[]
  standardTurnaroundTime?: number // in days
  // Bio and professional info
  bio?: string
  linkedInUrl?: string
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface AppraiserCertification {
  id: string
  name: string // e.g., 'ASA', 'CFA', 'CBV'
  issuingOrganization: string
  issueDate: string
  expiryDate?: string
  certificateUrl?: string // URL to uploaded certificate
}

export interface AppraiserDocumentRequirement {
  id: string
  documentName: string
  description: string
  required: boolean
  order: number
}

export const COMMON_CERTIFICATIONS = [
  'ASA (Accredited Senior Appraiser)',
  'AVA (Accredited Valuation Analyst)',
  'CVA (Certified Valuation Analyst)',
  'CFA (Chartered Financial Analyst)',
  'CPA (Certified Public Accountant)',
  'CBV (Chartered Business Valuator)',
  'ABV (Accredited in Business Valuation)',
  'Other'
]

export const COMMON_SPECIALIZATIONS = [
  'Private Company Valuations',
  'Equity Appraisals',
  'Stock Option Valuations',
  'Startup Valuations',
  'Pre-IPO Valuations',
  'Fair Market Value Assessments',
  'Gift and Estate Tax Valuations',
  'Financial Reporting Valuations (409A)',
  'M&A Advisory',
  'Other'
]

export const COMMON_DOCUMENT_REQUIREMENTS = [
  {
    name: 'Cap Table',
    description: 'Current capitalization table showing all equity holders'
  },
  {
    name: 'Financial Statements',
    description: 'Last 3 years of financial statements (P&L, Balance Sheet, Cash Flow)'
  },
  {
    name: 'Articles of Incorporation',
    description: 'Company formation documents'
  },
  {
    name: 'Stock Purchase Agreements',
    description: 'All historical stock purchase agreements'
  },
  {
    name: 'Board Resolutions',
    description: 'Recent board resolutions related to equity'
  },
  {
    name: 'Term Sheets',
    description: 'Investment term sheets from funding rounds'
  },
  {
    name: 'Business Plan',
    description: 'Current business plan and projections'
  },
  {
    name: 'Operating Agreement',
    description: 'LLC operating agreement or corporate bylaws'
  }
]
