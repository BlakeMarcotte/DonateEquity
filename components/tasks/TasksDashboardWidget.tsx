'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useUserTasks } from '@/hooks/useUserTasks'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function TasksDashboardWidget() {
  const { user, customClaims } = useAuth()
  const { tasks, pendingTasks, completedTasks, loading } = useUserTasks(
    user?.uid || null, 
    customClaims?.role === 'appraiser' ? 'appraiser' : undefined
  )

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Tasks</h3>
        <div className="text-center text-gray-500 py-8">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No tasks assigned yet</p>
          <p className="text-sm">Tasks will appear when you make or receive donations</p>
        </div>
      </Card>
    )
  }

  const tasksToShow = tasks.slice(0, 3) // Show first 3 tasks

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">My Tasks</h3>
        <div className="text-sm text-gray-500">
          {completedTasks.length} of {tasks.length} completed
        </div>
      </div>

      {/* Task Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{pendingTasks.length}</div>
          <div className="text-xs text-gray-500">Pending</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{tasks.filter(t => t.status === 'in_progress').length}</div>
          <div className="text-xs text-gray-500">In Progress</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="space-y-3 mb-4">
        {tasksToShow.map(task => (
          <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {task.status === 'completed' ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : task.status === 'blocked' ? (
                <AlertCircle className="h-4 w-4 text-gray-400" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-600" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">{task.title}</div>
                <div className="text-xs text-gray-500">
                  {task.type.replace('_', ' ')} • {task.priority} priority
                </div>
              </div>
            </div>
            {task.donationId && (
              <Link href={`/donations/${task.donationId}/tasks`}>
                <Button size="sm" variant="ghost">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* View All Link */}
      {tasks.length > 3 && (
        <div className="text-center">
          <Button variant="outline" size="sm">
            View All Tasks ({tasks.length})
          </Button>
        </div>
      )}
    </Card>
  )
}