import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken, getUserAccountInfo } from '@/lib/docusign/auth-code-client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    // Check for errors
    if (error) {
      return NextResponse.json({
        error: 'Authorization failed',
        details: error,
        description: searchParams.get('error_description')
      }, { status: 400 })
    }
    
    if (!code) {
      return NextResponse.json({
        error: 'No authorization code received'
      }, { status: 400 })
    }
    
    // Verify state (CSRF protection)
    const storedState = request.cookies.get('docusign_auth_state')?.value
    if (!storedState || storedState !== state) {
      return NextResponse.json({
        error: 'Invalid state parameter'
      }, { status: 400 })
    }
    
    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code)
    
    // Get account info
    const accountInfo = await getUserAccountInfo(tokens.accessToken)
    
    // Return success with instructions
    return NextResponse.json({
      success: true,
      message: 'DocuSign authorization successful!',
      instructions: [
        '1. Copy the access token below',
        '2. Add it to your .env.local file:',
        '   DOCUSIGN_SERVICE_ACCESS_TOKEN="' + tokens.accessToken + '"',
        '3. Restart your development server',
        '4. The DocuSign integration should now work!'
      ],
      accountInfo,
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: Math.floor((tokens.expiresAt - Date.now()) / 1000),
        hasRefreshToken: !!tokens.refreshToken
      },
      note: 'In production, you would store these tokens securely and implement token refresh'
    })
    
  } catch (error) {
    console.error('DocuSign callback error:', error)
    return NextResponse.json({
      error: 'Failed to process authorization callback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}