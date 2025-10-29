'use client'

import { useState } from 'react'
import PageErrorBoundary from '@/components/error/PageErrorBoundary'

interface Task {
  id: string
  title: string
  description: string
  role: 'nonprofit' | 'donor' | 'appraiser'
  status: 'completed' | 'active' | 'upcoming'
  dependencies?: string[]
  taskNumber: number
}

// Donation workflow tasks - 5 per role
const DONATION_TASKS: Task[] = [
  // Nonprofit Tasks
  {
    id: 'n1',
    taskNumber: 1,
    title: 'Sign NDA',
    description: 'Sign Non-Disclosure Agreement via DocuSign',
    role: 'nonprofit',
    status: 'upcoming'
  },
  {
    id: 'n2',
    taskNumber: 2,
    title: 'Review Campaign Details',
    description: 'Verify campaign information and donation terms',
    role: 'nonprofit',
    status: 'upcoming',
    dependencies: ['n1']
  },
  {
    id: 'n3',
    taskNumber: 3,
    title: 'Upload IRS Documentation',
    description: 'Upload 501(c)(3) determination letter and recent Form 990',
    role: 'nonprofit',
    status: 'upcoming',
    dependencies: ['n2']
  },
  {
    id: 'n4',
    taskNumber: 4,
    title: 'Review Donor Commitment',
    description: 'Review and acknowledge the donor\'s commitment amount',
    role: 'nonprofit',
    status: 'upcoming',
    dependencies: ['n3', 'd5'] // Blocked until donor sets commitment amount
  },
  {
    id: 'n5',
    taskNumber: 5,
    title: 'Sign Final Acceptance Agreement',
    description: 'DocuSign signature on final donation acceptance',
    role: 'nonprofit',
    status: 'upcoming',
    dependencies: ['n4', 'd5'] // Blocked until donor completes their workflow
  },

  // Donor Tasks
  {
    id: 'd1',
    taskNumber: 1,
    title: 'Sign NDA',
    description: 'Sign Non-Disclosure Agreement via DocuSign',
    role: 'donor',
    status: 'upcoming'
  },
  {
    id: 'd2',
    taskNumber: 2,
    title: 'Invite Appraiser',
    description: 'Send invitation to appraiser to join the platform',
    role: 'donor',
    status: 'upcoming',
    dependencies: ['d1']
  },
  {
    id: 'd3',
    taskNumber: 3,
    title: 'Upload Equity Documents',
    description: 'Provide stock certificates, cap table, and company financials',
    role: 'donor',
    status: 'upcoming',
    dependencies: ['d2']
  },
  {
    id: 'd4',
    taskNumber: 4,
    title: 'Review & Accept Appraisal',
    description: 'Review the valuation report from appraiser',
    role: 'donor',
    status: 'upcoming',
    dependencies: ['d3', 'a5'] // Blocked until appraiser submits valuation
  },
  {
    id: 'd5',
    taskNumber: 5,
    title: 'Set Commitment Amount',
    description: 'Define the equity shares/percentage to donate based on appraisal',
    role: 'donor',
    status: 'upcoming',
    dependencies: ['d4']
  },

  // Appraiser Tasks
  {
    id: 'a1',
    taskNumber: 1,
    title: 'Sign NDA',
    description: 'Sign Non-Disclosure Agreement via DocuSign',
    role: 'appraiser',
    status: 'upcoming'
  },
  {
    id: 'a2',
    taskNumber: 2,
    title: 'Review Donation Documents',
    description: 'Review documents uploaded by donor',
    role: 'appraiser',
    status: 'upcoming',
    dependencies: ['a1', 'd3'] // Blocked until donor uploads documents
  },
  {
    id: 'a3',
    taskNumber: 3,
    title: 'Request Additional Information',
    description: 'If needed, request more documents or clarification',
    role: 'appraiser',
    status: 'upcoming',
    dependencies: ['a2']
  },
  {
    id: 'a4',
    taskNumber: 4,
    title: 'Conduct Equity Valuation',
    description: 'Perform the appraisal analysis',
    role: 'appraiser',
    status: 'upcoming',
    dependencies: ['a3']
  },
  {
    id: 'a5',
    taskNumber: 5,
    title: 'Submit Valuation Report',
    description: 'Upload final appraisal report and valuation amount',
    role: 'appraiser',
    status: 'upcoming',
    dependencies: ['a4']
  },
]

