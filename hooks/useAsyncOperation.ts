import { useState, useCallback } from 'react'
import { useErrorHandler } from './useErrorHandler'

interface AsyncOperationState<T> {
  data: T | null
  loading: boolean
  error: string | null
  success: boolean
}

interface AsyncOperationOptions {
  context?: string
  onSuccess?: () => void
  onError?: (error: Error) => void
  resetOnExecute?: boolean
  showUserErrors?: boolean
}

export function useAsyncOperation<T = unknown>(
  options: AsyncOperationOptions = {}
) {
  const {
    context = 'async operation',
    onSuccess,
    onError,
    resetOnExecute = true,
    showUserErrors = false
  } = options

  const { handleError } = useErrorHandler()
  
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false
  })

  const execute = useCallback(async <R = T>(
    asyncFunction: () => Promise<R>
  ): Promise<R | null> => {
    if (resetOnExecute) {
      setState({
        data: null,
        loading: true,
        error: null,
        success: false
      })
    } else {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        success: false
      }))
    }

    try {
      const result = await asyncFunction()
      
      setState(prev => ({
        ...prev,
        data: result as T,
        loading: false,
        success: true
      }))

      onSuccess?.()
      return result
    } catch (error) {
      const handledError = handleError(error, {
        context,
        showToUser: showUserErrors
      })

      setState(prev => ({
        ...prev,
        loading: false,
        error: handledError.message,
        success: false
      }))

      onError?.(handledError)
      return null
    }
  }, [context, onSuccess, onError, resetOnExecute, showUserErrors, handleError])

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false
    })
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }, [])

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      success: true
    }))
  }, [])

  return {
    ...state,
    execute,
    reset,
    clearError,
    setData,
    // Convenience boolean states
    isIdle: !state.loading && !state.error && !state.success,
    hasData: state.data !== null,
    hasError: state.error !== null
  }
}

// Specialized hook for API calls
export function useApiOperation<T = unknown>(
  endpoint?: string,
  options: Omit<AsyncOperationOptions, 'context'> = {}
) {
  return useAsyncOperation<T>({
    ...options,
    context: endpoint ? `API call to ${endpoint}` : 'API call'
  })
}

// Specialized hook for form submissions
export function useFormSubmission<T = unknown>(
  formName?: string,
  options: Omit<AsyncOperationOptions, 'context'> = {}
) {
  return useAsyncOperation<T>({
    ...options,
    context: formName ? `${formName} form submission` : 'form submission',
    showUserErrors: true
  })
}