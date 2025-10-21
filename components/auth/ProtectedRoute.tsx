'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types/auth'
import { isPreviewMode } from '@/lib/preview-mode/preview-data'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  requiredPermissions?: string[]
  fallbackUrl?: string
  loadingComponent?: React.ReactNode
}

export default function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermissions,
  fallbackUrl = '/auth/login',
  loadingComponent,
}: ProtectedRouteProps) {
  const { user, customClaims, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isPreviewMode()) return
    
    if (loading) return

    // Redirect to login if not authenticated
    if (!user) {
      router.push(fallbackUrl)
      return
    }

    // Check role requirements
    if (requiredRoles && customClaims) {
      const hasRequiredRole = requiredRoles.includes(customClaims.role)
      if (!hasRequiredRole) {
        router.push('/unauthorized')
        return
      }
    }

    // Check permission requirements
    if (requiredPermissions && customClaims) {
      const hasAllPermissions = requiredPermissions.every(permission =>
        customClaims.permissions.includes(permission)
      )
      if (!hasAllPermissions) {
        router.push('/unauthorized')
        return
      }
    }
  }, [user, customClaims, loading, requiredRoles, requiredPermissions, router, fallbackUrl])

  // Preview mode bypasses all auth checks
  if (isPreviewMode()) {
    return <>{children}</>
  }

  // Show loading state
  if (loading) {
    return (
      loadingComponent || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    )
  }

  // Don't render children if not authenticated or authorized
  if (!user) {
    return null
  }

  if (requiredRoles && customClaims && !requiredRoles.includes(customClaims.role)) {
    return null
  }

  if (requiredPermissions && customClaims) {
    const hasAllPermissions = requiredPermissions.every(permission =>
      customClaims.permissions.includes(permission)
    )
    if (!hasAllPermissions) {
      return null
    }
  }

  return <>{children}</>
}

// Convenience wrapper components for specific roles
export function DonorRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['donor']} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function NonprofitAdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['nonprofit_admin']} {...props}>
      {children}
    </ProtectedRoute>
  )
}

export function AppraiserRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requiredRoles'>) {
  return (
    <ProtectedRoute requiredRoles={['appraiser']} {...props}>
      {children}
    </ProtectedRoute>
  )
}

