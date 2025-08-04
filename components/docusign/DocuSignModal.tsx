'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { AlertCircle, FileText, Shield, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface DocuSignModalProps {
  isOpen: boolean
  onClose: () => void
  taskId: string
  donationId: string
  onComplete?: () => void
}

export function DocuSignModal({ isOpen, onClose, taskId, donationId, onComplete }: DocuSignModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStartSigning = async () => {
    if (!user) return
    
    setLoading(true)
    setError(null)
    
    try {
      const token = await user.getIdToken()
      
      const response = await fetch('/api/docusign/create-nda-envelope', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId,
          donationId
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        console.error('DocuSign API Error Response:', data)
        const errorMessage = data.details?.message || data.error || 'Failed to create signing session'
        throw new Error(errorMessage)
      }
      
      if (data.signingUrl) {
        // Redirect to DocuSign signing URL
        window.location.href = data.signingUrl
      } else {
        throw new Error('No signing URL returned')
      }
      
    } catch (err) {
      console.error('Error starting DocuSign session:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to start signing session'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sign General NDA Agreement"
      size="md"
    >
      <div className="space-y-6">
        {/* NDA Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">Non-Disclosure Agreement</h3>
              <p className="text-sm text-blue-700 mt-1">
                This NDA protects confidential information shared during the equity donation process.
              </p>
            </div>
          </div>
        </div>

        {/* Document Details */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">Document: General NDA Agreement</p>
              <p className="text-xs text-gray-500">You will be able to review the document before signing</p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Secure Signing Process</h4>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>• Your signature will be legally binding</li>
                <li>• The signed document will be stored securely</li>
                <li>• You will receive a copy via email</li>
                <li>• The process is encrypted and compliant</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-900">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartSigning}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Preparing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Start Signing
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}