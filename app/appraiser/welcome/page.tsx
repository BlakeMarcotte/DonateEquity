'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CheckCircle, ArrowRight } from 'lucide-react'

export default function AppraiserWelcomePage() {
  const { user, customClaims, loading } = useAuth()
  const router = useRouter()
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (loading) return undefined

    // If user is not authenticated, redirect to login
    if (!user) {
      router.push('/auth/login')
      return undefined
    }

    // Check if user has appraiser role
    if ((customClaims?.role as string) === 'appraiser') {
      // Start countdown and redirect
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            router.push('/appraiser')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    } else if (customClaims?.role && (customClaims.role as string) !== 'appraiser') {
      // User has a role but it's not appraiser - something went wrong
      router.push('/unauthorized')
      return undefined
    }
    // If no role yet, keep waiting (loading state)
    return undefined
  }, [user, customClaims, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  if (!customClaims?.role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Activating your appraiser permissions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome, Appraiser!
        </h1>
        <p className="text-gray-600 mb-6">
          Your invitation has been accepted successfully. You can now access your appraisal assignments.
        </p>
        
        <div className="mb-6">
          <p className="text-sm text-gray-500 mb-2">
            Redirecting to your dashboard in:
          </p>
          <div className="text-3xl font-bold text-blue-600">
            {countdown}
          </div>
        </div>

        <button
          onClick={() => router.push('/appraiser')}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Go to Dashboard Now
        </button>
      </div>
    </div>
  )
}