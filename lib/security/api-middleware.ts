import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateRequest } from '@/lib/validation/schemas'

// Rate limiting in-memory store (in production, use Redis)
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Security headers configuration
export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'none';",
}

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  message?: string
}

const defaultRateLimit: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later'
}

// Specific rate limits for different endpoints
const rateLimits: Record<string, RateLimitConfig> = {
  '/api/auth/': { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // Auth endpoints: 10/15min
  '/api/campaigns/create': { windowMs: 60 * 60 * 1000, maxRequests: 5 }, // Campaign creation: 5/hour
  '/api/organizations/invite': { windowMs: 60 * 60 * 1000, maxRequests: 20 }, // Invitations: 20/hour
  '/api/files/upload': { windowMs: 60 * 60 * 1000, maxRequests: 50 }, // File uploads: 50/hour
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const xRealIP = request.headers.get('x-real-ip')
  const xForwardedFor = request.headers.get('x-forwarded-for')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (cfConnectingIP) return cfConnectingIP
  if (xRealIP) return xRealIP
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim()
  
  return '127.0.0.1' // Fallback for localhost
}

// Rate limiting middleware
export function checkRateLimit(request: NextRequest, pathname: string): { allowed: boolean; error?: string } {
  const clientIP = getClientIP(request)
  const now = Date.now()
  
  // Find the most specific rate limit that matches
  let rateLimit = defaultRateLimit
  for (const [path, config] of Object.entries(rateLimits)) {
    if (pathname.startsWith(path)) {
      rateLimit = config
      break
    }
  }
  
  const key = `${clientIP}:${pathname}`
  const entry = rateLimitStore.get(key)
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to trigger cleanup
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }
  }
  
  if (!entry || entry.resetTime < now) {
    // First request or window expired
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + rateLimit.windowMs
    })
    return { allowed: true }
  }
  
  if (entry.count >= rateLimit.maxRequests) {
    return {
      allowed: false,
      error: rateLimit.message || defaultRateLimit.message
    }
  }
  
  // Increment counter
  entry.count += 1
  rateLimitStore.set(key, entry)
  
  return { allowed: true }
}

// Input sanitization middleware
export function sanitizeRequestBody(body: unknown): unknown {
  if (typeof body !== 'object' || body === null) {
    return body
  }
  
  if (Array.isArray(body)) {
    return body.map(sanitizeRequestBody)
  }
  
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim()
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeRequestBody(value)
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

// API validation middleware
export async function validateApiRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    let body: unknown
    
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      const text = await request.text()
      if (text) {
        body = JSON.parse(text)
        body = sanitizeRequestBody(body)
      }
    }
    
    const validation = validateRequest(schema, body)
    
    if (!validation.success) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Validation failed', details: validation.error },
          { status: 400 }
        )
      }
    }
    
    return { success: true, data: validation.data }
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }
  }
}

// Security middleware wrapper
export function withSecurity<T>(
  handler: (request: NextRequest, validatedData?: T) => Promise<NextResponse>,
  schema?: z.ZodSchema<T>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const pathname = new URL(request.url).pathname
    
    // Check rate limiting
    const rateLimitResult = checkRateLimit(request, pathname)
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { error: rateLimitResult.error },
        { status: 429 }
      )
      
      // Add security headers
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    }
    
    // Validate request if schema provided
    let validatedData: T | undefined
    if (schema) {
      const validation = await validateApiRequest(request, schema)
      if (!validation.success) {
        // Add security headers to error response
        Object.entries(securityHeaders).forEach(([key, value]) => {
          validation.response.headers.set(key, value)
        })
        return validation.response
      }
      validatedData = validation.data
    }
    
    // Call the actual handler
    try {
      const response = await handler(request, validatedData)
      
      // Add security headers to success response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      
      return response
    } catch (error) {
      console.error('API Handler Error:', error)
      
      const errorResponse = NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
      
      // Add security headers to error response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        errorResponse.headers.set(key, value)
      })
      
      return errorResponse
    }
  }
}

// Logging utility for security events
export function logSecurityEvent(
  event: 'rate_limit_exceeded' | 'validation_failed' | 'auth_failed' | 'suspicious_activity',
  details: {
    ip?: string
    userAgent?: string
    endpoint?: string
    userId?: string
    error?: string
    timestamp?: Date
  }
) {
  const logEntry = {
    event,
    ...details,
    timestamp: details.timestamp || new Date(),
  }
  
  // In production, send to secure logging service
  console.warn('SECURITY EVENT:', JSON.stringify(logEntry))
}

// CORS helper
export function addCORSHeaders(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  response.headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization')
  
  return response
}