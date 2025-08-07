'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Mail, User, Clock, ArrowRight } from 'lucide-react'

interface InvitationData {
  id: string
  donationId: string
  appraiserEmail: string
  appraiserName: string | null
  inviterName: string
  inviterEmail: string
  personalMessage: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  userExists: boolean
  existingUserId: string | null
  invitedAt: Date
  expiresAt: Date
}

export default function AppraiserInvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const token = params.token as string

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (token) {
      fetchInvitation()
    }
  }, [token])

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/appraiser/invitations/${token}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load invitation')
      }

      setInvitation(result.invitation)
    } catch (err) {
      console.error('Error fetching invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) return

    setAccepting(true)
    setError(null)

    try {
      const authToken = await user.getIdToken()
      
      const response = await fetch(`/api/appraiser/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to accept invitation')
      }

      // Navigate to the donation task page
      router.push(`/donations/${invitation.donationId}/tasks`)

    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  const handleDeclineInvitation = async () => {
    if (!invitation || !user) return

    try {
      const authToken = await user.getIdToken()
      
      const response = await fetch(`/api/appraiser/invitations/${token}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (response.ok) {
        router.push('/appraiser')
      }
    } catch (err) {
      console.error('Error declining invitation:', err)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invitation...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Invitation Not Found
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            onClick={() => router.push('/appraiser')}
            variant="outline"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Invitation Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            This invitation link may be invalid or expired.
          </p>
          <Button
            onClick={() => router.push('/appraiser')}
            variant="outline"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  // Check if invitation is expired
  const isExpired = new Date() > new Date(invitation.expiresAt)
  
  // Check if user is already authenticated and matches the invitation
  const isCorrectUser = user?.email === invitation.appraiserEmail
  
  if (!user) {
    // User not authenticated - redirect to auth with invitation context
    const authUrl = invitation.userExists 
      ? `/auth/login?redirect=/appraiser/invitations/${token}`
      : `/auth/register?role=appraiser&redirect=/appraiser/invitations/${token}`
    
    router.push(authUrl)
    return null
  }

  if (!isCorrectUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Wrong Account
          </h1>
          <p className="text-gray-600 mb-6">
            This invitation was sent to <strong>{invitation.appraiserEmail}</strong>, 
            {`but you're signed in as`} <strong>{user.email}</strong>.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/auth/logout')}
              className="w-full"
            >
              Sign Out & Use Correct Account
            </Button>
            <Button
              onClick={() => router.push('/appraiser')}
              variant="outline"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Invitation Expired
          </h1>
          <p className="text-gray-600 mb-6">
            This invitation has expired. Please contact the donor to request a new invitation.
          </p>
          <Button
            onClick={() => router.push('/appraiser')}
            variant="outline"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Already Accepted
          </h1>
          <p className="text-gray-600 mb-6">
            {`You've already accepted this invitation and can now work on the donation appraisal.`}
          </p>
          <Button
            onClick={() => router.push(`/donations/${invitation.donationId}/tasks`)}
            className="w-full"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            View Donation Tasks
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="text-center mb-8">
            <Mail className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Appraiser Invitation
            </h1>
            <p className="text-gray-600">
              {`You've been invited to appraise an equity donation`}
            </p>
          </div>

          <div className="space-y-6">
            {/* Inviter Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Invitation Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">From</p>
                    <p className="text-sm text-gray-600">{invitation.inviterName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{invitation.inviterEmail}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Expires</p>
                    <p className="text-sm text-gray-600">
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Message */}
            {invitation.personalMessage && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  Personal Message
                </h4>
                <p className="text-sm text-blue-800 italic">
                  {`"${invitation.personalMessage}"`}
                </p>
              </div>
            )}

            {/* What happens next */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h4 className="text-sm font-medium text-green-900 mb-3">
                What happens when you accept?
              </h4>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{`You'll be assigned as the appraiser for this equity donation`}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>You can view and complete appraisal tasks in the workflow</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{`You'll collaborate with the donor and nonprofit through shared tasks`}</span>
                </li>
              </ul>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <Button
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {accepting ? (
                  <>
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Invitation
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleDeclineInvitation}
                variant="outline"
                disabled={accepting}
                className="sm:w-auto"
              >
                Decline
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}