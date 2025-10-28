'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import { updateOrganization, getOrCreateOrganization, type Organization } from '@/lib/firebase/organizations'
import { formatPhoneNumber, formatEIN, cleanPhoneNumber, cleanEIN } from '@/lib/utils/formatters'
import { Building2, Globe, Phone, MapPin, FileText } from 'lucide-react'
import { secureLogger } from '@/lib/logging/secure-logger'

interface CompleteOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export default function CompleteOrganizationModal({
  isOpen,
  onClose,
  onComplete
}: CompleteOrganizationModalProps) {
  const { customClaims, userProfile, user } = useAuth()
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [hasLoadedData, setHasLoadedData] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    website: '',
    phone: '',
    city: '',
    state: ''
  })

  const {
    loading,
    error,
    success,
    execute,
    reset
  } = useFormSubmission('Organization Update')

  // Initialize form data when modal opens - only load once
  useEffect(() => {
    if (isOpen && customClaims?.organizationId && userProfile && !hasLoadedData) {
      loadOrganizationData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, customClaims?.organizationId, userProfile])

  const loadOrganizationData = async () => {
    if (!customClaims?.organizationId || !userProfile) return

    setIsLoadingData(true)
    try {
      const org = await getOrCreateOrganization(
        customClaims.organizationId,
        userProfile.email || '',
        userProfile.uid
      )
      if (org) {
        setFormData({
          name: org.name || '',
          taxId: formatEIN(org.taxId || ''),
          website: org.website || '',
          phone: formatPhoneNumber(org.phone || ''),
          city: org.address?.city || '',
          state: org.address?.state || ''
        })
        setHasLoadedData(true)
      }
      reset()
    } catch (error) {
      secureLogger.error('Error loading organization', error, { organizationId: customClaims?.organizationId })
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customClaims?.organizationId || !userProfile) return

    const organizationId = customClaims.organizationId
    const result = await execute(async () => {
      const cleanedData: Partial<Organization> = {
        name: formData.name.trim(),
        taxId: cleanEIN(formData.taxId),
        website: formData.website.trim(),
        phone: cleanPhoneNumber(formData.phone),
        address: {
          street: '',
          city: formData.city.trim(),
          state: formData.state.trim(),
          zipCode: '',
          country: 'US'
        },
        updatedAt: new Date()
      }

      await updateOrganization(organizationId, cleanedData)

      // Check if organization data is sufficiently complete to mark task as done
      const isComplete = !!(
        cleanedData.name &&
        cleanedData.taxId &&
        cleanedData.website &&
        cleanedData.phone &&
        cleanedData.address?.city &&
        cleanedData.address?.state
      )

      // Mark task as complete if all required fields are filled
      if (isComplete && user) {
        const token = await user.getIdToken()
        await fetch('/api/tasks/completion', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskType: 'onboarding',
            taskId: 'organization',
            status: 'complete'
          })
        })
      }

      return { success: true }
    })

    if (result) {
      // Mark completion immediately to prevent re-opening
      onComplete?.()

      // Wait a moment to show success state then close
      setTimeout(() => {
        handleClose()
      }, 1500)
    }
  }

  const handleClose = () => {
    if (loading) return
    // Don't reset form data - keep the last loaded values to prevent flicker on reopen
    // The useEffect will update it when the modal reopens
    reset()
    onClose()
  }

  const handleSuccessClose = () => {
    // Don't call onComplete again as it was already called
    handleClose()
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData(prev => ({ ...prev, phone: formatted }))
  }

  const handleEINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEIN(e.target.value)
    setFormData(prev => ({ ...prev, taxId: formatted }))
  }

  // Allow saving with any fields filled - no validation required
  const isFormValid = true

  // Don't render modal content until data is loaded
  if (!isOpen) return null

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Complete Organization Information"
      description="Add your organization's details. You can save your progress at any time and complete this later."
      onSubmit={handleSubmit}
      loading={loading}
      loadingText="Updating Organization..."
      success={success}
      successTitle="Organization Updated!"
      successMessage="Your organization information has been successfully updated."
      onSuccessClose={handleSuccessClose}
      error={error}
      submitDisabled={!isFormValid}
      submitText="Save Progress"
      maxWidth="lg"
    >
      {isLoadingData ? (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            <Building2 className="inline w-4 h-4 mr-1" />
            Organization Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter organization name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="inline w-4 h-4 mr-1" />
            EIN (Tax ID)
          </label>
          <input
            type="text"
            id="taxId"
            value={formData.taxId}
            onChange={handleEINChange}
            placeholder="XX-XXXXXXX"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={loading}
            maxLength={10}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="inline w-4 h-4 mr-1" />
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={loading}
            maxLength={14}
          />
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="inline w-4 h-4 mr-1" />
            Website
          </label>
          <input
            type="text"
            id="website"
            value={formData.website}
            onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
            placeholder="www.example.org"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline w-4 h-4 mr-1" />
            City
          </label>
          <input
            type="text"
            id="city"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            placeholder="Enter city"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline w-4 h-4 mr-1" />
            State
          </label>
          <input
            type="text"
            id="state"
            value={formData.state}
            onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
            placeholder="Enter state"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={loading}
          />
        </div>
      </div>
      )}
    </FormModal>
  )
}