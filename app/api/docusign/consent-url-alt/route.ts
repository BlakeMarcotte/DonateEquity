import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
  
  if (!integrationKey) {
    return NextResponse.json({
      error: 'Missing DOCUSIGN_INTEGRATION_KEY'
    }, { status: 400 })
  }
  
  // Alternative redirect URIs that might work better
  const redirectOptions = [
    'https://www.docusign.com',
    'https://docusign.com',
    'http://localhost:3000/api/docusign/callback',
    'https://localhost:3000/api/docusign/callback'
  ]
  
  const consentUrls = redirectOptions.map(redirectUri => ({
    redirectUri,
    url: `https://account-d.docusign.com/oauth/auth?` + 
      `response_type=code&` +
      `scope=signature%20impersonation&` +
      `client_id=${integrationKey}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`
  }))
  
  return NextResponse.json({
    message: 'Alternative DocuSign Consent URLs',
    instructions: [
      '1. First, add one of these redirect URIs to your app in DocuSign Admin Console',
      '2. Then use the corresponding consent URL',
      '3. After granting consent, you can ignore where it redirects you'
    ],
    urls: consentUrls,
    directAdminUrl: 'https://admindemo.docusign.com/apps-and-keys',
    yourIntegrationKey: integrationKey,
    yourUserId: process.env.DOCUSIGN_USER_ID
  })
}