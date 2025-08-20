'use client'

import React from 'react'
import ErrorBoundary from './ErrorBoundary'
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react'

interface PageErrorBoundaryProps {
  children: React.ReactNode
  pageName?: string
}

const PageErrorFallback: React.FC<{ pageName?: string }> = ({ pageName }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="max-w-lg w-full">
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
          <AlertTriangle className="h-8 w-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page Error
        </h1>
        
        <p className="text-gray-600 mb-6">
          {pageName 
            ? `We encountered an error while loading the ${pageName} page.`
            : 'We encountered an error while loading this page.'
          }
          {' '}Please try refreshing the page or return to the homepage.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            <span>Refresh Page</span>
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium rounded-lg transition-colors duration-200"
          >
            <Home className="w-4 h-4" />
            <span>Homepage</span>
          </button>
        </div>
      </div>
    </div>
  </div>
)

export default function PageErrorBoundary({ children, pageName }: PageErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={<PageErrorFallback pageName={pageName} />}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  )
}