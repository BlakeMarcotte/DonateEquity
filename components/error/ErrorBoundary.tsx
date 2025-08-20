'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { secureLogger } from '@/lib/logging/secure-logger'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error securely without sensitive data
    secureLogger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      timestamp: new Date().toISOString()
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    this.setState({
      error,
      errorInfo
    })
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleReportBug = () => {
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      timestamp: new Date().toISOString()
    }
    
    // In a real app, this would send to an error reporting service
    secureLogger.info('User initiated bug report', {
      errorDetails: JSON.stringify(errorDetails)
    })
    
    // Copy error details to clipboard for user to report
    if (navigator.clipboard) {
      navigator.clipboard.writeText(
        `Error Report:\nMessage: ${errorDetails.message}\nTimestamp: ${errorDetails.timestamp}`
      )
    }
  }

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h2>
              
              <p className="text-gray-600 mb-6">
                We encountered an unexpected error. Our team has been notified and is working on a fix.
              </p>

              {this.props.showDetails && process.env.NODE_ENV === 'development' && (
                <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Error Details:</h3>
                  <p className="text-xs text-gray-600 font-mono break-all">
                    {this.state.error?.message}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
                
                <button
                  onClick={() => window.location.href = '/'}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors duration-200"
                >
                  <Home className="w-4 h-4" />
                  <span>Go Home</span>
                </button>

                <button
                  onClick={this.handleReportBug}
                  className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 font-medium rounded-lg transition-colors duration-200"
                >
                  <Bug className="w-4 h-4" />
                  <span>Report Issue</span>
                </button>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                Error ID: {Date.now().toString(36)}
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary