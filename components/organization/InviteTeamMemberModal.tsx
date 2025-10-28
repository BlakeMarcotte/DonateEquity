'use client'

import { useState } from 'react'
import { Mail, Copy, Check, Key } from 'lucide-react'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import { NonprofitSubrole } from '@/types/auth'
import { secureLogger } from '@/lib/logging/secure-logger'

interface InviteTeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, subrole: NonprofitSubrole, personalMessage?: string) => Promise<void>
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
  inviteCodes
}: InviteTeamMemberModalProps) {
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
    setCopiedCode(false)
    reset()
    onClose()
  }

  const isFormValid = email.trim().length > 0 && subrole
  const currentCode = subrole === 'admin' ? inviteCodes?.admin : inviteCodes?.member

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
      maxWidth="lg"
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

          {/* Invite Code Alternative */}
          {currentCode && (
            <div className="border-t pt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm mb-6">
                  <span className="px-4 bg-white text-gray-500 font-medium">OR</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Key className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Share an invite code
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Anyone with this code can join your organization as a <span className="font-semibold">{subrole}</span>. Perfect for sharing with multiple people or posting in a team channel.
                    </p>
                    <div className="bg-white rounded-lg p-4 border-2 border-blue-300 shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
                            {subrole} Invite Code
                          </label>
                          <code className="text-2xl font-mono font-bold text-blue-600 tracking-widest">
                            {currentCode}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentCode)}
                          className="ml-4 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
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
                </div>
              </div>
            </div>
          )}

      </div>
    </FormModal>
  )
}