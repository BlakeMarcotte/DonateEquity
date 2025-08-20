'use client'

import { useState } from 'react'
import { collection, addDoc, doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import { secureLogger } from '@/lib/logging/secure-logger'

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
    endDate: '',
    category: '',
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

    await execute(async () => {
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

      const campaignData = {
        title: formData.title,
        description: formData.description,
        goal: parseInt(formData.goal),
        currentAmount: 0,
        donorCount: 0,
        status: formData.status,
        category: formData.category,
        organizationId,
        organizationName,
        createdBy: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        startDate: Timestamp.now(),
        endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
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
  }

  const handleClose = () => {
    if (saving) return
    setFormData({
      title: '',
      description: '',
      goal: '',
      endDate: '',
      category: '',
      status: 'draft',
    })
    reset()
    onClose()
  }
  
  const handleSuccessClose = () => {
    setFormData({
      title: '',
      description: '',
      goal: '',
      endDate: '',
      category: '',
      status: 'draft',
    })
    reset()
    onSuccess()
    onClose()
  }

  const isFormValid = 
    formData.title.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    formData.goal.trim().length > 0 &&
    formData.category.trim().length > 0

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Campaign"
      description="Set up your fundraising campaign with basic information."
      onSubmit={handleSubmit}
      loading={saving}
      loadingText="Creating Campaign..."
      success={success}
      successTitle="Campaign Created!"
      successMessage={`Your campaign "${formData.title}" has been created successfully.`}
      onSuccessClose={handleSuccessClose}
      error={error}
      submitDisabled={!isFormValid}
      submitText="Create Campaign"
      maxWidth="lg"
    >
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Campaign Title
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
            Description
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funding Goal ($)
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.goal}
              onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="100000"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={saving}
          >
            <option value="">Select a category</option>
            <option value="Technology">Technology</option>
            <option value="Education">Education</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Environment">Environment</option>
            <option value="Arts & Culture">Arts & Culture</option>
            <option value="Community">Community</option>
            <option value="Social Impact">Social Impact</option>
            <option value="Research">Research</option>
            <option value="Emergency Relief">Emergency Relief</option>
            <option value="Other">Other</option>
          </select>
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
            <option value="paused">Paused - Temporarily hidden</option>
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