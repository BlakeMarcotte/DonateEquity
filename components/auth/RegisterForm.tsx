'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeOff, Loader2, ChevronDown } from 'lucide-react'
import { signIn } from '@/lib/firebase/auth'
import { useAuth } from '@/contexts/AuthContext'

interface Organization {
  id: string
  name: string
  type: 'nonprofit' | 'appraiser' | 'donor'
}

interface RegisterFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

const ROLES = [
  {
    value: 'donor' as UserRole,
    label: 'Donor',
    description: 'Individual looking to donate equity to nonprofits',
  },
  {
    value: 'nonprofit_admin' as UserRole,
    label: 'Nonprofit Administrator',
    description: 'Managing campaigns and donation workflows for a nonprofit',
  },
  {
    value: 'appraiser' as UserRole,
    label: 'Professional Appraiser',
    description: 'Conducting equity valuations and appraisals',
  },
]

export default function RegisterForm({ onSuccess, redirectTo = '/dashboard' }: RegisterFormProps) {
  const [step, setStep] = useState<'basic' | 'organization'>('basic')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    role: '' as UserRole | '',
    organizationId: '',
    organizationName: '',
    createNewOrg: false,
  })
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loadingOrgs, setLoadingOrgs] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()
  const { refreshUserData } = useAuth()

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
      ...(name === 'role' && { organizationId: '', organizationName: '', createNewOrg: false }),
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
      
      // All roles now require organization setup
      setStep('organization')
    } else if (step === 'organization') {
      if (!formData.createNewOrg && !formData.organizationId) {
        setError('Please select an organization or choose to create a new one')
        return
      }
      
      if (formData.createNewOrg && !formData.organizationName) {
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
          organizationId: formData.createNewOrg ? undefined : formData.organizationId || undefined,
          organizationName: formData.createNewOrg ? formData.organizationName : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Automatically sign in the user after successful registration
        try {
          await signIn(formData.email, formData.password)
          await refreshUserData()
          
          if (onSuccess) {
            onSuccess()
          } else {
            router.push(redirectTo)
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
                  disabled={loading}
                  className={`text-base h-12 ${error ? 'form-error' : ''}`}
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-gray-700 font-medium">
                  I am a *
                </Label>
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
                {formData.role && (
                  <p className="text-sm text-gray-600 mt-2">
                    {ROLES.find(r => r.value === formData.role)?.description}
                  </p>
                )}
              </div>

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
            {/* Toggle for new organization */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <input
                  id="createNewOrg"
                  name="createNewOrg"
                  type="checkbox"
                  checked={formData.createNewOrg}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <Label htmlFor="createNewOrg" className="text-gray-700 font-medium">
                  I want to register a new organization
                </Label>
              </div>
              <p className="text-sm text-gray-600 ml-7">
                Check this if your organization isn&apos;t listed below
              </p>
            </div>

            {formData.createNewOrg ? (
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-gray-700 font-medium">
                  Organization Name *
                </Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  type="text"
                  required
                  value={formData.organizationName}
                  onChange={handleInputChange}
                  placeholder={`Enter your ${
                    formData.role === 'donor' ? 'organization or foundation' :
                    formData.role === 'nonprofit_admin' ? 'nonprofit' : 'appraisal firm'
                  } name`}
                  disabled={loading}
                  className={`text-base h-12 ${error ? 'form-error' : ''}`}
                />
              </div>
            ) : (
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