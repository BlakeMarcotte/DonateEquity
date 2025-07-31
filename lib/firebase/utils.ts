// Firebase utility functions

// Generate a secure invitation token
export function generateInvitationToken(): string {
  // Use crypto.getRandomValues in browser environment
  if (typeof window !== 'undefined') {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  
  // For server-side, we'll use a simple random string generator
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}


// Generate a short ID (for shorter URLs)
export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Generate campaign share URL
export function generateCampaignShareUrl(campaignId: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/campaigns/${campaignId}/donate`
}

// Generate invitation acceptance URL
export function generateInvitationUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/invite/${token}`
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Calculate percentage
export function calculatePercentage(current: number, total: number): number {
  if (total === 0) return 0
  return Math.min((current / total) * 100, 100)
}

// Truncate text to specified length
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

// Generate initials from name
export function generateInitials(name: string): string {
  return name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)
}

// Check if date is expired
export function isExpired(date: Date): boolean {
  return new Date() > date
}

// Format relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  
  return 'Just now'
}