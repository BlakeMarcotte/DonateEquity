/**
 * Secure authentication verification following enterprise standards
 * No console logging - uses secureLogger
 */

import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { CustomClaims } from '@/types/auth'
import { secureLogger } from '@/lib/logging/secure-logger'

export interface AuthResult {
  success: boolean
  user?: {
    uid: string
    email?: string
    customClaims?: CustomClaims
  }
  error?: string
}

export async function verifyAuthSecure(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      secureLogger.security('Auth failed - missing or invalid header', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: request.url,
        method: request.method,
        statusCode: 401
      })
      
      return {
        success: false,
        error: 'Missing or invalid authorization header'
      }
    }

    const idToken = authHeader.split('Bearer ')[1]
    
    if (!idToken) {
      secureLogger.security('Auth failed - missing token', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: request.url,
        method: request.method,
        statusCode: 401
      })
      
      return {
        success: false,
        error: 'Missing ID token'
      }
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    
    secureLogger.audit('User authenticated', {
      userId: decodedToken.uid,
      action: 'auth_verify',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })
    
    return {
      success: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        customClaims: decodedToken as unknown as CustomClaims
      }
    }

  } catch (error) {
    secureLogger.error('Auth verification error', error, {
      endpoint: request.url,
      method: request.method
    })
    
    return {
      success: false,
      error: 'Invalid or expired token'
    }
  }
}