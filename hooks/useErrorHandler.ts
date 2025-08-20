import { useCallback } from 'react'
import { secureLogger } from '@/lib/logging/secure-logger'

interface ErrorHandlerOptions {
  context?: string
  showToUser?: boolean
  logLevel?: 'error' | 'warn' | 'info'
}

export function useErrorHandler() {
  const handleError = useCallback((
    error: unknown, 
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      context = 'Unknown context',
      showToUser = false,
      logLevel = 'error'
    } = options

    // Log the error securely
    const errorObj = error instanceof Error ? error : new Error(String(error))
    const metadata = {
      context,
      timestamp: new Date().toISOString(),
      userInitiated: showToUser
    }
    
    if (logLevel === 'error') {
      secureLogger.error(`Error in ${context}`, errorObj, metadata)
    } else if (logLevel === 'warn') {
      secureLogger.warn(`Warning in ${context}`, metadata)
    } else {
      secureLogger.info(`Info in ${context}`, metadata)
    }

    // In a real app, you might dispatch to a global error state
    // or show a toast notification if showToUser is true
    if (showToUser && error instanceof Error) {
      // You could integrate with a toast library here
      console.warn('User-facing error:', error.message)
    }

    return error instanceof Error ? error : new Error(String(error))
  }, [])

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncFn()
    } catch (error) {
      handleError(error, options)
      return null
    }
  }, [handleError])

  const createErrorHandler = useCallback((
    context: string,
    options: Omit<ErrorHandlerOptions, 'context'> = {}
  ) => {
    return (error: unknown) => handleError(error, { ...options, context })
  }, [handleError])

  return {
    handleError,
    handleAsyncError,
    createErrorHandler
  }
}