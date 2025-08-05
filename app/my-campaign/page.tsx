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
        {/* Campaign Overview Card */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{campaign.title}</h2>
                {campaign.organizationName && (
                  <p className="text-sm text-gray-600">{campaign.organizationName}</p>
                )}
              </div>
            </div>
          </div>
          
        </div>

        {/* Timeline Section */}
        {donation && tasks.length > 0 && (
          <TaskTimeline tasks={tasks} />
        )}

        {/* Tab Navigation */}
        {donation && (
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'tasks'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <CheckSquare className="h-4 w-4" />
                    <span>Your Tasks</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'files'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Shared Files</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'tasks' && (
                <DonationTaskList 
                  donationId={donation.id} 
                  campaignId={donation.campaignId}
                  showAllTasks={false}
                />
              )}
              
              {activeTab === 'files' && (
                <DonationFiles 
                  donationId={donation.id}
                  title="Shared Documents"
                  showUpload={false}
                  className="border-0 shadow-none p-0"
                />
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}