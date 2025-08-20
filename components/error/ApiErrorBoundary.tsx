'use client'

import React from 'react'
import ErrorBoundary from './ErrorBoundary'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ApiErrorBoundaryProps {
  children: React.ReactNode
  onRetry?: () => void
}

const ApiErrorFallback: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <div className="bg-white rounded-lg border border-red-200 p-6 text-center">
    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
      <AlertCircle className="h-6 w-6 text-red-600" />
    </div>
    
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Connection Error
    </h3>
    
    <p className="text-gray-600 mb-4">
      We&apos;re having trouble connecting to our servers. Please check your internet connection and try again.
    </p>
    
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Retry</span>
      </button>
    )}
  </div>
)

export default function ApiErrorBoundary({ children, onRetry }: ApiErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={<ApiErrorFallback onRetry={onRetry} />}
      onError={(error) => {
        // Log API-specific errors with additional context
        if (error.message.includes('fetch') || error.message.includes('network')) {
          // This is likely a network/API error
          console.error('API Error caught by boundary:', error)
        }
      }}
    >
      {children}
    </ErrorBoundary>
  )
}