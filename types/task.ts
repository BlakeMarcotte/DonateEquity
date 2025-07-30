export interface Task {
  id: string
  donationId: string
  title: string
  description: string
  type: TaskType
  assignedTo: string
  assignedRole: 'donor' | 'nonprofit_admin' | 'appraiser'
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dependencies: string[] // Task IDs that must be completed first
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
  }
  comments: TaskComment[]
}

export type TaskType = 
  | 'document_upload'
  | 'document_review'
  | 'signature_required'
  | 'appraisal_request'
  | 'appraisal_submission'
  | 'appraisal_review'
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