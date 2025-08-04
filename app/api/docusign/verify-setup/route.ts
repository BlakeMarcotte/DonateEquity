import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    currentSetup: {
      integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
      userId: process.env.DOCUSIGN_USER_ID,
      accountId: process.env.DOCUSIGN_API_ACCOUNT_ID,
      environment: process.env.DOCUSIGN_BASE_PATH?.includes('demo') ? 'sandbox' : 'production',
      rsaKeypairId: '23ddb773-18d5-411a-99d1-01ce156c6fdf'
    },
    checkList: [
      '1. Is the RSA keypair (23ddb773-18d5-411a-99d1-01ce156c6fdf) showing as ACTIVE in DocuSign?',
      '2. Is the app status ACTIVE?',
      '3. Is JWT Grant enabled in the app settings?',
      '4. Does the User ID (7f9435ec-e1ef-4465-a10f-5dc6df3ea7e0) match the user who created the app?',
      '5. Have you added any Redirect URIs to the app?'
    ],
    possibleIssues: [
      'Wrong User ID - The user ID must be the user who owns/created the integration',
      'Keypair mismatch - The private key in .env.local might not match the public key uploaded',
      'Missing consent - Even with correct setup, consent must be granted',
      'Wrong environment - Make sure you\'re using sandbox (demo) credentials'
    ],
    nextSteps: [
      'Verify the User ID is correct',
      'Try regenerating the RSA keypair',
      'Use the API Explorer to test authentication',
      'Check if there\'s a "Service Integration" option in the app settings'
    ]
  })
}