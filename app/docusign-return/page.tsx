'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * DocuSign Return Page
 * This page is shown after a user completes signing in DocuSign.
 * It automatically closes the popup window and signals the parent to refresh.
 */
export default function DocuSignReturnPage() {
  const searchParams = useSearchParams()
  const event = searchParams.get('event')

  useEffect(() => {
    // Post message to parent window to trigger refresh
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'DOCUSIGN_COMPLETE',
          event,
          timestamp: Date.now()
        },
        window.location.origin
      )
    }

    // Close the popup window after a short delay
    setTimeout(() => {
      window.close()
    }, 1000)
  }, [event])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Document Signed Successfully!
        </h1>

        <p className="text-gray-600 mb-6">
          Your signature has been recorded. This window will close automatically.
        </p>

        <button
          onClick={() => window.close()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Close Window
        </button>
      </div>
    </div>
  )
}
