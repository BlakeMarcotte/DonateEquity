import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 })
    }
    
    const DOCUSIGN_AUTH_SERVER = 'https://account-d.docusign.com'
    
    // For JWT flow, we might not have a client secret
    // Try without client_secret first
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      client_id: process.env.DOCUSIGN_INTEGRATION_KEY!,
      redirect_uri: 'https://localhost'  // Must match exactly what was used in authorization
    })
    
    // Only add client_secret if it exists
    if (process.env.DOCUSIGN_SECRET_KEY) {
      params.append('client_secret', process.env.DOCUSIGN_SECRET_KEY)
    }
    
    console.log('Exchanging code for token with params:', {
      client_id: process.env.DOCUSIGN_INTEGRATION_KEY,
      has_secret: !!process.env.DOCUSIGN_SECRET_KEY,
      redirect_uri: 'https://localhost'
    })
    
    const response = await fetch(`${DOCUSIGN_AUTH_SERVER}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    })
    
    const responseText = await response.text()
    console.log('Token exchange response:', response.status, responseText)
    
    if (!response.ok) {
      return NextResponse.json({
        error: 'Failed to exchange code for token',
        status: response.status,
        details: responseText
      }, { status: response.status })
    }
    
    const data = JSON.parse(responseText)
    
    return NextResponse.json({
      success: true,
      message: 'Successfully obtained access token!',
      instructions: [
        '1. Copy this access token:',
        data.access_token,
        '',
        '2. Add it to your .env.local file:',
        'DOCUSIGN_ACCESS_TOKEN=' + data.access_token,
        '',
        '3. The token expires in ' + (data.expires_in / 3600) + ' hours',
        '4. For production, implement token refresh using the refresh token'
      ],
      tokenInfo: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type
      }
    })
    
  } catch (error) {
    console.error('Error exchanging code:', error)
    return NextResponse.json({
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}