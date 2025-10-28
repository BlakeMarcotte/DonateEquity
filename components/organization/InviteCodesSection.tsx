'use client'

import { useState } from 'react'
import { Copy, Check, RefreshCw, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface InviteCodesSectionProps {
  organizationType: 'nonprofit' | 'appraiser' | 'appraiser_firm' | 'donor'
  inviteCodes: {
    admin?: string
    member?: string
    appraiser?: string
    donor?: string
  }
  inviteCodesGeneratedAt: {
    admin?: Date
    member?: Date
    appraiser?: Date
    donor?: Date
  }
  isAdmin: boolean
  onRegenerateCode: (codeType: 'admin' | 'member' | 'appraiser' | 'donor') => Promise<void>
}

export default function InviteCodesSection({
  organizationType,
  inviteCodes,
  inviteCodesGeneratedAt,
  isAdmin,
  onRegenerateCode
}: InviteCodesSectionProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [regeneratingCode, setRegeneratingCode] = useState<string | null>(null)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState<string | null>(null)

  const copyToClipboard = async (code: string, codeType: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(codeType)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  const handleRegenerateCode = async (codeType: 'admin' | 'member' | 'appraiser' | 'donor') => {
    setRegeneratingCode(codeType)
    try {
      await onRegenerateCode(codeType)
      setShowRegenerateConfirm(null)
    } catch (error) {
      console.error('Failed to regenerate code:', error)
    } finally {
      setRegeneratingCode(null)
    }
  }

  const renderCodeCard = (
    codeType: 'admin' | 'member' | 'appraiser' | 'donor',
    label: string,
    description: string
  ) => {
    const code = inviteCodes[codeType]
    const generatedAt = inviteCodesGeneratedAt[codeType]

    if (!code) return null

    return (
      <div key={codeType} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          </div>
          <Key className="h-5 w-5 text-gray-400" />
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-300 mb-3">
          <div className="flex items-center justify-between">
            <code className="text-2xl font-mono font-bold text-blue-600 tracking-wider">
              {code}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(code, codeType)}
              className="ml-2"
            >
              {copiedCode === codeType ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {generatedAt ? `Generated ${new Date(generatedAt).toLocaleDateString()}` : 'Generation date unknown'}
          </span>
          {isAdmin && (
            <>
              {showRegenerateConfirm === codeType ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRegenerateConfirm(null)}
                    disabled={regeneratingCode === codeType}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRegenerateCode(codeType)}
                    disabled={regeneratingCode === codeType}
                  >
                    {regeneratingCode === codeType ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      'Confirm'
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegenerateConfirm(codeType)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              )}
            </>
          )}
        </div>

        {showRegenerateConfirm === codeType && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              ⚠️ Warning: Regenerating this code will invalidate the current code.
              Anyone trying to use the old code will no longer be able to join.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Organization Invite Codes</h2>
        <p className="text-sm text-gray-600">
          Share these codes with people you want to join your organization.
          Each code grants different permissions based on the role.
        </p>
      </div>

      <div className="space-y-4">
        {organizationType === 'nonprofit' && (
          <>
            {renderCodeCard(
              'admin',
              'Admin Code',
              'Full organization management permissions'
            )}
            {renderCodeCard(
              'member',
              'Member Code',
              'Basic nonprofit permissions'
            )}
          </>
        )}

        {(organizationType === 'appraiser_firm' || organizationType === 'appraiser') && renderCodeCard(
          'appraiser',
          'Appraiser Code',
          'Access to assigned appraisal tasks'
        )}

        {organizationType === 'donor' && renderCodeCard(
          'donor',
          'Donor Code',
          'Supporter with donation permissions'
        )}
      </div>

      {!isAdmin && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Only organization admins can regenerate invite codes.
          </p>
        </div>
      )}
    </div>
  )
}
