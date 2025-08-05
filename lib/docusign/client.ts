// DocuSign client configuration following 2025 best practices
export class DocuSignClient {
  private apiClient: any
  private envelopesApi: any
  private docusign: any
  
  constructor() {
    // Dynamic import to fix Next.js compatibility issues
    this.docusign = require('docusign-esign')
    this.apiClient = new this.docusign.ApiClient()
    
    // Set base path for DocuSign API (demo environment)
    // For production, use: https://na1.docusign.net/restapi
    this.apiClient.setBasePath('https://demo.docusign.net/restapi')
    
    this.envelopesApi = new this.docusign.EnvelopesApi(this.apiClient)
  }

  /**
   * Authenticate using JWT (recommended for server-side applications)
   */
  async authenticateJWT(): Promise<{ accessToken: string; accountId: string }> {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
    const userId = process.env.DOCUSIGN_USER_ID
    const privateKey = process.env.DOCUSIGN_PRIVATE_KEY

    if (!integrationKey || !userId || !privateKey) {
      throw new Error('Missing required DocuSign environment variables')
    }

    try {
      // Configure JWT authentication for demo environment
      this.apiClient.setOAuthBasePath('https://account-d.docusign.com')
      
      // Get access token using JWT
      const results = await this.apiClient.requestJWTUserToken(
        integrationKey,
        userId,
        ['signature', 'impersonation'],
        Buffer.from(privateKey, 'base64'),
        3600 // 1 hour expiration
      )

      const accessToken = results.body.access_token
      
      // Set access token for API calls
      this.apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`)
      
      // Get user info to find account ID
      const userInfo = await this.apiClient.getUserInfo(accessToken)
      const accounts = userInfo.accounts
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No DocuSign accounts found')
      }
      
      // Use the first account (demo account)
      const accountId = accounts[0].accountId
      
      // Set the base path for API calls using the demo environment
      this.apiClient.setBasePath(`https://demo.docusign.net/restapi`)
      
      return { accessToken, accountId }
    } catch (error) {
      console.error('DocuSign JWT authentication failed:', error)
      throw new Error('Failed to authenticate with DocuSign')
    }
  }

  /**
   * Create an envelope with a document for signing
   */
  async createEnvelope(params: {
    signerEmail: string
    signerName: string
    documentPath: string
    documentName: string
    emailSubject: string
    accountId: string
  }): Promise<any> {
    const { signerEmail, signerName, documentPath, documentName, emailSubject, accountId } = params

    try {
      // Read the document file
      const fs = await import('fs/promises')
      const documentBytes = await fs.readFile(documentPath)
      const documentBase64 = documentBytes.toString('base64')

      // Create the envelope definition
      const envelopeDefinition = {
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
            tabs: {
              signHereTabs: [{
                documentId: '1',
                pageNumber: '1',
                recipientId: '1',
                tabLabel: 'SignHereTab',
                xPosition: '195',
                yPosition: '147'
              }]
            }
          }]
        },
        status: 'sent'
      }

      // Create the envelope
      const result = await this.envelopesApi.createEnvelope(accountId, {
        envelopeDefinition
      })

      return result
    } catch (error) {
      console.error('Failed to create DocuSign envelope:', error)
      throw new Error('Failed to create envelope for signing')
    }
  }

  /**
   * Get envelope status
   */
  async getEnvelopeStatus(accountId: string, envelopeId: string): Promise<any> {
    try {
      const result = await this.envelopesApi.getEnvelope(accountId, envelopeId)
      return result
    } catch (error) {
      console.error('Failed to get DocuSign envelope status:', error)
      throw new Error('Failed to get envelope status')
    }
  }

  /**
   * Get recipient view URL for embedded signing
   */
  async getRecipientView(params: {
    accountId: string
    envelopeId: string
    recipientEmail: string
    recipientName: string
    recipientId: string
    returnUrl: string
  }): Promise<any> {
    const { accountId, envelopeId, recipientEmail, recipientName, recipientId, returnUrl } = params

    try {
      const viewRequest: any = {
        authenticationMethod: 'none',
        email: recipientEmail,
        userName: recipientName,
        recipientId,
        returnUrl
      }

      const result = await this.envelopesApi.createRecipientView(accountId, envelopeId, {
        recipientViewRequest: viewRequest
      })

      return result
    } catch (error) {
      console.error('Failed to get DocuSign recipient view:', error)
      throw new Error('Failed to get recipient view URL')
    }
  }
}

// Export a singleton instance
export const docuSignClient = new DocuSignClient()