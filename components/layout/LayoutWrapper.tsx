'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Determine if we should show sidebar padding
  // Exclude pledge page for white-label experience
  const showSidebarPadding =
    user &&
    !loading &&
    !pathname?.startsWith('/auth/') &&
    pathname !== '/unauthorized' &&
    pathname !== '/' &&
    pathname !== '/pledge'

  return (
    <div className="min-h-screen">
      <main className={showSidebarPadding ? 'lg:pl-64' : ''}>
        {children}
      </main>
    </div>
  )
}