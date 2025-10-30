'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import PageErrorBoundary from '@/components/error/PageErrorBoundary'
import { secureLogger } from '@/lib/logging/secure-logger'
import type { SerializedAppraiserInvitation } from '@/types/appraiser-invitation'

function InvitationPageContent({ params }: { params: Promise<{ token: string }> }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [invitation, setInvitation] = useState<SerializedAppraiserInvitation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [token, setToken] = useState<string>('')

  // Unwrap params
  useEffect(() => {
    params.then(p => setToken(p.token))
  }, [params])

  // Fetch invitation details
  useEffect(() => {
    if (!token) return

    const fetchInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/${token}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load invitation')
        }

        setInvitation(data.invitation)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load invitation'
        setError(errorMessage)
        secureLogger.error('Failed to fetch invitation', err, {
          token,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  // Check if user needs to be redirected for authentication
  useEffect(() => {
    if (authLoading || loading || !invitation || !token) return

    // If user is not logged in, redirect to register with invitation token
    if (!user) {
      const registerUrl = `/auth/register?appraiserInvitation=${token}&email=${encodeURIComponent(invitation.appraiserEmail)}`
      router.push(registerUrl)
      return
    }

    // If user email doesn't match invitation email
    if (user.email?.toLowerCase() !== invitation.appraiserEmail.toLowerCase()) {
      setError(
        'This invitation was sent to a different email address. Please log out and log in with the correct account.'
      )
    }
  }, [user, authLoading, loading, invitation, token, router])

  const handleAccept = async () => {
    if (!user || !invitation || !token) return

    setAccepting(true)
    setError(null)

    try {
      const authToken = await user.getIdToken()
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      secureLogger.info('Invitation accepted', {
        userId: user.uid,
        invitationId: invitation.id,
        donationId: invitation.donationId,
      })

      // Redirect to my tasks page
      router.push(data.redirectUrl || '/my-tasks')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation'
      setError(errorMessage)
      secureLogger.error('Failed to accept invitation', err, {
        userId: user?.uid,
        invitationId: invitation?.id,
      })
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    if (!user || !invitation || !token) return

    setDeclining(true)
    setError(null)

    try {
      const authToken = await user.getIdToken()
      const response = await fetch(`/api/invitations/${token}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline invitation')
      }

      secureLogger.info('Invitation declined', {
        userId: user.uid,
        invitationId: invitation.id,
        donationId: invitation.donationId,
      })

      // Redirect to home
      router.push('/')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decline invitation'
      setError(errorMessage)
      secureLogger.error('Failed to decline invitation', err, {
        userId: user?.uid,
        invitationId: invitation?.id,
      })
      setDeclining(false)
    }
  }

  // Loading state
  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Invitation</h3>
            <p className="text-sm text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No invitation found
  if (!invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Invitation Not Found</h3>
            <p className="text-sm text-gray-600 mb-6">
              This invitation may have expired or been deleted.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Check if invitation is expired
  const isExpired = new Date(invitation.expiresAt) < new Date()

  // Check if invitation is already responded to
  const isResponded = invitation.status !== 'pending'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white mb-2">Appraiser Invitation</h1>
          <p className="text-indigo-100">
            You&apos;ve been invited to appraise an equity donation
          </p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Invitation Details */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invitation Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">From</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {invitation.inviterName} ({invitation.inviterEmail})
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">To</dt>
                <dd className="mt-1 text-sm text-gray-900">{invitation.appraiserEmail}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      invitation.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : invitation.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Expires</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(invitation.expiresAt).toLocaleDateString()} at{' '}
                  {new Date(invitation.expiresAt).toLocaleTimeString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Personal Message */}
          {invitation.personalMessage && (
            <div className="mb-6 bg-gray-50 border-l-4 border-indigo-500 p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Personal Message</h3>
              <p className="text-sm text-gray-600 italic">&ldquo;{invitation.personalMessage}&rdquo;</p>
            </div>
          )}

          {/* Expired Notice */}
          {isExpired && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">
                This invitation has expired and can no longer be accepted.
              </p>
            </div>
          )}

          {/* Already Responded Notice */}
          {isResponded && !isExpired && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-600">
                You have already {invitation.status} this invitation.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          {!isExpired && !isResponded && user && (
            <div className="flex gap-4">
              <button
                onClick={handleDecline}
                disabled={declining || accepting}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {declining ? 'Declining...' : 'Decline'}
              </button>
              <button
                onClick={handleAccept}
                disabled={accepting || declining}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-md hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {accepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
            </div>
          )}

          {/* Info Box */}
          {!isExpired && !isResponded && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                What happens when you accept?
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You&apos;ll be assigned as the appraiser for this donation</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You&apos;ll gain access to company financials and documentation</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    You&apos;ll be able to review the materials and provide a fair market valuation
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Your appraiser tasks will appear in your task list</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <PageErrorBoundary pageName="Appraiser Invitation">
      <InvitationPageContent params={params} />
    </PageErrorBoundary>
  )
}
