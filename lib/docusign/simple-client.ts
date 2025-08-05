// DocuSign Simple Client using direct HTTP API calls (2025 approach)
// Following the official DocuSign REST API quickstart guide
import jwt from 'jsonwebtoken'

export class DocuSignSimpleClient {
  private accessToken: string | null = null
  private accountId: string | null = null
  private tokenExpiry: number = 0

  private readonly baseUrl = 'https://demo.docusign.net/restapi'
  private readonly oAuthBaseUrl = 'https://account-d.docusign.com'

  /**
   * Authenticate using JWT (following 2025 quickstart guide)
   */
  async authenticateJWT(): Promise<{ accessToken: string; accountId: string }> {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
    const userId = process.env.DOCUSIGN_USER_ID
    const privateKeyBase64 = process.env.DOCUSIGN_PRIVATE_KEY

    if (!integrationKey || !userId || !privateKeyBase64) {
      throw new Error('Missing required DocuSign environment variables')
    }

    try {
      // Convert base64 private key to PEM format
      const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8')

      // Create JWT payload following DocuSign 2025 specification
      const now = Math.floor(Date.now() / 1000)
      const payload = {
        iss: integrationKey,
        sub: userId,
        aud: 'account-d.docusign.com',
        iat: now,
        exp: now + 3600, // 1 hour expiration
        scope: 'signature impersonation'
      }

      // Sign the JWT
      const jwtToken = jwt.sign(payload, privateKey, { algorithm: 'RS256' })

      // Exchange JWT for access token
      const tokenResponse = await fetch(`${this.oAuthBaseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwtToken
        })
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('DocuSign token error:', errorText)
        throw new Error(`Failed to get access token: ${tokenResponse.status}`)
      }

      const tokenData = await tokenResponse.json()
      this.accessToken = tokenData.access_token
      this.tokenExpiry = now + (tokenData.expires_in || 3600)

      // Get user info to find account ID
      const userInfoResponse = await fetch(`${this.oAuthBaseUrl}/oauth/userinfo`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      })

      if (!userInfoResponse.ok) {
        throw new Error(`Failed to get user info: ${userInfoResponse.status}`)
      }

      const userInfo = await userInfoResponse.json()
      if (!userInfo.accounts || userInfo.accounts.length === 0) {
        throw new Error('No DocuSign accounts found')
      }

      this.accountId = userInfo.accounts[0].account_id
      
      return { 
        accessToken: this.accessToken, 
        accountId: this.accountId 
      }
    } catch (error) {
      console.error('DocuSign JWT authentication failed:', error)
      throw new Error('Failed to authenticate with DocuSign')
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<{ accessToken: string; accountId: string }> {
    const now = Math.floor(Date.now() / 1000)
    
    if (!this.accessToken || !this.accountId || now >= this.tokenExpiry) {
      return await this.authenticateJWT()
    }
    
    return { accessToken: this.accessToken, accountId: this.accountId }
  }

  /**
   * Create an envelope with a document for signing
   * Uses free-form signing - signers can place signatures/dates anywhere
   */
  async createEnvelope(params: {
    signerEmail: string
    signerName: string
    documentPath: string
    documentName: string
    emailSubject: string
    allowFreeFormSigning?: boolean
  }): Promise<any> {
    const { signerEmail, signerName, documentPath, documentName, emailSubject } = params

    try {
      const { accessToken, accountId } = await this.ensureAuthenticated()

      // Read the document file
      const fs = await import('fs/promises')
      const documentBytes = await fs.readFile(documentPath)
      const documentBase64 = documentBytes.toString('base64')

      // Get webhook URL from environment - only use if HTTPS is available
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const isHttps = baseUrl.startsWith('https://')
      
      const envelopeDefinition: any = {
        emailSubject,
        documents: [{
          documentBase64,
          name: documentName,
          fileExtension: 'pdf',
          documentId: '1'
        }],
        recipients: {
          signers: [{
            email: signerEmail,
            name: signerName,
            recipientId: '1',
            routingOrder: '1',
            clientUserId: '1' // Required for embedded signing with free-form
            // No tabs defined - enables free-form signing where signers can place
            // their signatures and dates anywhere on the document
          }]
        },
        status: 'created' // Use 'created' to allow sender to add fields, or 'sent' for immediate sending
      }

      // Only add webhook configuration if running on HTTPS (production)
      if (isHttps) {
        const webhookUrl = `${baseUrl}/api/docusign/webhook`
        envelopeDefinition.eventNotification = {
          url: webhookUrl,
          loggingEnabled: 'true',
          requireAcknowledgment: 'true',
          envelopeEvents: [
            { envelopeEventStatusCode: 'sent' },
            { envelopeEventStatusCode: 'delivered' },
            { envelopeEventStatusCode: 'completed' },
            { envelopeEventStatusCode: 'declined' },
            { envelopeEventStatusCode: 'voided' }
          ],
          recipientEvents: [
            { recipientEventStatusCode: 'sent' },
            { recipientEventStatusCode: 'delivered' },
            { recipientEventStatusCode: 'completed' },
            { recipientEventStatusCode: 'declined' }
          ]
        }
        console.log('DocuSign webhook configured for:', webhookUrl)
      } else {
        console.log('DocuSign webhook disabled - HTTPS required, running on:', baseUrl)
      }

      // Create the envelope
      const response = await fetch(`${this.baseUrl}/v2.1/accounts/${accountId}/envelopes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(envelopeDefinition)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('DocuSign create envelope error:', errorText)
        throw new Error(`Failed to create envelope: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to create DocuSign envelope:', error)
      throw new Error('Failed to create envelope for signing')
    }
  }

  /**
   * Get envelope status
   */
  async getEnvelopeStatus(envelopeId: string): Promise<any> {
    try {
      const { accessToken, accountId } = await this.ensureAuthenticated()

      const response = await fetch(`${this.baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get envelope status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get DocuSign envelope status:', error)
      throw new Error('Failed to get envelope status')
    }
  }

  /**
   * Get recipient view URL for embedded signing
   */
  async getRecipientView(params: {
    envelopeId: string
    recipientEmail: string
    recipientName: string
    recipientId: string
    returnUrl: string
  }): Promise<any> {
    const { envelopeId, recipientEmail, recipientName, recipientId, returnUrl } = params

    try {
      const { accessToken, accountId } = await this.ensureAuthenticated()

      const viewRequest = {
        authenticationMethod: 'none',
        email: recipientEmail,
        userName: recipientName,
        recipientId,
        returnUrl,
        clientUserId: '1' // Must match the clientUserId from envelope creation
      }

      const response = await fetch(`${this.baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/recipient`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(viewRequest)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('DocuSign recipient view error:', errorText)
        throw new Error(`Failed to get recipient view: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get DocuSign recipient view:', error)
      throw new Error('Failed to get recipient view URL')
    }
  }

  /**
   * Create and immediately send an envelope for free-form signing
   */
  async createAndSendEnvelope(params: {
    signerEmail: string
    signerName: string
    documentPath: string
    documentName: string
    emailSubject: string
  }): Promise<any> {
    const { signerEmail, signerName, documentPath, documentName, emailSubject } = params

    try {
      const { accessToken, accountId } = await this.ensureAuthenticated()

      // Read the document file
      const fs = await import('fs/promises')
      const documentBytes = await fs.readFile(documentPath)
      const documentBase64 = documentBytes.toString('base64')

      // Get webhook URL from environment - only use if HTTPS is available
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const isHttps = baseUrl.startsWith('https://')
      
      const envelopeDefinition: any = {
        emailSubject,
        documents: [{
          documentBase64,
          name: documentName,
          fileExtension: 'pdf',
          documentId: '1'
        }],
        recipients: {
          signers: [{
            email: signerEmail,
            name: signerName,
            recipientId: '1',
            routingOrder: '1',
            clientUserId: '1' // Required for embedded signing with free-form
            // No tabs defined - enables free-form signing where signers can place
            // their signatures and dates anywhere on the document
          }]
        },
        status: 'sent' // Send immediately for free-form signing
      }

      // Only add webhook configuration if running on HTTPS (production)
      if (isHttps) {
        const webhookUrl = `${baseUrl}/api/docusign/webhook`
        envelopeDefinition.eventNotification = {
          url: webhookUrl,
          loggingEnabled: 'true',
          requireAcknowledgment: 'true',
          envelopeEvents: [
            { envelopeEventStatusCode: 'sent' },
            { envelopeEventStatusCode: 'delivered' },
            { envelopeEventStatusCode: 'completed' },
            { envelopeEventStatusCode: 'declined' },
            { envelopeEventStatusCode: 'voided' }
          ],
          recipientEvents: [
            { recipientEventStatusCode: 'sent' },
            { recipientEventStatusCode: 'delivered' },
            { recipientEventStatusCode: 'completed' },
            { recipientEventStatusCode: 'declined' }
          ]
        }
        console.log('DocuSign webhook configured for:', webhookUrl)
      } else {
        console.log('DocuSign webhook disabled - HTTPS required, running on:', baseUrl)
      }

      // Create the envelope
      const response = await fetch(`${this.baseUrl}/v2.1/accounts/${accountId}/envelopes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(envelopeDefinition)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('DocuSign create and send envelope error:', errorText)
        throw new Error(`Failed to create and send envelope: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to create and send DocuSign envelope:', error)
      throw new Error('Failed to create and send envelope for signing')
    }
  }

  /**
   * Send an envelope (change status from created to sent)
   */
  async sendEnvelope(envelopeId: string): Promise<any> {
    try {
      const { accessToken, accountId } = await this.ensureAuthenticated()

      const response = await fetch(`${this.baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status: 'sent' })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('DocuSign send envelope error:', errorText)
        throw new Error(`Failed to send envelope: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to send DocuSign envelope:', error)
      throw new Error('Failed to send envelope')
    }
  }

  /**
   * Get sender view URL for tagging/placing fields
   */
  async getSenderView(params: {
    envelopeId: string
    returnUrl: string
  }): Promise<any> {
    const { envelopeId, returnUrl } = params

    try {
      const { accessToken, accountId } = await this.ensureAuthenticated()

      const viewRequest = {
        returnUrl
      }

      const response = await fetch(`${this.baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/views/sender`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(viewRequest)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('DocuSign sender view error:', errorText)
        throw new Error(`Failed to get sender view: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get DocuSign sender view:', error)
      throw new Error('Failed to get sender view URL')
    }
  }

  /**
   * Download completed/signed envelope documents
   */
  async downloadEnvelopeDocuments(envelopeId: string): Promise<Buffer> {
    try {
      const { accessToken, accountId } = await this.ensureAuthenticated()

      const response = await fetch(`${this.baseUrl}/v2.1/accounts/${accountId}/envelopes/${envelopeId}/documents/combined`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/pdf'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('DocuSign download documents error:', errorText)
        throw new Error(`Failed to download documents: ${response.status}`)
      }

      // Return the PDF as a buffer
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('Failed to download DocuSign documents:', error)
      throw new Error('Failed to download signed documents')
    }
  }
}

// Export a singleton instance
export const docuSignClient = new DocuSignSimpleClient()