/**
 * 409.ai Valuation Service Client (AI Appraisal)
 * Following enterprise security standards with no any types
 */

import { secureLogger } from '@/lib/logging/secure-logger'
import {
  type ValuationAuthToken,
  type ValuationSessionToken,
  type ValuationUser,
  type CreateValuationUserRequest,
  type Valuation,
  type CreateValuationRequest,
  type UpdateValuationRequest,
  type ValuationAttachment,
  type ApiResponse,
  type ValuationApiError,
  type ValuationServiceConfig,
} from './types'
import {
  createValuationUserSchema,
  createValuationRequestSchema,
  updateValuationRequestSchema,
  authTokenSchema,
  sessionTokenSchema,
  valuationIdSchema,
  userIdSchema,
  valuationEnvSchema,
} from './schemas'

export class ValuationClient {
  private config: ValuationServiceConfig
  private authToken: ValuationAuthToken | null = null
  private tokenExpiresAt: Date | null = null

  constructor(config?: Partial<ValuationServiceConfig>) {
    // Only validate environment variables if config is not provided
    // This allows the module to load during build time
    if (!config) {
      this.config = {
        clientId: '',
        clientSecret: '',
        apiUrl: '',
        timeout: 30000, // 30 second default timeout
      }
    } else {
      this.config = {
        clientId: config.clientId || '',
        clientSecret: config.clientSecret || '',
        apiUrl: config.apiUrl || '',
        timeout: config.timeout || 30000,
      }
    }

    // Only log if we have actual config (not during build)
    if (this.config.apiUrl) {
      secureLogger.info('ValuationClient initialized', {
        apiUrl: this.config.apiUrl,
        clientId: this.config.clientId.substring(0, 4) + '****',
      })
    }
  }

  /**
   * Validate configuration when actually needed
   */
  private validateConfig(): void {
    const envConfig = {
      VALUATION_409AI_CLIENT_ID: process.env.VALUATION_409AI_CLIENT_ID,
      VALUATION_409AI_CLIENT_SECRET: process.env.VALUATION_409AI_CLIENT_SECRET,
      VALUATION_409AI_API_URL: process.env.VALUATION_409AI_API_URL,
    }

    const validatedEnv = valuationEnvSchema.parse(envConfig)

    // Update config with environment variables if not already set
    if (!this.config.clientId) {
      this.config.clientId = validatedEnv.VALUATION_409AI_CLIENT_ID
    }
    if (!this.config.clientSecret) {
      this.config.clientSecret = validatedEnv.VALUATION_409AI_CLIENT_SECRET
    }
    if (!this.config.apiUrl) {
      this.config.apiUrl = validatedEnv.VALUATION_409AI_API_URL
    }
  }

  /**
   * Make authenticated API request with proper error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      // Ensure we have a valid auth token
      await this.ensureAuthenticated()

      const url = `${this.config.apiUrl}${endpoint}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!)

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'authentication': this.authToken!.token,
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseData = await response.json() as ApiResponse<T>

      if (!response.ok) {
        // 409ai API error format: {status: "error", message: "...", errors: [...]}
        const responseBodyStr = JSON.stringify(responseData)
        const responseAsRecord = responseData as unknown as Record<string, unknown>
        const apiMessage = responseAsRecord.message as string || 'API request failed'
        
        const error = new Error(apiMessage) as ValuationApiError
        error.code = this.mapStatusToErrorCode(response.status)
        error.statusCode = response.status
        error.details = responseData.error?.details || responseAsRecord.errors
        error.responseBody = responseBodyStr

        secureLogger.error('Valuation API request failed', error, {
          endpoint,
          statusCode: response.status,
          method: options.method || 'GET',
          responseBody: responseBodyStr,
          requestBody: options.body,
        })

        throw error
      }

      secureLogger.apiRequest({
        method: options.method || 'GET',
        endpoint,
        statusCode: response.status,
        ip: 'outgoing',
      })

      // Log the actual response structure for debugging
      secureLogger.info('API Response structure', {
        endpoint,
        hasData: 'data' in responseData,
        responseKeys: Object.keys(responseData),
        responseType: typeof responseData,
      })

      // 409ai API doesn't wrap response in 'data' field
      return (responseData.data || responseData) as T
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        const timeoutError = new Error('Request timeout') as ValuationApiError
        timeoutError.code = 'SERVER_ERROR'
        timeoutError.statusCode = 408
        throw timeoutError
      }
      throw error
    }
  }

  /**
   * Map HTTP status codes to error codes
   */
  private mapStatusToErrorCode(status: number): ValuationApiError['code'] {
    switch (status) {
      case 401:
      case 403:
        return 'AUTH_FAILED'
      case 400:
      case 422:
        return 'VALIDATION_ERROR'
      case 404:
        return 'NOT_FOUND'
      case 429:
        return 'RATE_LIMITED'
      default:
        return 'SERVER_ERROR'
    }
  }

