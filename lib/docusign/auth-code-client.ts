import crypto from 'crypto'

// DocuSign API configuration for Authorization Code flow
const DOCUSIGN_BASE_URL = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi'
const DOCUSIGN_AUTH_SERVER = process.env.DOCUSIGN_BASE_PATH?.includes('demo.docusign.net') 
  ? 'https://account-d.docusign.com' 
  : 'https://account.docusign.com'

interface DocuSignTokens {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

// Store tokens in memory (in production, use a database or Redis)
const tokenStore = new Map<string, DocuSignTokens>()

// Get stored access token or request a new one
export async function getAccessTokenForUser(userId: string): Promise<string> {
  const stored = tokenStore.get(userId)
  
  if (stored && stored.expiresAt > Date.now()) {
    return stored.accessToken
  }
  
  // For service integration, we'll use the admin user's pre-authorized token
  // This requires one-time manual authorization
  return getServiceAccessToken()
}

// Get service account access token (one-time setup required)
async function getServiceAccessToken(): Promise<string> {
  // Check if we have a stored service token
  const serviceToken = process.env.DOCUSIGN_SERVICE_ACCESS_TOKEN
  
  if (serviceToken) {
    // In production, validate the token hasn't expired
    return serviceToken
  }
  
  // If no service token, we need to set it up once
  throw new Error(
    'DocuSign service access token not configured. ' +
    'Please complete the one-time authorization setup:\n' +
    '1. Visit /api/docusign/setup-service-auth\n' +
    '2. Complete the authorization\n' +
    '3. Add the resulting token to DOCUSIGN_SERVICE_ACCESS_TOKEN in .env.local'
  )
}

// Create authorization URL for one-time setup
export function createAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    scope: 'signature impersonation',
    client_id: process.env.DOCUSIGN_INTEGRATION_KEY!,
    redirect_uri: 'https://localhost',  // Using the registered redirect URI
    state: state
  })
  
  return `${DOCUSIGN_AUTH_SERVER}/oauth/auth?${params}`
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string): Promise<DocuSignTokens> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: process.env.DOCUSIGN_INTEGRATION_KEY!,
    client_secret: process.env.DOCUSIGN_SECRET_KEY!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/docusign/callback`
  })
  
  const response = await fetch(`${DOCUSIGN_AUTH_SERVER}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for token: ${error}`)
  }
  
  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000)
  }
}

// Alternative: Use client credentials with JWT (if consent is ever granted)
export async function getJWTAccessToken(): Promise<string> {
  // This is your current implementation
  // It will work once consent is granted
  const { getAccessToken } = await import('./api-client')
  return getAccessToken()
}

// Helper to get user info
export async function getUserAccountInfo(accessToken: string): Promise<{ accountId: string; baseUri: string }> {
  const response = await fetch(`${DOCUSIGN_AUTH_SERVER}/oauth/userinfo`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to get user account info')
  }

  const userInfo = await response.json()
  const defaultAccount = userInfo.accounts.find((acc: any) => acc.is_default) || userInfo.accounts[0]
  
  return {
    accountId: defaultAccount.account_id,
    baseUri: defaultAccount.base_uri
  }
}