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
          'Authorization': `Bearer ${this.authToken!.token}`,
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseData = await response.json() as ApiResponse<T>

      if (!response.ok) {
        const error = new Error(
          responseData.error?.message || 'API request failed'
        ) as ValuationApiError
        error.code = this.mapStatusToErrorCode(response.status)
        error.statusCode = response.status
        error.details = responseData.error?.details

        secureLogger.error('Valuation API request failed', error, {
          endpoint,
          statusCode: response.status,
          method: options.method || 'GET',
        })

        throw error
      }

      secureLogger.apiRequest({
        method: options.method || 'GET',
        endpoint,
        statusCode: response.status,
        ip: 'outgoing',
      })

      return responseData.data as T
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

      const data = await response.json() as { token: string; expires_at: string }
      
      const authToken: ValuationAuthToken = {
        token: data.token,
        expiresAt: data.expires_at,
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
    
    const response = await this.makeRequest<ValuationUser>('/api/users/create', {
      method: 'POST',
      body: JSON.stringify({
        email: validated.email,
        first_name: validated.firstName,
        last_name: validated.lastName,
        phone: validated.phone,
      }),
    })

    secureLogger.audit('Valuation user created', {
      userId: response.id,
      action: 'create_valuation_user',
      resource: 'valuation_user',
      resourceId: response.id,
    })

    return response
  }

  /**
   * Create a new valuation
   */
  async createValuation(request: CreateValuationRequest): Promise<Valuation> {
    const validated = createValuationRequestSchema.parse(request)
    
    const response = await this.makeRequest<Valuation>('/api/valuations/create', {
      method: 'POST',
      body: JSON.stringify({
        user_id: validated.userId,
        company_info: validated.companyInfo,
      }),
    })

    secureLogger.audit('Valuation created', {
      userId: validated.userId,
      action: 'create_valuation',
      resource: 'valuation',
      resourceId: response.id,
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
      userId: response.userId,
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
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('attachment_type', attachmentType)

    const response = await fetch(
      `${this.config.apiUrl}/api/attachments/${validatedId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken!.token}`,
        },
        body: formData,
      }
    )

    if (!response.ok) {
      throw new Error(`Attachment upload failed: ${response.statusText}`)
    }

    const attachment = await response.json() as ValuationAttachment

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

    const body: Record<string, string> = {}
    
    if (params.userId) {
      body.user_id = userIdSchema.parse(params.userId)
    }
    if (params.valuationId) {
      body.valuation_id = valuationIdSchema.parse(params.valuationId)
    }

    const response = await this.makeRequest<{
      access_token: string
      login_url: string
      expires_at: string
    }>('/api/authentication/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    const sessionToken: ValuationSessionToken = {
      token: response.access_token,
      loginUrl: response.login_url,
      expiresAt: response.expires_at,
    }

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