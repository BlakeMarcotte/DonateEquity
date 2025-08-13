export * from './errors'

export const APP_NAME = 'Donate Equity'
export const APP_DESCRIPTION = 'Pre-commit equity donations to nonprofits upon liquidity events'

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

export const ROUTES = {
  HOME: '/',
  SIGN_IN: '/auth/sign-in',
  SIGN_UP: '/auth/sign-up',
  DASHBOARD: '/tasks',
  CAMPAIGNS: '/campaigns',
  DONATIONS: '/donations',
  TASKS: '/tasks',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const