  /**
   * Ensure we have a valid authentication token
   */
  private async ensureAuthenticated(): Promise<void> {
    // Validate configuration first
    this.validateConfig()

    if (this.authToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return
    }

    await this.authenticate()
  }

  /**
   * Authenticate with the 409.ai service
   */
  async authenticate(): Promise<ValuationAuthToken> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/authentication/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }

      const data = await response.json() as { authentication: string }
      
      // The API returns 'authentication' instead of 'token'
      // For expires_at, we'll set it to 24 hours from now (based on the JWT exp claim)
      const authToken: ValuationAuthToken = {
        token: data.authentication,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      const validated = authTokenSchema.parse(authToken)
      
      this.authToken = validated
      this.tokenExpiresAt = new Date(validated.expiresAt)

      secureLogger.audit('Valuation service authenticated', {
        userId: 'system',
        action: 'valuation_auth',
        resource: '409ai',
      })

      return validated
    } catch (error) {
      secureLogger.error('Valuation authentication failed', error)
      throw error
    }
  }

  /**
   * Create a new user in the valuation system
   */
  async createUser(userData: CreateValuationUserRequest): Promise<ValuationUser> {
    const validated = createValuationUserSchema.parse(userData)
    
    await this.ensureAuthenticated()
    
    try {
      const response = await this.makeRequest<ValuationUser>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          authentication: this.authToken!.token,
          email: validated.email,
          first_name: validated.firstName,
          last_name: validated.lastName,
          phone: validated.phone,
        }),
      })

      secureLogger.audit('Valuation user created', {
        userId: response.user_uuid,
        action: 'create_valuation_user',
        resource: 'valuation_user',
        resourceId: response.user_uuid,
      })

      return response
    } catch (error) {
      // If user already exists (email taken), try to find and return existing user
      const isValuationError = error && typeof error === 'object' && 'statusCode' in error
      const valuationError = error as ValuationApiError
      const errorDetails = isValuationError && 'details' in error ? valuationError.details : undefined
      const errorMessage = error && typeof error === 'object' && 'message' in error ? (error as Error).message : ''
      const responseBody = isValuationError && 'responseBody' in error ? valuationError.responseBody || '' : ''
      const errorDetailsStr = errorDetails ? JSON.stringify(errorDetails) : ''
      
      const hasAlreadyTaken = 
        errorDetailsStr.includes('already been taken') || 
        errorMessage.includes('already been taken') ||
        responseBody.includes('already been taken')
      
      secureLogger.info('User creation error details', {
        isValuationError,
        statusCode: isValuationError ? valuationError.statusCode : undefined,
        errorMessage,
        errorDetailsStr,
        responseBodyLength: responseBody.length,
        hasAlreadyTaken,
      })
      
      if (isValuationError && valuationError.statusCode === 422 && hasAlreadyTaken) {
        secureLogger.info('User already exists, fetching existing user', {
          email: validated.email,
        })
        
        // Get list of users and find by email
        const users = await this.makeRequest<ValuationUser[]>('/api/users', {
          method: 'GET',
        })
        
        secureLogger.info('Fetched users list', {
          usersCount: Array.isArray(users) ? users.length : 'not-array',
          firstUserKeys: Array.isArray(users) && users.length > 0 ? Object.keys(users[0]) : [],
          firstUserSample: Array.isArray(users) && users.length > 0 ? JSON.stringify(users[0]) : 'none',
        })
        
        const existingUser = Array.isArray(users) ? users.find(u => u.email === validated.email) : undefined
        
        if (existingUser) {
          secureLogger.info('Found existing user', {
            userKeys: Object.keys(existingUser),
            hasId: 'id' in existingUser,
            userSample: JSON.stringify(existingUser),
          })
          
          secureLogger.audit('Existing valuation user retrieved', {
            userId: existingUser.user_uuid,
            action: 'get_existing_valuation_user',
            resource: 'valuation_user',
            resourceId: existingUser.user_uuid,
          })
          
          return existingUser
        }
        
        secureLogger.error('Could not find existing user in list', undefined, {
          email: validated.email,
          usersCount: Array.isArray(users) ? users.length : 'not-array',
        })
      }
      
      throw error
    }
  }

  /**
   * Create a new valuation
   */
  async createValuation(request: CreateValuationRequest): Promise<Valuation> {
    const validated = createValuationRequestSchema.parse(request)
    
    await this.ensureAuthenticated()
    
    // Convert to 409ai API format with separate objects
    const companyInfo: Record<string, unknown> = {}
    const companyDetails: Record<string, unknown> = {}
    const summary: Record<string, unknown> = {}
    
    if (validated.companyInfo) {
      const info = validated.companyInfo
      
      // company_info object
      if (info.legalName) companyInfo.company_name = info.legalName
      if (info.inceptionDate && info.inceptionDate !== '') companyInfo.company_inception_date = info.inceptionDate
      if (info.revenueModel) companyInfo.revenue_model = info.revenueModel
      if (info.sicCode) companyInfo.industry_id = info.sicCode
      if (info.exitTimeline && info.exitTimeline !== '') companyInfo.exit_timeline = info.exitTimeline
      if (info.lawFirm) companyInfo.law_firm = info.lawFirm
      companyInfo.business_status = 'Pre-Revenue' // Default value
      if (info.numberOfEmployees) companyInfo.employee_no = info.numberOfEmployees
      companyInfo.estimated_months_of_runway = 0 // Default value
      
      // company_details object
      companyDetails.overview = info.companyOverview || 'Company overview to be provided'
      
      // summary object (required fields)
      summary.person_name = 'Valuation Contact'
      summary.title = 'Contact'
      summary.currency = 'USD'
      summary.valuation_date = new Date().toISOString().split('T')[0]
    }
    
    secureLogger.info('Creating valuation with 409ai format', {
      userId: validated.userId,
      companyInfo: JSON.stringify(companyInfo),
      companyDetails: JSON.stringify(companyDetails),
      summary: JSON.stringify(summary),
    })
    
    const response = await this.makeRequest<Valuation>('/api/valuations', {
      method: 'POST',
      body: JSON.stringify({
        authentication: this.authToken!.token,
        user_id: validated.userId,
        company_info: companyInfo,
        company_details: companyDetails,
        summary: summary,
      }),
    })

    secureLogger.audit('Valuation created', {
      userId: validated.userId,
      action: 'create_valuation',
      resource: 'valuation',
      resourceId: response.valuation_uuid,
    })

    return response
  }

  /**
   * Update an existing valuation
   */
  async updateValuation(
    valuationId: string,
    updates: UpdateValuationRequest
  ): Promise<Valuation> {
    const validatedId = valuationIdSchema.parse(valuationId)
    const validated = updateValuationRequestSchema.parse(updates)
    
    const response = await this.makeRequest<Valuation>(
      `/api/valuations/${validatedId}`,
      {
        method: 'PUT',
        body: JSON.stringify(validated),
      }
    )

    secureLogger.audit('Valuation updated', {
      userId: response.user_uuid,
      action: 'update_valuation',
      resource: 'valuation',
      resourceId: validatedId,
    })

    return response
  }

  /**
   * Get valuation status
   */
  async getValuation(valuationId: string): Promise<Valuation> {
    const validatedId = valuationIdSchema.parse(valuationId)
    
    return this.makeRequest<Valuation>(`/api/valuations/${validatedId}`)
  }

  /**
   * Upload attachment to valuation
   */
  async uploadAttachment(
    valuationId: string,
    file: File,
    attachmentType: string
  ): Promise<ValuationAttachment> {
    const validatedId = valuationIdSchema.parse(valuationId)
    
    await this.ensureAuthenticated()
    
    const formData = new FormData()
    formData.append('authentication', this.authToken!.token)
    formData.append('valuation_uuid', validatedId)
    formData.append('file', file)

    secureLogger.info('Uploading attachment to 409ai', {
      valuationId: validatedId,
      fileName: file.name,
      fileSize: file.size,
      attachmentType,
    })

    const response = await fetch(
      `${this.config.apiUrl}/api/attachments`,
      {
        method: 'POST',
        body: formData,
      }
    )

    const responseText = await response.text()
    
    secureLogger.info('Attachment upload response', {
      statusCode: response.status,
      statusText: response.statusText,
      responseBody: responseText.substring(0, 500),
    })

    if (!response.ok) {
      throw new Error(`Attachment upload failed: ${response.status} ${response.statusText} - ${responseText}`)
    }

    const attachment = JSON.parse(responseText) as ValuationAttachment

    secureLogger.audit('Valuation attachment uploaded', {
      userId: 'system',
      action: 'upload_attachment',
      resource: 'valuation_attachment',
      resourceId: attachment.id,
    }, {
      valuationId: validatedId,
      fileName: file.name,
      fileSize: file.size,
    })

    return attachment
  }

  /**
   * Generate session token for user access
   */
  async generateSessionToken(
    params: { userId?: string; valuationId?: string }
  ): Promise<ValuationSessionToken> {
    if (!params.userId && !params.valuationId) {
      throw new Error('Either userId or valuationId must be provided')
    }

    await this.ensureAuthenticated()

    const body: Record<string, string> = {
      authentication: this.authToken!.token,
    }
    
    if (params.userId) {
      body.user_id = userIdSchema.parse(params.userId)
    }
    if (params.valuationId) {
      body.valuation_id = valuationIdSchema.parse(params.valuationId)
    }

    const response = await this.makeRequest<{
      authentication: string
      login_url: string
    }>('/api/authentication/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    secureLogger.info('Session token response received', {
      responseKeys: Object.keys(response),
      hasAuthentication: 'authentication' in response,
      hasLoginUrl: 'login_url' in response,
      loginUrlValue: response.login_url,
    })

    // Convert relative login URL to absolute URL
    const loginUrl = response.login_url.startsWith('http') 
      ? response.login_url 
      : `${this.config.apiUrl}${response.login_url}`

    const sessionToken: ValuationSessionToken = {
      token: response.authentication,
      loginUrl: loginUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Default 24 hours
    }

    secureLogger.info('Validating session token', {
      tokenLength: sessionToken.token?.length || 0,
      loginUrl: sessionToken.loginUrl,
      expiresAt: sessionToken.expiresAt,
    })

    const validated = sessionTokenSchema.parse(sessionToken)

    secureLogger.audit('Session token generated', {
      userId: params.userId || 'system',
      action: 'generate_session_token',
      resource: 'session',
    })

    return validated
  }

  /**
   * List user valuations
   */
  async listUserValuations(userId: string): Promise<Valuation[]> {
    const validatedId = userIdSchema.parse(userId)
    
    return this.makeRequest<Valuation[]>(`/api/valuations?user_id=${validatedId}`)
  }
}

// Export lazy-loaded singleton instance for convenience
let _valuationClient: ValuationClient | null = null

export const valuationClient = {
  getInstance(): ValuationClient {
    if (!_valuationClient) {
      _valuationClient = new ValuationClient()
    }
    return _valuationClient
  }
}