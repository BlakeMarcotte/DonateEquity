import { NextRequest } from 'next/server'
import { adminAuth } from './admin'
import { DecodedIdToken } from 'firebase-admin/auth'

export interface AuthResult {
  success: boolean
  user: DecodedIdToken | null
  decodedToken: DecodedIdToken | null
  error?: string
}

export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        user: null,
        decodedToken: null,
        error: 'Missing or invalid authorization header'
      }
    }

    // Extract the token
    const idToken = authHeader.split('Bearer ')[1]
    
    if (!idToken) {
      return {
        success: false,
        user: null,
        decodedToken: null,
        error: 'Missing ID token'
      }
    }

    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    
    return {
      success: true,
      user: decodedToken,
      decodedToken: decodedToken
    }

  } catch (error) {
    console.error('Authentication error:', error)
    
    return {
      success: false,
      user: null,
      decodedToken: null,
      error: error instanceof Error ? error.message : 'Authentication failed'
    }
  }
}