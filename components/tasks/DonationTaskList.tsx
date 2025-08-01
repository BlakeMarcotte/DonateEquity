'use client'

import { useState } from 'react'
import { useDonationTasks } from '@/hooks/useDonationTasks'
import { useAuth } from '@/contexts/AuthContext'
import { Task } from '@/types/task'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle, Clock, AlertCircle, Lock } from 'lucide-react'

interface DonationTaskListProps {
  donationId: string
  campaignId?: string
  showAllTasks?: boolean // Show tasks for all roles (admin view)
}

export function DonationTaskList({ donationId, campaignId, showAllTasks = false }: DonationTaskListProps) {
  const { user, customClaims } = useAuth()
  const { tasks, loading, completeTask, updateTaskStatus } = useDonationTasks(donationId)
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set())

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

  // Group tasks by role for better organization
  const tasksByRole = filteredTasks.reduce((acc, task) => {
    const role = task.assignedRole
    if (!acc[role]) acc[role] = []
    acc[role].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  const handleCompleteTask = async (taskId: string) => {
    if (completingTasks.has(taskId)) return

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

  if (filteredTasks.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
          <p>Tasks will appear here once the donation workflow begins.</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {showAllTasks ? 'All Donation Tasks' : 'Your Tasks'}
        </h2>
        <div className="text-sm text-gray-500">
          {filteredTasks.filter(t => t.status === 'completed').length} of {filteredTasks.length} completed
        </div>
      </div>

      {Object.entries(tasksByRole).map(([role, roleTasks]) => (
        <div key={role} className="space-y-3">
          {showAllTasks && (
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              {getRoleDisplayName(role)}
            </h3>
          )}
          
          {roleTasks.map(task => (
            <Card key={task.id} className={`p-4 ${getStatusColor(task.status)}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getStatusIcon(task.status)}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      {task.title}
                    </h4>
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
                      {showAllTasks && (
                        <span>Assigned to: {getRoleDisplayName(task.assignedRole)}</span>
                      )}
                      {task.status === 'blocked' && (
                        <span className="text-gray-400">Waiting for dependencies</span>
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
                      Assigned to {task.assignedRole}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}