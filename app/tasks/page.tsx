'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useRouter } from 'next/navigation'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import CompleteProfileModal from '@/components/tasks/CompleteProfileModal'
import CompleteOrganizationModal from '@/components/tasks/CompleteOrganizationModal'
import InviteTeamMemberModal from '@/components/organization/InviteTeamMemberModal'
import CreateCampaignModal from '@/components/tasks/CreateCampaignModal'
import { NonprofitSubrole } from '@/types/auth'
import { secureLogger } from '@/lib/logging/secure-logger'
import PageErrorBoundary from '@/components/error/PageErrorBoundary'
import { PageLoading } from '@/components/shared/LoadingStates'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  User,
  Building2,
  Users,
  PlusCircle,
  ArrowRight,
  FileText,
  RotateCcw,
  Clock,
  Eye,
  MessageSquare
} from 'lucide-react'

interface NonprofitTask {
  id: string
  title: string
  description: string
  isComplete: boolean
  action: () => void
  icon: React.ComponentType<{ className?: string }>
}

interface CampaignTaskSummary {
  campaignId: string
  campaignTitle: string
  tasks: Array<{
    id: string
    title: string
    description: string
    isComplete: boolean
  }>
}

interface BlockedDonationTask {
  donationId: string
  campaignTitle: string
  donorName: string
  donorEmail: string
  blockedTaskCount: number
  nextTask: string
  status: string
}

