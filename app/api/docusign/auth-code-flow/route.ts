import { NextRequest, NextResponse } from 'next/server'

// This endpoint helps you get an authorization code for testing
export async function GET(request: NextRequest) {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY || ''
  
  // Since your app uses Authorization Code Grant, let's use that flow
  const authUrl = `https://account-d.docusign.com/oauth/auth?` +
    `response_type=code&` +
    `scope=signature%20impersonation&` +
    `client_id=${integrationKey}&` +
    `redirect_uri=${encodeURIComponent('https://www.docusign.com/api/auth/consent')}`
  
  return NextResponse.json({
    message: 'Your app is configured for Authorization Code Grant',
    problem: 'JWT Grant is not enabled, which is required for service integration',
    solution: 'Edit your app in DocuSign to enable JWT Grant authentication',
    steps: [
      '1. Click Edit in your DocuSign app',
      '2. Change Authentication to include JWT Grant',
      '3. Add https://localhost as a Redirect URI',
      '4. Save the changes',
      '5. Then grant consent'
    ],
    temporaryWorkaround: {
      message: 'For testing, you could use Authorization Code flow instead',
      authUrl: authUrl,
      note: 'But JWT Grant is better for service integration'
    }
  })
}