import { NextRequest, NextResponse } from 'next/server'
import { createAuthorizationUrl } from '@/lib/docusign/auth-code-client'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  // Generate a secure state parameter
  const state = crypto.randomBytes(32).toString('hex')
  
  // Store state in a cookie for verification (in production, use a database)
  const response = NextResponse.json({
    message: 'One-Time DocuSign Service Authorization Setup',
    instructions: [
      '1. Click the authorization URL below',
      '2. Log in with the DocuSign account that will act as the service account',
      '3. Grant consent to the application',
      '4. You will be redirected back and receive an access token',
      '5. Add that token to your .env.local as DOCUSIGN_SERVICE_ACCESS_TOKEN'
    ],
    authorizationUrl: createAuthorizationUrl(state),
    important: [
      'This is a one-time setup process',
      'The account you use will be the service account for all DocuSign operations',
      'Make sure to use the correct DocuSign account'
    ]
  })
  
  // Set state cookie for CSRF protection
  response.cookies.set('docusign_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 3600 // 1 hour
  })
  
  return response
}