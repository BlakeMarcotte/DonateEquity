interface LogLevel {
  INFO: 'info'
  WARN: 'warn' 
  ERROR: 'error'
  SECURITY: 'security'
  AUDIT: 'audit'
}

const LOG_LEVELS: LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SECURITY: 'security',
  AUDIT: 'audit'
}

interface LogEntry {
  level: LogLevel[keyof LogLevel]
  message: string
  timestamp: Date
  userId?: string
  sessionId?: string
  ip?: string
  userAgent?: string
  endpoint?: string
  method?: string
  statusCode?: number
  error?: {
    name: string
    message: string
    stack?: string
  }
  metadata?: Record<string, unknown>
}

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'ssn',
  'taxId',
  'creditCard',
  'cvv',
  'pin'
]

// Sanitize data to remove sensitive information
function sanitizeForLogging(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data
  }
  
  if (typeof data === 'string') {
    // Don't log very long strings that might contain sensitive data
    if (data.length > 1000) {
      return `[TRUNCATED: ${data.length} characters]`
    }
    return data
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForLogging)
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {}
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase()
      
      // Check if this field contains sensitive data
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field.toLowerCase())
      )
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = sanitizeForLogging(value)
      }
    }
    
    return sanitized
  }
  
  return data
}

// Format error for logging (without exposing sensitive stack traces)
function formatError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      // Only include stack traces in development
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  }
  
  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : 'An unknown error occurred'
  }
}

// Core logging function
function writeLog(entry: LogEntry): void {
  // Sanitize the entire log entry
  const sanitizedEntry = {
    ...entry,
    metadata: entry.metadata ? sanitizeForLogging(entry.metadata) : undefined
  }
  
  // In production, this would send to a secure logging service
  // For now, use console with structured format
  const logLine = JSON.stringify(sanitizedEntry)
  
  switch (entry.level) {
    case LOG_LEVELS.ERROR:
    case LOG_LEVELS.SECURITY:
      console.error(logLine)
      break
    case LOG_LEVELS.WARN:
      console.warn(logLine)
      break
    case LOG_LEVELS.AUDIT:
      console.info('[AUDIT]', logLine)
      break
    default:
      console.log(logLine)
  }
}

// Public logging interface
export const secureLogger = {
  info: (message: string, metadata?: Record<string, unknown>) => {
    writeLog({
      level: LOG_LEVELS.INFO,
      message,
      timestamp: new Date(),
      metadata
    })
  },
  
  warn: (message: string, metadata?: Record<string, unknown>) => {
    writeLog({
      level: LOG_LEVELS.WARN,
      message,
      timestamp: new Date(),
      metadata
    })
  },
  
  error: (message: string, error?: unknown, metadata?: Record<string, unknown>) => {
    writeLog({
      level: LOG_LEVELS.ERROR,
      message,
      timestamp: new Date(),
      error: error ? formatError(error) : undefined,
      metadata
    })
  },
  
  security: (message: string, details: {
    userId?: string
    ip?: string
    userAgent?: string
    endpoint?: string
    method?: string
    statusCode?: number
  }, metadata?: Record<string, unknown>) => {
    writeLog({
      level: LOG_LEVELS.SECURITY,
      message,
      timestamp: new Date(),
      ...details,
      metadata
    })
  },
  
  audit: (message: string, details: {
    userId: string
    action: string
    resource?: string
    resourceId?: string
    ip?: string
    userAgent?: string
  }, metadata?: Record<string, unknown>) => {
    writeLog({
      level: LOG_LEVELS.AUDIT,
      message,
      timestamp: new Date(),
      ...details,
      metadata
    })
  },
  
  // API request logging
  apiRequest: (details: {
    method: string
    endpoint: string
    statusCode: number
    responseTime?: number
    userId?: string
    ip?: string
    userAgent?: string
    error?: unknown
  }) => {
    const level = details.statusCode >= 500 ? LOG_LEVELS.ERROR : 
                  details.statusCode >= 400 ? LOG_LEVELS.WARN : 
                  LOG_LEVELS.INFO
    
    writeLog({
      level,
      message: `API ${details.method} ${details.endpoint} - ${details.statusCode}`,
      timestamp: new Date(),
      ...details,
      error: details.error ? formatError(details.error) : undefined
    })
  }
}

// Express-style request logging middleware
export function createRequestLogger() {
  return (req: {
    method: string
    url: string
    headers: { [key: string]: string | string[] | undefined }
    ip?: string
  }, res: {
    statusCode: number
    end?: (...args: unknown[]) => void
  }, next?: () => void) => {
    const startTime = Date.now()
    
    const originalEnd = res.end
    res.end = function(...args: unknown[]) {
      const responseTime = Date.now() - startTime
      
      secureLogger.apiRequest({
        method: req.method,
        endpoint: req.url,
        statusCode: res.statusCode,
        responseTime,
        ip: req.ip || 'unknown',
        userAgent: Array.isArray(req.headers['user-agent']) 
          ? req.headers['user-agent'][0] 
          : req.headers['user-agent'] || 'unknown'
      })
      
      return originalEnd?.apply(this, args)
    }
    
    if (next) next()
  }
}

// Helper to safely log request/response without sensitive data
export function logApiCall(
  method: string,
  endpoint: string,
  statusCode: number,
  userId?: string,
  error?: unknown,
  requestData?: unknown,
  responseData?: unknown
) {
  secureLogger.apiRequest({
    method,
    endpoint,
    statusCode,
    userId,
    error,
    ip: 'server' // Internal call
  })
  
  if (error || statusCode >= 400) {
    secureLogger.error(
      `API call failed: ${method} ${endpoint}`,
      error,
      {
        statusCode,
        userId,
        requestData: sanitizeForLogging(requestData),
        responseData: statusCode < 500 ? sanitizeForLogging(responseData) : '[HIDDEN]'
      }
    )
  }
}

// Export log levels for external use
export { LOG_LEVELS }