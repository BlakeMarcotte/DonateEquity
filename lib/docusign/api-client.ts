import crypto from 'crypto'
import jwt from 'jsonwebtoken'

// DocuSign API configuration
const DOCUSIGN_BASE_URL = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi'
// Use demo auth server when using demo.docusign.net
const DOCUSIGN_AUTH_SERVER = process.env.DOCUSIGN_BASE_PATH?.includes('demo.docusign.net') 
  ? 'https://account-d.docusign.com' 
  : 'https://account.docusign.com'

// JWT token expiration time (1 hour)
const TOKEN_EXPIRATION = 3600

// DocuSign OAuth scopes
const SCOPES = ['signature', 'impersonation']

interface DocuSignConfig {
  integrationKey: string
  userId: string
  privateKey: string
  accountId?: string
}

interface AccessTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface UserInfoResponse {
  accounts: Array<{
    account_id: string
    is_default: boolean
    account_name: string
    base_uri: string
  }>
}

// Create JWT assertion for DocuSign OAuth
function createJWTAssertion(config: DocuSignConfig): string {
  try {
    const now = Math.floor(Date.now() / 1000)
    
    const payload = {
      iss: config.integrationKey,
      sub: config.userId,
      aud: DOCUSIGN_AUTH_SERVER,
      iat: now,
      exp: now + TOKEN_EXPIRATION,
      scope: SCOPES.join(' ')
    }

    console.log('JWT Payload:', payload)

    // Sign with RSA SHA-256
    const token = jwt.sign(payload, config.privateKey, { algorithm: 'RS256' })
    console.log('JWT created successfully')
    return token
  } catch (error) {
    console.error('Error creating JWT assertion:', error)
    throw new Error(`Failed to create JWT assertion: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Get access token using JWT grant
export async function getAccessToken(): Promise<string> {
  // Validate environment variables
  if (!process.env.DOCUSIGN_INTEGRATION_KEY) {
    throw new Error('Missing DOCUSIGN_INTEGRATION_KEY environment variable')
  }
  if (!process.env.DOCUSIGN_USER_ID) {
    throw new Error('Missing DOCUSIGN_USER_ID environment variable')
  }
  if (!process.env.DOCUSIGN_PRIVATE_KEY) {
    throw new Error('Missing DOCUSIGN_PRIVATE_KEY environment variable')
  }

  // Ensure private key has proper line breaks
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n')
  
  // Validate private key format
  if (!privateKey.includes('BEGIN RSA PRIVATE KEY') && !privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('Invalid private key format - must be PEM encoded RSA private key')
  }
  
  const config: DocuSignConfig = {
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
    userId: process.env.DOCUSIGN_USER_ID,
    privateKey: privateKey
  }

  console.log('DocuSign OAuth Config:', {
    integrationKey: config.integrationKey,
    userId: config.userId,
    authServer: DOCUSIGN_AUTH_SERVER,
    hasPrivateKey: !!config.privateKey,
    privateKeyFormat: privateKey.includes('BEGIN RSA PRIVATE KEY') ? 'RSA' : 'PKCS8'
  })

  const assertion = createJWTAssertion(config)
  
  const response = await fetch(`${DOCUSIGN_AUTH_SERVER}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('DocuSign OAuth Error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    })
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`)
  }

  const data: AccessTokenResponse = await response.json()
  console.log('DocuSign OAuth Success - Token obtained')
  return data.access_token
}

// Get user account information
export async function getUserAccountInfo(accessToken: string): Promise<{ accountId: string; baseUri: string }> {
  console.log('Getting user account info from:', DOCUSIGN_AUTH_SERVER)
  
  const response = await fetch(`${DOCUSIGN_AUTH_SERVER}/oauth/userinfo`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to get user info:', {
      status: response.status,
      error: errorText
    })
    throw new Error(`Failed to get user account info: ${response.status} - ${errorText}`)
  }

  const userInfo: UserInfoResponse = await response.json()
  console.log('User info response:', {
    accountsCount: userInfo.accounts?.length || 0,
    accounts: userInfo.accounts?.map(acc => ({
      id: acc.account_id,
      name: acc.account_name,
      isDefault: acc.is_default
    }))
  })
  
  if (!userInfo.accounts || userInfo.accounts.length === 0) {
    throw new Error('No DocuSign accounts found for user')
  }
  
  const defaultAccount = userInfo.accounts.find(acc => acc.is_default) || userInfo.accounts[0]
  
  // If we have an account ID in env, use that one
  const accountId = process.env.DOCUSIGN_API_ACCOUNT_ID || defaultAccount.account_id
  const account = userInfo.accounts.find(acc => acc.account_id === accountId) || defaultAccount
  
  console.log('Using DocuSign account:', {
    accountId: account.account_id,
    accountName: account.account_name,
    baseUri: account.base_uri
  })
  
  return {
    accountId: account.account_id,
    baseUri: account.base_uri
  }
}

// Create envelope with embedded signing
export async function createEnvelope(
  accessToken: string,
  accountId: string,
  baseUri: string,
  envelopeDefinition: any
): Promise<{ envelopeId: string; uri: string }> {
  const url = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes`
  console.log('Creating envelope at:', url)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(envelopeDefinition)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to create envelope:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url: url
    })
    throw new Error(`Failed to create envelope: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  console.log('Envelope created successfully:', result.envelopeId)
  return result
}

// Create recipient view (embedded signing URL)
export async function createRecipientView(
  accessToken: string,
  accountId: string,
  baseUri: string,
  envelopeId: string,
  recipientViewRequest: {
    returnUrl: string
    authenticationMethod: string
    email: string
    userName: string
    clientUserId: string
  }
): Promise<{ url: string }> {
  const url = `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`
  console.log('Creating recipient view:', {
    url,
    envelopeId,
    recipientViewRequest
  })
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(recipientViewRequest)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Failed to create recipient view:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      url: url
    })
    throw new Error(`Failed to create recipient view: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  console.log('Recipient view created successfully')
  return result
}

// Download envelope documents
export async function downloadEnvelopeDocuments(
  accessToken: string,
  accountId: string,
  baseUri: string,
  envelopeId: string
): Promise<Buffer> {
  const response = await fetch(
    `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  )

  if (!response.ok) {
    throw new Error('Failed to download envelope documents')
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Helper function to create NDA envelope definition
export function createNDAEnvelopeDefinition(
  documentBase64: string,
  signerName: string,
  signerEmail: string
) {
  return {
    emailSubject: 'Please sign the General NDA Agreement',
    documents: [{
      documentBase64,
      name: 'General NDA Agreement',
      fileExtension: 'pdf',
      documentId: '1'
    }],
    recipients: {
      signers: [{
        email: signerEmail,
        name: signerName,
        recipientId: '1',
        routingOrder: '1',
        clientUserId: '1000', // Enable embedded signing
        tabs: {
          signHereTabs: [{
            anchorString: 'Signature:',
            anchorUnits: 'pixels',
            anchorXOffset: '100',
            anchorYOffset: '0',
            anchorIgnoreIfNotPresent: 'false',
            name: 'SignHere',
            optional: 'false',
            scaleValue: '1',
            tabLabel: 'signature'
          }],
          dateSignedTabs: [{
            anchorString: 'Date:',
            anchorUnits: 'pixels',
            anchorXOffset: '100',
            anchorYOffset: '0',
            anchorIgnoreIfNotPresent: 'false',
            name: 'DateSigned',
            tabLabel: 'date_signed'
          }],
          fullNameTabs: [{
            anchorString: 'Name:',
            anchorUnits: 'pixels',
            anchorXOffset: '100',
            anchorYOffset: '0',
            anchorIgnoreIfNotPresent: 'false',
            name: 'FullName',
            tabLabel: 'full_name'
          }],
          textTabs: [{
            anchorString: 'Company:',
            anchorUnits: 'pixels',
            anchorXOffset: '100',
            anchorYOffset: '0',
            anchorIgnoreIfNotPresent: 'true',
            name: 'CompanyName',
            tabLabel: 'company_name',
            value: '',
            required: 'false',
            width: '200',
            height: '20'
          }]
        }
      }]
    },
    status: 'sent',
    eventNotification: {
      url: `${process.env.NEXT_PUBLIC_APP_URL}/api/docusign/webhook`,
      requireAcknowledgment: 'true',
      loggingEnabled: 'true',
      deliveryMode: 'SIM',
      events: ['envelope-sent', 'envelope-delivered', 'envelope-completed', 'envelope-declined', 'envelope-voided'],
      eventData: {
        version: 'restv2.1',
        format: 'json',
        includeData: ['tabs', 'recipients']
      }
    }
  }
}