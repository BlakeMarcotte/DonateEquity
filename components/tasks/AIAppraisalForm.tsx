'use client'

import { useState } from 'react'
import { Task } from '@/types/task'
import { useAuth } from '@/contexts/AuthContext'
import { 
  X, 
  Building, 
  FileText, 
  Upload,
  CheckCircle,
  AlertCircle,
  Bot
} from 'lucide-react'

interface AIAppraisalFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => Promise<void>
  task: Task
  campaignTitle?: string
  donorName?: string
  organizationName?: string
}

interface CompanyInfo {
  legalName: string
  sicCode?: string
  revenueModel?: 'SaaS' | 'Services' | 'Product' | 'Marketplace' | 'Other'
  numberOfEmployees?: '1-10' | '11-50' | '51-200' | '201-500' | '500+'
  inceptionDate?: string
  exitTimeline?: string
  lawFirm?: string
  companyOverview?: string
}

const steps = [
  { id: 1, name: 'Company Information', icon: Building },
  { id: 2, name: 'Upload Documents', icon: Upload },
  { id: 3, name: 'Review & Submit', icon: CheckCircle }
]

export function AIAppraisalForm({
  isOpen,
  onClose,
  onSuccess,
  task
}: AIAppraisalFormProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    legalName: '',
    sicCode: '',
    revenueModel: undefined,
    numberOfEmployees: undefined,
    inceptionDate: '',
    exitTimeline: '',
    lawFirm: '',
    companyOverview: ''
  })
  
  const [uploadedFiles, setUploadedFiles] = useState<{
    articlesOfIncorporation?: File
    pitchDeck?: File
    capTable?: File
  }>({})

  if (!isOpen) return null

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Step 1: Get fresh Firebase token
      if (!user) {
        throw new Error('User not authenticated')
      }
      
      // Force token refresh to ensure it's valid
      const token = await user.getIdToken(true)
      
      // Step 2: Initiate AI Appraisal
      const response = await fetch('/api/valuation/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          taskId: task.id,
          participantId: task.participantId,
          campaignId: task.campaignId,
          companyInfo
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initiate AI Appraisal')
      }

      await response.json()
      // Valuation initiated successfully

      // Step 2: Upload files if any
      const fileUploads = Object.entries(uploadedFiles).filter(([, file]) => file)
      
      for (const [type, file] of fileUploads) {
        if (!file) continue
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('taskId', task.id)
        formData.append('attachmentType', type.replace(/([A-Z])/g, '_$1').toLowerCase())

        const uploadResponse = await fetch('/api/valuation/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json()
          console.warn(`Failed to upload ${type}:`, uploadError.error)
          // Continue with other uploads even if one fails
        }
      }

      // Success - call parent success handler
      await onSuccess()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Legal Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={companyInfo.legalName}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, legalName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your company's legal name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SIC Code
          </label>
          <input
            type="text"
            value={companyInfo.sicCode}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, sicCode: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 6211"
            maxLength={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Revenue Model
          </label>
          <select
            value={companyInfo.revenueModel || ''}
            onChange={(e) => setCompanyInfo(prev => ({ 
              ...prev, 
              revenueModel: e.target.value as CompanyInfo['revenueModel'] 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select revenue model</option>
            <option value="SaaS">SaaS</option>
            <option value="Services">Services</option>
            <option value="Product">Product</option>
            <option value="Marketplace">Marketplace</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Employees
          </label>
          <select
            value={companyInfo.numberOfEmployees || ''}
            onChange={(e) => setCompanyInfo(prev => ({ 
              ...prev, 
              numberOfEmployees: e.target.value as CompanyInfo['numberOfEmployees'] 
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select employee range</option>
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-500">201-500</option>
            <option value="500+">500+</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Inception Date
          </label>
          <input
            type="date"
            value={companyInfo.inceptionDate}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, inceptionDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Law Firm
          </label>
          <input
            type="text"
            value={companyInfo.lawFirm}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, lawFirm: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Deloitte"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Company Overview
        </label>
        <textarea
          value={companyInfo.companyOverview}
          onChange={(e) => setCompanyInfo(prev => ({ ...prev, companyOverview: e.target.value }))}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Provide 1-3 sentences sharing a high-level overview of the business..."
          maxLength={1000}
        />
        <div className="text-xs text-gray-500 mt-1">
          {companyInfo.companyOverview?.length || 0}/1000 characters
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center text-gray-600 mb-6">
        <Bot className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <p>Upload your company documents to help our AI provide a more accurate valuation.</p>
        <p className="text-sm mt-2">All uploads are optional but recommended for better accuracy.</p>
      </div>

      {[
        { key: 'articlesOfIncorporation', label: 'Articles of Incorporation', description: 'Company formation documents' },
        { key: 'pitchDeck', label: 'Pitch Deck or Business Plan', description: 'Company overview presentation' },
        { key: 'capTable', label: 'Cap Table', description: 'Current equity structure' }
      ].map(({ key, label, description }) => (
        <div key={key} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{label}</h4>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
            
            <div className="flex items-center space-x-2">
              {uploadedFiles[key as keyof typeof uploadedFiles] ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">
                    {uploadedFiles[key as keyof typeof uploadedFiles]?.name}
                  </span>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setUploadedFiles(prev => ({ ...prev, [key]: file }))
                      }
                    }}
                  />
                  <div className="flex items-center space-x-2 px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Choose file</span>
                  </div>
                </label>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Supported file types:</p>
            <p>PDF, Word documents (.doc, .docx), Excel files (.xls, .xlsx), Images (.png, .jpg, .jpeg)</p>
            <p className="mt-1">Maximum file size: 50MB per file</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Bot className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for AI Appraisal</h3>
        <p className="text-gray-600">
          Review your information below and submit to begin the automated valuation process.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Company Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="font-medium">Legal Name:</span> {companyInfo.legalName || 'Not provided'}</div>
          <div><span className="font-medium">SIC Code:</span> {companyInfo.sicCode || 'Not provided'}</div>
          <div><span className="font-medium">Revenue Model:</span> {companyInfo.revenueModel || 'Not provided'}</div>
          <div><span className="font-medium">Employees:</span> {companyInfo.numberOfEmployees || 'Not provided'}</div>
          <div><span className="font-medium">Founded:</span> {companyInfo.inceptionDate || 'Not provided'}</div>
          <div><span className="font-medium">Law Firm:</span> {companyInfo.lawFirm || 'Not provided'}</div>
        </div>
        {companyInfo.companyOverview && (
          <div className="mt-3">
            <span className="font-medium">Overview:</span>
            <p className="text-gray-600 mt-1">{companyInfo.companyOverview}</p>
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Uploaded Documents</h4>
        {Object.entries(uploadedFiles).length > 0 ? (
          <ul className="space-y-2 text-sm">
            {Object.entries(uploadedFiles).map(([key, file]) => 
              file && (
                <li key={key} className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{file.name}</span>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-gray-600 text-sm">No documents uploaded</p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Bot className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">What happens next:</p>
            <ul className="space-y-1 ml-4 list-disc">
              <li>AI analysis begins immediately after submission</li>
              <li>Valuation report typically ready within 1-2 business days</li>
              <li>You&apos;ll receive notification when the report is complete</li>
              <li>Report will include detailed valuation methodology and supporting data</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  const canContinue = () => {
    if (currentStep === 1) {
      return companyInfo.legalName.trim().length > 0
    }
    return true
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Appraisal Setup</h2>
            <p className="text-sm text-gray-600 mt-1">
              Fast, accurate valuation powered by advanced AI
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isCompleted ? 'bg-green-100 text-green-600' :
                    isActive ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-blue-600' :
                    isCompleted ? 'text-green-600' :
                    'text-gray-400'
                  }`}>
                    {step.name}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`mx-4 h-px w-12 ${
                      isCompleted ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => currentStep > 1 ? setCurrentStep(prev => prev - 1) : onClose()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {currentStep > 1 ? 'Back' : 'Cancel'}
            </button>
            
            {/* Debug Test Button */}
            <button
              onClick={async () => {
                try {
                  if (!user) {
                    alert('User not authenticated')
                    return
                  }
                  const token = await user.getIdToken(true)
                  const response = await fetch('/api/valuation/test-auth', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test: true })
                  })
                  const result = await response.json()
                  alert(`Test Result: ${response.status}\n\n${JSON.stringify(result, null, 2)}`)
                } catch (err) {
                  alert(`Test Error: ${err}`)
                }
              }}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded border hover:bg-gray-200 transition-colors"
            >
              Debug Auth
            </button>
          </div>

          <button
            onClick={() => {
              if (currentStep < 3) {
                setCurrentStep(prev => prev + 1)
              } else {
                handleSubmit()
              }
            }}
            disabled={!canContinue() || loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : currentStep < 3 ? (
              'Continue'
            ) : (
              'Submit AI Appraisal Request'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}