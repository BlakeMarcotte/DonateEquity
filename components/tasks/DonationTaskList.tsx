'use client'

import { useState } from 'react'
import { useDonationTasks } from '@/hooks/useDonationTasks'
import { useAuth } from '@/contexts/AuthContext'
import { Task } from '@/types/task'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle, Clock, AlertCircle, Lock, Mail, RotateCcw } from 'lucide-react'
import { AppraiserInvitationForm } from './AppraiserInvitationForm'
import { Modal } from '@/components/ui/modal'

interface DonationTaskListProps {
  donationId: string
  campaignId?: string
  showAllTasks?: boolean // Show tasks for all roles (admin view)
}

export function DonationTaskList({ donationId, campaignId, showAllTasks = false }: DonationTaskListProps) {
  const { user, customClaims } = useAuth()
  const { tasks, loading, completeTask, updateTaskStatus } = useDonationTasks(donationId)
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set())
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [resettingTasks, setResettingTasks] = useState(false)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Filter tasks based on user role if not showing all tasks
  const filteredTasks = showAllTasks 
    ? tasks 
    : tasks.filter(task => task.assignedTo === user?.uid || task.assignedRole === customClaims?.role)

  // Sort tasks by creation date to maintain workflow order instead of grouping by role
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
    return aTime - bTime
  })

  const handleCompleteTask = async (taskId: string) => {
    if (completingTasks.has(taskId)) return

    // Check if this is an invitation task
    const task = tasks.find(t => t.id === taskId)
    if (task?.type === 'invitation') {
      setShowInvitationModal(true)
      return
    }

    setCompletingTasks(prev => new Set(prev).add(taskId))
    
    try {
      await completeTask(taskId)
    } catch (error) {
      console.error('Failed to complete task:', error)
      // Handle error - could show toast notification
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleInvitationSuccess = () => {
    setShowInvitationModal(false)
    // The useDonationTasks hook should automatically refresh and show the task as completed
  }

  const handleResetTasks = async () => {
    if (resettingTasks) return
    
    if (!confirm('Are you sure you want to reset all tasks? This will delete all current progress and start the workflow from the beginning.')) {
      return
    }

    setResettingTasks(true)
    
    try {
      const token = await user?.getIdToken()
      
      const response = await fetch(`/api/donations/${donationId}/reset-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset tasks')
      }

      // The useDonationTasks hook should automatically refresh the tasks
      console.log('Tasks reset successfully:', result.message)
      
    } catch (err) {
      console.error('Error resetting tasks:', err)
      alert(err instanceof Error ? err.message : 'Failed to reset tasks')
    } finally {
      setResettingTasks(false)
    }
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'blocked':
        return <Lock className="h-5 w-5 text-gray-400" />
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'in_progress':
        return 'bg-blue-50 border-blue-200'
      case 'blocked':
        return 'bg-gray-50 border-gray-200'
      case 'pending':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-white border-gray-200'
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'donor':
        return 'Donor Tasks'
      case 'nonprofit_admin':
        return 'Nonprofit Tasks'
      case 'appraiser':
        return 'Appraiser Tasks'
      default:
        return `${role} Tasks`
    }
  }

  const canCompleteTask = (task: Task) => {
    return (
      task.status !== 'completed' && 
      task.status !== 'blocked' &&
      (task.assignedTo === user?.uid || (task.assignedTo?.startsWith('mock-') && task.assignedRole === customClaims?.role))
    )
  }

  // Tasks should always exist since they're created automatically with donations
  if (filteredTasks.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading tasks...</h3>
          <p>Your donation tasks are being loaded.</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {showAllTasks ? 'Donation Workflow Tasks' : 'Your Tasks'}
        </h2>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {sortedTasks.filter(t => t.status === 'completed').length} of {sortedTasks.length} completed
          </div>
          {/* Reset button - only show for donors */}
          {customClaims?.role === 'donor' && (
            <Button
              onClick={handleResetTasks}
              disabled={resettingTasks}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {resettingTasks ? (
                <>
                  <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                  Resetting...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Tasks
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sortedTasks.map((task, index) => (
          <div key={task.id}>
            <Card className={`p-4 ${getStatusColor(task.status)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 mb-2">
                      {index + 1}
                    </div>
                    {getStatusIcon(task.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {task.title}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        task.assignedRole === 'donor' ? 'bg-blue-100 text-blue-800' :
                        task.assignedRole === 'nonprofit_admin' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {getRoleDisplayName(task.assignedRole).replace(' Tasks', '')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {task.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        Priority: <span className={`ml-1 font-medium ${
                          task.priority === 'high' ? 'text-red-600' :
                          task.priority === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {task.priority}
                        </span>
                      </span>
                      {task.status === 'blocked' && (
                        <span className="text-gray-400">Waiting for previous task</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  {canCompleteTask(task) ? (
                    <Button
                      size="sm"
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={completingTasks.has(task.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {completingTasks.has(task.id) ? (
                        <>
                          <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Completing...
                        </>
                      ) : task.type === 'invitation' ? (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Invitation
                        </>
                      ) : (
                        'Complete Task'
                      )}
                    </Button>
                  ) : task.status === 'completed' ? (
                    <div className="flex items-center text-green-600 text-sm font-medium">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Completed
                    </div>
                  ) : task.status === 'blocked' ? (
                    <div className="flex items-center text-gray-400 text-sm">
                      <Lock className="h-4 w-4 mr-1" />
                      Blocked
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Assigned to {getRoleDisplayName(task.assignedRole).replace(' Tasks', '')}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Invitation Modal */}
      <Modal
        isOpen={showInvitationModal}
        onClose={() => setShowInvitationModal(false)}
        title="Invite Appraiser to Platform"
        size="md"
      >
        <AppraiserInvitationForm
          donationId={donationId}
          onSuccess={handleInvitationSuccess}
        />
      </Modal>
    </div>
  )
}