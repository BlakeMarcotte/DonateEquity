'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AppraiserDashboard() {
  const { user, customClaims, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    // Redirect appraisers to use the same clean interface as donors
    if (!loading && user && customClaims?.role === 'appraiser') {
      router.push('/my-campaign')
      return
    }

    // Redirect other roles
    if (!loading && user && customClaims?.role !== 'appraiser') {
      router.push('/organization')
      return
    }
  }, [user, loading, customClaims, router])

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}