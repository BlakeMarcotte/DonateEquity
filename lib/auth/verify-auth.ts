import { NextRequest } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { CustomClaims } from '@/types/auth'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const auth = getAuth()

export interface AuthResult {
  success: boolean
  user?: {
    uid: string
    email?: string
    customClaims?: CustomClaims
  }
  error?: string
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      }
    }

    const idToken = authHeader.split('Bearer ')[1]
    
    if (!idToken) {
      return {
        success: false,
        error: 'Missing ID token'
      }
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken)
    
    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        customClaims: decodedToken as CustomClaims
      }
    }

  } catch (error) {
    console.error('Auth verification error:', error)
    
    return {
      success: false,
      error: 'Invalid or expired token'
    }
  }
}