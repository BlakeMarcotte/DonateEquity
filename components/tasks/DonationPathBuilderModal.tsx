'use client'

import { useState } from 'react'
import { X, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuizData } from '@/types/task'

interface QuizQuestion {
  id: string
  question: string
  type: 'single' | 'multiple' | 'numeric'
  options?: {
    id: string
    label: string
    description?: string
  }[]
  conditionalOn?: {
    questionId: string
    answerId: string
  }
  validation?: {
    min?: number
    max?: number
    sumTo?: number
  }
  fields?: {
    id: string
    label: string
    placeholder?: string
  }[]
}

interface DonationPathBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (quizData: QuizData) => Promise<void>
  campaignTitle?: string
  donorName?: string
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'company_stage',
    question: 'What stage best describes your company?',
    type: 'single',
    options: [
      { id: 'pre-seed', label: 'Pre-Seed' },
      { id: 'seed', label: 'Seed' },
      { id: 'series-a', label: 'Series A' },
      { id: 'series-b', label: 'Series B' },
      { id: 'growth', label: 'Growth' },
      { id: 'pre-ipo', label: 'Pre-IPO' },
      { id: 'public', label: 'Public' }
    ]
  },
  {
    id: 'donation_source',
    question: 'Who will the equity come from?',
    type: 'single',
    options: [
      { id: 'company', label: 'Company' },
      { id: 'founder', label: 'Founder' },
      { id: 'both', label: 'Both' }
    ]
  },
  {
    id: 'transfer_timing',
    question: 'When do you want to donate the equity?',
    type: 'single',
    options: [
      { id: 'now', label: 'Now (before IPO or sale)' },
      { id: 'at-liquidity', label: 'At liquidity (after IPO or sale)' }
    ]
  },
  {
    id: 'liquidity_timeline',
    question: 'When do you expect your next liquidity event?',
    type: 'single',
    options: [
      { id: 'less-than-1', label: '< 1 year' },
      { id: '1-3-years', label: '1–3 years' },
      { id: 'more-than-3', label: '> 3 years' },
      { id: 'already-public', label: 'Already public' }
    ]
  },
  {
    id: 'dilution_sensitivity',
    question: 'How sensitive are your investors or board to dilution right now?',
    type: 'single',
    options: [
      { id: 'low', label: 'Low' },
      { id: 'medium', label: 'Medium' },
      { id: 'high', label: 'High' }
    ]
  },
  {
    id: 'board_approval',
    question: 'Do you currently have a board that can approve new share issuance?',
    type: 'single',
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' },
      { id: 'unsure', label: 'Unsure' }
    ]
  },
  {
    id: 'has_daf',
    question: 'Do you already have a donor-advised fund (DAF) or philanthropic partner?',
    type: 'single',
    options: [
      { id: 'yes', label: 'Yes' },
      { id: 'no', label: 'No' }
    ]
  },
  {
    id: 'split_ratio',
    question: 'What % of the pledge will come from the company vs founder(s)?',
    type: 'numeric',
    conditionalOn: {
      questionId: 'donation_source',
      answerId: 'both'
    },
    validation: {
      min: 0,
      max: 100,
      sumTo: 100
    },
    fields: [
      { id: 'company_percent', label: 'Company %', placeholder: '50' },
      { id: 'founder_percent', label: 'Founder %', placeholder: '50' }
    ]
  }
]

type AnswerValue = string | string[] | Record<string, string>

