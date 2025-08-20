'use client'

import React, { ReactNode, FormEvent } from 'react'
import { X } from 'lucide-react'
import { InlineLoading, SuccessState, ErrorState } from './LoadingStates'

interface FormModalProps {
  // Modal State
  isOpen: boolean
  onClose: () => void
  
  // Form Configuration
  title: string
  description?: string
  children: ReactNode
  onSubmit: (e: FormEvent) => void
  
  // Button Configuration  
  submitText?: string
  cancelText?: string
  submitDisabled?: boolean
  
  // Loading States
  loading?: boolean
  loadingText?: string
  
  // Success State
  success?: boolean
  successTitle?: string
  successMessage?: string
  onSuccessClose?: () => void
  
  // Error State
  error?: string | null
  onErrorRetry?: () => void
  
  // Styling
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  submitDisabled = false,
  loading = false,
  loadingText = 'Saving...',
  success = false,
  successTitle = 'Success!',
  successMessage = 'Your changes have been saved.',
  onSuccessClose,
  error = null,
  onErrorRetry,
  maxWidth = 'md',
  className = ''
}) => {
  if (!isOpen) return null

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }

  // Show success state
  if (success) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onSuccessClose || onClose} />
          
          <div className={`relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full ${maxWidthClasses[maxWidth]} sm:p-6 ${className}`}>
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                onClick={onSuccessClose || onClose}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <SuccessState
              title={successTitle}
              message={successMessage}
              onContinue={onSuccessClose || onClose}
              continueText="Close"
            />
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
          
          <div className={`relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full ${maxWidthClasses[maxWidth]} sm:p-6 ${className}`}>
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                type="button"
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                onClick={onClose}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <ErrorState
              title="Error"
              message={error}
              onRetry={onErrorRetry}
              retryText="Try Again"
            />
          </div>
        </div>
      </div>
    )
  }

  // Show main form
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className={`relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full ${maxWidthClasses[maxWidth]} sm:p-6 ${className}`}>
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900 pr-8">
                {title}
              </h3>
              
              {description && (
                <p className="mt-2 text-sm text-gray-600">{description}</p>
              )}
              
              <form onSubmit={onSubmit} className="mt-4">
                <div className="space-y-4">
                  {children}
                </div>
                
                <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 sm:w-auto sm:text-sm"
                    onClick={onClose}
                    disabled={loading}
                  >
                    {cancelText}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading || submitDisabled}
                    className={`inline-flex w-full justify-center rounded-lg px-4 py-2 text-base font-medium text-white shadow-sm sm:w-auto sm:text-sm ${
                      loading || submitDisabled
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    } transition-colors duration-200`}
                  >
                    {loading ? (
                      <InlineLoading text={loadingText} size="sm" />
                    ) : (
                      submitText
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}