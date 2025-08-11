'use client'

import { usePathname } from 'next/navigation'
import { AppraiserRoute } from '@/components/auth/ProtectedRoute'

export default function AppraiserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Don't require appraiser role for invitation pages (people accepting invitations don't have the role yet)
  const isInvitationPage = pathname?.includes('/invitations/')
  
  if (isInvitationPage) {
    return <>{children}</>
  }

  return (
    <AppraiserRoute>
      {children}
    </AppraiserRoute>
  )
}