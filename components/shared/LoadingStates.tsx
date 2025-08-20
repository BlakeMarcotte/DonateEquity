import React from 'react'
import { AlertCircle, RefreshCw, CheckCircle } from 'lucide-react'

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }

  return (
    <RefreshCw 
      className={`animate-spin ${sizeClasses[size]} ${className}`} 
    />
  )
}

// Inline Loading Component
interface InlineLoadingProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ 
  text = 'Loading...', 
  size = 'md',
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <LoadingSpinner size={size} />
      <span className="text-gray-600">{text}</span>
    </div>
  )
}

// Page Loading Component
interface PageLoadingProps {
  title?: string
  description?: string
  className?: string
}

export const PageLoading: React.FC<PageLoadingProps> = ({ 
  title = 'Loading...',
  description,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto text-blue-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
        {description && (
          <p className="text-gray-600">{description}</p>
        )}
      </div>
    </div>
  )
}

// Error State Component
interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryText?: string
  className?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error. Please try again.',
  onRetry,
  retryText = 'Try Again',
  className = ''
}) => {
  return (
    <div className={`text-center p-6 ${className}`}>
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          <span>{retryText}</span>
        </button>
      )}
    </div>
  )
}

// Success State Component
interface SuccessStateProps {
  title?: string
  message?: string
  onContinue?: () => void
  continueText?: string
  className?: string
}

export const SuccessState: React.FC<SuccessStateProps> = ({
  title = 'Success!',
  message = 'The operation completed successfully.',
  onContinue,
  continueText = 'Continue',
  className = ''
}) => {
  return (
    <div className={`text-center p-6 ${className}`}>
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
        <CheckCircle className="h-6 w-6 text-green-600" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      
      {onContinue && (
        <button
          onClick={onContinue}
          className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          {continueText}
        </button>
      )}
    </div>
  )
}

// Button Loading State (for button components)
interface ButtonLoadingProps {
  loading: boolean
  children: React.ReactNode
  loadingText?: string
  disabled?: boolean
  className?: string
  [key: string]: unknown
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({ 
  loading, 
  children, 
  loadingText,
  disabled = false,
  className = '',
  ...props 
}) => {
  const isDisabled = loading || disabled

  return (
    <button 
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      <div className="flex items-center justify-center space-x-2">
        {loading && <LoadingSpinner size="sm" />}
        <span>{loading && loadingText ? loadingText : children}</span>
      </div>
    </button>
  )
}

// Card Loading Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  )
}