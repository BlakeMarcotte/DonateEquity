'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import { formatPhoneNumber } from '@/lib/utils/formatters'
import { User, Phone, FileText } from 'lucide-react'
import { secureLogger } from '@/lib/logging/secure-logger'
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload'

interface CompleteAppraiserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export default function CompleteAppraiserProfileModal({
  isOpen,
  onClose,
  onComplete
}: CompleteAppraiserProfileModalProps) {
  const { user, userProfile, refreshUserData } = useAuth()

  // Initialize form data immediately from userProfile to prevent flash
  const [formData, setFormData] = useState(() => ({
    displayName: userProfile?.displayName || '',
    phoneNumber: formatPhoneNumber(userProfile?.phoneNumber || ''),
    bio: ''
  }))

  const {
    loading,
    error,
    success,
    execute,
    reset
  } = useFormSubmission('Appraiser Profile Update')

  // Initialize form data when modal opens
  useEffect(() => {
    const loadProfileData = async () => {
      if (isOpen && userProfile) {
        try {
          // Get appraiser profile data from users document
          const userDoc = await getDoc(doc(db, 'users', userProfile.uid))
          const userData = userDoc.data()

          setFormData({
            displayName: userProfile.displayName || '',
            phoneNumber: formatPhoneNumber(userProfile.phoneNumber || ''),
            bio: userData?.bio || ''
          })
          reset()
        } catch (error) {
          secureLogger.error('Error loading appraiser profile', error, {
            userId: userProfile.uid
          })
        }
      }
    }

    loadProfileData()
  }, [isOpen, userProfile, reset])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !userProfile) return

    const result = await execute(async () => {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: formData.displayName
      })

      // Update Firestore user document
      const userDocRef = doc(db, 'users', userProfile.uid)
      await updateDoc(userDocRef, {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        bio: formData.bio,
        updatedAt: new Date()
      })

      // Mark task as complete if all required fields are filled
      if (formData.displayName.trim() && formData.phoneNumber.trim()) {
        const token = await user.getIdToken()
        await fetch('/api/tasks/completion', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskType: 'onboarding',
            taskId: 'appraiser_profile',
            status: 'complete'
          })
        })
      }

      // Refresh user data
      await refreshUserData()
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
    setFormData(prev => ({ ...prev, phoneNumber: formatted }))
  }

  const isFormValid = formData.displayName.trim().length > 0 && formData.phoneNumber.trim().length > 0

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Complete Your Appraiser Profile"
      description="Please provide your basic information to get started."
      onSubmit={handleSubmit}
      loading={loading}
      loadingText="Updating Profile..."
      success={success}
      successTitle="Profile Updated!"
      successMessage="Your appraiser profile has been successfully updated."
      onSuccessClose={handleSuccessClose}
      error={error}
      submitDisabled={!isFormValid}
      submitText="Save Profile"
      maxWidth="lg"
    >
      {/* Profile Picture Upload */}
      {user && (
        <div className="pb-6 mb-6 border-b border-gray-200">
          <ProfilePictureUpload
            user={user}
            currentPhotoURL={userProfile?.photoURL}
            disabled={loading}
            size="md"
          />
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
            <User className="inline w-4 h-4 mr-1" />
            Full Name <span className="text-red-600 font-bold">*</span>
          </label>
          <input
            type="text"
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
            placeholder="Enter your full name"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              formData.displayName.trim().length === 0
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
            disabled={loading}
            required
          />
          {formData.displayName.trim().length === 0 && (
            <p className="mt-1 text-sm text-red-600">This field is required</p>
          )}
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            <Phone className="inline w-4 h-4 mr-1" />
            Phone Number <span className="text-red-600 font-bold">*</span>
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={formData.phoneNumber}
            onChange={handlePhoneChange}
            placeholder="(555) 123-4567"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              formData.phoneNumber.trim().length === 0
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
            disabled={loading}
            maxLength={14}
            required
          />
          {formData.phoneNumber.trim().length === 0 && (
            <p className="mt-1 text-sm text-red-600">This field is required</p>
          )}
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="inline w-4 h-4 mr-1" />
            Professional Bio (Optional)
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Brief professional summary and areas of expertise..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={loading}
          />
          <p className="mt-1 text-sm text-gray-500">
            This will be shown to nonprofits when they consider working with you
          </p>
        </div>
      </div>
    </FormModal>
  )
}
