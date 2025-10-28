'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import { NonprofitSubrole } from '@/types/auth'
import { secureLogger } from '@/lib/logging/secure-logger'

interface InviteTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, subrole: NonprofitSubrole, personalMessage?: string) => Promise<void>
}

const SUBROLE_OPTIONS = [
  {
    value: 'admin' as NonprofitSubrole,
    label: 'Admin',
    description: 'Full organization management, campaign oversight, donation approvals, and signatory authority'
  },
  {
    value: 'member' as NonprofitSubrole,
    label: 'Member',
    description: 'Basic nonprofit permissions for viewing and participating'
  }
]

export default function InviteTeamMemberModal({ 
  isOpen, 
  onClose, 
  onInvite
}: InviteTeamMemberModalProps) {
  const [email, setEmail] = useState('')
  const [subrole, setSubrole] = useState<NonprofitSubrole>('member')
  const [personalMessage, setPersonalMessage] = useState('')
  
  const { 
    loading, 
    error, 
    execute, 
    reset 
  } = useFormSubmission('Team Invitation')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    secureLogger.info('Team invitation form submission', { email, subrole })

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !subrole) {
      throw new Error('Email and role are required')
    }
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address')
    }

    const result = await execute(async () => {
      await onInvite(email, subrole, personalMessage)
      return { success: true }
    })

    if (result) {
      // Close immediately without showing success state
      handleClose()
    }
  }

  const handleClose = () => {
    if (loading) return
    setEmail('')
    setSubrole('member')
    setPersonalMessage('')
    reset()
    onClose()
  }

  const isFormValid = email.trim().length > 0 && subrole

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Team Member"
      description="Send an invitation to join your organization team."
      onSubmit={handleSubmit}
      loading={loading}
      loadingText="Sending Invitation..."
      error={error}
      inlineError={true}
      submitDisabled={!isFormValid}
      submitText="Send Invitation"
      maxWidth="sm"
    >
      <div className="space-y-6">

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

      </div>
    </FormModal>
  )
}