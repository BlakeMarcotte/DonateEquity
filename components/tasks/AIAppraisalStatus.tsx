'use client'

import { useState, useEffect } from 'react'
import { Task } from '@/types/task'
import { 
  Bot, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  Download
} from 'lucide-react'

interface AIAppraisalStatusProps {
  task: Task
  onRefresh?: () => void
}

interface ValuationStatus {
  success: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'not_started' | 'unknown'
  valuationId?: string
  valuationAmount?: number
  reportUrl?: string
  completedAt?: string
  message?: string
}

export function AIAppraisalStatus({ task, onRefresh }: AIAppraisalStatusProps) {
  const [statusData, setStatusData] = useState<ValuationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = async () => {
    try {
      const token = await (window as unknown as { firebase?: { auth(): { currentUser?: { getIdToken(): Promise<string> } } } }).firebase?.auth()?.currentUser?.getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/valuation/status?taskId=${task.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch status')
      }

      const data = await response.json()
      setStatusData(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStatus()
    onRefresh?.()
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Pending',
          description: 'Your AI Appraisal request is queued for processing'
        }
      case 'in_progress':
        return {
          icon: Bot,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Processing',
          description: 'AI is analyzing your company data and generating the valuation'
        }
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Completed',
          description: 'Your AI Appraisal is ready for review'
        }
      case 'failed':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Failed',
          description: 'There was an issue processing your valuation. Please contact support.'
        }
      case 'not_started':
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Not Started',
          description: 'AI Appraisal has not been initiated yet'
        }
      default:
        return {
          icon: AlertCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          description: 'Status unknown - please refresh or contact support'
        }
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Appraisal Status</h3>
            <p className="text-gray-600 mt-1">Loading current status...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mt-1">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Error Loading Status</h3>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            title="Retry"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    )
  }

  if (!statusData) {
    return null
  }

  const statusDisplay = getStatusDisplay(statusData.status)
  const StatusIcon = statusDisplay.icon

  return (
    <div className={`border rounded-lg p-6 ${statusDisplay.bgColor} ${statusDisplay.borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`w-8 h-8 bg-white rounded-full flex items-center justify-center mt-1 shadow-sm`}>
            <StatusIcon className={`w-5 h-5 ${statusDisplay.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">AI Appraisal</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusDisplay.color} ${statusDisplay.bgColor} border`}>
                {statusDisplay.label}
              </span>
            </div>
            <p className="text-gray-700 mt-1">{statusDisplay.description}</p>
            {statusData.message && (
              <p className="text-sm text-gray-600 mt-2">{statusData.message}</p>
            )}
            
            {/* Valuation Results */}
            {statusData.status === 'completed' && statusData.valuationAmount && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">Valuation Amount</h4>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      ${statusData.valuationAmount.toLocaleString()}
                    </p>
                    {statusData.completedAt && (
                      <p className="text-sm text-gray-600 mt-1">
                        Completed on {new Date(statusData.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  {statusData.reportUrl && (
                    <div className="flex space-x-2">
                      <a
                        href={statusData.reportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>View Report</span>
                      </a>
                      <a
                        href={statusData.reportUrl}
                        download
                        className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium border"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Information */}
            {statusData.status === 'in_progress' && (
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Bot className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">AI Analysis in Progress</p>
                    <p className="mt-1">
                      Our AI is analyzing your company data, market comparables, and financial metrics. 
                      This typically takes 1-2 business days.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {statusData.status === 'pending' && (
              <div className="mt-4 p-3 bg-yellow-100 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Queued for Processing</p>
                    <p className="mt-1">
                      Your valuation request is in the queue. Processing will begin shortly.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-500 hover:bg-white hover:text-gray-700 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
          title="Refresh Status"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Valuation ID for debugging (only in development) */}
      {process.env.NODE_ENV === 'development' && statusData.valuationId && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Valuation ID: {statusData.valuationId}
          </p>
        </div>
      )}
    </div>
  )
}