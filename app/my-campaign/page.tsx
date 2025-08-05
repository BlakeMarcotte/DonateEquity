'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useDonorCampaign } from '@/hooks/useDonorCampaign'
import { DonationTaskList } from '@/components/tasks/DonationTaskList'
import { TaskTimeline } from '@/components/tasks/TaskTimeline'
import { DonationFiles } from '@/components/files/DonationFiles'
import { useDonationTasks } from '@/hooks/useDonationTasks'
import { Heart, Clock, Users, CheckSquare, FileText } from 'lucide-react'

export default function MyCampaignPage() {
  const { user, customClaims, loading } = useAuth()
  const { campaign, donation, loading: campaignLoading } = useDonorCampaign()
  const { tasks, loading: tasksLoading } = useDonationTasks(donation?.id || null)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'tasks' | 'files'>('tasks')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    // Redirect non-donors to their appropriate pages
    if (!loading && user && customClaims?.role !== 'donor') {
      router.push('/dashboard')
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
    <div className="bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-r from-white to-blue-50/30 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {campaign?.title || 'Loading Campaign...'}
                </h1>
                {campaign?.organizationName && (
                  <p className="mt-1 text-sm text-gray-600 font-medium">
                    {campaign.organizationName}
                  </p>
                )}
              </div>
            </div>
            <p className="mt-3 text-gray-600 text-base">
              Track your donation progress and complete required steps
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-6 pb-20">

        {/* Timeline Section */}
        {donation && tasks.length > 0 && (
          <TaskTimeline tasks={tasks} />
        )}

        {/* Enhanced Tab Navigation */}
        {donation && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden">
            <div className="border-b border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-white/50">
              <nav className="flex space-x-1 px-6 py-2" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                    activeTab === 'tasks'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4" />
                    <span>Your Tasks</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                    activeTab === 'files'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Shared Files</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Enhanced Tab Content */}
            <div className="p-6">
              {activeTab === 'tasks' && (
                <div className="animate-in fade-in duration-300">
                  <DonationTaskList 
                    donationId={donation.id} 
                    campaignId={donation.campaignId}
                    showAllTasks={false}
                  />
                </div>
              )}
              
              {activeTab === 'files' && (
                <div className="animate-in fade-in duration-300">
                  <DonationFiles 
                    donationId={donation.id}
                    title="Shared Documents"
                    showUpload={false}
                    className="border-0 shadow-none p-0"
                  />
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}