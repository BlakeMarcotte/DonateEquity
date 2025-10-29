'use client'

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
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
import { getOrCreateOrganization } from '@/lib/firebase/organizations'
import {
  CheckCircle2,
  User,
  Building2,
  Users,
  PlusCircle,
  ArrowRight,
  FileText,
  Clock,
  Eye,
  MessageSquare,
  RotateCcw,
  ChevronDown
} from 'lucide-react'

interface NonprofitTask {
  id: string
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'complete'
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
    status: 'not_started' | 'in_progress' | 'complete'
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
  const [taskCompletions, setTaskCompletions] = useState<{
    onboarding: Record<string, string>
    campaigns: Record<string, Record<string, string>>
  }>({ onboarding: {}, campaigns: {} })
  const [organizationInviteCodes, setOrganizationInviteCodes] = useState<{
    admin?: string
    member?: string
  }>({})

  // Modal states
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [organizationModalOpen, setOrganizationModalOpen] = useState(false)
  const [inviteTeamModalOpen, setInviteTeamModalOpen] = useState(false)
  const [createCampaignModalOpen, setCreateCampaignModalOpen] = useState(false)

  // FLICKER FIX: Track if we've ever successfully loaded task completion data
  const hasEverLoadedTaskCompletions = useRef(false)
  const hasRunInitialFetch = useRef(false)
  const hasRunInitialTaskCheck = useRef(false)
  // Note: hasEverLoadedTaskCompletions is now set in fetchTaskCompletions
  // This fallback check is kept for backwards compatibility
  if (taskCompletions.onboarding && Object.keys(taskCompletions.onboarding).length > 0) {
    hasEverLoadedTaskCompletions.current = true
  }

