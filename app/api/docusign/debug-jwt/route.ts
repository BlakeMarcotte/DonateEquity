import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    const privateKey = process.env.DOCUSIGN_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY || ''
    const userId = process.env.DOCUSIGN_USER_ID || ''
    
    // Create JWT
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: integrationKey,
      sub: userId,
      aud: 'https://account-d.docusign.com',
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation'
    }
    
    const jwtToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' })
    
    // Try to get token with detailed error handling
    const response = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken
      })
    })
    
    const responseText = await response.text()
    let responseData
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }
    
    return NextResponse.json({
      request: {
        url: 'https://account-d.docusign.com/oauth/token',
        integrationKey,
        userId,
        rsaKeypairId: '23ddb773-18d5-411a-99d1-01ce156c6fdf',
        jwtClaims: payload
      },
      response: {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      },
      debugging: {
        privateKeyStart: privateKey.substring(0, 50) + '...',
        privateKeyEnd: '...' + privateKey.substring(privateKey.length - 50),
        hasBeginMarker: privateKey.includes('BEGIN RSA PRIVATE KEY'),
        hasEndMarker: privateKey.includes('END RSA PRIVATE KEY'),
        keyLength: privateKey.length
      },
      solutions: response.status === 400 ? [
        '1. CONSENT: Open DocuSign Admin Console',
        '2. Go to your profile dropdown (top right) → "Go to Admin"',
        '3. Navigate to "Integrations" → "Apps and Keys"',
        '4. Find your app and click on it',
        '5. Look for "Add User" or "Grant Consent" button',
        '6. OR: Try adding "https://localhost" to Redirect URIs and save',
        '7. OR: Check if there\'s an "Actions" menu with consent options'
      ] : []
    })
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}