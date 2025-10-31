'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { FormModal } from '@/components/shared/FormModal'
import { useFormSubmission } from '@/hooks/useAsyncOperation'
import {
  FileText,
  Plus,
  X,
  GripVertical,
  Check,
  Clock
} from 'lucide-react'
import { secureLogger } from '@/lib/logging/secure-logger'
import { COMMON_DOCUMENT_REQUIREMENTS, type AppraiserDocumentRequirement } from '@/types/appraiser'

interface AppraiserPacketModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export default function AppraiserPacketModal({
  isOpen,
  onClose,
  onComplete
}: AppraiserPacketModalProps) {
  const { user, userProfile } = useAuth()

  const [formData, setFormData] = useState({
    requiredDocuments: [] as AppraiserDocumentRequirement[],
    standardTurnaroundTime: ''
  })

  const [newDocument, setNewDocument] = useState({
    documentName: '',
    description: '',
    required: true
  })

  const {
    loading,
    error,
    success,
    execute,
    reset
  } = useFormSubmission('Appraiser Packet Update')

  // Load existing data when modal opens
  useEffect(() => {
    const loadData = async () => {
      if (isOpen && userProfile) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userProfile.uid))
          const userData = userDoc.data()

          if (userData) {
            setFormData({
              requiredDocuments: userData.requiredDocuments || [],
              standardTurnaroundTime: userData.standardTurnaroundTime?.toString() || ''
            })
          }
          reset()
        } catch (error) {
          secureLogger.error('Error loading appraiser packet data', error, {
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
        requiredDocuments: formData.requiredDocuments,
        standardTurnaroundTime: formData.standardTurnaroundTime
          ? parseInt(formData.standardTurnaroundTime)
          : null,
        updatedAt: new Date()
      })

      // Mark task as complete if at least one document is added
      if (formData.requiredDocuments.length > 0) {
        const token = await user.getIdToken()
        await fetch('/api/tasks/completion', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskType: 'onboarding',
            taskId: 'appraiser_packet',
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

  const addCommonDocument = (docTemplate: { name: string; description: string }) => {
    const exists = formData.requiredDocuments.some(
      doc => doc.documentName === docTemplate.name
    )
    if (!exists) {
      const newDoc: AppraiserDocumentRequirement = {
        id: Date.now().toString(),
        documentName: docTemplate.name,
        description: docTemplate.description,
        required: true,
        order: formData.requiredDocuments.length
      }
      setFormData(prev => ({
        ...prev,
        requiredDocuments: [...prev.requiredDocuments, newDoc]
      }))
    }
  }

  const addCustomDocument = () => {
    if (newDocument.documentName && newDocument.description) {
      const doc: AppraiserDocumentRequirement = {
        id: Date.now().toString(),
        documentName: newDocument.documentName,
        description: newDocument.description,
        required: newDocument.required,
        order: formData.requiredDocuments.length
      }
      setFormData(prev => ({
        ...prev,
        requiredDocuments: [...prev.requiredDocuments, doc]
      }))
      setNewDocument({ documentName: '', description: '', required: true })
    }
  }

  const removeDocument = (id: string) => {
    setFormData(prev => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.filter(doc => doc.id !== id)
    }))
  }

  const toggleRequired = (id: string) => {
    setFormData(prev => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.map(doc =>
        doc.id === id ? { ...doc, required: !doc.required } : doc
      )
    }))
  }

  const moveDocument = (id: string, direction: 'up' | 'down') => {
    const index = formData.requiredDocuments.findIndex(doc => doc.id === id)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.requiredDocuments.length - 1)
    ) {
      return
    }

    const newDocs = [...formData.requiredDocuments]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    ;[newDocs[index], newDocs[newIndex]] = [newDocs[newIndex], newDocs[index]]

    // Update order
    newDocs.forEach((doc, idx) => {
      doc.order = idx
    })

    setFormData(prev => ({ ...prev, requiredDocuments: newDocs }))
  }

  const isFormValid = formData.requiredDocuments.length > 0

  return (
    <FormModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Appraiser Packet"
      description="Specify the documents you need from clients to conduct an appraisal. This will help streamline the appraisal process."
      onSubmit={handleSubmit}
      loading={loading}
      loadingText="Saving Packet..."
      success={success}
      successTitle="Packet Saved!"
      successMessage="Your appraiser packet has been configured successfully."
      onSuccessClose={handleSuccessClose}
      error={error}
      submitDisabled={!isFormValid}
      submitText="Save Packet"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Standard Turnaround Time */}
        <div>
          <label htmlFor="turnaroundTime" className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="inline w-4 h-4 mr-1" />
            Standard Turnaround Time (Optional)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              id="turnaroundTime"
              value={formData.standardTurnaroundTime}
              onChange={(e) => setFormData(prev => ({ ...prev, standardTurnaroundTime: e.target.value }))}
              placeholder="e.g., 10"
              min="1"
              className="w-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={loading}
            />
            <span className="text-gray-600">business days</span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            How long does it typically take you to complete an appraisal after receiving all documents?
          </p>
        </div>

        {/* Common Documents Quick Add */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Add Common Documents
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {COMMON_DOCUMENT_REQUIREMENTS.map((docTemplate) => {
              const alreadyAdded = formData.requiredDocuments.some(
                doc => doc.documentName === docTemplate.name
              )
              return (
                <button
                  key={docTemplate.name}
                  type="button"
                  onClick={() => addCommonDocument(docTemplate)}
                  disabled={alreadyAdded || loading}
                  className={`text-left p-3 border rounded-lg transition-all ${
                    alreadyAdded
                      ? 'border-green-300 bg-green-50 text-green-700 cursor-not-allowed'
                      : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{docTemplate.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{docTemplate.description}</p>
                    </div>
                    {alreadyAdded ? (
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                    ) : (
                      <Plus className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom Document Add */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Custom Document
          </label>
          <div className="space-y-3 p-4 border border-gray-300 rounded-lg bg-gray-50">
            <input
              type="text"
              value={newDocument.documentName}
              onChange={(e) => setNewDocument(prev => ({ ...prev, documentName: e.target.value }))}
              placeholder="Document name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={loading}
            />
            <textarea
              value={newDocument.description}
              onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description of what this document should contain..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={loading}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newDocument.required}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, required: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={loading}
                />
                <span className="text-gray-700">Required document</span>
              </label>
              <button
                type="button"
                onClick={addCustomDocument}
                disabled={!newDocument.documentName || !newDocument.description || loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Document
              </button>
            </div>
          </div>
        </div>

        {/* Document List */}
        {formData.requiredDocuments.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Appraiser Packet ({formData.requiredDocuments.length} documents)
            </label>
            <div className="space-y-2">
              {formData.requiredDocuments.map((doc, index) => (
                <div
                  key={doc.id}
                  className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => moveDocument(doc.id, 'up')}
                      disabled={index === 0 || loading}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDocument(doc.id, 'down')}
                      disabled={index === formData.requiredDocuments.length - 1 || loading}
                      className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{doc.documentName}</p>
                        <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleRequired(doc.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            doc.required
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          disabled={loading}
                        >
                          {doc.required ? 'Required' : 'Optional'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="text-red-600 hover:text-red-800"
                          disabled={loading}
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {formData.requiredDocuments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No documents added yet. Add at least one document to continue.</p>
          </div>
        )}
      </div>
    </FormModal>
  )
}
