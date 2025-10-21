export type Environment = 'development' | 'staging' | 'production'

export function getEnvironment(): Environment {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV
  
  if (env === 'staging') return 'staging'
  if (env === 'production') return 'production'
  return 'development'
}

export function isDevelopment(): boolean {
  return getEnvironment() === 'development'
}

export function isStaging(): boolean {
  return getEnvironment() === 'staging'
}

export function isProduction(): boolean {
  return getEnvironment() === 'production'
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export const config = {
  environment: getEnvironment(),
  isDevelopment: isDevelopment(),
  isStaging: isStaging(),
  isProduction: isProduction(),
  appUrl: getAppUrl(),
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
} as const
