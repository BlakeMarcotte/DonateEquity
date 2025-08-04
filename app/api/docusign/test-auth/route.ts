import { NextRequest, NextResponse } from 'next/server'
import { getAccessToken, getUserAccountInfo } from '@/lib/docusign/api-client'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // First, let's verify the JWT can be created
    const privateKey = process.env.DOCUSIGN_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY || ''
    const userId = process.env.DOCUSIGN_USER_ID || ''
    
    // Test JWT creation
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: integrationKey,
      sub: userId,
      aud: 'https://account-d.docusign.com',
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation'
    }
    
    let jwtToken: string
    try {
      jwtToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' })
      console.log('JWT created successfully')
    } catch (jwtError) {
      return NextResponse.json({
        success: false,
        step: 'JWT Creation',
        error: jwtError instanceof Error ? jwtError.message : 'Failed to create JWT',
        details: {
          hasPrivateKey: !!privateKey,
          privateKeyLength: privateKey.length,
          keyFormat: privateKey.includes('BEGIN RSA PRIVATE KEY') ? 'RSA' : 
                     privateKey.includes('BEGIN PRIVATE KEY') ? 'PKCS8' : 'Unknown'
        }
      }, { status: 500 })
    }
    
    // Try to get access token
    let accessToken: string
    try {
      accessToken = await getAccessToken()
    } catch (tokenError) {
      return NextResponse.json({
        success: false,
        step: 'Get Access Token',
        error: tokenError instanceof Error ? tokenError.message : 'Failed to get access token',
        details: {
          integrationKey,
          userId,
          authServer: 'https://account-d.docusign.com',
          consentUrl: `https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=${integrationKey}&redirect_uri=https://localhost`
        }
      }, { status: 500 })
    }
    
    // Try to get user account info
    try {
      const accountInfo = await getUserAccountInfo(accessToken)
      return NextResponse.json({
        success: true,
        message: 'DocuSign authentication successful!',
        accountInfo
      })
    } catch (accountError) {
      return NextResponse.json({
        success: false,
        step: 'Get Account Info',
        error: accountError instanceof Error ? accountError.message : 'Failed to get account info',
        details: {
          tokenObtained: true
        }
      }, { status: 500 })
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      step: 'General',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        hasIntegrationKey: !!process.env.DOCUSIGN_INTEGRATION_KEY,
        hasUserId: !!process.env.DOCUSIGN_USER_ID,
        hasPrivateKey: !!process.env.DOCUSIGN_PRIVATE_KEY,
        hasAccountId: !!process.env.DOCUSIGN_API_ACCOUNT_ID
      }
    }, { status: 500 })
  }
}