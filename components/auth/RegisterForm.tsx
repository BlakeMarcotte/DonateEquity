'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, EyeOff, Loader2, Users, Building, Shield } from 'lucide-react'

interface Organization {
  id: string
  name: string
  type: 'nonprofit' | 'appraiser'
}

interface RegisterFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

const ROLES = [
  {
    value: 'donor' as UserRole,
    label: 'Donor',
    description: 'Pre-commit equity donations to nonprofits upon liquidity events',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  {
    value: 'nonprofit_admin' as UserRole,
    label: 'Nonprofit Admin',
    description: 'Manage campaigns and coordinate donation workflows',
    icon: Building,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
  {
    value: 'appraiser' as UserRole,
    label: 'Appraiser',
    description: 'Conduct professional equity valuations and appraisals',
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
  },
]

export default function RegisterForm({ onSuccess, redirectTo = '/dashboard' }: RegisterFormProps) {
  const [step, setStep] = useState<'role' | 'details' | 'organization'>('role')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phoneNumber: '',
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

  const fetchOrganizations = async (type: 'nonprofit' | 'appraiser') => {
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

  const handleRoleSelect = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      role,
      organizationId: '',
      organizationName: '',
      createNewOrg: false,
    }))
    setStep('details')
  }

  const handleNext = () => {
    setError('')
    
    if (step === 'details') {
      if (!formData.email || !formData.password || !formData.displayName) {
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
      
      const requiresOrganization = formData.role === 'nonprofit_admin' || formData.role === 'appraiser'
      if (requiresOrganization) {
        setStep('organization')
      } else {
        handleSubmit()
      }
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
      setStep('details')
    } else if (step === 'details') {
      setStep('role')
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
          phoneNumber: formData.phoneNumber || undefined,
          role: formData.role,
          organizationId: formData.createNewOrg ? undefined : formData.organizationId || undefined,
          organizationName: formData.createNewOrg ? formData.organizationName : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        if (onSuccess) {
          onSuccess()
        } else {
          router.push(redirectTo)
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

  if (step === 'role') {
    return (
      <Card className="border-0 shadow-none p-0">
        <CardContent className="p-0">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Choose your account type
              </h3>
              <p className="text-sm text-gray-600">
                Select the option that best describes your role in the equity donation process.
              </p>
            </div>

            <div className="space-y-3">
              {ROLES.map((role) => {
                const Icon = role.icon
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleSelect(role.value)}
                    className={`w-full p-4 text-left border-2 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                      formData.role === role.value
                        ? role.bgColor
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-6 h-6 mt-0.5 ${role.color}`} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {role.label}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (step === 'details') {
    return (
      <Card className="border-0 shadow-none p-0">
        <CardContent className="p-0">
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Personal Information
              </h3>
              <p className="text-sm text-gray-600">
                Enter your details to create your {ROLES.find(r => r.value === formData.role)?.label.toLowerCase()} account.
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
              {/* Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className={error ? 'form-error' : ''}
                  />
                </div>

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
                    className={error ? 'form-error' : ''}
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-gray-700 font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  disabled={loading}
                />
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      placeholder="Create a secure password"
                      disabled={loading}
                      className={`pr-10 ${error ? 'form-error' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
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
                      className={`pr-10 ${error ? 'form-error' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-10 w-10 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
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
              Select your organization or create a new one.
            </p>
          </div>

          <div className="space-y-6">
            {/* Toggle for new organization */}
            <div className="flex items-center gap-3">
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
                Create a new organization
              </Label>
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
                  placeholder="Enter organization name"
                  disabled={loading}
                  className={error ? 'form-error' : ''}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="organizationId" className="text-gray-700 font-medium">
                  Select Organization *
                </Label>
                <select
                  id="organizationId"
                  name="organizationId"
                  required
                  value={formData.organizationId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors duration-200"
                  disabled={loading || loadingOrgs}
                >
                  <option value="">
                    {loadingOrgs ? 'Loading organizations...' : 'Select an organization'}
                  </option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
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