export default function NonprofitDashboardPage() {
  const { user, userProfile, customClaims, refreshUserData } = useAuth()
  const router = useRouter()
  const [tasks, setTasks] = useState<NonprofitTask[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'onboarding' | 'campaigns' | 'donations'>('onboarding')
  const [hasSetInitialTab, setHasSetInitialTab] = useState(false)
  const [campaignTasks, setCampaignTasks] = useState<CampaignTaskSummary[]>([])
  const [loadingCampaignTasks, setLoadingCampaignTasks] = useState(false)
  const [blockedDonationTasks, setBlockedDonationTasks] = useState<BlockedDonationTask[]>([])

  // Modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [organizationModalOpen, setOrganizationModalOpen] = useState(false)
  const [inviteTeamModalOpen, setInviteTeamModalOpen] = useState(false)
  const [createCampaignModalOpen, setCreateCampaignModalOpen] = useState(false)

  // Check completion status for each task
  const checkTaskCompletion = useCallback(async () => {
    if (!userProfile || !customClaims?.organizationId) return

    const taskCompletions = {
      profile: false,
      organization: false,
      team: false,
      campaign: false
    }

    // Check profile completion
    if (userProfile.displayName && userProfile.phoneNumber) {
      taskCompletions.profile = true
    }

    // Check organization completion - simplified check
    // We'll mark it as complete if it's been manually marked complete
    // This avoids the 403 error from the organizations/status endpoint
    taskCompletions.organization = false

    // Check team completion - for now, we'll mark as complete if there's at least one member
    try {
      const token = await user?.getIdToken()
      const teamResponse = await fetch('/api/organizations/members', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (teamResponse.ok) {
        const teamData = await teamResponse.json()
        if (teamData.members && teamData.members.length > 1) { // More than just the current user
          taskCompletions.team = true
        }
      }
    } catch (error) {
      secureLogger.error('Error checking team status', error, {
        userId: userProfile.uid
      })
    }

    // Check campaign completion
    try {
      const token = await user?.getIdToken()
      const campaignResponse = await fetch('/api/campaigns/user-campaigns', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json()
        if (campaignData.campaigns && campaignData.campaigns.length > 0) {
          taskCompletions.campaign = true
        }
      }
    } catch (error) {
      secureLogger.error('Error checking campaign status', error, {
        userId: userProfile.uid
      })
    }

    // Get manual completions from localStorage - user specific
    const storageKey = `nonprofit-task-completions-${userProfile.uid}`
    const manualCompletions = JSON.parse(localStorage.getItem(storageKey) || '{}')

    // Create tasks array
    const newTasks: NonprofitTask[] = [
      {
        id: 'profile',
        title: 'Complete User Profile',
        description: 'Fill out your personal information including name and phone number',
        isComplete: taskCompletions.profile || manualCompletions.profile || false,
        action: () => setProfileModalOpen(true),
        icon: User
      },
      {
        id: 'organization',
        title: 'Complete Organization Information',
        description: 'Add organization name, EIN, website, city, state, and phone number',
        isComplete: taskCompletions.organization || manualCompletions.organization || false,
        action: () => setOrganizationModalOpen(true),
        icon: Building2
      },
      {
        id: 'team',
        title: 'Invite Internal Team Members',
        description: 'Invite team members to collaborate on your campaigns',
        isComplete: taskCompletions.team || manualCompletions.team || false,
        action: () => setInviteTeamModalOpen(true),
        icon: Users
      },
      {
        id: 'campaign',
        title: 'Create a Campaign',
        description: 'Set up your first fundraising campaign',
        isComplete: taskCompletions.campaign || manualCompletions.campaign || false,
        action: () => setCreateCampaignModalOpen(true),
        icon: PlusCircle
      }
    ]

    setTasks(newTasks)
    setLoading(false)
  }, [user, userProfile, customClaims])

  // Fetch blocked donation tasks (tasks waiting on donors)
  const fetchBlockedDonationTasks = useCallback(async () => {
    if (!customClaims?.organizationId || !userProfile?.uid) return

    try {
      // Query campaign_participants for this organization's campaigns
      const campaignsQuery = query(
        collection(db, 'campaigns'),
        where('organizationId', '==', customClaims.organizationId)
      )
      const campaignsSnapshot = await getDocs(campaignsQuery)
      const campaignIds = campaignsSnapshot.docs.map(doc => doc.id)

      if (campaignIds.length === 0) {
        setBlockedDonationTasks([])
        return
      }

      const blockedTasks: BlockedDonationTask[] = []

      // For each campaign, get participants
      for (const campaignDoc of campaignsSnapshot.docs) {
        const campaignData = campaignDoc.data()
        const campaignId = campaignDoc.id

        const participantsQuery = query(
          collection(db, 'campaign_participants'),
          where('campaignId', '==', campaignId)
        )
        const participantsSnapshot = await getDocs(participantsQuery)

        for (const participantDoc of participantsSnapshot.docs) {
          const participant = participantDoc.data()

          // Query tasks for this participant to check if there are incomplete tasks
          try {
            const tasksQuery = query(
              collection(db, 'tasks'),
              where('participantId', '==', participantDoc.id)
            )

            const tasksSnapshot = await getDocs(tasksQuery)
            const tasks = tasksSnapshot.docs.map(doc => doc.data())

            // Get all incomplete tasks assigned to the donor
            const incompleteDonorTasks = tasks.filter(t =>
              t.status !== 'completed' && t.assignedRole === 'donor'
            )

            // Get all incomplete tasks assigned to the nonprofit
            const incompleteNonprofitTasks = tasks.filter(t =>
              t.status !== 'completed' && t.assignedRole === 'nonprofit'
            )

            // Only include if there are incomplete donor tasks AND no incomplete nonprofit tasks
            // This means the nonprofit is waiting on the donor
            if (incompleteDonorTasks.length > 0 && incompleteNonprofitTasks.length === 0) {
              // Find the next task (lowest order number)
              const nextTask = incompleteDonorTasks.sort((a, b) =>
                (a.order || 999) - (b.order || 999)
              )[0]

              blockedTasks.push({
                donationId: participantDoc.id,
                campaignTitle: campaignData.title || 'Unknown Campaign',
                donorName: participant.donorName || participant.userEmail || 'Unknown Donor',
                donorEmail: participant.donorEmail || participant.userEmail || '',
                blockedTaskCount: incompleteDonorTasks.length,
                nextTask: nextTask.title || 'Complete workflow',
                status: participant.status || 'active'
              })
            }
          } catch (taskError) {
            secureLogger.error('Error fetching tasks for participant', taskError, {
              participantId: participantDoc.id
            })
          }
        }
      }

      setBlockedDonationTasks(blockedTasks)
    } catch (error) {
      secureLogger.error('Error fetching blocked donation tasks', error, {
        organizationId: customClaims?.organizationId
      })
    }
  }, [customClaims?.organizationId, userProfile?.uid])

  // Fetch campaign and donation tasks
  const fetchCampaignTasks = useCallback(async () => {
    if (!customClaims?.organizationId || !userProfile?.uid) return

    setLoadingCampaignTasks(true)
    try {
      // Fetch campaigns for the organization using Firestore directly
      const campaignsQuery = query(
        collection(db, 'campaigns'),
        where('organizationId', '==', customClaims.organizationId)
      )

      const campaignsSnapshot = await getDocs(campaignsQuery)
      const campaigns = campaignsSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title
      }))

      // Get completion status from localStorage
      const storageKey = `campaign-task-completions-${userProfile.uid}`
      const completions = JSON.parse(localStorage.getItem(storageKey) || '{}')

      // For each campaign, create the 3 setup tasks
      const campaignSummaries: CampaignTaskSummary[] = campaigns.map((campaign) => {
        const campaignKey = campaign.id

        return {
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          tasks: [
            {
              id: `${campaignKey}-marketing`,
              title: 'Create Marketing Materials',
              description: 'Set up your campaign description, images, and story to attract donors.',
              isComplete: completions[`${campaignKey}-marketing`] || false
            },
            {
              id: `${campaignKey}-team`,
              title: 'Invite Internal Team Members',
              description: 'Add team members from your organization to help manage this campaign.',
              isComplete: completions[`${campaignKey}-team`] || false
            },
            {
              id: `${campaignKey}-donors`,
              title: 'Invite Donors',
              description: 'Start inviting potential donors to your campaign.',
              isComplete: completions[`${campaignKey}-donors`] || false
            }
          ]
        }
      })

      setCampaignTasks(campaignSummaries)
    } catch (error) {
      secureLogger.error('Error fetching campaign tasks', error, {
        organizationId: customClaims?.organizationId
      })
    } finally {
      setLoadingCampaignTasks(false)
    }
  }, [customClaims?.organizationId, userProfile?.uid])

  useEffect(() => {
    if (user && userProfile && customClaims?.organizationId) {
      checkTaskCompletion()
      // Always fetch campaign tasks on load so we can show the badge count
      fetchCampaignTasks()
      fetchBlockedDonationTasks()
    }
  }, [user, userProfile, customClaims, checkTaskCompletion, fetchCampaignTasks, fetchBlockedDonationTasks])

  // Set initial tab based on onboarding completion
  useEffect(() => {
    if (!hasSetInitialTab && tasks.length > 0) {
      const allComplete = tasks.every(task => task.isComplete)
      if (allComplete) {
        setActiveTab('campaigns')
      }
      setHasSetInitialTab(true)
    }
  }, [tasks, hasSetInitialTab])

  const handleToggleComplete = async (taskId: string) => {
    // Find current completion status
    const currentTask = tasks.find(task => task.id === taskId)
    const newStatus = !currentTask?.isComplete

    // Update local state immediately for better UX
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, isComplete: newStatus } : task
    ))

    // Store completion status in localStorage for persistence - user specific
    const storageKey = `nonprofit-task-completions-${userProfile?.uid}`
    const completions = JSON.parse(localStorage.getItem(storageKey) || '{}')
    completions[taskId] = newStatus
    localStorage.setItem(storageKey, JSON.stringify(completions))
  }


  const handleMarkComplete = async (taskId: string) => {
    // Update local state immediately for better UX
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, isComplete: true } : task
    ))

    // Store completion status in localStorage for persistence - user specific
    const storageKey = `nonprofit-task-completions-${userProfile?.uid}`
    const completions = JSON.parse(localStorage.getItem(storageKey) || '{}')
    completions[taskId] = true
    localStorage.setItem(storageKey, JSON.stringify(completions))
  }

  // Handle team member invitation
  const handleInviteTeamMember = async (email: string, subrole: NonprofitSubrole, personalMessage?: string) => {
    if (!user || !customClaims?.organizationId) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          subrole,
          personalMessage
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }

      // Mark team task as complete and refresh task completion status
      handleMarkComplete('team')
      checkTaskCompletion()
    } catch (error) {
      throw error // Re-throw to let the modal handle it
    }
  }

  const handleModalComplete = async (taskId: string) => {
    // Mark complete first to prevent modal re-opening
    handleMarkComplete(taskId)
    
    // Close the modal immediately
    if (taskId === 'profile') setProfileModalOpen(false)
    if (taskId === 'organization') setOrganizationModalOpen(false)
    if (taskId === 'team') setInviteTeamModalOpen(false)
    if (taskId === 'campaign') setCreateCampaignModalOpen(false)
    
    // Wait for user data to refresh before checking completion
    try {
      await refreshUserData()
      // Small delay to ensure state updates are processed
      setTimeout(() => {
        checkTaskCompletion()
      }, 200)
    } catch {
      // If refresh fails, still check completion after delay
      setTimeout(() => {
        checkTaskCompletion()
      }, 500)
    }
  }

  const handleResetTasks = async () => {
    if (!userProfile || !user) return
    
    // Clear localStorage completions for this user
    const storageKey = `nonprofit-task-completions-${userProfile.uid}`
    localStorage.removeItem(storageKey)
    
    // For testing purposes, also clear actual profile data
    try {
      // Clear profile displayName and phoneNumber in Firebase
      const userDocRef = doc(db, 'users', userProfile.uid)
      await updateDoc(userDocRef, {
        displayName: '',
        phoneNumber: '',
        updatedAt: new Date()
      })
      
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: ''
      })
      
      // Refresh user data and task completion status
      await refreshUserData()
      checkTaskCompletion()
    } catch (error) {
      secureLogger.error('Error resetting profile data', error, {
        userId: userProfile.uid
      })
      // Still refresh task completion even if profile reset failed
      checkTaskCompletion()
    }
  }

  const completedTasks = tasks.filter(task => task.isComplete).length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  if (loading) {
    return (
      <PageLoading 
        title="Loading Dashboard" 
        description="Setting up your nonprofit dashboard..." 
      />
    )
  }

  return (
    <PageErrorBoundary pageName="Tasks Dashboard">
      <NonprofitAdminRoute>
        <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage your onboarding, campaign, and donation tasks
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-0">
                <button
                  onClick={() => setActiveTab('onboarding')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'onboarding'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Onboarding Tasks
                </button>
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'campaigns'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Campaign Tasks
                  {campaignTasks.length > 0 && (() => {
                    const totalIncompleteTasks = campaignTasks.reduce((sum, c) => {
                      return sum + c.tasks.filter(t => !t.isComplete).length
                    }, 0)
                    return totalIncompleteTasks > 0 ? (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {totalIncompleteTasks}
                      </span>
                    ) : null
                  })()}
                </button>
                <button
                  onClick={() => setActiveTab('donations')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'donations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Donation Tasks
                  {blockedDonationTasks.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {blockedDonationTasks.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Onboarding Tasks Tab */}
          {activeTab === 'onboarding' && (
            <>
          {/* Progress Overview */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Setup Progress</h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleResetTasks}
                  className="inline-flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200"
                  title="Reset all tasks to test the process"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Tasks</span>
                </button>
                <span className="text-2xl font-bold text-blue-600">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-600">
              {completedTasks === totalTasks
                ? "🎉 Great job! You've completed all setup tasks. You're ready to start fundraising!"
                : `${totalTasks - completedTasks} task${totalTasks - completedTasks === 1 ? '' : 's'} remaining to complete your setup.`
              }
            </p>
          </div>

          {/* Setup Complete - Show below progress bar when all tasks done */}
          {completedTasks === totalTasks && (
            <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow p-6 text-white">
              <h3 className="text-xl font-semibold mb-2">🎉 Setup Complete!</h3>
              <p className="mb-4">
                Congratulations! You&apos;ve completed all the setup tasks. You&apos;re now ready to manage your campaigns and start fundraising.
              </p>
              <div className="flex items-center space-x-4">
                {/* Bouncing Arrow */}
                <div className="animate-bounce">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
                <button
                  onClick={() => router.push('/campaigns')}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <span>View All Campaigns</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="space-y-4">
            {tasks.map((task, index) => {
              const TaskIcon = task.icon
              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md ${
                    task.isComplete ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center space-x-4">
                      {/* Step Number & Status */}
                      <div className="flex-shrink-0">
                        {task.isComplete ? (
                          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-gray-600">{index + 1}</span>
                          </div>
                        )}
                      </div>

                      {/* Task Icon */}
                      <div className={`p-3 rounded-lg ${
                        task.isComplete ? 'bg-green-100' : 'bg-blue-100'
                      }`}>
                        <TaskIcon className={`w-6 h-6 ${
                          task.isComplete ? 'text-green-600' : 'text-blue-600'
                        }`} />
                      </div>

                      {/* Task Content */}
                      <div className="flex-grow">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {task.title}
                          </h3>
                          {task.isComplete && (
                            <Badge variant="success" size="sm">Complete</Badge>
                          )}
                        </div>
                        <p className="text-gray-600">{task.description}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleComplete(task.id)}
                          className={`inline-flex items-center space-x-2 px-3 py-2 font-medium rounded-lg transition-colors duration-200 ${
                            task.isComplete
                              ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                          title={task.isComplete ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">
                            {task.isComplete ? 'Mark Incomplete' : 'Mark Complete'}
                          </span>
                        </button>
                        
                        <button
                          onClick={task.action}
                          className={`inline-flex items-center space-x-2 px-4 py-2 font-medium rounded-lg transition-colors duration-200 ${
                            task.isComplete 
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <span>{task.isComplete ? 'View' : 'Start'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </>
          )}

          {/* Campaign Tasks Tab */}
          {activeTab === 'campaigns' && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Campaign Tasks</h2>
              <p className="text-gray-600 mb-6">
                View and manage tasks for setting up your campaigns.
              </p>

              {loadingCampaignTasks ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading campaign tasks...</p>
                </div>
              ) : campaignTasks.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No campaign tasks yet</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Campaign tasks will appear here once you have donors participating in your campaigns.
                  </p>
                  <button
                    onClick={() => router.push('/campaigns')}
                    className="mt-6 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    <span>View Campaigns</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaignTasks.map((campaign) => {
                    const incompleteTasks = campaign.tasks.filter(t => !t.isComplete)

                    return (
                      <div
                        key={campaign.campaignId}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 p-6"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {campaign.campaignTitle}
                            </h3>
                            <p className="text-gray-600 mb-4">
                              You have <strong>{incompleteTasks.length} task{incompleteTasks.length !== 1 ? 's' : ''}</strong> to complete in this campaign.
                            </p>

                            {/* Show incomplete task titles */}
                            {incompleteTasks.length > 0 && (
                              <div className="mb-4 space-y-2">
                                {incompleteTasks.map((task) => (
                                  <div key={task.id} className="flex items-center space-x-2 text-sm text-gray-600">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>{task.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <button
                              onClick={() => router.push(`/campaigns/${campaign.campaignId}`)}
                              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                            >
                              <span>Go to Campaign Tasks</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="ml-4">
                            <div className="bg-blue-100 rounded-full p-3">
                              <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Donation Tasks Tab */}
          {activeTab === 'donations' && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Donation Tasks</h2>
              <p className="text-gray-600 mb-6">
                Monitor donation workflows and track tasks that donors need to complete.
              </p>

              {blockedDonationTasks.length > 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    ⏳ Waiting on Donors ({blockedDonationTasks.length})
                  </h3>
                  <p className="text-gray-600 mb-4">
                    These donations have tasks that are currently waiting on the donor to complete their part.
                  </p>

                  <div className="space-y-3 mb-6">
                    {blockedDonationTasks.map((blocked) => (
                      <div
                        key={blocked.donationId}
                        className="bg-amber-50 border border-amber-200 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Clock className="w-5 h-5 text-amber-600" />
                              <h4 className="font-semibold text-gray-900">
                                {blocked.campaignTitle}
                              </h4>
                            </div>

                            <div className="ml-7 space-y-1">
                              <p className="text-sm text-gray-700">
                                <strong>Waiting on:</strong> {blocked.donorName}
                                {blocked.donorEmail && (
                                  <span className="text-gray-500"> ({blocked.donorEmail})</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-700">
                                <strong>Next task:</strong> {blocked.nextTask}
                              </p>
                              <p className="text-sm text-amber-700">
                                {blocked.blockedTaskCount} task{blocked.blockedTaskCount !== 1 ? 's' : ''} remaining for donor
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => router.push(`/donations/${blocked.donationId}/tasks`)}
                            className="flex-shrink-0 inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors duration-200"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Tasks</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Why are these blocked?</p>
                        <p className="text-sm text-blue-700 mt-1">
                          These donations require the donor to complete certain steps (like providing equity information or signing documents) before you can proceed with your nonprofit tasks. You&apos;ll be notified when they complete their part.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">All caught up!</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    You have no donations waiting on donor actions. All your donors are up to date with their tasks.
                  </p>
                </div>
              )}
            </div>
          )}

          </div>

          {/* Modals */}
        <CompleteProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          onComplete={() => handleModalComplete('profile')}
        />
        
        <CompleteOrganizationModal
          isOpen={organizationModalOpen}
          onClose={() => setOrganizationModalOpen(false)}
          onComplete={() => handleModalComplete('organization')}
        />
        
        <InviteTeamMemberModal
          isOpen={inviteTeamModalOpen}
          onClose={() => setInviteTeamModalOpen(false)}
          onInvite={handleInviteTeamMember}
        />
        
        <CreateCampaignModal
          isOpen={createCampaignModalOpen}
          onClose={() => setCreateCampaignModalOpen(false)}
          onSuccess={() => {
            handleModalComplete('campaign')
            setCreateCampaignModalOpen(false)
          }}
          organizationId={customClaims?.organizationId || ''}
          userId={userProfile?.uid || ''}
          />
        </div>
      </NonprofitAdminRoute>
    </PageErrorBoundary>
  )
}