import { AuthProvider } from '@/contexts/AuthContext'
import { PreviewModeProvider } from '@/contexts/PreviewModeContext'
import ErrorBoundary from '@/components/error/ErrorBoundary'

export default function UIShowcaseLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PreviewModeProvider>
          {/* No Navbar - full screen showcase */}
          {children}
        </PreviewModeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
