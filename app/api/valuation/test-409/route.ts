/**
 * Test endpoint to debug 409ai API calls
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthSecure } from '@/lib/auth/verify-auth-secure'

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthSecure(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiUrl = process.env.VALUATION_409AI_API_URL
    const clientId = process.env.VALUATION_409AI_CLIENT_ID
    const clientSecret = process.env.VALUATION_409AI_CLIENT_SECRET

    // Step 1: Get auth token
    const authResponse = await fetch(`${apiUrl}/api/authentication/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    const authData = await authResponse.json()
    
    if (!authResponse.ok) {
      return NextResponse.json({
        step: 'authentication',
        status: authResponse.status,
        error: authData,
      }, { status: 500 })
    }

    const authToken = authData.authentication

    // Step 2: Try different endpoint variations
    const endpoints = [
      '/api/users/create',
      '/api/users',
      '/users/create',
      '/users'
    ]

    const results = []

    for (const endpoint of endpoints) {
      const createUserResponse = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authentication: authToken,
          user_params: {
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
          }
        }),
      })

      const createUserText = await createUserResponse.text()
      let createUserData
      try {
        createUserData = JSON.parse(createUserText)
      } catch {
        createUserData = createUserText
      }

      results.push({
        endpoint,
        status: createUserResponse.status,
        statusText: createUserResponse.statusText,
        response: createUserData,
      })
    }

    return NextResponse.json({
      step: 'create_user_tests',
      authToken: authToken.substring(0, 20) + '...',
      results
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}
