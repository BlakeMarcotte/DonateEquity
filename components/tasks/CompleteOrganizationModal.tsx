'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Modal } from '@/components/ui/modal'
import { updateOrganization, getOrCreateOrganization, type Organization } from '@/lib/firebase/organizations'
import { Building2, Globe, Phone, MapPin, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'

interface CompleteOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

// Format phone number as user types
const formatPhoneNumber = (value: string) => {
  // Remove all non-digits
  const phoneNumber = value.replace(/\D/g, '')
  
  // Format as (XXX) XXX-XXXX
  if (phoneNumber.length <= 3) {
    return phoneNumber
  } else if (phoneNumber.length <= 6) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
  } else {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }
}

// Format EIN as user types
const formatEIN = (value: string) => {
  // Remove all non-digits
  const ein = value.replace(/\D/g, '')
  
  // Format as XX-XXXXXXX
  if (ein.length <= 2) {
    return ein
  } else {
    return `${ein.slice(0, 2)}-${ein.slice(2, 9)}`
  }
}


export default function CompleteOrganizationModal({ 
  isOpen, 
  onClose, 
  onComplete 
}: CompleteOrganizationModalProps) {
  const { user, userProfile, customClaims } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    taxId: '',
    website: '',
    phone: '',
    address: {
      city: '',
      state: ''
    }
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)

  // Fetch organization data when modal opens
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!isOpen || !customClaims?.organizationId || !userProfile) {
        return
      }

      try {
        const org = await getOrCreateOrganization(
          customClaims.organizationId,
          userProfile.email,
          userProfile.uid,
          userProfile.displayName ? `${userProfile.displayName}'s Organization` : undefined
        )
        
        if (org) {
          setOrganization(org)
          setFormData({
            name: org.name || '',
            taxId: formatEIN(org.taxId || ''),
            website: org.website || '',
            phone: formatPhoneNumber(org.phone || ''),
            address: {
              city: org.address?.city || '',
              state: org.address?.state || ''
            }
          })
        }
      } catch (error) {
        console.error('Error fetching organization:', error)
        setError(`Failed to load organization: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (isOpen) {
      fetchOrganization()
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, customClaims?.organizationId, userProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customClaims?.organizationId) return

    setSaving(true)
    setError(null)

    try {
      const updatedOrganization: Partial<Organization> = {
        name: formData.name,
        taxId: formData.taxId,
        website: formData.website,
        phone: formData.phone,
        address: formData.address,
        updatedAt: new Date()
      }

      await updateOrganization(customClaims.organizationId, updatedOrganization)
      
      setSuccess(true)
      
      // Close modal after a brief success message
      setTimeout(() => {
        onComplete?.()
        onClose()
      }, 1500)

    } catch (error: any) {
      console.error('Error updating organization:', error)
      setError(error.message || 'Failed to update organization information')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving) return
    setFormData({
      name: '',
      taxId: '',
      website: '',
      phone: '',
      address: {
        city: '',
        state: ''
      }
    })
    setError(null)
    setSuccess(false)
    onClose()
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setFormData(prev => ({ ...prev, phone: formatted }))
  }

  const handleTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEIN(e.target.value)
    setFormData(prev => ({ ...prev, taxId: formatted }))
  }

  const isFormValid = formData.name.trim().length > 0 && 
                     formData.taxId.trim().length > 0 && 
                     formData.website.trim().length > 0 && 
                     formData.phone.trim().length > 0 &&
                     formData.address.city.trim().length > 0 &&
                     formData.address.state.trim().length > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Complete Organization Information"
      size="md"
    >
      {success ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Organization Updated!</h3>
          <p className="text-gray-600">Your organization information has been successfully updated.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="inline w-4 h-4 mr-1" />
                Organization Name
              </label>
              <input
                type="text"
                id="orgName"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter organization name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
                required
              />
            </div>

            <div>
              <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline w-4 h-4 mr-1" />
                Tax ID (EIN)
              </label>
              <input
                type="text"
                id="taxId"
                value={formData.taxId}
                onChange={handleTaxIdChange}
                placeholder="XX-XXXXXXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                placeholder="https://www.example.org"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
                required
              />
            </div>

            <div>
              <label htmlFor="orgPhone" className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="inline w-4 h-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                id="orgPhone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                City
              </label>
              <input
                type="text"
                id="city"
                value={formData.address.city}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, city: e.target.value } 
                }))}
                placeholder="Enter city"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
                required
              />
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                id="state"
                value={formData.address.state}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  address: { ...prev.address, state: e.target.value } 
                }))}
                placeholder="Enter state"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={saving}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !isFormValid}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  <span>Update Organization</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}