  // Fetch organization invite codes
  const fetchOrganizationInviteCodes = useCallback(async () => {
    if (!customClaims?.organizationId || !userProfile) return

    try {
      const org = await getOrCreateOrganization(
        customClaims.organizationId,
        userProfile.email,
        userProfile.uid,
        userProfile.displayName ? `${userProfile.displayName}'s Organization` : undefined
      )

      if (org?.inviteCodes) {
        setOrganizationInviteCodes({
          admin: org.inviteCodes.admin,
          member: org.inviteCodes.member
        })
      }
    } catch (error) {
      secureLogger.error('Error fetching organization invite codes', error instanceof Error ? error : new Error(String(error)))
    }
  }, [customClaims?.organizationId, userProfile])

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
          onboarding: result.completions?.onboarding || {},
          campaigns: result.completions?.campaigns || {}
        })
        // Mark that we've loaded task completions (even if empty)
        hasEverLoadedTaskCompletions.current = true
      }
    } catch (error) {
      secureLogger.error('Error fetching task completions', error instanceof Error ? error : new Error(String(error)))
      // Even on error, mark as loaded to prevent infinite loading
      hasEverLoadedTaskCompletions.current = true
    }
  }, [user])

  // Helper function to determine status
  const getTaskStatus = useCallback((taskId: string, isAutomaticallyComplete: boolean): 'not_started' | 'in_progress' | 'complete' => {
    // If manually set in Firestore, use that status (check if key exists, not if value is truthy)
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
    if (!userProfile || !customClaims?.organizationId) return

    const automaticTaskCompletions = {
      profile: false,
      organization: false,
      team: false,
      campaign: false
    }

    // Check profile completion
    if (userProfile.displayName && userProfile.phoneNumber) {
      automaticTaskCompletions.profile = true
    }

    // Check organization completion - simplified check
    // We'll mark it as complete if it's been manually marked complete
    // This avoids the 403 error from the organizations/status endpoint
    automaticTaskCompletions.organization = false

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
          automaticTaskCompletions.team = true
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
          automaticTaskCompletions.campaign = true
        }
      }
    } catch (error) {
      secureLogger.error('Error checking campaign status', error, {
        userId: userProfile.uid
      })
    }


    // Create tasks array
    const newTasks: NonprofitTask[] = [
      {
        id: 'profile',
        title: 'Complete User Profile',
        description: 'Fill out your personal information including name and phone number',
        status: getTaskStatus('profile', automaticTaskCompletions.profile),
        action: () => setProfileModalOpen(true),
        icon: User
      },
      {
        id: 'organization',
        title: 'Complete Organization Information',
        description: 'Add organization name, EIN, website, city, state, and phone number',
        status: getTaskStatus('organization', automaticTaskCompletions.organization),
        action: () => setOrganizationModalOpen(true),
        icon: Building2
      },
      {
        id: 'team',
        title: 'Invite Internal Team Members',
        description: 'Invite team members to collaborate on your campaigns',
        status: getTaskStatus('team', automaticTaskCompletions.team),
        action: () => setInviteTeamModalOpen(true),
        icon: Users
      },
      {
        id: 'campaign',
        title: 'Create a Campaign',
        description: 'Set up your first fundraising campaign',
        status: getTaskStatus('campaign', automaticTaskCompletions.campaign),
        action: () => setCreateCampaignModalOpen(true),
        icon: PlusCircle
      }
    ]

    setTasks(newTasks)
    setLoading(false)
  }, [user, userProfile, customClaims, getTaskStatus])

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

      // For each campaign, create the 3 setup tasks
      const campaignSummaries: CampaignTaskSummary[] = campaigns.map((campaign) => {
        const campaignKey = campaign.id
        const campaignCompletions = (taskCompletions.campaigns && taskCompletions.campaigns[campaignKey]) || {}

        return {
          campaignId: campaign.id,
          campaignTitle: campaign.title,
          tasks: [
            {
              id: 'marketing',
              title: 'Create Marketing Materials',
              description: 'Set up your campaign description, images, and story to attract donors.',
              status: (campaignCompletions['marketing'] as 'not_started' | 'in_progress' | 'complete') || 'not_started'
            },
            {
              id: 'team',
              title: 'Invite Internal Team Members',
              description: 'Add team members from your organization to help manage this campaign.',
              status: (campaignCompletions['team'] as 'not_started' | 'in_progress' | 'complete') || 'not_started'
            },
            {
              id: 'donors',
              title: 'Invite Donors',
              description: 'Start inviting potential donors to your campaign.',
              status: (campaignCompletions['donors'] as 'not_started' | 'in_progress' | 'complete') || 'not_started'
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
  }, [customClaims?.organizationId, userProfile?.uid, taskCompletions])

  // Fetch initial data once on mount
  useEffect(() => {
    if (user && userProfile && customClaims?.organizationId && !hasRunInitialFetch.current) {
      hasRunInitialFetch.current = true

      // Fetch task completions, then check automatic completions
      fetchTaskCompletions()

      // Fetch other data in parallel
      fetchCampaignTasks()
      fetchBlockedDonationTasks()
      fetchOrganizationInviteCodes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userProfile, customClaims?.organizationId])

  // Run checkTaskCompletion whenever taskCompletions changes
  useEffect(() => {
    // Check if we've loaded task completions (even if empty)
    // The hasEverLoadedTaskCompletions ref will be set to true after fetchTaskCompletions runs
    if (hasEverLoadedTaskCompletions.current && user && userProfile && customClaims?.organizationId) {
      // Mark that we've run at least once
      if (!hasRunInitialTaskCheck.current) {
        hasRunInitialTaskCheck.current = true
      }
      // Always run checkTaskCompletion when taskCompletions changes
      // This ensures UI updates when tasks are completed
      checkTaskCompletion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskCompletions, user, userProfile, customClaims?.organizationId])

  // Set initial tab based on onboarding completion - BEFORE first paint to prevent flicker
  // Use useLayoutEffect to run synchronously before browser paints
  useLayoutEffect(() => {
    if (!hasSetInitialTab && tasks.length > 0 && hasEverLoadedTaskCompletions.current) {
      const allComplete = tasks.every(task => task.status === 'complete')
      if (allComplete && campaignTasks.length > 0) {
        setActiveTab('campaigns')
      }
      setHasSetInitialTab(true)
    }
  }, [tasks, hasSetInitialTab, campaignTasks.length])

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

      // Refresh task completion status
      await fetchTaskCompletions()
      checkTaskCompletion()
    } catch (error) {
      throw error // Re-throw to let the modal handle it
    }
  }

  const handleModalComplete = async (taskId: string) => {
    // Close the modal immediately
    if (taskId === 'profile') setProfileModalOpen(false)
    if (taskId === 'organization') setOrganizationModalOpen(false)
    if (taskId === 'team') setInviteTeamModalOpen(false)
    if (taskId === 'campaign') setCreateCampaignModalOpen(false)

    // Refresh data and fetch task completions from Firestore
    // checkTaskCompletion() will be called automatically by useEffect when taskCompletions updates
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

  const handleResetTasks = async () => {
    if (!userProfile || !user) return

    // Reset task completions in Firestore by setting all to not_started
    try {
      const token = await user.getIdToken()

      // Reset onboarding tasks
      for (const taskId of ['profile', 'organization', 'team', 'campaign']) {
        await fetch('/api/tasks/completion', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            taskType: 'onboarding',
            taskId,
            status: 'not_started'
          })
        })
      }

      // Refresh task completions
      await fetchTaskCompletions()
      checkTaskCompletion()
    } catch (error) {
      secureLogger.error('Error resetting task completions', error instanceof Error ? error : new Error(String(error)))
    }

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

  const completedTasks = tasks.filter(task => task.status === 'complete').length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  // FLICKER FIX: Detect race condition gap
  // Wait for initial task completion data to load before showing content
  const waitingForInitialLoad = user && userProfile && customClaims?.organizationId &&
    !hasEverLoadedTaskCompletions.current &&
    Object.keys(taskCompletions.onboarding).length === 0

  // Wait for initial tab to be set to prevent flickering between tabs
  // Don't show content until we've determined the correct initial tab
  const waitingForInitialTab = !hasSetInitialTab && tasks.length > 0

  // Combine all loading conditions
  const showLoadingScreen = loading || waitingForInitialLoad || waitingForInitialTab

  if (showLoadingScreen) {
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
                  onClick={() => {
                    if (campaignTasks.length > 0) {
                      setActiveTab('campaigns')
                    }
                  }}
                  disabled={campaignTasks.length === 0}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 inline-flex items-center gap-2 ${
                    activeTab === 'campaigns'
                      ? 'border-blue-500 text-blue-600'
                      : campaignTasks.length === 0
                      ? 'border-transparent text-gray-400 cursor-not-allowed opacity-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  title={campaignTasks.length === 0 ? 'Create a campaign first to unlock this tab' : ''}
                >
                  {campaignTasks.length === 0 && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  Campaign Tasks
                  {campaignTasks.length > 0 && (() => {
                    const totalIncompleteTasks = campaignTasks.reduce((sum, c) => {
                      return sum + c.tasks.filter(t => t.status !== 'complete').length
                    }, 0)
                    return totalIncompleteTasks > 0 ? (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {totalIncompleteTasks}
                      </span>
                    ) : null
                  })()}
                </button>
                <button
                  onClick={() => {
                    if (blockedDonationTasks.length > 0) {
                      setActiveTab('donations')
                    }
                  }}
                  disabled={blockedDonationTasks.length === 0}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 inline-flex items-center gap-2 ${
                    activeTab === 'donations'
                      ? 'border-blue-500 text-blue-600'
                      : blockedDonationTasks.length === 0
                      ? 'border-transparent text-gray-400 cursor-not-allowed opacity-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  title={blockedDonationTasks.length === 0 ? 'Start accepting donations to unlock this tab' : ''}
                >
                  {blockedDonationTasks.length === 0 && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  )}
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
                    const incompleteTasks = campaign.tasks.filter(t => t.status !== 'complete')

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
                                    <div className={`w-2 h-2 rounded-full ${
                                      task.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
                                    }`}></div>
                                    <span>{task.title}</span>
                                    {task.status === 'in_progress' && (
                                      <span className="text-xs text-blue-600">(in progress)</span>
                                    )}
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
          onComplete={() => handleModalComplete('team')}
          inviteCodes={organizationInviteCodes}
        />
        
        <CreateCampaignModal
          isOpen={createCampaignModalOpen}
          onClose={() => setCreateCampaignModalOpen(false)}
          onSuccess={(campaignId: string) => {
            handleModalComplete('campaign')
            setCreateCampaignModalOpen(false)
            // Navigate to the newly created campaign
            router.push(`/campaigns/${campaignId}`)
          }}
          organizationId={customClaims?.organizationId || ''}
          userId={userProfile?.uid || ''}
          />
        </div>
      </NonprofitAdminRoute>
    </PageErrorBoundary>
  )
}