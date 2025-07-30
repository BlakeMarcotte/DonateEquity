import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { CustomClaims, UserRole } from '@/types/auth'

interface AuthResult {
  success: boolean
  decodedToken?: Record<string, unknown>
  error?: string
}

export async function verifyAuthToken(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Missing or invalid authorization header',
      }
    }

    const token = authHeader.split('Bearer ')[1]
    
    if (!token) {
      return {
        success: false,
        error: 'Missing authentication token',
      }
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    
    return {
      success: true,
      decodedToken,
    }
  } catch (error: unknown) {
    console.error('Token verification error:', error)
    
    const authError = error as { code?: string }
    if (authError.code === 'auth/id-token-expired') {
      return {
        success: false,
        error: 'Token expired',
      }
    }
    
    if (authError.code === 'auth/id-token-revoked') {
      return {
        success: false,
        error: 'Token revoked',
      }
    }
    
    return {
      success: false,
      error: 'Invalid token',
    }
  }
}

export function requireRole(requiredRoles: UserRole[]) {
  return async (request: NextRequest): Promise<AuthResult> => {
    const authResult = await verifyAuthToken(request)
    
    if (!authResult.success) {
      return authResult
    }

    const customClaims = authResult.decodedToken?.customClaims as CustomClaims
    
    if (!customClaims || !requiredRoles.includes(customClaims.role)) {
      return {
        success: false,
        error: 'Insufficient permissions',
      }
    }

    return authResult
  }
}

export function requirePermissions(requiredPermissions: string[]) {
  return async (request: NextRequest): Promise<AuthResult> => {
    const authResult = await verifyAuthToken(request)
    
    if (!authResult.success) {
      return authResult
    }

    const customClaims = authResult.decodedToken?.customClaims as CustomClaims
    
    if (!customClaims) {
      return {
        success: false,
        error: 'No permissions found',
      }
    }

    const hasPermissions = requiredPermissions.every(permission =>
      customClaims.permissions.includes(permission)
    )

    if (!hasPermissions) {
      return {
        success: false,
        error: 'Insufficient permissions',
      }
    }

    return authResult
  }
}

export async function getCurrentUserFromToken(request: NextRequest) {
  const authResult = await verifyAuthToken(request)
  
  if (!authResult.success || !authResult.decodedToken) {
    return null
  }

  return {
    uid: authResult.decodedToken?.uid as string,
    email: authResult.decodedToken?.email as string,
    customClaims: authResult.decodedToken?.customClaims as CustomClaims,
  }
}