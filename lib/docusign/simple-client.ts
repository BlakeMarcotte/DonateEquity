// Simple DocuSign client that uses a pre-obtained access token
// This bypasses the JWT authentication issues

const DOCUSIGN_BASE_URL = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi'

export async function getSimpleAccessToken(): Promise<string> {
  // First try environment variable
  const token = process.env.DOCUSIGN_ACCESS_TOKEN
  if (token) {
    return token
  }
  
  throw new Error(
    'No DocuSign access token available. Please:\n' +
    '1. Use the authorization code from the consent process\n' +
    '2. Exchange it for an access token at /api/docusign/exchange-code\n' +
    '3. Add DOCUSIGN_ACCESS_TOKEN to your .env.local'
  )
}

export async function getAccountInfo(accessToken: string): Promise<{ accountId: string; baseUri: string }> {
  const response = await fetch('https://account-d.docusign.com/oauth/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user info: ${response.status} - ${error}`)
  }

  const userInfo = await response.json()
  console.log('User info:', userInfo)
  
  const account = userInfo.accounts.find((acc: any) => 
    acc.account_id === process.env.DOCUSIGN_API_ACCOUNT_ID
  ) || userInfo.accounts[0]
  
  return {
    accountId: account.account_id,
    baseUri: account.base_uri
  }
}

export async function createSimpleEnvelope(
  accessToken: string,
  accountId: string,
  baseUri: string,
  documentBase64: string,
  signerName: string,
  signerEmail: string
): Promise<{ envelopeId: string }> {
  const envelopeDefinition = {
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
        clientUserId: '1000',
        canSignOffline: 'true',
        requireIdLookup: 'false',
        tabs: {}
      }]
    },
    status: 'sent',
    allowTagging: 'true'
  }
  
  const response = await fetch(`${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(envelopeDefinition)
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create envelope: ${response.status} - ${error}`)
  }
  
  return response.json()
}

export async function getEmbeddedSigningUrl(
  accessToken: string,
  accountId: string,
  baseUri: string,
  envelopeId: string,
  returnUrl: string,
  signerEmail: string,
  signerName: string
): Promise<{ url: string }> {
  const recipientViewRequest = {
    returnUrl,
    authenticationMethod: 'none',
    email: signerEmail,
    userName: signerName,
    clientUserId: '1000'
  }
  
  const response = await fetch(
    `${baseUri}/restapi/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recipientViewRequest)
    }
  )
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create recipient view: ${response.status} - ${error}`)
  }
  
  return response.json()
}