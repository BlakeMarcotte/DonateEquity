'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { secureLogger } from '@/lib/logging/secure-logger'
import PageErrorBoundary from '@/components/error/PageErrorBoundary'
import { PageLoading } from '@/components/shared/LoadingStates'
import { Badge } from '@/components/ui/badge'
import CompleteAppraiserProfileModal from '@/components/appraiser/CompleteAppraiserProfileModal'
import ExperienceAndOrganizationModal from '@/components/appraiser/ExperienceAndOrganizationModal'
import AppraiserPacketModal from '@/components/appraiser/AppraiserPacketModal'
import {
  CheckCircle2,
  User,
  Briefcase,
  FileText,
  ArrowRight,
  Clock,
  ChevronDown
} from 'lucide-react'

interface AppraiserTask {
  id: string
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'complete'
  action: () => void
  icon: React.ComponentType<{ className?: string }>
}

export default function AppraiserOnboardingPage() {
  const { user, userProfile, customClaims, refreshUserData } = useAuth()
  const router = useRouter()
  const [tasks, setTasks] = useState<AppraiserTask[]>([])
  const [loading, setLoading] = useState(true)
  const [taskCompletions, setTaskCompletions] = useState<{
    onboarding: Record<string, string>
  }>({ onboarding: {} })
  const [hasCampaigns, setHasCampaigns] = useState(false)

  // Modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [experienceModalOpen, setExperienceModalOpen] = useState(false)
  const [packetModalOpen, setPacketModalOpen] = useState(false)

  const hasEverLoadedTaskCompletions = useRef(false)
  const hasRunInitialFetch = useRef(false)
  const hasRunInitialTaskCheck = useRef(false)

  if (taskCompletions.onboarding && Object.keys(taskCompletions.onboarding).length > 0) {
    hasEverLoadedTaskCompletions.current = true
  }

  // Fetch task completions from Firestore
  const fetchTaskCompletions = useCallback(async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/tasks/completion', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setTaskCompletions({
          onboarding: result.completions?.onboarding || {}
        })
      }
    } catch (error) {
      secureLogger.error('Error fetching task completions', error instanceof Error ? error : new Error(String(error)))
    }
  }, [user])

  // Helper function to determine status
  const getTaskStatus = useCallback((taskId: string, isAutomaticallyComplete: boolean): 'not_started' | 'in_progress' | 'complete' => {
    // If manually set in Firestore, use that status
    if (taskId in taskCompletions.onboarding) {
      return taskCompletions.onboarding[taskId] as 'not_started' | 'in_progress' | 'complete'
    }
    // If automatically detected as complete, mark complete
    if (isAutomaticallyComplete) {
      return 'complete'
    }
    // Otherwise not started
    return 'not_started'
  }, [taskCompletions])

  // Check completion status for each task
  const checkTaskCompletion = useCallback(async () => {
    if (!userProfile || !user) return

    const automaticTaskCompletions = {
      appraiser_profile: false,
      appraiser_experience: false,
      appraiser_packet: false
    }

    // Check profile completion
    if (userProfile.displayName && userProfile.phoneNumber) {
      automaticTaskCompletions.appraiser_profile = true
    }

    // Check experience completion - need to fetch from Firestore
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/users/${userProfile.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const userData = await response.json()

        // Check if experience is complete
        if (
          userData.yearsOfExperience &&
          userData.specializations?.length > 0 &&
          userData.firmName
        ) {
          automaticTaskCompletions.appraiser_experience = true
        }

        // Check if packet is complete
        if (userData.requiredDocuments?.length > 0) {
          automaticTaskCompletions.appraiser_packet = true
        }
      }
    } catch (error) {
      secureLogger.error('Error checking appraiser completion status', error, {
        userId: userProfile.uid
      })
    }

    // Create tasks array
    const newTasks: AppraiserTask[] = [
      {
        id: 'appraiser_profile',
        title: 'Complete Your Profile',
        description: 'Add your name, phone number, and professional bio',
        status: getTaskStatus('appraiser_profile', automaticTaskCompletions.appraiser_profile),
        action: () => setProfileModalOpen(true),
        icon: User
      },
      {
        id: 'appraiser_experience',
        title: 'Experience & Organization',
        description: 'Add your professional experience, certifications, and firm information',
        status: getTaskStatus('appraiser_experience', automaticTaskCompletions.appraiser_experience),
        action: () => setExperienceModalOpen(true),
        icon: Briefcase
      },
      {
        id: 'appraiser_packet',
        title: 'Create Appraiser Packet',
        description: 'Define the documents you need from clients to conduct appraisals',
        status: getTaskStatus('appraiser_packet', automaticTaskCompletions.appraiser_packet),
        action: () => setPacketModalOpen(true),
        icon: FileText
      }
    ]

    setTasks(newTasks)
    setLoading(false)
  }, [user, userProfile, getTaskStatus])

  // Check if appraiser has campaign assignments
  const checkForCampaigns = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/campaign-participants/by-appraiser?appraiserId=${user.uid}`)
      if (response.ok) {
        const { participants } = await response.json()
        setHasCampaigns(participants && participants.length > 0)
      }
    } catch (error) {
      secureLogger.error('Error checking for campaigns', error instanceof Error ? error : new Error(String(error)))
    }
  }, [user])

  // Fetch initial data once on mount
  useEffect(() => {
    if (user && userProfile && !hasRunInitialFetch.current) {
      hasRunInitialFetch.current = true
      fetchTaskCompletions()
      checkForCampaigns()
    }
  }, [user, userProfile, fetchTaskCompletions, checkForCampaigns])

  // Run checkTaskCompletion once after initial taskCompletions load
  useEffect(() => {
    const hasData = taskCompletions.onboarding && Object.keys(taskCompletions.onboarding).length > 0
    if (hasData && user && userProfile && !hasRunInitialTaskCheck.current) {
      hasRunInitialTaskCheck.current = true
      checkTaskCompletion()
    }
  }, [taskCompletions, user, userProfile, checkTaskCompletion])

  const handleSetTaskStatus = async (taskId: string, newStatus: 'not_started' | 'in_progress' | 'complete') => {
    if (!user) return

    // Update local state immediately for better UX
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, status: newStatus } : task
    ))

    // Update task completions state
    setTaskCompletions(prev => ({
      ...prev,
      onboarding: {
        ...prev.onboarding,
        [taskId]: newStatus
      }
    }))

    // Save to Firestore
    try {
      const token = await user.getIdToken()
      await fetch('/api/tasks/completion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskType: 'onboarding',
          taskId,
          status: newStatus
        })
      })
    } catch (error) {
      secureLogger.error('Error updating task status', error instanceof Error ? error : new Error(String(error)))
    }
  }

  const handleModalComplete = async (taskId: string) => {
    // Close the modal immediately
    if (taskId === 'appraiser_profile') setProfileModalOpen(false)
    if (taskId === 'appraiser_experience') setExperienceModalOpen(false)
    if (taskId === 'appraiser_packet') setPacketModalOpen(false)

    // Refresh data and fetch task completions from Firestore
    try {
      await refreshUserData()
      // Add a delay before fetching to allow Firestore write to propagate
      await new Promise(resolve => setTimeout(resolve, 300))
      await fetchTaskCompletions()
    } catch (error) {
      secureLogger.error('Error refreshing after task completion', error instanceof Error ? error : new Error(String(error)))
      // Still try to fetch completions even if refresh fails
      await fetchTaskCompletions()
    }
  }

  const completedTasks = tasks.filter(task => task.status === 'complete').length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const waitingForInitialLoad = user && userProfile &&
    !hasEverLoadedTaskCompletions.current &&
    Object.keys(taskCompletions.onboarding).length === 0

  const showLoadingScreen = loading || waitingForInitialLoad

  if (showLoadingScreen) {
    return (
      <PageLoading
        title="Loading Onboarding"
        description="Setting up your appraiser onboarding..."
      />
    )
  }

  // Redirect to dashboard if user is not an appraiser
  if (customClaims?.role !== 'appraiser') {
    router.push('/my-campaign')
    return null
  }

  return (
    <PageErrorBoundary pageName="Appraiser Onboarding">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Appraiser Onboarding</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Complete these steps to start receiving appraisal requests
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Overview */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Setup Progress</h2>
              <span className="text-2xl font-bold text-blue-600">
                {completedTasks}/{totalTasks}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>

            <p className="text-sm text-gray-600">
              {completedTasks === totalTasks
                ? "🎉 Great job! You've completed all onboarding tasks. You're ready to start appraising!"
                : `${totalTasks - completedTasks} task${totalTasks - completedTasks === 1 ? '' : 's'} remaining to complete your setup.`
              }
            </p>
          </div>

          {/* Setup Complete */}
          {completedTasks === totalTasks && (
            <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow p-6 text-white">
              <h3 className="text-xl font-semibold mb-2">🎉 Onboarding Complete!</h3>
              <p className="mb-4">
                Congratulations! You&apos;ve completed all the onboarding tasks. You&apos;re now ready to receive and work on appraisal requests.
              </p>
              {hasCampaigns ? (
                <div className="flex items-center space-x-4">
                  <div className="animate-bounce">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                  <button
                    onClick={() => router.push('/my-campaign')}
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <span>Go to My Assignments</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <p className="text-white/90 text-sm">
                    You&apos;ll receive email notifications when nonprofits assign you to appraisal requests. In the meantime, your profile is visible to organizations looking for appraisers.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Task List */}
          <div className="space-y-4">
            {tasks.map((task, index) => {
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md ${
                    task.status === 'complete' ? 'border-green-200 bg-green-50' :
                    task.status === 'in_progress' ? 'border-blue-200 bg-blue-50' :
                    'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Step Number & Status */}
                      <div className="flex-shrink-0">
                        {task.status === 'complete' ? (
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        ) : task.status === 'in_progress' ? (
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-gray-600">{index + 1}</span>
                          </div>
                        )}
                      </div>

                      {/* Task Content */}
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-lg font-semibold ${
                            task.status === 'complete' ? 'text-green-900 line-through' : 'text-gray-900'
                          }`}>
                            {task.title}
                          </h3>
                          {task.status === 'in_progress' && (
                            <Badge variant="info" size="sm">In Progress</Badge>
                          )}
                          {task.status === 'complete' && (
                            <Badge variant="success" size="sm">Complete</Badge>
                          )}
                        </div>
                        <p className="text-gray-600">{task.description}</p>

                        <div className="mt-4">
                          <button
                            onClick={task.action}
                            className={`inline-flex items-center space-x-2 px-4 py-2 font-medium rounded-lg transition-colors duration-200 ${
                              task.status === 'complete'
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <span>{task.status === 'complete' ? 'View' : 'Start'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <div className="flex-shrink-0">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Status
                        </label>
                        <div className="relative">
                          <select
                            value={task.status}
                            onChange={(e) => handleSetTaskStatus(task.id, e.target.value as 'not_started' | 'in_progress' | 'complete')}
                            className={`appearance-none w-full px-3 py-2 pr-8 text-sm font-medium rounded-lg border transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              task.status === 'complete'
                                ? 'bg-green-50 text-green-700 border-green-300'
                                : task.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 border-blue-300'
                                : 'bg-gray-50 text-gray-700 border-gray-300'
                            }`}
                          >
                            <option value="not_started">Not Started</option>
                            <option value="in_progress">In Progress</option>
                            <option value="complete">Complete</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Modals */}
        <CompleteAppraiserProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          onComplete={() => handleModalComplete('appraiser_profile')}
        />

        <ExperienceAndOrganizationModal
          isOpen={experienceModalOpen}
          onClose={() => setExperienceModalOpen(false)}
          onComplete={() => handleModalComplete('appraiser_experience')}
        />

        <AppraiserPacketModal
          isOpen={packetModalOpen}
          onClose={() => setPacketModalOpen(false)}
          onComplete={() => handleModalComplete('appraiser_packet')}
        />
      </div>
    </PageErrorBoundary>
  )
}
