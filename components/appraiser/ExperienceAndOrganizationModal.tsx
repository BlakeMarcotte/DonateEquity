'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import {
  Briefcase,
  Award,
  Building2,
  Globe,
  Plus,
  X,
  MapPin
} from 'lucide-react'
import { secureLogger } from '@/lib/logging/secure-logger'
import { COMMON_CERTIFICATIONS, COMMON_SPECIALIZATIONS, type AppraiserCertification } from '@/types/appraiser'

interface ExperienceAndOrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export default function ExperienceAndOrganizationModal({
  isOpen,
  onClose,
  onComplete
}: ExperienceAndOrganizationModalProps) {
  const { user, userProfile } = useAuth()

  const [formData, setFormData] = useState({
    yearsOfExperience: '',
    specializations: [] as string[],
    certifications: [] as AppraiserCertification[],
    licenseNumber: '',
    firmName: '',
    firmWebsite: '',
    firmCity: '',
    firmState: ''
  })

  const [newSpecialization, setNewSpecialization] = useState('')
  const [newCertification, setNewCertification] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: ''
  })

  const {
    loading,
    error,
    success,
    execute,
    reset
  } = useFormSubmission('Experience Update')

  // Load existing data when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (isOpen && userProfile) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userProfile.uid))
          const userData = userDoc.data()

          if (userData) {
            setFormData({
              yearsOfExperience: userData.yearsOfExperience?.toString() || '',
              specializations: userData.specializations || [],
              certifications: userData.certifications || [],
              licenseNumber: userData.licenseNumber || '',
              firmName: userData.firmName || '',
              firmWebsite: userData.firmWebsite || '',
              firmCity: userData.firmAddress?.city || '',
              firmState: userData.firmAddress?.state || ''
            })
          }
          reset()
        } catch (error) {
          secureLogger.error('Error loading appraiser experience data', error, {
            userId: userProfile.uid
          })
        }
      }
    }

    loadData()
  }, [isOpen, userProfile, reset])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !userProfile) return

    const result = await execute(async () => {
      // Update Firestore user document
      const userDocRef = doc(db, 'users', userProfile.uid)
      await updateDoc(userDocRef, {
        yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
        specializations: formData.specializations,
        certifications: formData.certifications,
        licenseNumber: formData.licenseNumber,
        firmName: formData.firmName,
        firmWebsite: formData.firmWebsite,
        firmAddress: {
          city: formData.firmCity,
          state: formData.firmState
        },
        updatedAt: new Date()
      })

      // Mark task as complete if key fields are filled
      const isComplete = !!(
        formData.yearsOfExperience &&
        formData.specializations.length > 0 &&
        formData.firmName
      )

      if (isComplete) {
        const token = await user.getIdToken()
        await fetch('/api/tasks/completion', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskType: 'onboarding',
            taskId: 'appraiser_experience',
            status: 'complete'
          })
        })
      }

      return { success: true }
    })

    if (result) {
      onComplete?.()
      setTimeout(() => {
        handleClose()
      }, 1500)
    }
  }

  const handleClose = () => {
    if (loading) return
    reset()
    onClose()
  }

  const handleSuccessClose = () => {
    handleClose()
  }

  const addSpecialization = (spec: string) => {
    if (spec && !formData.specializations.includes(spec)) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, spec]
      }))
      setNewSpecialization('')
    }
  }

  const removeSpecialization = (spec: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(s => s !== spec)
    }))
  }

  const addCertification = () => {
    if (newCertification.name && newCertification.issuingOrganization) {
      const cert: AppraiserCertification = {
        id: Date.now().toString(),
        name: newCertification.name,
        issuingOrganization: newCertification.issuingOrganization,
        issueDate: newCertification.issueDate
      }
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, cert]
      }))
      setNewCertification({ name: '', issuingOrganization: '', issueDate: '' })
    }
  }

  const removeCertification = (id: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c.id !== id)
    }))
  }

  const isFormValid = !!(
    formData.yearsOfExperience &&
    formData.specializations.length > 0 &&
    formData.firmName
  )

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Experience & Organization"
      description="Tell us about your professional experience, certifications, and the firm you work for."
      onSubmit={handleSubmit}
      loading={loading}
      loadingText="Saving Experience..."
      success={success}
      successTitle="Experience Updated!"
      successMessage="Your professional experience and organization details have been saved."
      onSuccessClose={handleSuccessClose}
      error={error}
      submitDisabled={!isFormValid}
      submitText="Save Experience"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Experience Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            Professional Experience
          </h3>

          <div className="space-y-4">
            <div>
              <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience <span className="text-red-600 font-bold">*</span>
              </label>
              <input
                type="number"
                id="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={(e) => setFormData(prev => ({ ...prev, yearsOfExperience: e.target.value }))}
                placeholder="e.g., 5"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specializations <span className="text-red-600 font-bold">*</span>
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={newSpecialization}
                    onChange={(e) => {
                      if (e.target.value) {
                        addSpecialization(e.target.value)
                      }
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    disabled={loading}
                  >
                    <option value="">Select a specialization...</option>
                    {COMMON_SPECIALIZATIONS.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                </div>
                {formData.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.specializations.map(spec => (
                      <span
                        key={spec}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {spec}
                        <button
                          type="button"
                          onClick={() => removeSpecialization(spec)}
                          className="hover:text-blue-600"
                          disabled={loading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                License Number (Optional)
              </label>
              <input
                type="text"
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
                placeholder="Enter your license number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Certifications Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Certifications (Optional)
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                value={newCertification.name}
                onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={loading}
              >
                <option value="">Select certification...</option>
                {COMMON_CERTIFICATIONS.map(cert => (
                  <option key={cert} value={cert}>{cert}</option>
                ))}
              </select>
              <input
                type="text"
                value={newCertification.issuingOrganization}
                onChange={(e) => setNewCertification(prev => ({ ...prev, issuingOrganization: e.target.value }))}
                placeholder="Issuing organization"
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={loading}
              />
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newCertification.issueDate}
                  onChange={(e) => setNewCertification(prev => ({ ...prev, issueDate: e.target.value }))}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={addCertification}
                  disabled={!newCertification.name || !newCertification.issuingOrganization || loading}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {formData.certifications.length > 0 && (
              <div className="space-y-2">
                {formData.certifications.map(cert => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{cert.name}</p>
                      <p className="text-sm text-gray-600">
                        {cert.issuingOrganization}
                        {cert.issueDate && ` • Issued ${new Date(cert.issueDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCertification(cert.id)}
                      className="text-red-600 hover:text-red-800"
                      disabled={loading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Firm Information Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Firm Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="firmName" className="block text-sm font-medium text-gray-700 mb-2">
                Firm Name <span className="text-red-600 font-bold">*</span>
              </label>
              <input
                type="text"
                id="firmName"
                value={formData.firmName}
                onChange={(e) => setFormData(prev => ({ ...prev, firmName: e.target.value }))}
                placeholder="Enter your firm name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={loading}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="firmWebsite" className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="inline w-4 h-4 mr-1" />
                Firm Website (Optional)
              </label>
              <input
                type="text"
                id="firmWebsite"
                value={formData.firmWebsite}
                onChange={(e) => setFormData(prev => ({ ...prev, firmWebsite: e.target.value }))}
                placeholder="www.yourfirm.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="firmCity" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                City (Optional)
              </label>
              <input
                type="text"
                id="firmCity"
                value={formData.firmCity}
                onChange={(e) => setFormData(prev => ({ ...prev, firmCity: e.target.value }))}
                placeholder="Enter city"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="firmState" className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                State (Optional)
              </label>
              <input
                type="text"
                id="firmState"
                value={formData.firmState}
                onChange={(e) => setFormData(prev => ({ ...prev, firmState: e.target.value }))}
                placeholder="Enter state"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  )
}
