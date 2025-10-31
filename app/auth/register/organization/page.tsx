'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { UserRole, NonprofitSubrole } from '@/types/auth'
import { signIn } from '@/lib/firebase/auth'
import { useAuth } from '@/contexts/AuthContext'
import AuthLayout from '@/components/auth/AuthLayout'

interface BasicSignupData {
  email: string
  password: string
  displayName: string
  role: UserRole
  subrole?: NonprofitSubrole
  phoneNumber?: string
  teamInviteToken?: string
  appraiserInvitationToken?: string
}

export default function OrganizationSelectionPage() {
  const router = useRouter()
  const { refreshUserData } = useAuth()
  const [basicData, setBasicData] = useState<BasicSignupData | null>(null)
  const [organizationOption, setOrganizationOption] = useState<'create' | 'join'>('create')
  const [organizationName, setOrganizationName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [validatingCode, setValidatingCode] = useState(false)
  const [error, setError] = useState('')
  const [codeError, setCodeError] = useState('')
  const [validatedOrganization, setValidatedOrganization] = useState<{ id: string; name: string; type: string } | null>(null)

  useEffect(() => {
    // Load basic signup data from sessionStorage
    const storedData = sessionStorage.getItem('basicSignupData')
    if (storedData) {
      setBasicData(JSON.parse(storedData))
    } else {
      // If no data, redirect back to register
      router.push('/auth/register')
    }
  }, [router])

  const validateInviteCode = async (code: string) => {
    if (!code || code.length !== 8) {
      setCodeError('Invite code must be 8 characters')
      setValidatedOrganization(null)
      return
    }

    setValidatingCode(true)
    setCodeError('')

    try {
      const response = await fetch(`/api/organizations/validate-code?code=${encodeURIComponent(code)}`)
      const data = await response.json()

      if (data.success) {
        setValidatedOrganization(data.organization)
        setCodeError('')
      } else {
        setCodeError(data.error || 'Invalid invite code')
        setValidatedOrganization(null)
      }
    } catch {
      setCodeError('Failed to validate invite code')
      setValidatedOrganization(null)
    } finally {
      setValidatingCode(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!basicData) return

    setError('')
    setLoading(true)

    // Validation
    if (organizationOption === 'create' && !organizationName.trim()) {
      setError('Please enter an organization name')
      setLoading(false)
      return
    }

    if (organizationOption === 'join' && !validatedOrganization) {
      setError('Please enter and validate an invite code')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...basicData,
          inviteCode: organizationOption === 'join' ? inviteCode : undefined,
          organizationName: organizationOption === 'create' ? organizationName : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Clear sessionStorage
        sessionStorage.removeItem('basicSignupData')

        // Automatically sign in the user
        try {
          await signIn(basicData.email, basicData.password)
          await refreshUserData()

          // Check if there's a pending campaign invitation to accept
          const pendingInvitation = sessionStorage.getItem('pendingInvitation')
          let redirectPath = ''

          if (pendingInvitation) {
            try {
              const invitation = JSON.parse(pendingInvitation)
              sessionStorage.removeItem('pendingInvitation')

              console.log('Accepting pending campaign invitation after registration:', invitation)

              // Wait a bit for Firebase to process the registration
              await new Promise(resolve => setTimeout(resolve, 1000))

              // Get auth token
              const { auth } = await import('@/lib/firebase/config')
              const currentUser = auth.currentUser
              if (currentUser) {
                const idToken = await currentUser.getIdToken(true)

                // Accept the campaign invitation
                const response = await fetch('/api/invitations/accept', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                  },
                  body: JSON.stringify({
                    invitationId: invitation.id,
                    invitationToken: invitation.token
                  })
                })

                if (response.ok) {
                  const result = await response.json()
                  console.log('Campaign invitation accepted:', result)

                  // Redirect to donation tasks if we have the data
                  if (result.data?.donationId) {
                    redirectPath = `/donations/${result.data.donationId}/tasks?refresh=1`
                  } else if (result.data?.campaignId) {
                    redirectPath = `/my-campaign?campaignId=${result.data.campaignId}&refresh=1`
                  }
                } else {
                  console.error('Failed to accept campaign invitation:', await response.json())
                }
              }
            } catch (invitationError) {
              console.error('Error accepting campaign invitation:', invitationError)
            }
          }

          // Check if there's a pending appraiser invitation to accept
          if (basicData.appraiserInvitationToken) {
            try {
              console.log('Accepting pending appraiser invitation after registration')

              // Wait a bit for Firebase to process the registration
              await new Promise(resolve => setTimeout(resolve, 1000))

              // Get auth token
              const { auth } = await import('@/lib/firebase/config')
              const currentUser = auth.currentUser
              if (currentUser) {
                const idToken = await currentUser.getIdToken()

                // Accept the appraiser invitation
                const response = await fetch(`/api/invitations/${basicData.appraiserInvitationToken}/accept`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                  }
                })

                if (response.ok) {
                  const result = await response.json()
                  console.log('Appraiser invitation accepted:', result)

                  // Refresh token if role was just set
                  if (result.roleUpdated) {
                    await currentUser.getIdToken(true)
                  }

                  // Set redirect path to my-campaign
                  if (!redirectPath) {
                    redirectPath = result.redirectUrl || '/my-campaign'
                  }
                } else {
                  const error = await response.json()
                  console.error('Failed to accept appraiser invitation:', error)
                  console.error('Response status:', response.status)
                  console.error('Error details:', JSON.stringify(error))
                }
              }
            } catch (appraiserInvitationError) {
              console.error('Error accepting appraiser invitation:', appraiserInvitationError)
            }
          }

          // Redirect based on role or invitation
          if (redirectPath) {
            router.push(redirectPath)
          } else {
            switch (basicData.role) {
              case 'donor':
                router.push('/my-campaign?refresh=1')
                break
              case 'appraiser':
                router.push('/my-campaign')
                break
              case 'nonprofit_admin':
                router.push('/tasks')
                break
              default:
                router.push('/dashboard')
            }
          }
        } catch (signInError) {
          console.error('Auto sign-in error:', signInError)
          router.push('/auth/login?message=Registration successful! Please sign in.')
        }
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push('/auth/register')
  }

  if (!basicData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const isDonor = basicData.role === 'donor'
  const orgTypeName = isDonor ? 'organization or foundation' : basicData.role === 'nonprofit_admin' ? 'nonprofit' : 'appraisal firm'

  return (
    <AuthLayout mode="register">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Organization Details
          </h3>
          <p className="text-sm text-gray-600">
            Tell us about your {orgTypeName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Create New Organization Section */}
          <div className="space-y-2">
            <Label htmlFor="organizationName" className="text-gray-700 font-medium">
              New Organization Name *
            </Label>
            <Input
              id="organizationName"
              type="text"
              value={organizationName}
              onChange={(e) => {
                setOrganizationName(e.target.value)
                if (e.target.value) {
                  setOrganizationOption('create')
                  setInviteCode('')
                  setValidatedOrganization(null)
                  setCodeError('')
                }
              }}
              placeholder={`Enter your new ${orgTypeName} name`}
              disabled={loading}
              className="text-base h-12"
            />
            <p className="text-sm text-gray-600">
              Create a new {orgTypeName} and become the admin
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          {/* Join with Invite Code Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode" className="text-gray-700 font-medium">
                Organization Invite Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value)
                    if (e.target.value) {
                      setOrganizationOption('join')
                      setOrganizationName('')
                    }
                    setValidatedOrganization(null)
                    setCodeError('')
                  }}
                  placeholder="Enter 8-character code"
                  maxLength={8}
                  disabled={loading || validatingCode}
                  className={`text-base h-12 uppercase ${codeError ? 'border-red-500' : ''}`}
                  style={{ textTransform: 'uppercase' }}
                />
                <Button
                  type="button"
                  onClick={() => validateInviteCode(inviteCode)}
                  disabled={loading || validatingCode || inviteCode.length !== 8}
                  className="h-12 px-6"
                >
                  {validatingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    'Validate'
                  )}
                </Button>
              </div>
              {codeError && (
                <p className="text-sm text-red-600">{codeError}</p>
              )}
              {validatedOrganization && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900">
                    ✓ Valid code! You will join: <span className="font-bold">{validatedOrganization.name}</span>
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-600">
                Ask your organization admin for the invite code to join their {orgTypeName}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 h-12 text-base"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AuthLayout>
  )
}
