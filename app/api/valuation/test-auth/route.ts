/**
 * API Route: AI Appraisal Authentication Test
 * POST /api/valuation/test-auth
 * 
 * Tests the complete authentication flow for debugging
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthSecure } from '@/lib/auth/verify-auth-secure'

export async function POST(request: NextRequest) {
  try {
    // Test 1: Check if we can read the request
    console.log('🔍 Test Auth - Request received')
    
    // Test 2: Check authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔍 Test Auth - Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader) {
      return NextResponse.json({ 
        error: 'No authorization header',
        step: 'header_check',
        success: false 
      }, { status: 401 })
    }

    // Test 3: Check token format
    const token = authHeader.replace('Bearer ', '')
    console.log('🔍 Test Auth - Token length:', token.length)
    console.log('🔍 Test Auth - Token preview:', token.substring(0, 20) + '...')

    // Test 4: Try Firebase authentication
    console.log('🔍 Test Auth - Attempting Firebase auth verification')
    const authResult = await verifyAuthSecure(request)
    
    console.log('🔍 Test Auth - Auth result:', {
      success: authResult.success,
      hasUser: !!authResult.user,
      userUid: authResult.user?.uid?.substring(0, 8) + '...' || 'none'
    })

    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ 
        error: 'Firebase authentication failed',
        step: 'firebase_auth',
        authResult: {
          success: authResult.success,
          hasUser: !!authResult.user,
          errorDetails: authResult.error
        },
        success: false 
      }, { status: 401 })
    }

    // Test 5: Check environment variables
    const envVars = {
      clientId: !!process.env.VALUATION_409AI_CLIENT_ID,
      clientSecret: !!process.env.VALUATION_409AI_CLIENT_SECRET,
      apiUrl: !!process.env.VALUATION_409AI_API_URL,
      values: {
        clientId: process.env.VALUATION_409AI_CLIENT_ID,
        apiUrl: process.env.VALUATION_409AI_API_URL
      }
    }
    
    console.log('🔍 Test Auth - Environment variables:', envVars)

    // Test 6: Return success with debugging info
    return NextResponse.json({
      success: true,
      message: 'Authentication flow working correctly',
      debug: {
        user: {
          uid: authResult.user.uid,
          email: authResult.user.email
        },
        environment: envVars,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('🔍 Test Auth - Unexpected error:', error)
    
    return NextResponse.json({
      error: 'Unexpected error in auth test',
      step: 'unexpected_error',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}