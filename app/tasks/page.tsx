'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  User,
  Building2,
  Users,
  PlusCircle,
  ArrowRight,
  FileText
} from 'lucide-react'

interface NonprofitTask {
  id: string
  title: string
  description: string
  isComplete: boolean
  action: () => void
  icon: React.ComponentType<{ className?: string }>
}

export default function NonprofitDashboardPage() {
  const { user, userProfile, customClaims } = useAuth()
  const router = useRouter()
  const [tasks, setTasks] = useState<NonprofitTask[]>([])
  const [loading, setLoading] = useState(true)

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

    // Check organization completion
    try {
      const token = await user?.getIdToken()
      const orgResponse = await fetch('/api/organizations/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        const org = orgData.organization
        if (org?.name && org?.taxId && org?.website && org?.address?.city && org?.address?.state && org?.phone) {
          taskCompletions.organization = true
        }
      }
    } catch (error) {
      console.error('Error checking organization status:', error)
    }

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
      console.error('Error checking team status:', error)
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
      console.error('Error checking campaign status:', error)
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
        action: () => router.push('/profile?from=tasks'),
        icon: User
      },
      {
        id: 'organization',
        title: 'Complete Organization Information',
        description: 'Add organization name, EIN, website, city, state, and phone number',
        isComplete: taskCompletions.organization || manualCompletions.organization || false,
        action: () => router.push('/organization?from=tasks'),
        icon: Building2
      },
      {
        id: 'team',
        title: 'Invite Internal Team Members',
        description: 'Invite team members to collaborate on your campaigns',
        isComplete: taskCompletions.team || manualCompletions.team || false,
        action: () => router.push('/organization?tab=team&from=tasks'),
        icon: Users
      },
      {
        id: 'campaign',
        title: 'Create a Campaign',
        description: 'Set up your first fundraising campaign',
        isComplete: taskCompletions.campaign || manualCompletions.campaign || false,
        action: () => router.push('/campaigns'),
        icon: PlusCircle
      }
    ]

    setTasks(newTasks)
    setLoading(false)
  }, [user, userProfile, customClaims, router])

  useEffect(() => {
    if (user && userProfile && customClaims?.organizationId) {
      checkTaskCompletion()
    }
  }, [user, userProfile, customClaims, checkTaskCompletion])

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


  const completedTasks = tasks.filter(task => task.isComplete).length
  const totalTasks = tasks.length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <NonprofitAdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Getting Started</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Complete these tasks to set up your nonprofit account
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
                ? "🎉 Great job! You've completed all setup tasks. You're ready to start fundraising!"
                : `${totalTasks - completedTasks} task${totalTasks - completedTasks === 1 ? '' : 's'} remaining to complete your setup.`
              }
            </p>
          </div>

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
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Complete
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600">{task.description}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        {!task.isComplete && (
                          <button
                            onClick={() => handleMarkComplete(task.id)}
                            className="inline-flex items-center space-x-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg transition-colors duration-200"
                            title="Mark this task as complete"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Mark Complete</span>
                          </button>
                        )}
                        
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

          {/* Next Steps */}
          {completedTasks === totalTasks && (
            <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow p-6 text-white">
              <h3 className="text-xl font-semibold mb-2">🎉 Setup Complete!</h3>
              <p className="mb-4">
                Congratulations! You&apos;ve completed all the setup tasks. You&apos;re now ready to manage your campaigns and start fundraising.
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={() => router.push('/campaigns')}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  <span>View All Campaigns</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => router.push('/campaigns/create')}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-800 hover:bg-blue-900 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create New Campaign</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </NonprofitAdminRoute>
  )
}