import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
  const redirectUri = 'https://localhost' // DocuSign default for JWT flow
  
  if (!integrationKey) {
    return NextResponse.json({
      error: 'Missing DOCUSIGN_INTEGRATION_KEY'
    }, { status: 400 })
  }
  
  // For demo/sandbox environment
  const consentUrl = `https://account-d.docusign.com/oauth/auth?` + 
    `response_type=code&` +
    `scope=signature%20impersonation&` +
    `client_id=${integrationKey}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`
  
  // For production environment
  const productionConsentUrl = `https://account.docusign.com/oauth/auth?` + 
    `response_type=code&` +
    `scope=signature%20impersonation&` +
    `client_id=${integrationKey}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`
  
  return NextResponse.json({
    message: 'DocuSign Consent URLs',
    instructions: [
      '1. Open the appropriate consent URL in your browser',
      '2. Log in with your DocuSign credentials',
      '3. Click "Accept" to grant consent',
      '4. You will be redirected to https://localhost (ignore the error)',
      '5. Consent is now granted and JWT authentication should work'
    ],
    urls: {
      sandbox: consentUrl,
      production: productionConsentUrl
    },
    currentEnvironment: process.env.DOCUSIGN_BASE_PATH?.includes('demo.docusign.net') ? 'sandbox' : 'production',
    integrationKey
  })
}