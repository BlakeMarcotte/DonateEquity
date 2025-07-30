export const ERROR_MESSAGES = {
  // Authentication errors
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
  AUTH_USER_NOT_FOUND: 'User not found',
  AUTH_EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  AUTH_WEAK_PASSWORD: 'Password must be at least 8 characters',
  AUTH_SESSION_EXPIRED: 'Your session has expired. Please sign in again',
  AUTH_UNAUTHORIZED: 'You are not authorized to perform this action',
  
  // Validation errors
  VALIDATION_REQUIRED_FIELD: 'This field is required',
  VALIDATION_INVALID_EMAIL: 'Please enter a valid email address',
  VALIDATION_INVALID_PHONE: 'Please enter a valid phone number',
  VALIDATION_INVALID_TAX_ID: 'Please enter a valid tax ID',
  
  // Campaign errors
  CAMPAIGN_NOT_FOUND: 'Campaign not found',
  CAMPAIGN_ENDED: 'This campaign has ended',
  CAMPAIGN_GOAL_REACHED: 'This campaign has reached its goal',
  
  // Donation errors
  DONATION_MINIMUM_NOT_MET: 'Donation amount is below the minimum',
  DONATION_MAXIMUM_EXCEEDED: 'Donation amount exceeds the maximum',
  DONATION_PROCESSING_ERROR: 'Error processing donation. Please try again',
  
  // Document errors
  DOCUMENT_UPLOAD_FAILED: 'Failed to upload document',
  DOCUMENT_TOO_LARGE: 'Document size exceeds the maximum limit',
  DOCUMENT_INVALID_TYPE: 'Invalid document type',
  
  // General errors
  GENERIC_ERROR: 'An unexpected error occurred. Please try again',
  NETWORK_ERROR: 'Network error. Please check your connection',
  SERVER_ERROR: 'Server error. Please try again later',
} as const

export type ErrorCode = keyof typeof ERROR_MESSAGES