function DonationRoadmapTestContent() {
  const [tasks, setTasks] = useState<Task[]>(DONATION_TASKS)

  // Helper function to check if a task's dependencies are met
  const areDependenciesMet = (task: Task, currentTasks: Task[]): boolean => {
    if (!task.dependencies || task.dependencies.length === 0) return true

    return task.dependencies.every(depId => {
      const depTask = currentTasks.find(t => t.id === depId)
      return depTask?.status === 'completed'
    })
  }

  // Find next task to complete for a specific role
  const getNextTaskForRole = (role: 'nonprofit' | 'donor' | 'appraiser'): Task | null => {
    const availableTasks = tasks.filter(t =>
      t.role === role && t.status === 'upcoming' && areDependenciesMet(t, tasks)
    )
    return availableTasks[0] || null
  }

  // Get blocker info for any task
  const getTaskBlockers = (task: Task, allTasks: Task[]): { taskId: string; title: string; role: string; taskNumber: number }[] => {
    if (!task.dependencies || task.status === 'completed') {
      return []
    }

    return task.dependencies
      .map(depId => {
        const depTask = allTasks.find(t => t.id === depId)
        if (depTask && depTask.status !== 'completed' && depTask.role !== task.role) {
          return {
            taskId: depTask.id,
            title: depTask.title,
            role: depTask.role,
            taskNumber: depTask.taskNumber
          }
        }
        return null
      })
      .filter(blocker => blocker !== null) as { taskId: string; title: string; role: string; taskNumber: number }[]
  }

  // Find last completed task for a specific role
  const getLastCompletedTaskForRole = (role: 'nonprofit' | 'donor' | 'appraiser'): Task | null => {
    const completed = tasks.filter(t => t.role === role && t.status === 'completed')
    return completed[completed.length - 1] || null
  }

  // Advance to next task for a specific role
  const handleNextForRole = (role: 'nonprofit' | 'donor' | 'appraiser') => {
    const nextTask = getNextTaskForRole(role)
    if (!nextTask) return

    setTasks(tasks.map(t =>
      t.id === nextTask.id ? { ...t, status: 'completed' } : t
    ))
  }

  // Go back to previous task for a specific role
  const handlePreviousForRole = (role: 'nonprofit' | 'donor' | 'appraiser') => {
    const lastCompleted = getLastCompletedTaskForRole(role)
    if (!lastCompleted) return

    setTasks(tasks.map(t =>
      t.id === lastCompleted.id ? { ...t, status: 'upcoming' } : t
    ))
  }

  // Reset all tasks
  const handleReset = () => {
    setTasks(DONATION_TASKS)
  }

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length

  // Get stats for each role
  const nonprofitCompleted = tasks.filter(t => t.role === 'nonprofit' && t.status === 'completed').length
  const donorCompleted = tasks.filter(t => t.role === 'donor' && t.status === 'completed').length
  const appraiserCompleted = tasks.filter(t => t.role === 'appraiser' && t.status === 'completed').length

  const nextNonprofitTask = getNextTaskForRole('nonprofit')
  const nextDonorTask = getNextTaskForRole('donor')
  const nextAppraiserTask = getNextTaskForRole('appraiser')

  const nonprofitTasks = tasks.filter(t => t.role === 'nonprofit')
  const donorTasks = tasks.filter(t => t.role === 'donor')
  const appraiserTasks = tasks.filter(t => t.role === 'appraiser')

  const roleColors = {
    nonprofit: { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700', line: 'bg-pink-300', primary: '#ec4899' },
    donor: { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700', line: 'bg-amber-300', primary: '#f59e0b' },
    appraiser: { bg: 'bg-violet-100', border: 'border-violet-400', text: 'text-violet-700', line: 'bg-violet-300', primary: '#8b5cf6' },
  }

  const blockerRoleColors = {
    nonprofit: { bg: 'bg-pink-500', text: 'text-pink-50' },
    donor: { bg: 'bg-amber-500', text: 'text-amber-50' },
    appraiser: { bg: 'bg-violet-500', text: 'text-violet-50' },
  }

  const renderTaskNode = (task: Task, index: number, tasksInRole: Task[]) => {
    const colors = roleColors[task.role]
    const isLast = index === tasksInRole.length - 1
    const blockers = getTaskBlockers(task, tasks)
    const isBlocked = blockers.length > 0

    return (
      <div key={task.id} className="flex items-center" id={`task-${task.id}`}>
        <div className="relative">
          {/* Node */}
          <div
            className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 w-64 shadow-md hover:shadow-xl transition-shadow cursor-pointer relative ${
              task.status === 'completed' ? 'opacity-100' : task.status === 'active' ? 'opacity-90 ring-4 ring-blue-400 ring-opacity-50' : 'opacity-60'
            }`}
          >
            <div className="flex items-start gap-2">
              {/* Status indicator */}
              <div className="mt-1">
                {task.status === 'completed' && (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {task.status === 'active' && (
                  <svg className="w-5 h-5 text-blue-600 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                  </svg>
                )}
                {task.status === 'upcoming' && !isBlocked && (
                  <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                  </svg>
                )}
                {task.status === 'upcoming' && isBlocked && (
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold ${colors.text}`}>Step {task.taskNumber}</span>
                </div>
                <h3 className={`font-semibold ${colors.text} text-sm`}>{task.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{task.description}</p>
              </div>
            </div>

            {/* Blocker badges */}
            {isBlocked && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Blocked by:
                </div>
                <div className="flex flex-wrap gap-1">
                  {blockers.map((blocker, idx) => {
                    const blockerColors = blockerRoleColors[blocker.role as keyof typeof blockerRoleColors]
                    return (
                      <div
                        key={idx}
                        className={`${blockerColors.bg} ${blockerColors.text} px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1`}
                      >
                        <span className="capitalize font-bold">{blocker.role.charAt(0).toUpperCase()}</span>
                        <span>Step {blocker.taskNumber}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Connection line to next task in same role */}
          {!isLast && (
            <div className={`absolute left-1/2 top-full w-0.5 h-8 ${colors.line} transform -translate-x-1/2`} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Donation Workflow Roadmap</h1>
          <p className="text-slate-600">5-step workflow for each role in the donation process</p>
        </div>

        {/* Simulation Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Role Simulation Controls</h2>
              <p className="text-sm text-slate-600">Control each role independently. Blocked tasks will show visual indicators.</p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset All
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Nonprofit Controls */}
            <div className="border-2 border-pink-200 rounded-lg p-4 bg-pink-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-lg">
                  N
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Nonprofit</h3>
                  <p className="text-xs text-slate-600">{nonprofitCompleted} / 5 tasks</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs font-medium text-slate-600 mb-1">Next Task:</div>
                <div className="text-xs font-semibold text-pink-700 min-h-[32px]">
                  {nextNonprofitTask ? nextNonprofitTask.title : '✓ All Complete!'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePreviousForRole('nonprofit')}
                  disabled={nonprofitCompleted === 0}
                  className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded text-sm font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => handleNextForRole('nonprofit')}
                  disabled={!nextNonprofitTask}
                  className="flex-1 px-3 py-2 bg-pink-600 text-white rounded text-sm font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>

              <div className="mt-3 w-full bg-pink-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-pink-600 transition-all duration-500"
                  style={{ width: `${(nonprofitCompleted / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Donor Controls */}
            <div className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-lg">
                  D
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Donor</h3>
                  <p className="text-xs text-slate-600">{donorCompleted} / 5 tasks</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs font-medium text-slate-600 mb-1">Next Task:</div>
                <div className="text-xs font-semibold text-amber-700 min-h-[32px]">
                  {nextDonorTask ? nextDonorTask.title : '✓ All Complete!'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePreviousForRole('donor')}
                  disabled={donorCompleted === 0}
                  className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded text-sm font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => handleNextForRole('donor')}
                  disabled={!nextDonorTask}
                  className="flex-1 px-3 py-2 bg-amber-600 text-white rounded text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>

              <div className="mt-3 w-full bg-amber-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-amber-600 transition-all duration-500"
                  style={{ width: `${(donorCompleted / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Appraiser Controls */}
            <div className="border-2 border-violet-200 rounded-lg p-4 bg-violet-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-lg">
                  A
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Appraiser</h3>
                  <p className="text-xs text-slate-600">{appraiserCompleted} / 5 tasks</p>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-xs font-medium text-slate-600 mb-1">Next Task:</div>
                <div className="text-xs font-semibold text-violet-700 min-h-[32px]">
                  {nextAppraiserTask ? nextAppraiserTask.title : '✓ All Complete!'}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePreviousForRole('appraiser')}
                  disabled={appraiserCompleted === 0}
                  className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded text-sm font-medium hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => handleNextForRole('appraiser')}
                  disabled={!nextAppraiserTask}
                  className="flex-1 px-3 py-2 bg-violet-600 text-white rounded text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>

              <div className="mt-3 w-full bg-violet-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-violet-600 transition-all duration-500"
                  style={{ width: `${(appraiserCompleted / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-slate-600">Overall Progress</div>
              <div className="text-sm font-bold text-slate-900">{completedCount} / {totalCount} tasks</div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Roadmap Visualization */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Node Roadmap by Role</h2>
          <p className="text-slate-600 mb-8">Each column shows 5 tasks for a specific role organized vertically.</p>

          <div className="grid grid-cols-3 gap-12 relative">
            {/* Nonprofit Column */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">
                  N
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Nonprofit</h3>
                  <p className="text-sm text-slate-600">Organization tasks</p>
                </div>
              </div>
              <div className="space-y-8">
                {nonprofitTasks.map((task, idx) => renderTaskNode(task, idx, nonprofitTasks))}
              </div>
            </div>

            {/* Donor Column */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                  D
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Donor</h3>
                  <p className="text-sm text-slate-600">Your tasks</p>
                </div>
              </div>
              <div className="space-y-8">
                {donorTasks.map((task, idx) => renderTaskNode(task, idx, donorTasks))}
              </div>
            </div>

            {/* Appraiser Column */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">
                  A
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Appraiser</h3>
                  <p className="text-sm text-slate-600">Valuation tasks</p>
                </div>
              </div>
              <div className="space-y-8">
                {appraiserTasks.map((task, idx) => renderTaskNode(task, idx, appraiserTasks))}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-8 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-6">
              <div className="font-semibold text-slate-700">Legend:</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-600"></div>
                <span className="text-sm text-slate-600">Nonprofit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-600"></div>
                <span className="text-sm text-slate-600">Donor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-600"></div>
                <span className="text-sm text-slate-600">Appraiser</span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Dependencies Summary */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Key Cross-Role Dependencies</h3>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-pink-600">Nonprofit Step 4</span>
              <span>→ blocked until</span>
              <span className="font-semibold text-amber-600">Donor Step 5</span>
              <span>(Set Commitment Amount)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-violet-600">Appraiser Step 2</span>
              <span>→ blocked until</span>
              <span className="font-semibold text-amber-600">Donor Step 3</span>
              <span>(Upload Equity Documents)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-amber-600">Donor Step 4</span>
              <span>→ blocked until</span>
              <span className="font-semibold text-violet-600">Appraiser Step 5</span>
              <span>(Submit Valuation Report)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DonationRoadmapTestPage() {
  return (
    <PageErrorBoundary pageName="Donation Roadmap Test">
      <DonationRoadmapTestContent />
    </PageErrorBoundary>
  )
}
