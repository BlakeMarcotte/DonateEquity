'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types/auth'

interface Organization {
  id: string
  name: string
  type: 'nonprofit' | 'appraiser'
}

interface RegisterFormProps {
  onSuccess?: () => void
  redirectTo?: string
}

const ROLE_DESCRIPTIONS = {
  donor: 'Individuals who want to pre-commit equity donations to nonprofits',
  nonprofit_admin: 'Administrators of nonprofit organizations managing campaigns',
  appraiser: 'Professional appraisers who conduct equity valuations',
}

export default function RegisterForm({ onSuccess, redirectTo = '/dashboard' }: RegisterFormProps) {
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

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.displayName || !formData.role) {
      setError('Please fill in all required fields')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }

    if ((formData.role === 'nonprofit_admin' || formData.role === 'appraiser')) {
      if (!formData.createNewOrg && !formData.organizationId) {
        setError('Please select an organization or choose to create a new one')
        return false
      }
      
      if (formData.createNewOrg && !formData.organizationName) {
        setError('Please enter an organization name')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }

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

  const requiresOrganization = formData.role === 'nonprofit_admin' || formData.role === 'appraiser'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
            Full Name *
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            value={formData.displayName}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          value={formData.phoneNumber}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            value={formData.password}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password *
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Account Type *
        </label>
        <select
          id="role"
          name="role"
          required
          value={formData.role}
          onChange={handleInputChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
          <option value="">Select your role</option>
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
            <option key={role} value={role}>
              {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} - {description}
            </option>
          ))}
        </select>
      </div>

      {requiresOrganization && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-md">
          <h3 className="text-sm font-medium text-gray-900">Organization Information</h3>
          
          <div className="flex items-center space-x-3">
            <input
              id="createNewOrg"
              name="createNewOrg"
              type="checkbox"
              checked={formData.createNewOrg}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <label htmlFor="createNewOrg" className="text-sm text-gray-700">
              Create a new organization
            </label>
          </div>

          {formData.createNewOrg ? (
            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                Organization Name *
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required={formData.createNewOrg}
                value={formData.organizationName}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
          ) : (
            <div>
              <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700">
                Select Organization *
              </label>
              <select
                id="organizationId"
                name="organizationId"
                required={!formData.createNewOrg}
                value={formData.organizationId}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  )
}