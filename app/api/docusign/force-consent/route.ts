import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // First, let's add https://localhost to your app's redirect URIs in DocuSign console
  // Then use this special consent flow
  
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
  const userId = process.env.DOCUSIGN_USER_ID
  
  // Method 1: Individual Consent (what we've been trying)
  const individualConsentUrl = `https://account-d.docusign.com/oauth/auth?` +
    `response_type=code&` +
    `scope=signature%20impersonation&` +
    `client_id=${integrationKey}&` +
    `redirect_uri=https://localhost`
  
  // Method 2: Admin Consent (for organization-wide consent)
  const adminConsentUrl = `https://account-d.docusign.com/oauth/auth?` +
    `response_type=code&` +
    `scope=signature%20impersonation&` +
    `client_id=${integrationKey}&` +
    `redirect_uri=https://localhost&` +
    `admin_consent_scope=signature%20impersonation`
  
  // Method 3: Try using the working project's approach
  // They might be using a different flow or have already granted consent
  
  return NextResponse.json({
    problem: 'JWT authentication requires consent to be granted first',
    
    solution1: {
      name: 'Add Redirect URI First',
      steps: [
        '1. Go to https://admindemo.docusign.com/',
        '2. Navigate to your app settings',
        '3. Add "https://localhost" to Redirect URIs',
        '4. SAVE the changes',
        '5. Then try the consent URL below'
      ]
    },
    
    solution2: {
      name: 'Manual Consent',
      individualConsentUrl,
      adminConsentUrl,
      instructions: [
        '1. Make sure https://localhost is in your redirect URIs',
        '2. Click one of the consent URLs above',
        '3. Log in and accept',
        '4. Ignore the localhost error page'
      ]
    },
    
    solution3: {
      name: 'Alternative - Use Legacy Auth Code Flow',
      description: 'If JWT consent is not working, we can switch to Authorization Code flow',
      note: 'This would require code changes but might work immediately'
    },
    
    yourConfig: {
      integrationKey,
      userId,
      accountId: process.env.DOCUSIGN_API_ACCOUNT_ID,
      rsaKeypairId: '23ddb773-18d5-411a-99d1-01ce156c6fdf'
    },
    
    debugInfo: {
      message: 'The "no_valid_keys_or_signatures" error is misleading',
      realIssue: 'Consent has not been granted for JWT flow',
      whyItWorksElsewhere: 'The other project likely already has consent granted'
    }
  })
}