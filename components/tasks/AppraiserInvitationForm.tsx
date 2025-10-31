'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { secureLogger } from '@/lib/logging/secure-logger'

interface AppraiserInvitationFormProps {
  donationId: string
  onClose: () => void
  onSuccess: () => void
}

export default function AppraiserInvitationForm({
  donationId,
  onClose,
  onSuccess,
}: AppraiserInvitationFormProps) {
  const { user } = useAuth()
  const [appraiserEmail, setAppraiserEmail] = useState('')
  const [appraiserName, setAppraiserName] = useState('')
  const [personalMessage, setPersonalMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(appraiserEmail)) {
      setError('Please enter a valid email address')
      return
    }

    // Validate message length
    if (personalMessage.length > 1000) {
      setError('Personal message is too long (max 1000 characters)')
      return
    }

    setLoading(true)

    try {
      const token = await user?.getIdToken()
      if (!token) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/donations/${donationId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          appraiserEmail: appraiserEmail.trim(),
          appraiserName: appraiserName.trim() || null,
          personalMessage: personalMessage.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      secureLogger.info('Appraiser invitation sent successfully', {
        userId: user?.uid,
        donationId,
        invitationId: data.invitationId,
      })

      onSuccess()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation'
      setError(errorMessage)
      secureLogger.error('Failed to send appraiser invitation', err, {
        userId: user?.uid,
        donationId,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Invite an Appraiser
        </h3>
        <p className="text-sm text-gray-600">
          Invite a qualified appraiser to assess the fair market value of your equity donation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label
            htmlFor="appraiserEmail"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Appraiser Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="appraiserEmail"
            value={appraiserEmail}
            onChange={(e) => setAppraiserEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="appraiser@example.com"
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">
            The appraiser will receive an email invitation
          </p>
        </div>

        {/* Name Field */}
        <div>
          <label
            htmlFor="appraiserName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Appraiser Name (Optional)
          </label>
          <input
            type="text"
            id="appraiserName"
            value={appraiserName}
            onChange={(e) => setAppraiserName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="John Doe"
            disabled={loading}
          />
        </div>

        {/* Personal Message Field */}
        <div>
          <label
            htmlFor="personalMessage"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Personal Message (Optional)
          </label>
          <textarea
            id="personalMessage"
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Add a personal note to your invitation..."
            disabled={loading}
          />
          <p className="mt-1 text-xs text-gray-500">
            {personalMessage.length}/1000 characters
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !appraiserEmail}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          What happens next?
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>The appraiser will receive an email invitation</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>They can accept or decline the invitation</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Once accepted, they&apos;ll be able to access your donation details and begin the appraisal process</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>The invitation expires in 7 days</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
