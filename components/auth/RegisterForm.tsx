'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole, NonprofitSubrole } from '@/types/auth'
import { CampaignInvitation } from '@/types/invitations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeOff, Loader2, ChevronDown, Mail, Users } from 'lucide-react'
import { signIn } from '@/lib/firebase/auth'
import { auth } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/AuthContext'

interface Organization {
  id: string
  name: string
  type: 'nonprofit' | 'appraiser' | 'donor'
}

interface AppraiserInvitation {
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

interface RegisterFormProps {
  onSuccess?: () => void
  redirectTo?: string
  invitation?: CampaignInvitation | null
  onSuccessRedirect?: string
  preselectedRole?: 'donor' | 'nonprofit_admin' | 'appraiser' | null
  teamInvitation?: Record<string, unknown>
  teamInviteToken?: string | null
  appraiserInvitation?: AppraiserInvitation | null
  appraiserInvitationToken?: string | null
  emailParam?: string | null
}

const ROLES = [
  {
    value: 'donor' as UserRole,
    label: 'Donor',
    description: '',
  },
  {
    value: 'nonprofit_admin' as UserRole,
    label: 'Nonprofit',
    description: 'Managing campaigns and donation workflows for a nonprofit',
  },
  {
    value: 'appraiser' as UserRole,
    label: 'Professional Appraiser',
    description: 'Conducting equity valuations and appraisals',
  },
]

export default function RegisterForm({ 
  onSuccess, 
  redirectTo, 
  invitation,
  onSuccessRedirect,
  preselectedRole,
  teamInvitation,
  teamInviteToken,
  appraiserInvitation,
  appraiserInvitationToken,
  emailParam
}: RegisterFormProps) {
  const [step, setStep] = useState<'basic' | 'organization'>('basic')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    role: (preselectedRole || '') as UserRole | '',
    subrole: 'admin' as NonprofitSubrole,
    organizationId: '',
    organizationName: '',
    joinExistingOrg: false,
  })
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const { refreshUserData } = useAuth()

  // Pre-fill email if invitation exists
  useEffect(() => {
    if (invitation) {
      setFormData(prev => ({
        ...prev,
        email: invitation.invitedEmail,
        role: 'donor' // Default to donor for invitations
      }))
    } else if (teamInvitation) {
      // Pre-fill for team invitation
      setFormData(prev => ({
        ...prev,
        email: teamInvitation.invitedEmail as string,
        role: 'nonprofit_admin', // Always nonprofit_admin for team invites
        subrole: teamInvitation.subrole as NonprofitSubrole,
        organizationId: teamInvitation.organizationId as string,
        joinExistingOrg: true, // They're joining an existing org
      }))
    } else if (appraiserInvitation) {
      // Pre-fill for appraiser invitation
      setFormData(prev => ({
        ...prev,
        email: appraiserInvitation.appraiserEmail,
        role: 'appraiser' // Always appraiser for appraiser invites
      }))
    } else if (emailParam) {
      // Pre-fill email from URL parameter
      setFormData(prev => ({
        ...prev,
        email: emailParam
      }))
    }
  }, [invitation, teamInvitation, appraiserInvitation, emailParam])

  const fetchOrganizations = async (type: 'nonprofit' | 'appraiser' | 'donor') => {
    setLoadingOrgs(true)
    try {
      const response = await fetch(`/api/organizations?type=${type}&limit=50`)
      const data = await response.json()
      
      if (data.success) {
        setOrganizations(data.organizations)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoadingOrgs(false)
    }
  }

  useEffect(() => {
    if (formData.role === 'nonprofit_admin' || formData.role === 'appraiser') {
      const orgType = formData.role === 'nonprofit_admin' ? 'nonprofit' : 'appraiser'
      fetchOrganizations(orgType)
    } else if (formData.role === 'donor') {
      // Fetch donor organizations
      fetchOrganizations('donor')
    } else {
      setOrganizations([])
    }
  }, [formData.role])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const inputValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    
    setFormData(prev => ({
      ...prev,
      [name]: inputValue,
      // Reset organization fields when role changes
      ...(name === 'role' && { organizationId: '', organizationName: '', joinExistingOrg: false }),
    }))
  }

  const handleNext = () => {
    setError('')
    
    if (step === 'basic') {
      if (!formData.email || !formData.password || !formData.displayName || !formData.role) {
        setError('Please fill in all required fields')
        return
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
      
      // Skip organization step for team invitations
      if (teamInvitation) {
        handleSubmit()
      } else {
        // All roles now require organization setup
        setStep('organization')
      }
    } else if (step === 'organization') {
      if (formData.joinExistingOrg && !formData.organizationId) {
        setError('Please select an organization or uncheck to create a new one')
        return
      }
      
      if (!formData.joinExistingOrg && !formData.organizationName) {
        setError('Please enter an organization name')
        return
      }
      
      handleSubmit()
    }
  }

  const handleBack = () => {
    setError('')
    if (step === 'organization') {
      setStep('basic')
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          role: formData.role,
          subrole: formData.role === 'nonprofit_admin' ? formData.subrole : undefined,
          organizationId: formData.joinExistingOrg ? formData.organizationId || undefined : undefined,
          organizationName: formData.joinExistingOrg ? undefined : formData.organizationName,
          teamInviteToken: teamInviteToken || undefined,
          appraiserInvitationToken: appraiserInvitationToken || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Automatically sign in the user after successful registration
        try {
          await signIn(formData.email, formData.password)
          await refreshUserData()

          // If user registered via invitation, accept the invitation
          if (invitation) {
            try {
              // Get the user's auth token
              const currentUser = auth.currentUser
              if (currentUser) {
                const idToken = await currentUser.getIdToken()
                
                // Call the API to accept the invitation
                const response = await fetch('/api/invitations/accept', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                  },
                  body: JSON.stringify({
                    invitationId: invitation.id,
                    invitationToken: invitation.invitationToken
                  })
                })
                
                if (!response.ok) {
                  const error = await response.json()
                  console.error('Error accepting invitation:', error)
                }
              }
            } catch (invitationError) {
              console.error('Error accepting invitation:', invitationError)
              // Continue with registration flow even if invitation acceptance fails
            }
          }
          
          if (onSuccess) {
            onSuccess()
          } else {
            // Use onSuccessRedirect if provided, otherwise use role-based defaults
            if (onSuccessRedirect) {
              router.push(onSuccessRedirect)
            } else if (redirectTo) {
              router.push(redirectTo)
            } else {
              // Default role-based redirects
              switch (formData.role) {
                case 'donor':
                  router.push('/my-campaign')
                  break
                case 'appraiser':
                  router.push('/my-campaign')
                  break
                case 'nonprofit_admin':
                  router.push('/organization')
                  break
                default:
                  router.push('/dashboard')
              }
            }
          }
        } catch (signInError) {
          console.error('Auto sign-in error after registration:', signInError)
          // If auto sign-in fails, redirect to login page with success message
          router.push(`/auth/login?message=Registration successful! Please sign in.`)
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

  if (step === 'basic') {
    return (
      <Card className="border-0 shadow-none p-0">
        <CardContent className="p-0">
          <div className="space-y-6">
            {/* Invitation Banner */}
            {invitation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">
                      {invitation.inviterName} invited you to support {invitation.campaignTitle || 'their campaign'}!
                    </h4>
                  </div>
                </div>
              </div>
            )}

            {/* Team Invitation Banner */}
            {teamInvitation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Users className="w-5 h-5 text-green-600 mt-0.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-green-900">
                      {`You're invited to join ${teamInvitation.organizationName as string}!`}
                    </h4>
                    <p className="text-sm text-green-800 mt-1">
                      {teamInvitation.inviterName as React.ReactNode} has invited you to join their nonprofit organization as a {teamInvitation.subrole as React.ReactNode}.
                    </p>
                    {(teamInvitation.personalMessage as string) && (
                      <p className="text-sm text-green-700 mt-2 italic">
                        {`"${teamInvitation.personalMessage as string}"`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-gray-700 font-medium">
                  Full Name *
                </Label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  disabled={loading}
                  className={`text-base h-12 ${error ? 'form-error' : ''}`}
                />
              </div>

              {/* Email Address */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  disabled={loading || !!appraiserInvitation || !!invitation || !!teamInvitation}
                  className={`text-base h-12 ${error ? 'form-error' : ''} ${(appraiserInvitation || invitation || teamInvitation) ? 'bg-gray-50 text-gray-600' : ''}`}
                />
                {(appraiserInvitation || invitation || teamInvitation) && (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email address is set from your invitation and cannot be changed
                  </p>
                )}
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-700 font-medium">
                  I am a *
                </Label>
                {preselectedRole || teamInvitation ? (
                  // Show preselected role as disabled field
                  <div className="relative">
                    <Input
                      id="role"
                      type="text"
                      value={teamInvitation ? 'Nonprofit' : ROLES.find(r => r.value === preselectedRole)?.label || preselectedRole || ''}
                      disabled={true}
                      className="text-base h-12 bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                    <p className="text-sm text-blue-600 mt-1">
                      Role automatically set based on your invitation
                    </p>
                  </div>
                ) : (
                  // Show role selection dropdown
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      required
                      value={formData.role}
                      onChange={handleInputChange}
                      disabled={loading}
                      className={`w-full h-12 px-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200 appearance-none bg-white pr-10 ${error ? 'form-error' : ''}`}
                    >
                      <option value="">Select your role</option>
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                )}
                {formData.role && !preselectedRole && (
                  <p className="text-sm text-gray-600 mt-2">
                    {ROLES.find(r => r.value === formData.role)?.description}
                  </p>
                )}
                {formData.role && preselectedRole && (
                  <p className="text-sm text-gray-600 mt-2">
                    {ROLES.find(r => r.value === formData.role)?.description}
                  </p>
                )}
              </div>

              {/* Subrole Selection for Nonprofit Admins */}
              {formData.role === 'nonprofit_admin' && (
                <div className="space-y-2">
                  <Label htmlFor="subrole" className="text-gray-700 font-medium">
                    Your Role in the Organization *
                  </Label>
                  {teamInvitation ? (
                    // Show preselected subrole for team invitations
                    <div className="relative">
                      <Input
                        id="subrole"
                        type="text"
                        value={String(teamInvitation.subrole).charAt(0).toUpperCase() + String(teamInvitation.subrole).slice(1)}
                        disabled={true}
                        className="text-base h-12 bg-gray-50 text-gray-600 cursor-not-allowed"
                      />
                      <p className="text-sm text-blue-600 mt-1">
                        Organization role set by your invitation
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        id="subrole"
                        name="subrole"
                        required
                        value={formData.subrole}
                        onChange={handleInputChange}
                        disabled={loading}
                        className={`w-full h-12 px-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200 appearance-none bg-white pr-10 ${error ? 'form-error' : ''}`}
                      >
                        <option value="admin">Admin - Full organization management</option>
                        <option value="member">Member - Basic nonprofit permissions</option>
                        <option value="marketer">Marketer - Marketing and social media</option>
                        <option value="signatory">Signatory - Document signing authority</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                  {!teamInvitation && (
                    <p className="text-sm text-gray-600">
                      Choose your specific role within the nonprofit organization
                    </p>
                  )}
                </div>
              )}

              {/* Password Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Password *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Create a secure password (min. 6 characters)"
                      disabled={loading}
                      className={`text-base h-12 pr-12 ${error ? 'form-error' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 w-12 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Confirm your password"
                      disabled={loading}
                      className={`text-base h-12 pr-12 ${error ? 'form-error' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 w-12 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Organization step
  return (
    <Card className="border-0 shadow-none p-0">
      <CardContent className="p-0">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Organization Details
            </h3>
            <p className="text-sm text-gray-600">
              {formData.role === 'donor' 
                ? 'Tell us about your donor organization or foundation'
                : `Tell us about your ${formData.role === 'nonprofit_admin' ? 'nonprofit organization' : 'appraisal firm'}`
              }
            </p>
          </div>

          <div className="space-y-6">
            {/* Toggle for joining existing organization */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <input
                  id="joinExistingOrg"
                  name="joinExistingOrg"
                  type="checkbox"
                  checked={formData.joinExistingOrg}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <Label htmlFor="joinExistingOrg" className="text-gray-700 font-medium">
                  Join an existing organization
                </Label>
              </div>
              <p className="text-sm text-gray-600 ml-7">
                Check this if you want to join an organization that&apos;s already registered
              </p>
            </div>

            {formData.joinExistingOrg ? (
              <div className="space-y-2">
                <Label htmlFor="organizationId" className="text-gray-700 font-medium">
                  Select Your Organization *
                </Label>
                <div className="relative">
                  <select
                    id="organizationId"
                    name="organizationId"
                    required
                    value={formData.organizationId}
                    onChange={handleInputChange}
                    className={`w-full h-12 px-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200 appearance-none bg-white pr-10 ${error ? 'form-error' : ''}`}
                    disabled={loading || loadingOrgs}
                  >
                    <option value="">
                      {loadingOrgs ? 'Loading organizations...' : `Select your ${
                        formData.role === 'donor' ? 'organization or foundation' :
                        formData.role === 'nonprofit_admin' ? 'nonprofit' : 'appraisal firm'
                      }`}
                    </option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-gray-700 font-medium">
                  New Organization Name *
                </Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  placeholder={`Enter your new ${
                    formData.role === 'donor' ? 'organization or foundation' :
                    formData.role === 'nonprofit_admin' ? 'nonprofit' : 'appraisal firm'
                  } name`}
                  disabled={loading}
                  className={`text-base h-12 ${error ? 'form-error' : ''}`}
                />
              </div>
            )}

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
                type="button"
                onClick={handleNext}
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
          </div>
        </div>
      </CardContent>
    </Card>
  )
}