'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useDonorCampaign } from '@/hooks/useDonorCampaign'
import { DonationTaskList } from '@/components/tasks/DonationTaskList'
import { TaskTimeline } from '@/components/tasks/TaskTimeline'
import { DonationFiles } from '@/components/files/DonationFiles'
import { EquityCommitmentModal } from '@/components/tasks/EquityCommitmentModal'
import { useDonationTasks } from '@/hooks/useDonationTasks'
import { useParticipantTasks } from '@/hooks/useParticipantTasks'
import { Heart, Clock, Users, CheckSquare, FileText, DollarSign } from 'lucide-react'

export default function MyCampaignPage() {
  const { user, customClaims, loading } = useAuth()
  const { campaign, donation, loading: campaignLoading } = useDonorCampaign()
  const { tasks: donationTasks, loading: donationTasksLoading } = useDonationTasks(donation?.id || null)
  
  // Create participant ID for task querying
  const participantId = campaign && user ? `${campaign.id}_${user.uid}` : null
  const { tasks: participantTasks, loading: participantTasksLoading, handleCommitmentDecision } = useParticipantTasks(participantId, donation?.id || null)
  
  // Use participant tasks if no donation, otherwise use donation tasks
  const tasks = donation ? donationTasks : participantTasks
  const tasksLoading = donation ? donationTasksLoading : participantTasksLoading
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tasks' | 'files'>('tasks')
  const [showCommitmentModal, setShowCommitmentModal] = useState(false)

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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    // Redirect non-donors to their appropriate pages
    if (!loading && user && customClaims?.role !== 'donor') {
      router.push('/organization')
      return
    }
  }, [user, loading, customClaims, router])

  if (loading || campaignLoading || tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || customClaims?.role !== 'donor') {
    return null
  }

  if (!campaign) {
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
              You don't appear to be participating in any campaigns yet.
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


        {/* Show old-style interest message if no tasks yet */}
        {campaign && !donation && tasks.length === 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">You're interested in this campaign!</h3>
                <p className="text-blue-700 mt-1">
                  Ready to make your equity donation? Start by creating your donation commitment.
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
              {activeTab === 'tasks' && (
                <DonationTaskList 
                  donationId={donation?.id} 
                  campaignId={donation?.campaignId || campaign?.id}
                  showAllTasks={false}
                  // Pass required props for EquityCommitmentModal
                  campaignTitle={campaign?.title}
                  donorName={user?.displayName || user?.email?.split('@')[0] || 'User'}
                  organizationName={campaign?.organizationName}
                  // Pass participant tasks and handlers when no donation exists
                  {...(!donation && {
                    tasks: tasks,
                    loading: tasksLoading,
                    handleCommitmentDecision: handleCommitmentDecision
                  })}
                />
              )}
              
              {activeTab === 'files' && (
                <>
                  {donation ? (
                    <DonationFiles 
                      donationId={donation.id}
                      title="Shared Documents"
                      showUpload={false}
                      className="border-0 shadow-none p-0"
                    />
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Shared Files</h3>
                      <p className="text-gray-600">
                        File sharing will be available once your donation is created.
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