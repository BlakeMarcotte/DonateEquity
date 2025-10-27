'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState, Suspense } from 'react'
import { PledgeTaskList } from '@/components/tasks/PledgeTaskList'
import { DonationFiles } from '@/components/files/DonationFiles'
import { EquityCommitmentModal } from '@/components/tasks/EquityCommitmentModal'
import { usePledgeTasks } from '@/hooks/usePledgeTasks'
import { CheckSquare, FileText } from 'lucide-react'

function PledgePage() {
  const { user, loading } = useAuth()

  // For demo purposes, use a fixed demo participant ID based on user (or guest ID if no user)
  const participantId = user ? `pledge_demo_${user.uid}` : 'pledge_demo_guest'

  const { tasks: pledgeTasks, loading: pledgeTasksLoading, handleCommitmentDecision } = usePledgeTasks(participantId)

  // Use pledge tasks exclusively
  const tasks = pledgeTasks
  const tasksLoading = pledgeTasksLoading
  const [activeTab, setActiveTab] = useState<'tasks' | 'files'>('tasks')
  const [showCommitmentModal, setShowCommitmentModal] = useState(false)
  const [creatingDemoTasks, setCreatingDemoTasks] = useState(false)

  // Auto-create demo tasks if none exist
  useEffect(() => {
    const createDemoTasks = async () => {
      if (!participantId || tasksLoading || creatingDemoTasks) return

      // If no tasks exist, create demo tasks
      if (tasks.length === 0) {
        setCreatingDemoTasks(true)
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          }

          // Only add auth token if user is logged in
          if (user) {
            headers['Authorization'] = `Bearer ${await user.getIdToken()}`
          }

          const response = await fetch('/api/pledge/create-demo-tasks', {
            method: 'POST',
            headers,
            body: JSON.stringify({ participantId })
          })

          if (!response.ok) {
            throw new Error('Failed to create demo tasks')
          }
        } catch {
          // Error creating demo tasks - silently fail
        } finally {
          setCreatingDemoTasks(false)
        }
      }
    }

    createDemoTasks()
  }, [user, participantId, tasks.length, tasksLoading, creatingDemoTasks])

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
      throw error
    }
  }

  if (loading || tasksLoading || creatingDemoTasks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005A7D]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#5BC5F2]/5">
      {/* Compact Pledge 1% Header */}
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#005A7D] via-[#004560] to-[#005A7D]">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-64 h-64 bg-[#5BC5F2] rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#5BC5F2] rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-[#005A7D] font-bold text-lg">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Pledge 1%</h1>
              <p className="text-[#5BC5F2] text-xs font-medium">Corporate Impact Movement</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* Task Content - Compact Card Design */}
        {tasks.length > 0 && (
          <div className="relative mb-8">
            {/* Decorative Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#5BC5F2]/5 to-transparent rounded-2xl"></div>

            <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200">
              {/* Compact Tab Navigation */}
              <div className="relative bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <nav className="flex px-4 pt-3">
                  <button
                    onClick={() => setActiveTab('tasks')}
                    className={`relative pb-3 px-4 font-semibold text-sm transition-all duration-300 ${
                      activeTab === 'tasks'
                        ? 'text-[#005A7D]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        activeTab === 'tasks'
                          ? 'bg-gradient-to-br from-[#005A7D] to-[#004560] shadow-md'
                          : 'bg-gray-100'
                      }`}>
                        <CheckSquare className={`h-4 w-4 ${activeTab === 'tasks' ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <span>Tasks</span>
                    </div>
                    {activeTab === 'tasks' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#005A7D] to-[#004560] rounded-t-full"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className={`relative pb-3 px-4 font-semibold text-sm transition-all duration-300 ${
                      activeTab === 'files'
                        ? 'text-[#005A7D]'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                        activeTab === 'files'
                          ? 'bg-gradient-to-br from-[#005A7D] to-[#004560] shadow-md'
                          : 'bg-gray-100'
                      }`}>
                        <FileText className={`h-4 w-4 ${activeTab === 'files' ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <span>Documents</span>
                    </div>
                    {activeTab === 'files' && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#005A7D] to-[#004560] rounded-t-full"></div>
                    )}
                  </button>
                </nav>
              </div>

            <div className="p-4">
              {activeTab === 'tasks' && (
                <PledgeTaskList
                  participantId={participantId || undefined}
                  campaignId="pledge_demo"
                  showAllTasks={false}
                  // Pass required props for demo
                  campaignTitle="Pledge 1% Demo"
                  donorName={user?.displayName || user?.email?.split('@')[0] || 'User'}
                  organizationName="Pledge 1%"
                  // Always pass pledge tasks and handlers
                  tasks={tasks}
                  loading={tasksLoading}
                  handleCommitmentDecision={handleCommitmentDecision}
                />
              )}

              {activeTab === 'files' && (
                <>
                  {participantId ? (
                    <DonationFiles
                      donationId={`participants/${participantId}`}
                      title="Shared Documents"
                      showUpload={false}
                      className="border-0 shadow-none p-0"
                    />
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Shared Files</h3>
                      <p className="text-gray-600">
                        File sharing will be available once your participation is set up.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          </div>
        )}

      </div>

      {/* Equity Commitment Modal */}
      <EquityCommitmentModal
        isOpen={showCommitmentModal}
        onClose={() => setShowCommitmentModal(false)}
        onCommit={handleCommitmentCreate}
        campaignTitle="Pledge 1% Demo"
        donorName={user?.displayName || user?.email?.split('@')[0] || 'User'}
        organizationName="Pledge 1%"
      />
    </div>
  )
}

function PledgePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PledgePage />
    </Suspense>
  )
}

export default PledgePageWrapper