export function DonationPathBuilderModal({
  isOpen,
  onClose,
  onComplete
}: DonationPathBuilderModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  // Filter questions based on conditional logic
  const visibleQuestions = QUIZ_QUESTIONS.filter(q => {
    if (!q.conditionalOn) return true
    const conditionAnswer = answers[q.conditionalOn.questionId]
    return conditionAnswer === q.conditionalOn.answerId
  })

  const currentQuestion = visibleQuestions[currentStep]
  const isLastQuestion = currentStep === visibleQuestions.length - 1
  const totalSteps = visibleQuestions.length

  const handleAnswer = (questionId: string, answerId: string, isMultiple: boolean) => {
    if (isMultiple) {
      const currentAnswers = (answers[questionId] as string[]) || []
      const newAnswers = currentAnswers.includes(answerId)
        ? currentAnswers.filter(id => id !== answerId)
        : [...currentAnswers, answerId]

      setAnswers(prev => ({
        ...prev,
        [questionId]: newAnswers
      }))
    } else {
      setAnswers(prev => ({
        ...prev,
        [questionId]: answerId
      }))
    }
    setError(null)
  }

  const handleNumericAnswer = (questionId: string, fieldId: string, value: string) => {
    const currentAnswer = answers[questionId]
    const currentAnswers = (typeof currentAnswer === 'object' && !Array.isArray(currentAnswer) ? currentAnswer : {}) as Record<string, string>
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...currentAnswers,
        [fieldId]: value
      } as AnswerValue
    }))
    setError(null)
  }

  const validateNumericAnswer = (questionId: string): boolean => {
    const question = currentQuestion
    if (!question.validation || !question.fields) return true

    const answer = answers[questionId]
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false
    const numericAnswers = answer as Record<string, string>

    const values = question.fields.map(f => parseFloat(numericAnswers[f.id] || '0'))

    // Check if all values are valid numbers
    if (values.some(isNaN)) {
      setError('Please enter valid numbers')
      return false
    }

    // Check min/max validation
    if (question.validation.min !== undefined || question.validation.max !== undefined) {
      const invalidValues = values.some(v =>
        (question.validation!.min !== undefined && v < question.validation!.min) ||
        (question.validation!.max !== undefined && v > question.validation!.max)
      )
      if (invalidValues) {
        setError(`Values must be between ${question.validation.min || 0} and ${question.validation.max || 100}`)
        return false
      }
    }

    // Check sum validation
    if (question.validation.sumTo !== undefined) {
      const sum = values.reduce((a, b) => a + b, 0)
      if (Math.abs(sum - question.validation.sumTo) > 0.01) {
        setError(`Values must add up to ${question.validation.sumTo}`)
        return false
      }
    }

    return true
  }

  const canProceed = () => {
    if (!currentQuestion) return false

    const answer = answers[currentQuestion.id]

    if (currentQuestion.type === 'numeric') {
      if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false
      const numericAnswers = answer as Record<string, string>
      const hasAllFields = currentQuestion.fields?.every(f => numericAnswers[f.id])
      return hasAllFields && validateNumericAnswer(currentQuestion.id)
    }

    if (currentQuestion.type === 'multiple') {
      return Array.isArray(answer) && answer.length > 0
    }

    return !!answer
  }

  const handleNext = () => {
    if (!currentQuestion) return

    if (currentQuestion.type === 'numeric') {
      if (!validateNumericAnswer(currentQuestion.id)) {
        return
      }
    } else if (!canProceed()) {
      setError('Please select an answer to continue')
      return
    }

    if (isLastQuestion) {
      handleSubmit()
    } else {
      setCurrentStep(prev => prev + 1)
      setError(null)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const quizData: QuizData = {
        answers,
        completedAt: new Date().toISOString(),
        donationPath: 'standard' // This could be calculated based on answers
      }

      await onComplete(quizData)

      // Reset state on success
      setCurrentStep(0)
      setAnswers({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz')
    } finally {
      setLoading(false)
    }
  }

  const isSelected = (questionId: string, optionId: string): boolean => {
    const answer = answers[questionId]
    if (Array.isArray(answer)) {
      return answer.includes(optionId)
    }
    return answer === optionId
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-3xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Donation Path Builder
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors duration-200"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 pt-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-8">
          {currentQuestion && (
            <div className="space-y-6">
              {/* Question */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {currentQuestion.question}
                </h3>
                {currentQuestion.type === 'multiple' && (
                  <p className="text-sm text-gray-500">
                    Select all that apply
                  </p>
                )}
              </div>

              {/* Options or Numeric Inputs */}
              {currentQuestion.type === 'numeric' && currentQuestion.fields ? (
                <div className="space-y-4">
                  {currentQuestion.fields.map((field) => {
                    const answer = answers[currentQuestion.id]
                    const numericAnswers = (typeof answer === 'object' && !Array.isArray(answer) ? answer : {}) as Record<string, string>
                    return (
                      <div key={field.id} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder={field.placeholder}
                          value={numericAnswers[field.id] || ''}
                          onChange={(e) => handleNumericAnswer(currentQuestion.id, field.id, e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-lg"
                        />
                      </div>
                    )
                  })}
                </div>
              ) : currentQuestion.id === 'company_stage' || currentQuestion.id === 'liquidity_timeline' ? (
                // Two-column grid layout for company stage and liquidity timeline questions
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options?.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => handleAnswer(currentQuestion.id, option.id, currentQuestion.type === 'multiple')}
                      className={`
                        border-2 rounded-lg p-3 cursor-pointer transition-all duration-200
                        ${isSelected(currentQuestion.id, option.id)
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`
                          w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                          ${isSelected(currentQuestion.id, option.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                          }
                        `}>
                          {isSelected(currentQuestion.id, option.id) && (
                            <div className="w-2.5 h-2.5 bg-white rounded-full" />
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900 text-sm">
                          {option.label}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Standard single-column layout for other questions
                <div className="space-y-3">
                  {currentQuestion.options?.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => handleAnswer(currentQuestion.id, option.id, currentQuestion.type === 'multiple')}
                      className={`
                        border-2 rounded-xl p-5 cursor-pointer transition-all duration-200
                        ${isSelected(currentQuestion.id, option.id)
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`
                          w-6 h-6 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0
                          ${isSelected(currentQuestion.id, option.id)
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                          }
                        `}>
                          {isSelected(currentQuestion.id, option.id) && (
                            currentQuestion.type === 'multiple' ? (
                              <CheckCircle className="w-4 h-4 text-white" />
                            ) : (
                              <div className="w-3 h-3 bg-white rounded-full" />
                            )
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {option.label}
                          </h4>
                          {option.description && (
                            <p className="text-sm text-gray-600">
                              {option.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={handleBack}
            disabled={currentStep === 0 || loading}
            variant="outline"
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canProceed() || loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : isLastQuestion ? (
              <>
                Complete Quiz
                <CheckCircle className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
