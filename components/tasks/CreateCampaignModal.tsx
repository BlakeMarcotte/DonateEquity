'use client'

import { useState } from 'react'
import { collection, addDoc, doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import { secureLogger } from '@/lib/logging/secure-logger'
import { formatCurrencyInput, cleanCurrencyInput } from '@/lib/utils/formatters'

interface CreateCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  organizationId: string
  userId: string
}

export default function CreateCampaignModal({ 
  isOpen,
  onClose, 
  onSuccess, 
  organizationId, 
  userId 
}: CreateCampaignModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: '',
    status: 'draft' as 'draft' | 'active' | 'paused' | 'completed',
  })
  
  const { 
    loading: saving, 
    error, 
    success,
    execute, 
    reset 
  } = useFormSubmission('Campaign Creation')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !userId) {
      throw new Error('Missing organization or user ID')
    }

    secureLogger.info('Campaign creation form submission', { 
      title: formData.title, 
      goal: formData.goal, 
      organizationId 
    })

    const result = await execute(async () => {
      // Fetch organization name
      let organizationName = 'Unknown Organization'
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
        if (orgDoc.exists()) {
          organizationName = orgDoc.data().name || 'Unknown Organization'
        }
      } catch (orgError) {
        secureLogger.error('Error fetching organization for campaign', orgError, { organizationId })
      }

      // Parse the cleaned currency value (remove $ and commas)
      const cleanedGoal = cleanCurrencyInput(formData.goal)
      const goalAmount = parseInt(cleanedGoal)

      const campaignData = {
        title: formData.title,
        description: formData.description,
        goal: goalAmount,
        currentAmount: 0,
        donorCount: 0,
        status: formData.status,
        organizationId,
        organizationName,
        createdBy: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        startDate: Timestamp.now(),
        endDate: null,
        tags: [],
        images: {
          hero: '',
          gallery: []
        },
        settings: {
          allowRecurring: true
        }
      }

      await addDoc(collection(db, 'campaigns'), campaignData)
      return { campaignTitle: formData.title, goal: formData.goal }
    })

    if (result) {
      // Mark completion immediately to prevent re-opening
      onSuccess()
      
      // Wait a moment to show success state then close
      setTimeout(() => {
        handleClose()
      }, 1500)
    }
  }

  const handleClose = () => {
    if (saving) return
    setFormData({
      title: '',
      description: '',
      goal: '',
      status: 'draft',
    })
    reset()
    onClose()
  }

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrencyInput(e.target.value)
    setFormData(prev => ({ ...prev, goal: formatted }))
  }

  const handleSuccessClose = () => {
    // Don't call onSuccess again as it was already called
    handleClose()
  }

  const isFormValid =
    formData.title.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    cleanCurrencyInput(formData.goal).length > 0

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Campaign"
      description="All fields are required to create a campaign."
      onSubmit={handleSubmit}
      loading={saving}
      loadingText="Creating Campaign..."
      success={success}
      successTitle="Campaign Created!"
      successMessage="Your campaign has been successfully created."
      onSuccessClose={handleSuccessClose}
      error={error}
      submitDisabled={!isFormValid}
      submitText="Create Campaign"
      maxWidth="lg"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter campaign title"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-600">*</span>
          </label>
          <textarea
            rows={2}
            required
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe your campaign..."
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Funding Goal <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.goal}
            onChange={handleGoalChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="$100,000"
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'active' | 'paused' | 'completed' }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={saving}
          >
            <option value="draft">Draft - Not visible to donors</option>
            <option value="active">Active - Live and accepting donations</option>
            <option value="completed">Completed - Campaign has ended</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Choose the initial status for your campaign. You can change this later.
          </p>
        </div>


      </div>
    </FormModal>
  )
}