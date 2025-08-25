import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify-auth'

/**
 * Test endpoint to check user authentication and custom claims
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    
    if (!authResult.success) {
      return NextResponse.json({ 
        error: 'Unauthorized', 
        authenticated: false 
      }, { status: 401 })
    }

    const { user } = authResult
    
    return NextResponse.json({
      authenticated: true,
      uid: user?.uid,
      email: user?.email,
      customClaims: user?.customClaims || {},
      hasRole: !!user?.customClaims?.role,
      role: user?.customClaims?.role || 'none'
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Auth check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support POST for easier testing
export async function POST(request: NextRequest) {
  return GET(request)
}