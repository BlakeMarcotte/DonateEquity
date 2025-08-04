import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
  
  // Generate a fresh consent URL
  const consentUrl = `https://account-d.docusign.com/oauth/auth?` +
    `response_type=code&` +
    `scope=signature%20impersonation&` +
    `client_id=${integrationKey}&` +
    `redirect_uri=https://localhost`
  
  return NextResponse.json({
    message: 'Get a fresh authorization code',
    instructions: [
      '1. Click the consent URL below to get a NEW authorization code',
      '2. Log in and grant consent (even if you did before)',
      '3. When you see "This site can\'t be reached", look at the URL',
      '4. IMMEDIATELY copy the code parameter from the URL',
      '5. Come back here and exchange it within 5 minutes'
    ],
    consentUrl,
    important: [
      'Authorization codes expire in 5-10 minutes',
      'Each code can only be used ONCE',
      'You must exchange it immediately after getting it'
    ],
    alternative: {
      message: 'Alternative: Use a long-lived access token',
      instructions: [
        '1. Use Postman or curl to get an access token',
        '2. Add it directly to .env.local as DOCUSIGN_ACCESS_TOKEN',
        '3. This bypasses the code exchange step'
      ]
    }
  })
}