import { initializeApp, cert, getApps, getApp, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getStorage, Storage } from 'firebase-admin/storage'
import { secureLogger } from '@/lib/logging/secure-logger'

let adminAppInstance: App | null = null

const getFirebaseAdminApp = (): App => {
  // Return existing instance if already initialized
  if (adminAppInstance) {
    return adminAppInstance
  }

  // Check if app is already initialized via getApps()
  if (getApps().length > 0) {
    adminAppInstance = getApp()
    return adminAppInstance
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    secureLogger.error('Missing Firebase Admin credentials', undefined, {
      hasPrivateKey: !!privateKey,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    })
    throw new Error('Missing Firebase Admin credentials. Please set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variables.')
  }

  adminAppInstance = initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })

  return adminAppInstance
}

// Lazy getters that only initialize when accessed
export const getAdminAuth = (): Auth => getAuth(getFirebaseAdminApp())
export const getAdminDb = (): Firestore => getFirestore(getFirebaseAdminApp())
export const getAdminStorage = (): Storage => getStorage(getFirebaseAdminApp())

// Backward compatibility - these will now initialize lazily via getters
export const adminAuth = new Proxy({} as Auth, {
  get: (_target, prop) => {
    const auth = getAdminAuth()
    return auth[prop as keyof Auth]
  }
}) as Auth

export const adminDb = new Proxy({} as Firestore, {
  get: (_target, prop) => {
    const db = getAdminDb()
    return db[prop as keyof Firestore]
  }
}) as Firestore

export const adminStorage = new Proxy({} as Storage, {
  get: (_target, prop) => {
    const storage = getAdminStorage()
    return storage[prop as keyof Storage]
  }
}) as Storage

// Export adminAuth as 'auth' for compatibility
export { adminAuth as auth }

// Default export for the app
export default getFirebaseAdminApp