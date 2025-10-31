'use client'

import { useState } from 'react'
import { Mail, Copy, Check, Key } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import { NonprofitSubrole } from '@/types/auth'
import { secureLogger } from '@/lib/logging/secure-logger'
import { useAuth } from '@/contexts/AuthContext'

interface InviteTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, subrole: NonprofitSubrole, personalMessage?: string) => Promise<void>
  onComplete?: () => void
  inviteCodes?: {
    admin?: string
    member?: string
  }
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
  onInvite,
  onComplete,
  inviteCodes
}: InviteTeamMemberModalProps) {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [subrole, setSubrole] = useState<NonprofitSubrole>('member')
  const [personalMessage, setPersonalMessage] = useState('')
  const [copiedCode, setCopiedCode] = useState(false)

  const {
    loading,
    error,
    execute,
    reset
  } = useFormSubmission('Team Invitation')

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // If no email entered, mark task as complete and close
    if (!email.trim()) {
      secureLogger.info('Team invitation code shared', { subrole })

      try {
        // Mark task as complete in Firestore
        if (user) {
          const token = await user.getIdToken()
          const response = await fetch('/api/tasks/completion', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              taskType: 'onboarding',
              taskId: 'team',
              status: 'complete'
            })
          })

          if (!response.ok) {
            throw new Error('Failed to mark task as complete')
          }
        }

        // Notify parent component to refresh task completions
        onComplete?.()
        handleClose()
      } catch (error) {
        secureLogger.error('Error marking team task as complete', error instanceof Error ? error : new Error(String(error)))
        // Still close the modal even if marking complete fails
        handleClose()
      }
      return
    }

    secureLogger.info('Team invitation form submission', { email, subrole })

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
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
    setCopiedCode(false)
    reset()
    onClose()
  }

  const currentCode = subrole === 'admin' ? inviteCodes?.admin : inviteCodes?.member

  // Button is always enabled, text changes based on whether email is filled
  const submitButtonText = !email.trim()
    ? 'Mark as Shared'
    : 'Send Invitation'

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
      submitDisabled={false}
      submitText={submitButtonText}
      maxWidth="2xl"
    >
      <div className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="inline w-4 h-4 mr-1" />
              Email Address (Optional)
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* Role Selection - 2 Columns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Role
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SUBROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`relative flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    subrole === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="subrole"
                    value={option.value}
                    checked={subrole === option.value}
                    onChange={(e) => setSubrole(e.target.value as NonprofitSubrole)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
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
              rows={2}
              value={personalMessage}
              onChange={(e) => setPersonalMessage(e.target.value)}
              placeholder="Add a personal message to your invitation..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Invite Code Alternative - Compact */}
          {currentCode && (
            <div className="border-t pt-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs mb-3">
                  <span className="px-3 bg-white text-gray-500 font-medium">OR</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-700 mb-0.5">
                        Share {subrole} invite code
                      </div>
                      <code className="text-base font-mono font-bold text-blue-600 tracking-wider block truncate">
                        {currentCode}
                      </code>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(currentCode)}
                    className="flex-shrink-0 flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    disabled={loading}
                  >
                    {copiedCode ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

      </div>
    </FormModal>
  )
}