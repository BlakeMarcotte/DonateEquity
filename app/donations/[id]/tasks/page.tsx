'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useDonationTasks } from '@/hooks/useDonationTasks'
import { DonationTaskList } from '@/components/tasks/DonationTaskList'
import { TaskTimeline } from '@/components/tasks/TaskTimeline'
import { DonationFiles } from '@/components/files/DonationFiles'
import { CheckSquare, FileText } from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

function DonationTasksPage() {
  const { user, loading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const donationId = params.id as string
  const [activeTab, setActiveTab] = useState<'tasks' | 'files'>('tasks')
  const [donationData, setDonationData] = useState<{
    campaignTitle?: string
    campaignId?: string
    donorName?: string
    organizationName?: string
    participantId?: string
  } | null>(null)
  const [donationLoading, setDonationLoading] = useState(true)

  const { tasks, loading: tasksLoading, handleCommitmentDecision, completeTask } = useDonationTasks(donationId)

  // Fetch donation data for display
  useEffect(() => {
    const fetchDonation = async () => {
      if (!donationId) {
        setDonationLoading(false)
        return
      }

      try {
        const donationDoc = await getDoc(doc(db, 'donations', donationId))
        if (donationDoc.exists()) {
          const data = donationDoc.data()
          setDonationData({
            campaignTitle: data.campaignTitle,
            campaignId: data.campaignId,
            donorName: data.donorName,
            organizationName: data.commitmentDetails?.donorOrganizationName,
            participantId: data.participantId // Get participantId from donation doc
          })
        }
      } catch (error) {
        console.error('Error fetching donation:', error)
      } finally {
        setDonationLoading(false)
      }
    }

    fetchDonation()
  }, [donationId])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const isLoadingData = loading || tasksLoading || donationLoading

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your tasks...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {donationData?.campaignTitle || 'My Campaign'}
                </h1>
                {donationData?.organizationName && (
                  <p className="text-gray-600">
                    {donationData.organizationName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Timeline Section */}
        {tasks.length > 0 && (
          <TaskTimeline tasks={tasks} />
        )}

        {/* Task Content */}
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
            {activeTab === 'tasks' && (
              <DonationTaskList
                donationId={donationId}
                campaignId={donationData?.campaignId}
                showAllTasks={true}
                campaignTitle={donationData?.campaignTitle}
                donorName={donationData?.donorName || user?.displayName || user?.email?.split('@')[0] || 'User'}
                organizationName={donationData?.organizationName}
                tasks={tasks}
                loading={tasksLoading}
                completeTask={completeTask}
                handleCommitmentDecision={handleCommitmentDecision}
              />
            )}

            {activeTab === 'files' && (
              <DonationFiles
                donationId={donationId}
                title="Shared Documents"
                showUpload={false}
                className="border-0 shadow-none p-0"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DonationTasksPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DonationTasksPage />
    </Suspense>
  )
}

export default DonationTasksPageWrapper
