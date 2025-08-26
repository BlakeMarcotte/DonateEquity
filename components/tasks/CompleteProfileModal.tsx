'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import { formatPhoneNumber } from '@/lib/utils/formatters'
import { User, Phone } from 'lucide-react'

interface CompleteProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}


export default function CompleteProfileModal({ 
  isOpen, 
  onClose, 
  onComplete 
}: CompleteProfileModalProps) {
  const { user, userProfile, refreshUserData } = useAuth()
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: ''
  })
  
  const { 
    loading, 
    error, 
    success, 
    execute, 
    reset 
  } = useFormSubmission('Profile Update')

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        phoneNumber: formatPhoneNumber(userProfile.phoneNumber || '')
      })
      reset()
    }
  }, [isOpen, userProfile, reset])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !userProfile) return

    await execute(async () => {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: formData.displayName
      })

      // Update Firestore user document
      const userDocRef = doc(db, 'users', userProfile.uid)
      await updateDoc(userDocRef, {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        updatedAt: new Date()
      })

      // Refresh user data
      await refreshUserData()
      return { success: true }
    })

    // Success is handled by the success state in FormModal
    // The modal will show success message before closing
  }

  const handleClose = () => {
    if (loading) return
    setFormData({
      displayName: '',
      phoneNumber: ''
    })
    reset()
    onClose()
  }
  
  const handleSuccessClose = () => {
    onComplete?.()
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
      title="Complete Your Profile"
      description="Please provide your name and phone number to complete your profile."
      onSubmit={handleSubmit}
      loading={loading}
      loadingText="Updating Profile..."
      success={success}
      successTitle="Profile Updated!"
      successMessage="Your profile information has been successfully updated."
      onSuccessClose={handleSuccessClose}
      error={error}
      submitDisabled={!isFormValid}
      submitText="Update Profile"
      maxWidth="sm"
    >
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
          <User className="inline w-4 h-4 mr-1" />
          Full Name
        </label>
        <input
          type="text"
          id="displayName"
          value={formData.displayName}
          onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
          placeholder="Enter your full name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          disabled={loading}
          required
        />
      </div>

      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
          <Phone className="inline w-4 h-4 mr-1" />
          Phone Number
        </label>
        <input
          type="tel"
          id="phoneNumber"
          value={formData.phoneNumber}
          onChange={handlePhoneChange}
          placeholder="(555) 123-4567"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          disabled={loading}
          maxLength={14}
          required
        />
      </div>
    </FormModal>
  )
}