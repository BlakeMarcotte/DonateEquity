'use client'

import { Task } from '@/types/task'

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


  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 mb-6">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">Donation Progress</h3>
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-500">
              {completedTasks} of {totalTasks} completed
            </div>
            <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              {Math.round(progressPercentage)}%
            </div>
          </div>
        </div>
        {/* Enhanced Progress bar */}
        <div className="relative">
          <div className="w-full bg-gray-100 rounded-full h-2 shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500 ease-out shadow-sm relative overflow-hidden"
              style={{ width: `${progressPercentage}%` }}
            >
              {progressPercentage > 15 && (
                <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                  <div className="w-1 h-1 bg-white rounded-full opacity-80"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}