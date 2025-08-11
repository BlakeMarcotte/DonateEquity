import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

const createFirebaseAdminApp = () => {
  if (getApps().length > 0) {
    return getApp()
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  
  if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    console.error('Missing Firebase Admin credentials:', {
      hasPrivateKey: !!privateKey,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    })
    throw new Error('Missing Firebase Admin credentials. Please set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variables.')
  }

  const app = initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })

  return app
}

const adminApp = createFirebaseAdminApp()

export const adminAuth = getAuth(adminApp)
export const adminDb = getFirestore(adminApp)
export const adminStorage = getStorage(adminApp)

// Export adminAuth as 'auth' for compatibility
export { adminAuth as auth }

export default adminApp