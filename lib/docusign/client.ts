import * as docusign from 'docusign-esign'

// DocuSign client configuration following 2025 best practices
export class DocuSignClient {
  private apiClient: docusign.ApiClient
  private envelopesApi: docusign.EnvelopesApi
  
  constructor() {
    this.apiClient = new docusign.ApiClient()
    
    // Set base path for DocuSign API (demo environment)
    // For production, use: https://na1.docusign.net/restapi
    this.apiClient.setBasePath('https://demo.docusign.net/restapi')
    
    this.envelopesApi = new docusign.EnvelopesApi(this.apiClient)
  }

  /**
   * Authenticate using JWT (recommended for server-side applications)
   */
  async authenticateJWT(): Promise<string> {
    const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY
    const userId = process.env.DOCUSIGN_USER_ID
    const privateKey = process.env.DOCUSIGN_PRIVATE_KEY
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID

    if (!integrationKey || !userId || !privateKey || !accountId) {
      throw new Error('Missing required DocuSign environment variables')
    }

    try {
      // Configure JWT authentication
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
      
      return accessToken
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
  }): Promise<docusign.EnvelopeSummary> {
    const { signerEmail, signerName, documentPath, documentName, emailSubject, accountId } = params

    try {
      // Read the document file
      const fs = await import('fs/promises')
      const documentBytes = await fs.readFile(documentPath)
      const documentBase64 = documentBytes.toString('base64')

      // Create the envelope definition
      const envelopeDefinition: docusign.EnvelopeDefinition = {
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
  async getEnvelopeStatus(accountId: string, envelopeId: string): Promise<docusign.Envelope> {
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
  }): Promise<docusign.ViewUrl> {
    const { accountId, envelopeId, recipientEmail, recipientName, recipientId, returnUrl } = params

    try {
      const viewRequest: docusign.RecipientViewRequest = {
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