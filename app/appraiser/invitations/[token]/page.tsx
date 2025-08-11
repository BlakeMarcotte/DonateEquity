'use client'

import { useState, useEffect, useCallback } from 'react'
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

  const fetchInvitation = useCallback(async () => {
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
  }, [token])

  useEffect(() => {
    if (token) {
      fetchInvitation()
    }
  }, [token, fetchInvitation])

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

      // Use the redirect URL from the API response to go directly to the campaign tasks
      if (result.redirectUrl) {
        // Force refresh token if role was updated
        if (result.roleUpdated) {
          await user.getIdToken(true)
          // Wait for the auth context to fully update
          let attempts = 0
          const maxAttempts = 10
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 500))
            const token = await user.getIdToken(true)
            const payload = JSON.parse(atob(token.split('.')[1]))
            if (payload.role === 'appraiser') {
              console.log('Auth context updated with appraiser role')
              break
            }
            attempts++
            console.log(`Waiting for auth context to update... attempt ${attempts}`)
          }
        }
        // Redirect directly to the campaign task list
        console.log('Appraiser invitation: Redirecting to', result.redirectUrl)
        router.push(result.redirectUrl)
      } else {
        // Fallback: if no specific redirect URL, go to general dashboard
        if (result.roleUpdated) {
          await user.getIdToken(true) // Force refresh
          // Redirect to welcome page which will wait for auth context to update
          router.push('/appraiser/welcome')
        } else {
          // Role was already set, go directly to dashboard
          router.push('/my-campaign')
        }
      }

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
        router.push('/my-campaign')
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
            onClick={() => router.push('/my-campaign')}
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
            onClick={() => router.push('/my-campaign')}
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
  const isExpired = invitation ? new Date() > new Date(invitation.expiresAt) : false
  
  // Check if user is already authenticated and matches the invitation
  const isCorrectUser = user?.email === invitation?.appraiserEmail
  
  const handleSignUpToAccept = () => {
    // Redirect to register with the appraiser invitation token
    router.push(`/auth/register?appraiserInvitation=${token}`)
  }

  const handleSignInToAccept = () => {
    // Redirect to login with redirect back to this page
    router.push(`/auth/login?redirect=/appraiser/invitations/${token}`)
  }

  if (user && !isCorrectUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Wrong Account
          </h1>
          <p className="text-gray-600 mb-6">
            This invitation was sent to <strong>{invitation?.appraiserEmail}</strong>, 
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
              onClick={() => router.push('/my-campaign')}
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
            onClick={() => router.push('/my-campaign')}
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
            onClick={() => router.push('/my-campaign')}
            className="w-full"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            View My Assignment
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
      <div className="max-w-md mx-auto">
        <Card className="p-6">
          <div className="text-center mb-6">
            <Mail className="h-10 w-10 text-blue-600 mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              Appraiser Invitation
            </h1>
            <p className="text-gray-600 text-sm">
              {`You've been invited to appraise an equity donation`}
            </p>
          </div>

          <div className="space-y-4">
            {/* Inviter Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3">
                Invitation Details
              </h3>
              <div className="space-y-2">
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
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">
                What happens when you accept?
              </h4>
              <ul className="space-y-1 text-xs text-green-800">
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>{`You'll be assigned as the appraiser for this equity donation`}</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-1.5 flex-shrink-0"></div>
                  <span>You can view and complete appraisal tasks in the workflow</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-1.5 flex-shrink-0"></div>
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
            <div className="pt-4">
              {user && isCorrectUser ? (
                // Authenticated user - show accept/decline buttons
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={handleAcceptInvitation}
                    disabled={accepting}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
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
                    className="w-full"
                  >
                    Decline
                  </Button>
                </div>
              ) : (
                // Unauthenticated user or wrong user - show signup/signin buttons
                <div className="space-y-2">
                  {!user && (
                    <>
                      <Button
                        onClick={handleSignUpToAccept}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Sign Up to Accept Invitation
                      </Button>
                      
                      <Button
                        onClick={handleSignInToAccept}
                        variant="outline"
                        className="w-full"
                      >
                        Already have an account? Sign In
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* User Status Info */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>
                  {user && isCorrectUser ? 
                    'You are already signed in. Accepting will take you directly to the appraisal workflow.' :
                    'New to our platform? Signing up will guide you through creating your account with your invitation email pre-filled.'
                  }
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}