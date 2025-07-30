'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import AuthLayout from '@/components/auth/AuthLayout'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

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
    <AuthLayout mode="register">
      <RegisterForm />
    </AuthLayout>
  )
}