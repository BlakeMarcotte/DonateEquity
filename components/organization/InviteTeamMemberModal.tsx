'use client'

import { useState } from 'react'
import { Mail, AlertCircle } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { NonprofitSubrole } from '@/types/auth'

interface InviteTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, subrole: NonprofitSubrole, personalMessage?: string) => Promise<void>
  loading?: boolean
}

const SUBROLE_OPTIONS = [
  {
    value: 'admin' as NonprofitSubrole,
    label: 'Admin',
    description: 'Full organization management, campaign oversight, donation approvals'
  },
  {
    value: 'member' as NonprofitSubrole,
    label: 'Member',
    description: 'Basic nonprofit permissions for viewing and participating'
  },
  {
    value: 'marketer' as NonprofitSubrole,
    label: 'Marketer',
    description: 'Marketing content creation and social media management'
  },
  {
    value: 'signatory' as NonprofitSubrole,
    label: 'Signatory',
    description: 'Document signing and legal approval authority'
  }
]

export default function InviteTeamMemberModal({ 
  isOpen, 
  onClose, 
  onInvite, 
  loading = false 
}: InviteTeamMemberModalProps) {
  const [email, setEmail] = useState('')
  const [subrole, setSubrole] = useState<NonprofitSubrole>('member')
  const [personalMessage, setPersonalMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    console.log('Form submission - email:', email, 'subrole:', subrole)

    if (!email.trim() || !subrole) {
      console.log('Validation failed - email:', email.trim(), 'subrole:', subrole)
      setError('Email and role are required')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    try {
      await onInvite(email, subrole, personalMessage)
      // Reset form
      setEmail('')
      setSubrole('member')
      setPersonalMessage('')
      onClose()
    } catch (error: unknown) {
      console.error('Invitation error:', error)
      setError(error instanceof Error ? error.message : 'Failed to send invitation')
    }
  }

  const handleClose = () => {
    if (loading) return
    setEmail('')
    setSubrole('member')
    setPersonalMessage('')
    setError(null)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Team Member"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline w-4 h-4 mr-1" />
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
              required
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Team Role
            </label>
            <div className="space-y-3">
              {SUBROLE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="subrole"
                    value={option.value}
                    checked={subrole === option.value}
                    onChange={(e) => setSubrole(e.target.value as NonprofitSubrole)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Personal Message */}
          <div>
            <label htmlFor="personalMessage" className="block text-sm font-medium text-gray-700 mb-2">
              Personal Message (Optional)
            </label>
            <textarea
              id="personalMessage"
              rows={3}
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="Add a personal message to your invitation..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email || !subrole}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
    </Modal>
  )
}