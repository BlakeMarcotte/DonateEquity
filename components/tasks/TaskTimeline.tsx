'use client'

import { Task } from '@/types/task'
import { CheckCircle, Clock, AlertCircle, Lock } from 'lucide-react'

interface TaskTimelineProps {
  tasks: Task[]
}

export function TaskTimeline({ tasks }: TaskTimelineProps) {
  // Sort tasks by order field to maintain consistent workflow sequence
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.order && b.order) {
      return a.order - b.order
    }
    // Fallback to creation date for backwards compatibility
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
    return aTime - bTime
  })

  const completedTasks = sortedTasks.filter(task => task.status === 'completed').length
  const totalTasks = sortedTasks.length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const getStepStatus = (index: number, task: Task) => {
    if (task.status === 'completed') return 'completed'
    if (task.status === 'in_progress') return 'current'
    if (task.status === 'blocked') return 'blocked'
    return 'upcoming'
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-white" />
      case 'current':
        return <Clock className="w-4 h-4 text-white" />
      case 'blocked':
        return <Lock className="w-4 h-4 text-white" />
      default:
        return <div className="w-2 h-2 bg-white rounded-full" />
    }
  }

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-600'
      case 'current':
        return 'bg-blue-600'
      case 'blocked':
        return 'bg-gray-400'
      default:
        return 'bg-gray-300'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'donor':
        return 'text-blue-600'
      case 'nonprofit_admin':
        return 'text-green-600'
      case 'appraiser':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'donor':
        return 'Donor'
      case 'nonprofit_admin':
        return 'Nonprofit'
      case 'appraiser':
        return 'Appraiser'
      default:
        return role
    }
  }

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Donation Progress</h3>
          <div className="text-sm text-gray-600">
            {completedTasks} of {totalTasks} steps completed
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

    </div>
  )
}