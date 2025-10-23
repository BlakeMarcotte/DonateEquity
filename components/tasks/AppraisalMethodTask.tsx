'use client'

import { useState } from 'react'
import { Task } from '@/types/task'
import { CheckCircle, User, Bot } from 'lucide-react'
import { AppraiserInvitationForm } from './AppraiserInvitationForm'
import { AIAppraisalForm } from './AIAppraisalForm'
import { Modal } from '@/components/ui/modal'

type AppraisalMethod = 'invite_appraiser' | 'ai_appraisal'

interface AppraisalMethodTaskProps {
  task: Task
  onMethodSelect: (taskId: string, method: AppraisalMethod) => Promise<void>
  campaignTitle?: string
  donorName?: string
  organizationName?: string
  stepNumber?: number
}

export function AppraisalMethodTask({
  task,
  onMethodSelect,
  campaignTitle = 'this campaign',
  donorName,
  organizationName,
  stepNumber
}: AppraisalMethodTaskProps) {
  const [loading, setLoading] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<AppraisalMethod | null>(null)
  const [showAppraiserModal, setShowAppraiserModal] = useState(false)
  const [showAIAppraisalModal, setShowAIAppraisalModal] = useState(false)

  const handleMethodSelect = async (method: AppraisalMethod) => {
    setLoading(true)
    try {
      await onMethodSelect(task.id, method)
    } catch (error) {
      // Error will be handled by parent component
      throw error
    } finally {
      setLoading(false)
    }
  }

  if (task.status === 'completed') {
    const method = task.metadata?.appraisalMethod || 
                   (task.metadata?.valuationId ? 'ai_appraisal' : 'invite_appraiser')
    
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">{task.title}</h3>
            <p className="text-green-700 mt-1">
              {method === 'ai_appraisal' 
                ? `You chose AI Appraisal. Your valuation is being processed automatically.`
                : `You chose to invite an external appraiser. They will complete the valuation process.`
              }
            </p>
          </div>
        </div>
      </div>
    )
  }

  const appraisalOptions = [
    {
      id: 'invite_appraiser',
      label: 'Invite Appraiser',
      description: 'Invite a professional appraiser to evaluate your company. This is the traditional approach with personalized service.',
      icon: User,
      features: [
        'Professional human expertise',
        'Detailed consultation process',
        'Customized valuation approach',
        'Direct communication with appraiser'
      ],
      timeline: '2-3 weeks',
      cost: 'Variable based on appraiser'
    },
    {
      id: 'ai_appraisal',
      label: 'AI Appraisal',
      description: 'Get an automated valuation using advanced AI technology. Fast, consistent, and data-driven approach.',
      icon: Bot,
      features: [
        'Instant automated processing',
        'Consistent methodology',
        'Data-driven analysis',
        'Immediate results available'
      ],
      timeline: '1-2 business days',
      cost: 'Fixed transparent pricing'
    }
  ]

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start space-x-3 mb-6">
          {stepNumber && (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-md">
              {stepNumber}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
            <p className="text-gray-600 mt-1">{task.description}</p>
          </div>
        </div>

        <div className="space-y-4">
          {appraisalOptions.map((option) => {
            const IconComponent = option.icon
            return (
              <div
                key={option.id}
                className={`border rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                  selectedMethod === option.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => {
                  setSelectedMethod(option.id as AppraisalMethod)
                }}
              >
                <div className="flex items-start space-x-4">
                  <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center flex-shrink-0 ${
                    selectedMethod === option.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedMethod === option.id && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <IconComponent className="w-5 h-5 text-gray-600" />
                      <h4 className="font-semibold text-gray-900">{option.label}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Key Features:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {option.features.map((feature, index) => (
                            <li key={index} className="flex items-start">
                              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs font-medium text-gray-700">Timeline: </span>
                          <span className="text-xs text-gray-600">{option.timeline}</span>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-700">Cost: </span>
                          <span className="text-xs text-gray-600">{option.cost}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {selectedMethod && (
          <div className="mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <div className="w-5 h-5 text-blue-600 mt-0.5">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-sm text-blue-800">
                  {selectedMethod === 'ai_appraisal' 
                    ? 'AI Appraisal will analyze your company data and provide a professional valuation report within 1-2 business days.'
                    : 'You\'ll be able to invite a professional appraiser who will work directly with you throughout the valuation process.'
                  }
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  if (selectedMethod === 'invite_appraiser') {
                    setShowAppraiserModal(true)
                  } else {
                    setShowAIAppraisalModal(true)
                  }
                }}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  `Continue with ${selectedMethod === 'ai_appraisal' ? 'AI Appraisal' : 'Appraiser Invitation'}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Appraiser Invitation Modal */}
      <Modal
        isOpen={showAppraiserModal}
        onClose={() => setShowAppraiserModal(false)}
        title="Invite Appraiser to Platform"
        size="md"
      >
        <AppraiserInvitationForm
          participantId={task.participantId}
          donationId={task.participantId} // For backward compatibility
          onSuccess={async () => {
            await handleMethodSelect('invite_appraiser')
            setShowAppraiserModal(false)
          }}
        />
      </Modal>

      {/* AI Appraisal Form Modal */}
      {showAIAppraisalModal && (
        <AIAppraisalForm
          isOpen={showAIAppraisalModal}
          onClose={() => setShowAIAppraisalModal(false)}
          onSuccess={async () => {
            await handleMethodSelect('ai_appraisal')
            setShowAIAppraisalModal(false)
          }}
          task={task}
          campaignTitle={campaignTitle}
          donorName={donorName}
          organizationName={organizationName}
        />
      )}
    </>
  )
}