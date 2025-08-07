'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useParticipantTasks } from '@/hooks/useParticipantTasks'
import { DonationTaskList } from '@/components/tasks/DonationTaskList'
import { Heart, ArrowLeft, Users, CheckSquare, FileText } from 'lucide-react'

export default function ParticipantTasksPage() {
  const { user, customClaims, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const campaignId = params.id as string
  const donorId = params.donorId as string
  
  // Create participant ID for task querying
  const participantId = campaignId && donorId ? `${campaignId}_${donorId}` : null
  const { tasks, loading: tasksLoading, handleCommitmentDecision } = useParticipantTasks(participantId)

  const [activeTab, setActiveTab] = useState<'tasks' | 'files'>('tasks')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
      return
    }

    // Allow access for nonprofit_admin, appraiser, and the specific donor
    if (!loading && user && customClaims?.role) {
      const isAuthorized = 
        customClaims.role === 'nonprofit_admin' ||
        customClaims.role === 'appraiser' ||
        (customClaims.role === 'donor' && user.uid === donorId)
      
      if (!isAuthorized) {
        router.push('/organization')
        return
      }
    }
  }, [user, loading, customClaims, router, donorId])

  if (loading || tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !customClaims?.role) {
    return null
  }

  const isNonprofitAdmin = customClaims.role === 'nonprofit_admin'
  const isAppraiser = customClaims.role === 'appraiser'
  const isDonor = customClaims.role === 'donor' && user.uid === donorId

  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-white to-blue-50/30 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="py-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  if (isNonprofitAdmin) {
                    router.push(`/campaigns/${campaignId}`)
                  } else if (isDonor) {
                    router.push('/my-campaign')
                  } else {
                    router.back()
                  }
                }}
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Participant Task Workflow
                </h1>
                <p className="mt-1 text-sm text-gray-600 font-medium">
                  {isDonor ? 'Your donation process' : 'Donor task management'}
                </p>
              </div>
            </div>
            {isDonor && (
              <p className="mt-3 text-gray-600 text-base">
                Complete your tasks to proceed with the equity donation process
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-6 pb-20">
        {/* Task List */}
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
                  <span>Tasks</span>
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
                  <span>Files</span>
                </div>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'tasks' && (
              <div className="animate-in fade-in duration-300">
                <DonationTaskList 
                  participantId={participantId}
                  campaignId={campaignId}
                  showAllTasks={customClaims.role === 'nonprofit_admin' || customClaims.role === 'appraiser'}
                  tasks={tasks}
                  loading={tasksLoading}
                  handleCommitmentDecision={handleCommitmentDecision}
                />
              </div>
            )}
            
            {activeTab === 'files' && (
              <div className="animate-in fade-in duration-300">
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Shared Files</h2>
                  <p className="text-gray-600">
                    File sharing will be available once a donation is created.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}