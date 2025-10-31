'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

function DocuSignCompleteContent() {
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(3)
  const event = searchParams.get('event')

  useEffect(() => {
    // Notify parent window that signing is complete
    if (window.opener && event === 'signing_complete') {
      window.opener.postMessage({
        type: 'docusign-complete',
        event: event
      }, window.location.origin)
    }

    // Countdown before closing
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          // Close the popup window
          window.close()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(countdownInterval)
  }, [event])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Document Signed Successfully!
        </h1>

        <p className="text-gray-600 mb-6">
          Your signature has been recorded. This window will close automatically in {countdown} seconds.
        </p>

        <button
          onClick={() => window.close()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Close Now
        </button>
      </div>
    </div>
  )
}

export default function DocuSignCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DocuSignCompleteContent />
    </Suspense>
  )
}
