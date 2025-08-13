'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Building2, 
  Users, 
  Crown, 
  User, 
  Megaphone, 
  PenTool, 
  Mail,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { NonprofitSubrole } from '@/types/auth'

interface InvitationDetails {
  organizationName: string
  inviterName: string
  invitedEmail: string
  subrole: NonprofitSubrole
  personalMessage?: string
  createdAt: Date
  expiresAt: Date
}

const SUBROLE_ICONS = {
  admin: Crown,
  member: User,
  marketer: Megaphone,
  signatory: PenTool,
}

const SUBROLE_DESCRIPTIONS = {
  admin: 'Full organization management, campaign oversight, and donation approvals',
  member: 'Basic nonprofit permissions for viewing and participating in activities',
  marketer: 'Marketing content creation and social media management',
  signatory: 'Document signing and legal approval authority'
}

function JoinTeamPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const token = searchParams.get('token')

  const fetchInvitationDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/organizations/join?token=${token}`)
      
      if (response.ok) {
        const data = await response.json()
        setInvitation(data.invitation)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Invalid invitation')
      }
    } catch (error) {
      console.error('Error fetching invitation:', error)
      setError('Failed to load invitation details')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link')
      setLoading(false)
      return
    }

    fetchInvitationDetails()
  }, [token, fetchInvitationDetails])

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to login with return URL
      router.push(`/auth/login?returnUrl=${encodeURIComponent(window.location.href)}`)
      return
    }

    setAccepting(true)
    setError(null)

    try {
      // Get Firebase Auth token
      const authToken = await user.getIdToken()
      
      const response = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invitationToken: token }),
      })

      if (response.ok) {
        setSuccess(true)
        // Redirect to tasks page after 2 seconds
        setTimeout(() => {
          router.push('/tasks')
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto" />
          <p className="mt-4 text-sm text-gray-600">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Invitation Error</h3>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Welcome to the Team!</h3>
          <p className="mt-2 text-sm text-gray-600">
            {`You've successfully joined ${invitation?.organizationName}. Redirecting you to your organization dashboard...`}
          </p>
          <div className="mt-4">
            <Loader2 className="animate-spin h-6 w-6 text-blue-600 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Invitation Not Found</h3>
          <p className="mt-2 text-sm text-gray-600">
            This invitation link may have expired or been used already.
          </p>
        </div>
      </div>
    )
  }

  const SubroleIcon = SUBROLE_ICONS[invitation.subrole]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white shadow rounded-lg p-8">
          {/* Header */}
          <div className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-blue-600" />
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Team Invitation
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {`You've been invited to join a nonprofit organization`}
            </p>
          </div>

          {/* Invitation Details */}
          <div className="mt-8 space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Building2 className="h-8 w-8 text-gray-400" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {invitation.organizationName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Invited by {invitation.inviterName}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <SubroleIcon className="h-6 w-6 text-blue-600" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 capitalize">
                    {invitation.subrole} Role
                  </h4>
                  <p className="text-sm text-blue-700">
                    {SUBROLE_DESCRIPTIONS[invitation.subrole]}
                  </p>
                </div>
              </div>
            </div>

            {invitation.personalMessage && (
              <div className="border-l-4 border-gray-300 pl-4">
                <p className="text-sm text-gray-600 italic">
                  {`"${invitation.personalMessage}"`}
                </p>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  For: {invitation.invitedEmail}
                </span>
              </div>
              <p className="text-xs text-yellow-700 mt-1">
                Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              {!user ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600">
                    Create an account to join the organization
                  </p>
                  <button
                    onClick={() => router.push(`/auth/register?teamInvite=${token}&returnUrl=${encodeURIComponent(window.location.href)}`)}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Sign Up to Accept
                  </button>
                  <button
                    onClick={() => router.push(`/auth/login?returnUrl=${encodeURIComponent(window.location.href)}`)}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              ) : user.email !== invitation.invitedEmail ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-red-600">
                    {`This invitation is for ${invitation.invitedEmail}, but you're signed in as ${user.email}`}
                  </p>
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Sign In with Different Account
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <Users className="w-4 h-4 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </button>
              )}

              <button
                onClick={() => router.push('/')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function JoinTeamPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <JoinTeamPage />
    </Suspense>
  )
}

export default JoinTeamPageWrapper