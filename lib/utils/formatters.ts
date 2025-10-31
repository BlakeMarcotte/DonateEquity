/**
 * Shared formatting utilities for consistent data formatting across the app
 */

// Format phone number as user types
export const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const phoneNumber = value.replace(/\D/g, '')
  
  // Format as (XXX) XXX-XXXX
  if (phoneNumber.length <= 3) {
    return phoneNumber
  } else if (phoneNumber.length <= 6) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
  } else {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }
}

// Format EIN as user types
export const formatEIN = (value: string): string => {
  // Remove all non-digits
  const ein = value.replace(/\D/g, '')
  
  // Format as XX-XXXXXXX
  if (ein.length <= 2) {
    return ein
  } else {
    return `${ein.slice(0, 2)}-${ein.slice(2, 9)}`
  }
}

// Format currency for display
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format percentage for display
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`
}

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Clean phone number for storage (remove formatting)
export const cleanPhoneNumber = (formattedPhone: string): string => {
  return formattedPhone.replace(/\D/g, '')
}

// Clean EIN for storage (remove formatting)
export const cleanEIN = (formattedEIN: string): string => {
  return formattedEIN.replace(/\D/g, '')
}

// Validate phone number
export const isValidPhoneNumber = (phone: string): boolean => {
  const cleaned = cleanPhoneNumber(phone)
  return cleaned.length === 10
}

// Validate EIN
export const isValidEIN = (ein: string): boolean => {
  const cleaned = cleanEIN(ein)
  return cleaned.length === 9
}

// Format date for display
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`
  } else {
    return formatDate(date)
  }
}

// Format currency input as user types (adds dollar sign and commas)
export const formatCurrencyInput = (value: string): string => {
  // Remove all non-digits
  const numbers = value.replace(/\D/g, '')

  // If empty, return empty string
  if (!numbers) return ''

  // Convert to number and format with commas
  const number = parseInt(numbers)
  const formatted = number.toLocaleString('en-US')

  // Add dollar sign
  return `$${formatted}`
}

// Clean currency input for storage (remove dollar sign, commas, etc.)
export const cleanCurrencyInput = (formattedCurrency: string): string => {
  return formattedCurrency.replace(/\D/g, '')
}