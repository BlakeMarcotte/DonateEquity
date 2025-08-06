'use client'

import { useState } from 'react'
import { X, DollarSign, Percent, Info, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EquityCommitmentModalProps {
  isOpen: boolean
  onClose: () => void
  onCommit: (commitment: {
    type: 'dollar' | 'percentage'
    amount: number
    message?: string
  }) => Promise<void>
  campaignTitle: string
  donorName: string
  organizationName?: string
}

type CommitmentType = 'dollar' | 'percentage'

export function EquityCommitmentModal({
  isOpen,
  onClose,
  onCommit,
  campaignTitle,
  donorName,
  organizationName
}: EquityCommitmentModalProps) {
  const [step, setStep] = useState(1)
  const [commitmentType, setCommitmentType] = useState<CommitmentType>('dollar')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleTypeSelect = (type: CommitmentType) => {
    setCommitmentType(type)
    setAmount('')
    setError(null)
  }

  const validateStep1 = () => {
    const numAmount = parseFloat(amount)
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return false
    }

    if (commitmentType === 'dollar' && numAmount < 100) {
      setError('Minimum dollar commitment is $100')
      return false
    }

    if (commitmentType === 'percentage' && (numAmount < 0.1 || numAmount > 100)) {
      setError('Percentage must be between 0.1% and 100%')
      return false
    }

    return true
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
      setError(null)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep1()) return

    setLoading(true)
    setError(null)

    try {
      await onCommit({
        type: commitmentType,
        amount: parseFloat(amount),
        message: message.trim() || undefined
      })
      setSuccess(true)
      setStep(3)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create equity commitment')
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (value: string, type: CommitmentType) => {
    const num = parseFloat(value)
    if (isNaN(num)) return type === 'dollar' ? '$0' : '0%'
    
    if (type === 'dollar') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(num)
    } else {
      return `${num}%`
    }
  }

  const handleReset = () => {
    setStep(1)
    setCommitmentType('dollar')
    setAmount('')
    setMessage('')
    setError(null)
    setSuccess(false)
    setLoading(false)
  }

  if (!isOpen) {
    console.log('EquityCommitmentModal: Modal is closed')
    return null
  }

  console.log('EquityCommitmentModal: Modal is open, rendering...')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {success ? 'Commitment Created!' : 'Make Equity Commitment'}
            </h2>
            {!success && (
              <div className="flex items-center mt-1">
                <div className="flex items-center space-x-1">
                  {[1, 2].map((stepNum) => (
                    <div key={stepNum} className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {stepNum}
                      </div>
                      {stepNum < 2 && (
                        <div className={`w-6 h-0.5 ${step > stepNum ? 'bg-blue-600' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  ))}
                </div>
                <span className="ml-3 text-xs text-gray-600">
                  Step {step} of 2
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              handleReset()
              onClose()
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Step 1: Commitment Details */}
          {step === 1 && (
            <div className="space-y-4">

              {/* Commitment Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commitment Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTypeSelect('dollar')}
                    className={`p-3 border-2 rounded-lg transition-all duration-200 text-left ${
                      commitmentType === 'dollar'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <DollarSign className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="font-medium text-gray-900 text-sm">Dollar Amount</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Commit a specific dollar amount
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTypeSelect('percentage')}
                    className={`p-3 border-2 rounded-lg transition-all duration-200 text-left ${
                      commitmentType === 'percentage'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center mb-1">
                      <Percent className="w-4 h-4 text-blue-600 mr-2" />
                      <span className="font-medium text-gray-900 text-sm">Percentage</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Commit a percentage of equity
                    </p>
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {commitmentType === 'dollar' ? 'Commitment Amount' : 'Percentage of Equity'}
                </label>
                <div className="relative">
                  {commitmentType === 'dollar' ? (
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  ) : (
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  )}
                  <input
                    type="number"
                    min={commitmentType === 'dollar' ? '100' : '0.1'}
                    max={commitmentType === 'percentage' ? '100' : undefined}
                    step={commitmentType === 'dollar' ? '100' : '0.1'}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value)
                      setError(null)
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={commitmentType === 'dollar' ? '10000' : '5.0'}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {commitmentType === 'dollar' 
                    ? `Min: $100 • Value: ${formatAmount(amount, commitmentType)}`
                    : `Range: 0.1%-100% • Value: ${formatAmount(amount, commitmentType)}`
                  }
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a message of support..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}/500 characters
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleNext} disabled={!amount}>
                  Review Commitment
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Review and Confirm */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Commitment</h3>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campaign:</span>
                    <span className="font-medium text-gray-900">{campaignTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Donor:</span>
                    <span className="font-medium text-gray-900">{donorName}</span>
                  </div>
                  {organizationName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Organization:</span>
                      <span className="font-medium text-gray-900">{organizationName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Commitment Type:</span>
                    <span className="font-medium text-gray-900">
                      {commitmentType === 'dollar' ? 'Dollar Amount' : 'Percentage of Equity'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatAmount(amount, commitmentType)}
                    </span>
                  </div>
                  {message && (
                    <div className="pt-4 border-t border-gray-200">
                      <span className="text-gray-600 block mb-2">Message:</span>
                      <p className="text-gray-900 italic">"{message}"</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <h4 className="font-medium mb-1">What happens next?</h4>
                    <p>
                      Your equity commitment will be recorded and you'll proceed through a professional 
                      appraisal and documentation process. The commitment will be fulfilled when a 
                      qualifying liquidity event occurs (IPO, acquisition, etc.).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Commitment...
                    </>
                  ) : (
                    'Create Commitment'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && success && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Equity Commitment Created Successfully!
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="text-left">
                  <h4 className="font-medium text-green-900 mb-2">Commitment Summary:</h4>
                  <div className="space-y-1 text-sm text-green-800">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="font-medium">
                        {commitmentType === 'dollar' ? 'Dollar Amount' : 'Percentage'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount:</span>
                      <span className="font-medium text-green-900">
                        {formatAmount(amount, commitmentType)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Campaign:</span>
                      <span className="font-medium">{campaignTitle}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Your commitment has been recorded and the appraisal workflow will begin. 
                You'll receive updates on the next steps in the process.
              </p>
              <Button 
                onClick={() => {
                  handleReset()
                  onClose()
                }} 
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}