import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { CustomClaims } from '@/types/auth'

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
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    
    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        customClaims: decodedToken as unknown as CustomClaims
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