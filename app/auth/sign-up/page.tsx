'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SignUpRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the correct registration page
    router.replace('/auth/register')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}