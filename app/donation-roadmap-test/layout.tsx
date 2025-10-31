import ErrorBoundary from '@/components/error/ErrorBoundary'

export default function DonationRoadmapTestLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ErrorBoundary>
      {/* No authentication required - public testing page */}
      {children}
    </ErrorBoundary>
  )
}
