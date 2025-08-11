'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import AuthLayout from '@/components/auth/AuthLayout'
import LoginForm from '@/components/auth/LoginForm'

function LoginPageContent() {
  const { user, loading, customClaims } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect')

  useEffect(() => {
    if (!loading && user && customClaims) {
      // If there's a redirect parameter, use it
      if (redirectTo) {
        router.push(redirectTo)
        return
      }

      // Otherwise, use role-based defaults
      switch (customClaims.role) {
        case 'donor':
          router.push('/my-campaign')
          break
        case 'appraiser':
          router.push('/my-campaign')
          break
        case 'nonprofit_admin':
          router.push('/organization')
          break
        default:
          router.push('/dashboard')
      }
    }
  }, [user, loading, customClaims, router, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <AuthLayout mode="login">
      <LoginForm redirectTo={redirectTo || undefined} />
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  )
}