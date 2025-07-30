export interface Document {
  id: string
  name: string
  type: DocumentType
  category: DocumentCategory
  relatedId: string // Could be donationId, campaignId, etc.
  relatedType: 'donation' | 'campaign' | 'organization' | 'user'
  storageUrl: string
  thumbnailUrl?: string
  size: number // in bytes
  mimeType: string
  uploadedBy: string
  uploadedAt: Date
  lastModified: Date
  status: 'draft' | 'pending_signature' | 'signed' | 'completed' | 'archived'
  signatureStatus?: SignatureStatus
  metadata: {
    pageCount?: number
    isEncrypted: boolean
    checksum: string
    expiresAt?: Date
    tags?: string[]
  }
  permissions: {
    viewableBy: string[] // User IDs
    editableBy: string[]
    signableBy: string[]
  }
}

export type DocumentType = 
  | 'appraisal_report'
  | 'equity_certificate'
  | 'donation_agreement'
  | 'tax_receipt'
  | 'legal_agreement'
  | 'financial_statement'
  | 'valuation_report'
  | 'transfer_document'
  | 'other'

export type DocumentCategory = 
  | 'legal'
  | 'financial'
  | 'appraisal'
  | 'tax'
  | 'administrative'

export interface SignatureStatus {
  required: boolean
  signers: Signer[]
  envelopeId?: string // DocuSign envelope ID
  completedAt?: Date
  expiresAt?: Date
}

export interface Signer {
  id: string
  name: string
  email: string
  role: 'donor' | 'nonprofit_admin' | 'appraiser' | 'witness'
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined'
  signedAt?: Date
  ipAddress?: string
  signatureImage?: string
}