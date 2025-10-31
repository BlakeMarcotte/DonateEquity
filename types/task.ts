export interface Task {
  id: string
  participantId?: string // Optional for backward compatibility with participant-based tasks
  donationId?: string // For donation-based tasks (donors)
  campaignId: string
  donorId: string
  title: string
  description: string
  type: TaskType
  assignedTo: string
  assignedRole: 'donor' | 'nonprofit_admin' | 'appraiser'
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dependencies: string[] // Task IDs that must be completed first
  order?: number // Explicit ordering for consistent display
  workflowType?: 'donation' | 'pledge' // Distinguish between donation and Pledge 1% workflows
  dueDate?: Date
  completedAt?: Date
  completedBy?: string
  createdAt: Date
  updatedAt: Date
  metadata: {
    documentIds?: string[]
    signatureRequired?: boolean
    approvalRequired?: boolean
    automatedReminders?: boolean
    // DocuSign specific fields
    documentPath?: string
    documentName?: string
    docuSignEnvelopeId?: string | null
    envelopeId?: string | null
    signedAt?: string | null
    signingUrl?: string | null
    docuSignStatus?: string | null
    docuSignCompletedAt?: string | null
    signedDocumentUrl?: string | null
    // Document upload specific fields
    uploadFolders?: string[]
    uploadRole?: 'donor' | 'nonprofit' | 'appraiser' // Role-based upload for new system
    // Document review specific fields
    reviewRoles?: Array<'donor' | 'nonprofit' | 'appraiser'> // Roles whose files to review
    reviewTaskIds?: string[] // Specific task IDs whose uploaded files to review
    // Invitation specific fields
    invitationSent?: boolean
    appraiserEmail?: string | null
    appraiserInvited?: string | null
    invitationToken?: string | null
    // AI Appraisal specific fields
    appraisalMethod?: 'invite_appraiser' | 'ai_appraisal' | null
    valuationUserId?: string | null
    valuationId?: string | null
    valuationStatus?: 'pending' | 'in_progress' | 'completed' | 'failed' | null
    valuationAmount?: number | null
    valuationReportUrl?: string | null
    valuationCompletedAt?: string | null
  }
  comments: TaskComment[]
  completionData?: TaskCompletionData
}

export type TaskType =
  | 'quiz'
  | 'review_results'
  | 'download_templates'
  | 'upload_completed_files'
  | 'commitment_decision'
  | 'invitation'
  | 'document_upload'
  | 'document_review'
  | 'document_signing'
  | 'docusign_signature'
  | 'signature_required'
  | 'appraisal_request'
  | 'appraisal_submission'
  | 'appraisal_review'
  | 'ai_appraisal_request'
  | 'ai_appraisal_submission'
  | 'ai_appraisal_review'
  | 'equity_transfer'
  | 'tax_documentation'
  | 'legal_review'
  | 'payment_processing'
  | 'other'

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  userName: string
  userRole: string
  content: string
  createdAt: Date
  attachments?: {
    name: string
    url: string
    type: string
  }[]
}

export interface TaskTemplate {
  id: string
  name: string
  description: string
  type: TaskType
  defaultAssignee: 'donor' | 'nonprofit_admin' | 'appraiser'
  estimatedDuration: number // in days
  requiredDocuments: string[]
  instructions: string
}

export interface TaskOption {
  id: string
  label: string
  description: string
}

// Task completion data types
export interface CommitmentData {
  type: 'dollar' | 'percentage'
  amount: number
  message?: string
  createdAt: string
}

export interface DocumentUploadData {
  uploadedFiles?: string[]
  folderPath?: string
  notes?: string
}

export interface AppraisalData {
  valuationAmount?: number
  appraisalMethod?: string
  supportingDocuments?: string[]
  notes?: string
}

export interface AIAppraisalData {
  companyInfo?: {
    legalName?: string
    sicCode?: string
    revenueModel?: string
    numberOfEmployees?: string
    inceptionDate?: string
    exitTimeline?: string
    lawFirm?: string
    companyOverview?: string
    competitors?: Array<{ name: string; website?: string }>
    serviceCountries?: string[]
    accountingSoftware?: string
  }
  capTableInfo?: {
    hasLiquidityPreference?: boolean
    liquidityPreferenceDetails?: string
    hasConvertibleNotes?: boolean
    convertibleNotesDetails?: string
    hasSpecialRights?: boolean
    specialRightsDetails?: string
  }
  reportContact?: {
    name: string
    title: string
    email: string
  }
  valuationAmount?: number
  valuationDate?: string
  valuationReportUrl?: string
  lastUpdatedAt?: string
}

export interface QuizData {
  answers: Record<string, string | string[] | Record<string, string>>
  completedAt: string
  donationPath?: string
}

// Union type for all possible completion data
export type TaskCompletionData =
  | QuizData
  | CommitmentData
  | DocumentUploadData
  | AppraisalData
  | AIAppraisalData
  | Record<string, unknown>
  | undefined