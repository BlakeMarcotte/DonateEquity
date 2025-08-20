import { z } from 'zod'

// Base validation schemas
export const emailSchema = z.string().email('Invalid email address').min(1, 'Email is required')
export const urlSchema = z.string().url('Invalid URL format')
export const phoneSchema = z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be in format (555) 123-4567')
export const einSchema = z.string().regex(/^\d{2}-\d{7}$/, 'EIN must be in format XX-XXXXXXX')

// User validation schemas
export const userProfileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: emailSchema,
  phoneNumber: phoneSchema.optional(),
  role: z.enum(['donor', 'nonprofit_admin', 'appraiser', 'admin']),
  organizationId: z.string().min(1, 'Organization ID required').optional()
})

// Organization validation schemas
export const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(200, 'Name too long'),
  taxId: einSchema,
  website: urlSchema,
  phone: phoneSchema,
  address: z.object({
    street: z.string().min(1, 'Street address required').max(200, 'Address too long').optional(),
    city: z.string().min(1, 'City required').max(100, 'City name too long'),
    state: z.string().min(2, 'State required').max(50, 'State name too long'),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format').optional()
  }),
  description: z.string().max(1000, 'Description too long').optional()
})

export const organizationUpdateSchema = organizationSchema.partial()

// Campaign validation schemas
export const campaignSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description too long'),
  goal: z.number().min(1000, 'Goal must be at least $1,000').max(100000000, 'Goal too high'),
  endDate: z.string().datetime('Invalid end date format'),
  category: z.enum(['Technology', 'Education', 'Healthcare', 'Environment', 'Arts & Culture', 'Community', 'Social Impact', 'Research', 'Emergency Relief']),
  visibility: z.enum(['public', 'private', 'unlisted']),
  organizationId: z.string().min(1, 'Organization ID required')
})

export const campaignUpdateSchema = campaignSchema.partial()

// Donation validation schemas
export const donationSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID required'),
  donorId: z.string().min(1, 'Donor ID required'),
  amount: z.number().min(1, 'Amount must be positive').max(100000000, 'Amount too high').optional(),
  percentage: z.number().min(0.01, 'Percentage must be at least 0.01%').max(100, 'Percentage cannot exceed 100%').optional(),
  type: z.enum(['dollar', 'percentage']),
  message: z.string().max(1000, 'Message too long').optional(),
  requiresAppraisal: z.boolean().default(false)
}).refine(
  (data) => {
    if (data.type === 'dollar') return data.amount !== undefined
    if (data.type === 'percentage') return data.percentage !== undefined
    return false
  },
  {
    message: 'Amount is required for dollar donations, percentage is required for percentage donations'
  }
)

// Task validation schemas
export const taskCompletionSchema = z.object({
  completionData: z.record(z.string(), z.unknown()).optional()
})

export const commitmentDecisionSchema = z.object({
  decision: z.enum(['commit_now', 'commit_after_appraisal']),
  commitmentData: z.object({
    type: z.enum(['dollar', 'percentage']),
    amount: z.number().min(1, 'Amount must be positive'),
    message: z.string().max(1000, 'Message too long').optional(),
    createdAt: z.string().datetime('Invalid date format')
  }).optional()
})

// Invitation validation schemas
export const invitationSchema = z.object({
  email: emailSchema,
  subrole: z.enum(['admin', 'member', 'viewer']).optional(),
  personalMessage: z.string().max(500, 'Personal message too long').optional()
})

export const campaignInvitationSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID required'),
  invitedEmail: emailSchema,
  message: z.string().max(500, 'Message too long').optional()
})

// File upload validation schemas
export const fileUploadSchema = z.object({
  fileName: z.string().min(1, 'File name required').max(255, 'File name too long'),
  fileType: z.string().min(1, 'File type required'),
  fileSize: z.number().min(1, 'File size must be positive').max(26214400, 'File too large (max 25MB)'), // 25MB in bytes
  folder: z.enum(['legal', 'financial', 'appraisals', 'signed-documents', 'general']).optional()
})

// Common parameter validation
export const idSchema = z.string().min(1, 'ID required').max(100, 'ID too long')
export const paginationSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0)
})

// Rate limiting schemas
export const ipAddressSchema = z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, 'Invalid IP address')
export const userAgentSchema = z.string().max(1000, 'User agent too long')

// Sanitization utilities
export const sanitizeString = (str: string): string => {
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

export const sanitizeHtml = (html: string): string => {
  // Basic HTML sanitization - in production, use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>/gi, '')
    .replace(/<object\b[^>]*>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// Export validation function
export const validateRequest = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } => {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { success: false, error: message }
    }
    return { success: false, error: 'Validation failed' }
  }
}