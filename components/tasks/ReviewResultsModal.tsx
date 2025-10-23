'use client'

import { useState } from 'react'
import { X, CheckCircle, Lightbulb, ArrowRight, AlertCircle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDonationRecommendation, MODEL_DESCRIPTIONS } from '@/lib/utils/donation-path-logic'
import { QuizData } from '@/types/task'

interface ReviewResultsModalProps {
  isOpen: boolean
  onClose: () => void
  onAccept: () => Promise<void>
  quizData: QuizData | null
  campaignTitle?: string
  donorName?: string
}

export function ReviewResultsModal({
  isOpen,
  onClose,
  onAccept,
  quizData
}: ReviewResultsModalProps) {
  const [loading, setLoading] = useState(false)

  if (!isOpen || !quizData) return null

  const recommendation = getDonationRecommendation(quizData.answers)
  const modelDetails = MODEL_DESCRIPTIONS[recommendation.model]

  const handleAccept = async () => {
    setLoading(true)
    try {
      await onAccept()
    } catch (error) {
      // Error will be handled by parent
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto w-full max-w-4xl relative">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Your Personalized Donation Path
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Based on your responses
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors duration-200"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-8 py-8 space-y-8">
          {/* Recommendation Banner */}
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Lightbulb className="w-6 h-6" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-100 mb-2">
                  Recommended for You
                </div>
                <h3 className="text-3xl font-bold mb-3">
                  {modelDetails.title}
                </h3>
                <p className="text-lg text-blue-50 leading-relaxed">
                  {recommendation.explanation}
                </p>
              </div>
            </div>
          </div>

          {/* Model Description */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              About This Model
            </h4>
            <p className="text-gray-700 mb-4">
              {modelDetails.description}
            </p>
          </div>

          {/* Key Points */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Key Features
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modelDetails.keyPoints.map((point, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">{point}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Considerations */}
          {modelDetails.considerations && modelDetails.considerations.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Important Considerations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modelDetails.considerations.map((consideration, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 bg-amber-50 p-4 rounded-xl border border-amber-200 hover:border-amber-300 transition-colors"
                  >
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-gray-700 text-sm">{consideration}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Typical Users */}
          {modelDetails.typicalUsers && (
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Typical Users
              </h4>
              <p className="text-gray-700">{modelDetails.typicalUsers}</p>
            </div>
          )}

          {/* What's Next */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <ArrowRight className="w-5 h-5 mr-2 text-blue-600" />
              What Happens Next?
            </h4>
            <div className="space-y-2 text-gray-700">
              {recommendation.model === 'Manual Review' ? (
                <>
                  <p>
                    Our team will review your situation and contact you within 2 business days with a customized recommendation.
                  </p>
                  <p>
                    In the meantime, feel free to reach out if you have any questions.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    After accepting this recommendation, we&apos;ll guide you through the next steps specific to the{' '}
                    <strong>{modelDetails.title}</strong> model.
                  </p>
                  <p>
                    This may include document preparation, legal review, and setting up the donation structure.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Debug Info (only show rule ID in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 text-center">
              Rule: {recommendation.ruleId}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
            className="rounded-xl"
            disabled={loading}
          >
            Review Again
          </Button>

          <Button
            onClick={handleAccept}
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-8"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              <>
                Accept Recommendation
                <CheckCircle className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
