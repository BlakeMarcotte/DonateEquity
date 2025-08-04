'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Mail, User, MessageSquare, CheckCircle, AlertCircle, X } from 'lucide-react'

interface AppraiserInvitationFormProps {
  donationId: string
  onClose?: () => void
  onSuccess?: () => void
  className?: string
}

export function AppraiserInvitationForm({ 
  donationId, 
  onClose, 
  onSuccess,
  className 
}: AppraiserInvitationFormProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    appraiserEmail: '',
    appraiserName: '',
    personalMessage: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.appraiserEmail.trim()) {
      setError('Appraiser email is required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.appraiserEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const token = await user?.getIdToken()
      
      const response = await fetch('/api/appraisers/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          donationId,
          appraiserEmail: formData.appraiserEmail.trim(),
          appraiserName: formData.appraiserName.trim() || null,
          personalMessage: formData.personalMessage.trim() || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation')
      }

      setSuccess(true)
      
      // Auto-close after success message
      setTimeout(() => {
        onSuccess?.()
        onClose?.()
      }, 2000)

    } catch (err) {
      console.error('Error sending appraiser invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null) // Clear error when user types
  }

  if (success) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Invitation Sent Successfully!
          </h3>
          <p className="text-gray-600 mb-4">
            The appraiser will receive an email with instructions to join the platform and start working on your donation appraisal.
          </p>
          <div className="text-sm text-gray-500">
            This window will close automatically...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-6">
        <Mail className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Invite Appraiser to Platform
        </h3>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 text-sm leading-relaxed">
          To proceed with your equity donation, you'll need to invite a qualified appraiser to assess the value of your equity. 
          This ensures accurate valuation for both you and the nonprofit organization.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="appraiserEmail" className="block text-sm font-medium text-gray-700">
            Appraiser Email Address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="appraiserEmail"
              type="email"
              value={formData.appraiserEmail}
              onChange={(e) => handleInputChange('appraiserEmail', e.target.value)}
              placeholder="appraiser@example.com"
              className="pl-10"
              disabled={isSubmitting}
              required
            />
          </div>
          <p className="text-xs text-gray-500">
            Enter the email address of the appraiser you'd like to invite
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="appraiserName" className="block text-sm font-medium text-gray-700">
            Appraiser Name (Optional)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="appraiserName"
              type="text"
              value={formData.appraiserName}
              onChange={(e) => handleInputChange('appraiserName', e.target.value)}
              placeholder="John Smith"
              className="pl-10"
              disabled={isSubmitting}
            />
          </div>
          <p className="text-xs text-gray-500">
            Help personalize the invitation email
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="personalMessage" className="block text-sm font-medium text-gray-700">
            Personal Message (Optional)
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Textarea
              id="personalMessage"
              value={formData.personalMessage}
              onChange={(e) => handleInputChange('personalMessage', e.target.value)}
              placeholder="Hi [Name], I'd like to invite you to appraise my equity donation. This is for a great cause and I'd appreciate your expertise..."
              className="pl-10 resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
          <p className="text-xs text-gray-500">
            Add a personal note to make your invitation more compelling
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="space-y-1 text-blue-700">
                <li>• The appraiser will receive an invitation email</li>
                <li>• If they have an account, they can sign in immediately</li>
                <li>• If they're new, they'll be guided through account creation</li>
                <li>• Once they accept, you can proceed with providing company information</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !formData.appraiserEmail.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Sending Invitation...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
          
          {onClose && (
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="sm:w-auto"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}