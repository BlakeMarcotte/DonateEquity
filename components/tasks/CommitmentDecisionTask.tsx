'use client'

import { useState } from 'react'
import { Task, CommitmentData, TaskOption } from '@/types/task'
import { Heart, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { EquityCommitmentModal } from './EquityCommitmentModal'


type CommitmentDecision = 'commit_now' | 'commit_after_appraisal'


interface CommitmentDecisionTaskProps {
  task: Task
  onDecision: (taskId: string, decision: CommitmentDecision, commitmentData?: CommitmentData) => Promise<void>
  campaignTitle?: string
  donorName?: string
  organizationName?: string
  stepNumber?: number
}

export function CommitmentDecisionTask({
  task,
  onDecision,
  campaignTitle = 'this campaign',
  donorName,
  organizationName,
  stepNumber
}: CommitmentDecisionTaskProps) {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showCommitmentModal, setShowCommitmentModal] = useState(false)
  
  const displayName = donorName || userProfile?.displayName || 'Anonymous Donor'
  const displayOrgName = organizationName || userProfile?.organizationId

  const handleDecision = async (decision: CommitmentDecision) => {
    setLoading(true)
    try {
      await onDecision(task.id, decision)
    } catch {
      // Error making commitment decision
    } finally {
      setLoading(false)
    }
  }

  const handleCommitmentCreate = async (commitment: {
    type: 'dollar' | 'percentage'
    amount: number
    message?: string
  }) => {
    try {
      const commitmentData: CommitmentData = {
        ...commitment,
        createdAt: new Date().toISOString()
      }
      await onDecision(task.id, 'commit_now', commitmentData)
      setShowCommitmentModal(false)
    } catch (error) {
      // Error creating commitment
      throw error
    }
  }

  if (task.status === 'completed') {
    const decision = (task.metadata as Record<string, unknown>)?.decision
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">{task.title}</h3>
            <p className="text-green-700 mt-1">
              {decision === 'commit_now' 
                ? `You chose to make your commitment now. You can proceed with specifying your donation amount.`
                : `You chose to wait for the appraisal. You'll be asked for your commitment after the appraisal is complete.`
              }
            </p>
          </div>
        </div>
      </div>
    )
  }

  const options = (task.metadata as Record<string, unknown>)?.options || []

  return (
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
        {(Array.isArray(options) ? options : []).map((option: TaskOption) => (
          <div
            key={option.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
              selectedOption === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => {
              setSelectedOption(option.id)
              // If "commit_now" is selected, open the modal immediately
              if (option.id === 'commit_now') {
                setShowCommitmentModal(true)
              }
            }}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                selectedOption === option.id
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300'
              }`}>
                {selectedOption === option.id && (
                  <div className="w-2 h-2 bg-white rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{option.label}</h4>
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedOption && selectedOption !== 'commit_now' && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              handleDecision(selectedOption as CommitmentDecision)
            }}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              'Confirm Decision'
            )}
          </button>
        </div>
      )}

      {/* Equity Commitment Modal */}
      <EquityCommitmentModal
        isOpen={showCommitmentModal}
        onClose={() => setShowCommitmentModal(false)}
        onCommit={handleCommitmentCreate}
        campaignTitle={campaignTitle}
        donorName={displayName}
        organizationName={displayOrgName}
      />
    </div>
  )
}