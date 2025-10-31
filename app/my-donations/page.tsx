'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useDonorCampaign } from '@/hooks/useDonorCampaign'
import { DonationTaskList } from '@/components/tasks/DonationTaskList'
import { TaskTimeline } from '@/components/tasks/TaskTimeline'
import { DonationFiles } from '@/components/files/DonationFiles'
import { EquityCommitmentModal } from '@/components/tasks/EquityCommitmentModal'
import { useDonationTasks } from '@/hooks/useDonationTasks'
import { Heart, CheckSquare, FileText } from 'lucide-react'

function MyCampaignPage() {
  const { user, customClaims, loading } = useAuth()
  const searchParams = useSearchParams()
  const campaignIdFromUrl = searchParams.get('campaignId')
  const shouldRefresh = searchParams.get('refresh') === '1'
  const { campaign, donation, loading: campaignLoading } = useDonorCampaign(shouldRefresh)

  // All users (donors and appraisers) use donation-based tasks now
  const donationId = donation?.id || null

  // Fetch donation-based tasks for all users
  const { tasks, loading: tasksLoading, handleCommitmentDecision, completeTask } = useDonationTasks(donationId)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tasks' | 'files'>('tasks')
  const [showCommitmentModal, setShowCommitmentModal] = useState(false)

  // Track if we've ever successfully loaded campaign data
  const hasEverHadCampaign = useRef(false)
  if (campaign) {
    hasEverHadCampaign.current = true
  }

  // Handle redirect for campaign ID from URL
  useEffect(() => {
    if (campaignIdFromUrl && user && !campaignLoading && !campaign) {
      // Redirect to donations page
      router.push(`/my-donations`)
    }
  }, [campaignIdFromUrl, user, campaignLoading, campaign, router])

  const handleCommitmentCreate = async (commitment: {
    type: 'dollar' | 'percentage'
    amount: number
    message?: string
  }) => {
    try {
      // Call the existing handleCommitmentDecision with the commitment data
      if (handleCommitmentDecision) {
        // Find the commitment decision task
        const commitmentTask = tasks.find(t => t.type === 'commitment_decision')
        if (commitmentTask) {
          const commitmentData = {
            ...commitment,
            createdAt: new Date().toISOString()
          }
          await handleCommitmentDecision(commitmentTask.id, 'commit_now', commitmentData)
          setShowCommitmentModal(false)
        }
      }
    } catch (error) {
      console.error('Error creating commitment:', error)
      throw error
    }
  }

  // Simpler approach: if ANY loading is happening, show loading spinner
  // Don't try to be smart about it - just wait for ALL async operations to complete
  const isAuthFullyLoaded = !loading && (user ? customClaims !== null : true)

  // If auth is loaded and we have a user, check if data is still loading
  const isLoadingData = campaignLoading || tasksLoading

  // CRITICAL FIX: If we have a user but haven't loaded campaign data yet, keep showing loading
  // This prevents the flash when campaignLoading=false but campaign state hasn't updated yet
  // BUT: Also check campaignLoading - if it's false and no campaign, stop waiting (user has no campaigns)
  const waitingForInitialCampaignLoad = isAuthFullyLoaded && user && !hasEverHadCampaign.current && !campaign && campaignLoading

  const showLoadingScreen = !isAuthFullyLoaded || isLoadingData || waitingForInitialCampaignLoad

  useEffect(() => {
    console.log('MyCampaign loading states:', {
      loading,
      user: !!user,
      userRole: customClaims?.role,
      userId: user?.uid,
      isAuthFullyLoaded,
      campaignLoading,
      tasksLoading,
      hasCampaign: !!campaign,
      taskCount: tasks.length,
      hasEverHadCampaign: hasEverHadCampaign.current,
      waitingForInitialCampaignLoad,
      showLoadingScreen
    })

    // Don't do anything until auth is fully loaded
    if (!isAuthFullyLoaded) return

    // Only redirect to login if no user at all
    if (!user) {
      console.log('MyCampaign: No user, redirecting to login')
      router.push('/auth/login')
      return
    }

    // For everyone else (donors, appraisers, anyone), just show the page
    // The page content will handle showing appropriate UI based on role
    console.log('MyCampaign: User authenticated, showing page regardless of role')
  }, [user, loading, customClaims, router, isAuthFullyLoaded, showLoadingScreen, campaign, tasks.length, campaignLoading, tasksLoading, waitingForInitialCampaignLoad])

  // Show loading until everything is ready
  if (showLoadingScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your campaign...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated
  if (!user) {
    return null
  }

  // Only show "No Campaign Found" if we have no campaign AND no tasks AND no donation
  // If we have tasks, show the page even without a campaign object
  if (!campaign && tasks.length === 0 && !donationId) {
    // If we have a campaign ID from URL, show loading while redirecting
    if (campaignIdFromUrl) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your campaign...</p>
          </div>
        </div>
      )
    }

    // If user is an appraiser without campaigns, redirect to onboarding
    if (customClaims?.role === 'appraiser') {
      router.push('/appraiser/onboarding')
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Redirecting to onboarding...</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <h1 className="text-3xl font-bold text-gray-900">My Campaign</h1>
              <p className="mt-2 text-sm text-gray-600">
                Your campaign overview and donation progress
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Campaign Found</h2>
            <p className="text-gray-600 mb-6">
              {`You don't appear to be participating in any campaigns yet.`}
            </p>
            <button
              onClick={() => router.push('/browse')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
            >
              Browse Campaigns
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {campaign?.title || 'My Campaign'}
                </h1>
                {campaign?.organizationName && (
                  <p className="text-gray-600">
                    {campaign.organizationName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Timeline Section */}
        {donation && tasks.length > 0 && (
          <TaskTimeline tasks={tasks} />
        )}


        {/* Show old-style interest message if no tasks yet (donors only) */}
        {campaign && !donation && tasks.length === 0 && customClaims?.role === 'donor' && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Ready to participate in this campaign!</h3>
                <p className="text-blue-700 mt-1">
                  {`Ready to make your equity donation? Start by creating your donation commitment.`}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push(`/campaigns/${campaign.id}/donate`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors duration-200"
              >
                Start Donation Process
              </button>
            </div>
          </div>
        )}

        {/* Show appraiser assignment message if no tasks yet (appraisers only) */}
        {campaign && !donation && tasks.length === 0 && customClaims?.role === 'appraiser' && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">You&apos;re assigned to this campaign!</h3>
                <p className="text-green-700 mt-1">
                  You&apos;ve been assigned as the appraiser for this donation. Tasks will appear here once they&apos;re ready for you.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Task Content - show for both donations and participant tasks */}
        {(donation || (!donation && tasks.length > 0)) && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'tasks'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4" />
                    <span>Tasks</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'files'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Files</span>
                  </div>
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'tasks' && donationId && (
                <DonationTaskList
                  donationId={donationId}
                  campaignId={campaign?.id}
                  showAllTasks={true}
                  // Pass required props for EquityCommitmentModal
                  campaignTitle={campaign?.title}
                  donorName={user?.displayName || user?.email?.split('@')[0] || 'User'}
                  organizationName={campaign?.organizationName}
                  // Pass tasks and handlers
                  tasks={tasks}
                  loading={tasksLoading}
                  completeTask={completeTask}
                  handleCommitmentDecision={handleCommitmentDecision}
                />
              )}
              
              {activeTab === 'files' && (
                <>
                  {donationId ? (
                    <DonationFiles
                      donationId={donationId}
                      title="Shared Documents"
                      showUpload={false}
                      className="border-0 shadow-none p-0"
                    />
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Shared Files</h3>
                      <p className="text-gray-600">
                        File sharing will be available once your donation is set up.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Equity Commitment Modal */}
      <EquityCommitmentModal
        isOpen={showCommitmentModal}
        onClose={() => setShowCommitmentModal(false)}
        onCommit={handleCommitmentCreate}
        campaignTitle={campaign?.title || 'this campaign'}
        donorName={user?.displayName || user?.email?.split('@')[0] || 'User'}
        organizationName={campaign?.organizationName}
      />
    </div>
  )
}

function MyCampaignPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <MyCampaignPage />
    </Suspense>
  )
}

export default MyCampaignPageWrapper