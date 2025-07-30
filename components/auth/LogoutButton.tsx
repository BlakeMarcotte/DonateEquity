'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/firebase/auth'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
  redirectTo?: string
}

export default function LogoutButton({ 
  className = '', 
  children = 'Sign Out',
  redirectTo = '/'
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    try {
      await signOut()
      router.push(redirectTo)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? 'Signing out...' : children}
    </button>
  )
}