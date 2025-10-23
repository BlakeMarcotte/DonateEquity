'use client'

import { useState } from 'react'
import PageErrorBoundary from '@/components/error/PageErrorBoundary'

interface TeamMember {
  id: string
  name: string
  role: 'nonprofit' | 'donor' | 'appraiser'
  title: string
  initials: string
  color: string
}

interface Task {
  id: string
  title: string
  description: string
  category: 'education' | 'transfer' | 'review'
  role: 'nonprofit' | 'donor' | 'appraiser'
  status: 'completed' | 'active' | 'upcoming'
  dependencies?: string[]
  assignedTo: string[] // Array of team member IDs
}

// Team members for each role
const TEAM_MEMBERS: TeamMember[] = [
  // Nonprofit team
  { id: 'n-sarah', name: 'Sarah Chen', role: 'nonprofit', title: 'Executive Director', initials: 'SC', color: '#ec4899' },
  { id: 'n-michael', name: 'Michael Torres', role: 'nonprofit', title: 'Development Director', initials: 'MT', color: '#db2777' },
  { id: 'n-priya', name: 'Priya Patel', role: 'nonprofit', title: 'Legal Counsel', initials: 'PP', color: '#f472b6' },

  // Donor team
  { id: 'd-james', name: 'James Wilson', role: 'donor', title: 'Chief Financial Officer', initials: 'JW', color: '#f59e0b' },
  { id: 'd-emily', name: 'Emily Rodriguez', role: 'donor', title: 'Wealth Manager', initials: 'ER', color: '#d97706' },
  { id: 'd-alex', name: 'Alex Kim', role: 'donor', title: 'Tax Attorney', initials: 'AK', color: '#fbbf24' },

  // Appraiser team
  { id: 'a-david', name: 'David Lee', role: 'appraiser', title: 'Senior Valuation Analyst', initials: 'DL', color: '#8b5cf6' },
  { id: 'a-rachel', name: 'Rachel Johnson', role: 'appraiser', title: 'Compliance Manager', initials: 'RJ', color: '#7c3aed' },
  { id: 'a-omar', name: 'Omar Hassan', role: 'appraiser', title: 'Financial Analyst', initials: 'OH', color: '#a78bfa' },
]

const INITIAL_TASKS: Task[] = [
  // Nonprofit Tasks
  { id: 'n1', title: 'Verify Nonprofit Eligibility', description: 'Confirm 501(c)(3) status', category: 'education', role: 'nonprofit', status: 'upcoming', assignedTo: ['n-sarah'] },
  { id: 'n2', title: 'Initial Donor Consultation', description: 'Meet with potential donor', category: 'education', role: 'nonprofit', status: 'upcoming', dependencies: ['n1'], assignedTo: ['n-sarah', 'n-michael'] },
  { id: 'n3', title: 'Review Donation Terms', description: 'Understand pledge agreement', category: 'transfer', role: 'nonprofit', status: 'upcoming', dependencies: ['n2'], assignedTo: ['n-michael'] },
  { id: 'n4', title: 'Prepare Acceptance Letter', description: 'Draft formal acceptance', category: 'transfer', role: 'nonprofit', status: 'upcoming', dependencies: ['n3'], assignedTo: ['n-priya'] },
  { id: 'n5', title: 'Review Submitted Documents', description: 'Verify donor documentation (BLOCKED until Donor step 3)', category: 'transfer', role: 'nonprofit', status: 'upcoming', dependencies: ['n4', 'd3'], assignedTo: ['n-priya', 'n-sarah'] },
  { id: 'n6', title: 'Sign Pledge Agreement', description: 'Countersign the agreement', category: 'transfer', role: 'nonprofit', status: 'upcoming', dependencies: ['n5'], assignedTo: ['n-sarah'] },
  { id: 'n7', title: 'Initial Review Process', description: 'Begin internal review', category: 'review', role: 'nonprofit', status: 'upcoming', dependencies: ['n6'], assignedTo: ['n-michael', 'n-priya'] },
  { id: 'n8', title: 'Coordinate with Appraiser', description: 'Schedule valuation (BLOCKED until Appraiser step 4)', category: 'review', role: 'nonprofit', status: 'upcoming', dependencies: ['n7', 'a4'], assignedTo: ['n-michael'] },
  { id: 'n9', title: 'Final Approval', description: 'Complete approval process (BLOCKED until Appraiser step 9)', category: 'review', role: 'nonprofit', status: 'upcoming', dependencies: ['n8', 'a9'], assignedTo: ['n-sarah', 'n-michael', 'n-priya'] },
  { id: 'n10', title: 'Setup Monitoring', description: 'Configure liquidity tracking', category: 'review', role: 'nonprofit', status: 'upcoming', dependencies: ['n9'], assignedTo: ['n-priya'] },

  // Donor Tasks
  { id: 'd1', title: 'Learn About Equity Donations', description: 'Understand the process', category: 'education', role: 'donor', status: 'upcoming', assignedTo: ['d-james'] },
  { id: 'd2', title: 'Review Tax Benefits', description: 'Consult with tax advisor', category: 'education', role: 'donor', status: 'upcoming', dependencies: ['d1'], assignedTo: ['d-james', 'd-emily'] },
  { id: 'd3', title: 'Select Nonprofit Partner', description: 'Choose beneficiary organization', category: 'education', role: 'donor', status: 'upcoming', dependencies: ['d2'], assignedTo: ['d-james'] },
  { id: 'd4', title: 'Create Donor Account', description: 'Register on platform', category: 'transfer', role: 'donor', status: 'upcoming', dependencies: ['d3'], assignedTo: ['d-alex'] },
  { id: 'd5', title: 'Upload Equity Documents', description: 'Provide stock certificates', category: 'transfer', role: 'donor', status: 'upcoming', dependencies: ['d4'], assignedTo: ['d-james', 'd-alex'] },
  { id: 'd6', title: 'Set Donation Amount', description: 'Specify shares to donate (BLOCKED until Nonprofit step 2)', category: 'transfer', role: 'donor', status: 'upcoming', dependencies: ['d5', 'n2'], assignedTo: ['d-james'] },
  { id: 'd7', title: 'Review Pledge Terms', description: 'Read agreement carefully', category: 'transfer', role: 'donor', status: 'upcoming', dependencies: ['d6'], assignedTo: ['d-james', 'd-emily'] },
  { id: 'd8', title: 'Sign Pledge Agreement', description: 'Execute via DocuSign (BLOCKED until Nonprofit step 6)', category: 'transfer', role: 'donor', status: 'upcoming', dependencies: ['d7', 'n6'], assignedTo: ['d-james'] },
  { id: 'd9', title: 'Await Valuation', description: 'Wait for appraisal results (BLOCKED until Appraiser step 7)', category: 'review', role: 'donor', status: 'upcoming', dependencies: ['d8', 'a7'], assignedTo: ['d-james', 'd-emily', 'd-alex'] },
  { id: 'd10', title: 'Accept Final Terms', description: 'Confirm donation completion', category: 'review', role: 'donor', status: 'upcoming', dependencies: ['d9'], assignedTo: ['d-james'] },

  // Appraiser Tasks
  { id: 'a1', title: 'Review Initial Request', description: 'Assess valuation need', category: 'education', role: 'appraiser', status: 'upcoming', assignedTo: ['a-david'] },
  { id: 'a2', title: 'Legal Compliance Check', description: 'Verify regulatory requirements', category: 'education', role: 'appraiser', status: 'upcoming', dependencies: ['a1'], assignedTo: ['a-rachel'] },
  { id: 'a3', title: 'Gather Company Data', description: 'Collect financial information (BLOCKED until Donor step 5)', category: 'education', role: 'appraiser', status: 'upcoming', dependencies: ['a2', 'd5'], assignedTo: ['a-david', 'a-omar'] },
  { id: 'a4', title: 'Request Additional Info', description: 'Follow-up documentation', category: 'transfer', role: 'appraiser', status: 'upcoming', dependencies: ['a3'], assignedTo: ['a-omar'] },
  { id: 'a5', title: 'Analyze Market Comps', description: 'Research comparable companies', category: 'transfer', role: 'appraiser', status: 'upcoming', dependencies: ['a4'], assignedTo: ['a-david', 'a-rachel'] },
  { id: 'a6', title: 'Calculate Equity Value', description: 'Perform valuation analysis', category: 'transfer', role: 'appraiser', status: 'upcoming', dependencies: ['a5'], assignedTo: ['a-david', 'a-rachel', 'a-omar'] },
  { id: 'a7', title: 'Prepare Valuation Report', description: 'Draft formal report', category: 'review', role: 'appraiser', status: 'upcoming', dependencies: ['a6'], assignedTo: ['a-rachel'] },
  { id: 'a8', title: 'Legal Review', description: 'Attorney compliance check', category: 'review', role: 'appraiser', status: 'upcoming', dependencies: ['a7'], assignedTo: ['a-rachel', 'a-omar'] },
  { id: 'a9', title: 'Submit Final Valuation', description: 'Deliver appraisal results', category: 'review', role: 'appraiser', status: 'upcoming', dependencies: ['a8'], assignedTo: ['a-david'] },
  { id: 'a10', title: 'Archive Documentation', description: 'Store records securely', category: 'review', role: 'appraiser', status: 'upcoming', dependencies: ['a9'], assignedTo: ['a-omar'] },
]

type TabType = 'roadmap' | 'timeline' | 'journey' | 'stages'

// Helper component to display team member avatars
function TeamMemberAvatars({ memberIds, size = 'sm' }: { memberIds: string[]; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const members = memberIds.map(id => TEAM_MEMBERS.find(m => m.id === id)).filter(Boolean) as TeamMember[]

  const sizeClasses = {
    xs: 'w-5 h-5 text-[8px]',
    sm: 'w-6 h-6 text-[9px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  }

  const offsetClasses = {
    xs: '-ml-2',
    sm: '-ml-2.5',
    md: '-ml-3',
    lg: '-ml-4'
  }

  return (
    <div className="flex items-center">
      {members.map((member, idx) => (
        <div
          key={member.id}
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold shadow-md border-2 border-white ${idx > 0 ? offsetClasses[size] : ''}`}
          style={{ backgroundColor: member.color, zIndex: members.length - idx }}
          title={`${member.name} - ${member.title}`}
        >
          {member.initials}
        </div>
      ))}
    </div>
  )
}

function TaskListUIContent() {
  const [activeTab, setActiveTab] = useState<TabType>('roadmap')
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)

  const tabs: { id: TabType; label: string }[] = [
    { id: 'roadmap', label: 'Node Roadmap' },
    { id: 'timeline', label: 'Timeline View' },
    { id: 'journey', label: 'Journey Flow' },
    { id: 'stages', label: 'Stage Gates' },
  ]

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
    // Find all upcoming tasks for this role whose dependencies are met
    const availableTasks = tasks.filter(t =>
      t.role === role && t.status === 'upcoming' && areDependenciesMet(t, tasks)
    )

    // Return the first available task (in array order)
    return availableTasks[0] || null
  }

  // Get blocker info for any task
  const getTaskBlockers = (task: Task, allTasks: Task[]): { taskId: string; title: string; role: string }[] => {
    if (!task.dependencies || task.status === 'completed') {
      return []
    }

    // Check which dependencies are not met
    return task.dependencies
      .map(depId => {
        const depTask = allTasks.find(t => t.id === depId)
        if (depTask && depTask.status !== 'completed' && depTask.role !== task.role) {
          // Only show cross-role blockers
          return {
            taskId: depTask.id,
            title: depTask.title,
            role: depTask.role
          }
        }
        return null
      })
      .filter(blocker => blocker !== null) as { taskId: string; title: string; role: string }[]
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
    setTasks(INITIAL_TASKS)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Task List UI Experiments</h1>
        <p className="text-slate-600 mb-4">Exploring different visual approaches for task progression</p>

        {/* Team Members Legend */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Team Members</h2>
          <div className="grid grid-cols-3 gap-6">
            {/* Nonprofit Team */}
            <div>
              <div className="text-sm font-semibold text-pink-700 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-xs">N</div>
                Nonprofit Team
              </div>
              <div className="space-y-2">
                {TEAM_MEMBERS.filter(m => m.role === 'nonprofit').map(member => (
                  <div key={member.id} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Donor Team */}
            <div>
              <div className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold text-xs">D</div>
                Donor Team
              </div>
              <div className="space-y-2">
                {TEAM_MEMBERS.filter(m => m.role === 'donor').map(member => (
                  <div key={member.id} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Appraiser Team */}
            <div>
              <div className="text-sm font-semibold text-violet-700 mb-3 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-xs">A</div>
                Appraiser Team
              </div>
              <div className="space-y-2">
                {TEAM_MEMBERS.filter(m => m.role === 'appraiser').map(member => (
                  <div key={member.id} className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.title}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Simulation Controls - Individual Role Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Role Simulation Controls</h2>
              <p className="text-sm text-slate-600">Control each role independently. Blocked tasks will show visual indicators on the cards.</p>
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
                  <p className="text-xs text-slate-600">{nonprofitCompleted} / 10 tasks</p>
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
                  style={{ width: `${(nonprofitCompleted / 10) * 100}%` }}
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
                  <p className="text-xs text-slate-600">{donorCompleted} / 10 tasks</p>
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
                  style={{ width: `${(donorCompleted / 10) * 100}%` }}
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
                  <p className="text-xs text-slate-600">{appraiserCompleted} / 10 tasks</p>
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
                  style={{ width: `${(appraiserCompleted / 10) * 100}%` }}
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

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-lg p-1 shadow-sm w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-md font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {activeTab === 'roadmap' && <RoadmapView tasks={tasks} getTaskBlockers={getTaskBlockers} />}
          {activeTab === 'timeline' && <TimelineView tasks={tasks} getTaskBlockers={getTaskBlockers} />}
          {activeTab === 'journey' && <JourneyView tasks={tasks} getTaskBlockers={getTaskBlockers} />}
          {activeTab === 'stages' && <StageView />}
        </div>
      </div>
    </div>
  )
}

// Node-Edge Roadmap Visualization
function RoadmapView({ tasks, getTaskBlockers }: {
  tasks: Task[]
  getTaskBlockers: (task: Task, allTasks: Task[]) => { taskId: string; title: string; role: string }[]
}) {
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
                <h3 className={`font-semibold ${colors.text} text-sm`}>{task.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{task.description}</p>

                {/* Team member avatars */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Assigned to:</span>
                  <TeamMemberAvatars memberIds={task.assignedTo} size="sm" />
                </div>
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
                        <span className="capitalize font-bold">{blocker.role.charAt(0)}</span>
                        <span>→ {blocker.title.substring(0, 20)}{blocker.title.length > 20 ? '...' : ''}</span>
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
    <div className="relative">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Node-Edge Roadmap by Role</h2>
      <p className="text-slate-600 mb-8">Each column shows tasks for a specific role organized vertically.</p>

      <div className="grid grid-cols-3 gap-12 relative">
        {/* Nonprofit Column */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">
              1
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
              2
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
              3
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
  )
}

// Timeline/Stepper View
function TimelineView({ tasks, getTaskBlockers }: {
  tasks: Task[]
  getTaskBlockers: (task: Task, allTasks: Task[]) => { taskId: string; title: string; role: string }[]
}) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'education' | 'transfer' | 'review'>('all')

  const blockerRoleColors = {
    nonprofit: { bg: 'bg-pink-500', text: 'text-pink-50' },
    donor: { bg: 'bg-amber-500', text: 'text-amber-50' },
    appraiser: { bg: 'bg-violet-500', text: 'text-violet-50' },
  }

  const filteredTasks = selectedCategory === 'all'
    ? tasks
    : tasks.filter(t => t.category === selectedCategory)

  const categoryColors = {
    education: 'bg-purple-500',
    transfer: 'bg-blue-500',
    review: 'bg-green-500',
  }

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    active: tasks.filter(t => t.status === 'active').length,
    upcoming: tasks.filter(t => t.status === 'upcoming').length,
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Timeline Stepper View</h2>
      <p className="text-slate-600 mb-8">Linear progression through all tasks</p>

      {/* Stats and Filter */}
      <div className="flex items-center justify-between mb-8">
        {/* Stats */}
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900">{stats.completed}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.active}</div>
            <div className="text-sm text-slate-600">Active</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-400">{stats.upcoming}</div>
            <div className="text-sm text-slate-600">Upcoming</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'education', 'transfer', 'review'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />

        {/* Tasks */}
        <div className="space-y-6">
          {filteredTasks.map((task, idx) => {
            const isCompleted = task.status === 'completed'
            const isActive = task.status === 'active'
            const categoryColor = categoryColors[task.category]
            const blockers = getTaskBlockers(task, tasks)
            const isBlocked = blockers.length > 0

            return (
              <div key={task.id} className="relative flex items-start gap-6">
                {/* Timeline node */}
                <div className="relative z-10">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                    isCompleted
                      ? categoryColor + ' text-white'
                      : isActive
                      ? 'bg-white border-4 ' + categoryColor.replace('bg-', 'border-') + ' animate-pulse'
                      : isBlocked
                      ? 'bg-white border-4 border-red-400'
                      : 'bg-white border-2 border-slate-300'
                  }`}>
                    {isCompleted ? (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isBlocked ? (
                      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className={`text-lg font-bold ${isActive ? categoryColor.replace('bg-', 'text-') : 'text-slate-400'}`}>
                        {idx + 1}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-8">
                  <div className={`bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all cursor-pointer ${
                    isActive ? 'ring-2 ring-blue-400' : isBlocked ? 'ring-2 ring-red-400 bg-red-50' : ''
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-900">{task.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.category === 'education'
                            ? 'bg-purple-100 text-purple-700'
                            : task.category === 'transfer'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {task.category}
                        </span>
                      </div>
                      {isActive && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                          Current Task
                        </span>
                      )}
                      {isBlocked && (
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-2">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Blocked
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600">{task.description}</p>

                    {/* Team member avatars */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-600">Assigned to:</span>
                        <TeamMemberAvatars memberIds={task.assignedTo} size="md" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {task.assignedTo.map(id => {
                          const member = TEAM_MEMBERS.find(m => m.id === id)
                          if (!member) return null
                          return (
                            <div key={id} className="text-xs bg-slate-50 px-2 py-1 rounded">
                              <span className="font-medium text-slate-700">{member.name}</span>
                              <span className="text-slate-500"> · {member.title}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Progress indicator */}
                    {isCompleted && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-600 font-medium">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Completed
                      </div>
                    )}

                    {/* Blocker info */}
                    {isBlocked && (
                      <div className="mt-3 pt-3 border-t border-red-200">
                        <div className="text-sm font-semibold text-red-700 mb-2">Blocked by:</div>
                        <div className="flex flex-wrap gap-2">
                          {blockers.map((blocker, bidx) => {
                            const blockerColors = blockerRoleColors[blocker.role as keyof typeof blockerRoleColors]
                            return (
                              <div
                                key={bidx}
                                className={`${blockerColors.bg} ${blockerColors.text} px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1`}
                              >
                                <span className="capitalize font-bold">{blocker.role}</span>
                                <span>→ {blocker.title}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Creative Journey Flow Visualization with Circular Nodes
function JourneyView({ tasks, getTaskBlockers }: {
  tasks: Task[]
  getTaskBlockers: (task: Task, allTasks: Task[]) => { taskId: string; title: string; role: string }[]
}) {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  const blockerRoleColors = {
    nonprofit: { bg: 'bg-pink-500', text: 'text-pink-50' },
    donor: { bg: 'bg-amber-500', text: 'text-amber-50' },
    appraiser: { bg: 'bg-violet-500', text: 'text-violet-50' },
  }

  // Category background colors (for shading sections)
  const categoryColors = {
    education: {
      bg: '#f3e8ff',
      bgDark: '#e9d5ff',
      label: 'Education',
      textColor: '#7c3aed'
    },
    transfer: {
      bg: '#dbeafe',
      bgDark: '#bfdbfe',
      label: 'Transfer',
      textColor: '#2563eb'
    },
    review: {
      bg: '#dcfce7',
      bgDark: '#bbf7d0',
      label: 'Review',
      textColor: '#16a34a'
    },
  }

  // Role colors (for node coloring based on who performs the task)
  const roleColors = {
    nonprofit: {
      primary: '#ec4899',
      light: '#fce7f3',
      medium: '#f472b6',
      gradient: 'from-pink-400 to-pink-600',
      label: 'Nonprofit'
    },
    donor: {
      primary: '#f59e0b',
      light: '#fef3c7',
      medium: '#fbbf24',
      gradient: 'from-amber-400 to-amber-600',
      label: 'Donor'
    },
    appraiser: {
      primary: '#8b5cf6',
      light: '#ede9fe',
      medium: '#a78bfa',
      gradient: 'from-violet-400 to-violet-600',
      label: 'Appraiser'
    },
  }

  // Assign roles to tasks (randomly but consistently)
  const taskRoles = new Map<string, 'nonprofit' | 'donor' | 'appraiser'>([
    // Education - mostly donor
    ['e1', 'donor'], ['e2', 'donor'], ['e3', 'nonprofit'], ['e4', 'donor'],
    ['e5', 'donor'], ['e6', 'nonprofit'], ['e7', 'donor'], ['e8', 'donor'],
    ['e9', 'donor'], ['e10', 'nonprofit'],
    // Transfer - mix of donor and nonprofit
    ['t1', 'donor'], ['t2', 'donor'], ['t3', 'donor'], ['t4', 'nonprofit'],
    ['t5', 'donor'], ['t6', 'donor'], ['t7', 'donor'], ['t8', 'donor'],
    ['t9', 'nonprofit'], ['t10', 'nonprofit'],
    // Review - mostly appraiser and nonprofit
    ['r1', 'nonprofit'], ['r2', 'nonprofit'], ['r3', 'appraiser'], ['r4', 'appraiser'],
    ['r5', 'nonprofit'], ['r6', 'appraiser'], ['r7', 'appraiser'], ['r8', 'nonprofit'],
    ['r9', 'nonprofit'], ['r10', 'nonprofit'],
  ])

  // Create flowing positions for nodes in a serpentine pattern
  const getNodePosition = (index: number) => {
    const section = Math.floor(index / 10)
    const posInSection = index % 10

    // Create a flowing S-curve pattern that fits within bounds
    // SVG is 1200x500, so we have ~400px per section (3 sections)
    const baseX = 60 + (section * 380)
    const baseY = 250 // Center vertically
    const amplitude = 150 // Wave height
    const frequency = 0.6

    const x = baseX + (posInSection * 32)
    const y = baseY + Math.sin(posInSection * frequency) * amplitude

    return { x, y }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Journey Flow Visualization</h2>
      <p className="text-slate-600 mb-8">Follow the flowing path through your donation journey</p>

      {/* Legend - Now showing roles */}
      <div className="flex items-center gap-8 mb-8 p-4 bg-slate-50 rounded-lg">
        <div className="font-semibold text-slate-700">Node Colors (by Role):</div>
        {Object.entries(roleColors).map(([role, colors]) => (
          <div key={role} className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full shadow-sm"
              style={{ backgroundColor: colors.primary }}
            />
            <span className="text-sm font-medium text-slate-700 capitalize">{colors.label}</span>
          </div>
        ))}
      </div>

      {/* SVG Canvas for nodes and connections */}
      <div className="relative w-full overflow-x-auto bg-gradient-to-br from-slate-50 to-white rounded-xl p-4 shadow-inner">
        <svg
          width="1200"
          height="500"
          viewBox="0 0 1200 500"
          className="w-full"
          style={{ minWidth: '1200px', maxHeight: '500px' }}
        >
          <defs>
            {/* Gradient definitions for roles */}
            <linearGradient id="nonprofitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#f472b6', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="donorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="appraiserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#a78bfa', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
            </linearGradient>

            {/* Glow filter for active task */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background shading for categories */}
          {/* Education section */}
          <rect
            x="0"
            y="0"
            width="400"
            height="500"
            fill={categoryColors.education.bg}
            opacity="0.4"
          />
          <text
            x="200"
            y="30"
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill={categoryColors.education.textColor}
            opacity="0.7"
          >
            📚 {categoryColors.education.label}
          </text>

          {/* Transfer section */}
          <rect
            x="400"
            y="0"
            width="400"
            height="500"
            fill={categoryColors.transfer.bg}
            opacity="0.4"
          />
          <text
            x="600"
            y="30"
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill={categoryColors.transfer.textColor}
            opacity="0.7"
          >
            💸 {categoryColors.transfer.label}
          </text>

          {/* Review section */}
          <rect
            x="800"
            y="0"
            width="400"
            height="500"
            fill={categoryColors.review.bg}
            opacity="0.4"
          />
          <text
            x="1000"
            y="30"
            textAnchor="middle"
            fontSize="18"
            fontWeight="bold"
            fill={categoryColors.review.textColor}
            opacity="0.7"
          >
            ✅ {categoryColors.review.label}
          </text>

          {/* Draw connecting lines first */}
          {tasks.map((task, index) => {
            if (index === tasks.length - 1) return null

            const start = getNodePosition(index)
            const end = getNodePosition(index + 1)
            const role = taskRoles.get(task.id) || 'donor'
            const colors = roleColors[role]

            // Create curved path using quadratic bezier
            const midX = (start.x + end.x) / 2
            const midY = (start.y + end.y) / 2
            const controlX = midX
            const controlY = midY + (Math.random() - 0.5) * 40

            const isCompleted = task.status === 'completed'
            const isActive = task.status === 'active'

            return (
              <g key={`line-${task.id}`}>
                {/* Background line */}
                <path
                  d={`M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`}
                  stroke={isCompleted || isActive ? colors.primary : '#cbd5e1'}
                  strokeWidth={isCompleted || isActive ? '3' : '2'}
                  fill="none"
                  strokeDasharray={isCompleted ? 'none' : '5,5'}
                  opacity={isCompleted || isActive ? 0.6 : 0.3}
                />

                {/* Animated flow particles for active connections */}
                {isActive && (
                  <circle r="4" fill={colors.primary}>
                    <animateMotion
                      dur="2s"
                      repeatCount="indefinite"
                      path={`M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`}
                    />
                  </circle>
                )}
              </g>
            )
          })}

          {/* Draw nodes */}
          {tasks.map((task, index) => {
            const pos = getNodePosition(index)
            const role = taskRoles.get(task.id) || 'donor'
            const colors = roleColors[role]
            const isCompleted = task.status === 'completed'
            const isActive = task.status === 'active'
            const isHovered = hoveredTask === task.id

            const nodeRadius = isActive ? 28 : isHovered ? 26 : 22
            const gradientId = role === 'nonprofit' ? 'nonprofitGrad'
              : role === 'donor' ? 'donorGrad'
              : 'appraiserGrad'

            return (
              <g
                key={task.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
                onClick={() => setSelectedTask(selectedTask === task.id ? null : task.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Outer glow for active task */}
                {isActive && (
                  <circle
                    r={nodeRadius + 8}
                    fill={colors.primary}
                    opacity="0.2"
                    className="animate-pulse"
                  />
                )}

                {/* Main circle */}
                <circle
                  r={nodeRadius}
                  fill={isCompleted ? `url(#${gradientId})` : isActive ? colors.medium : '#ffffff'}
                  stroke={isCompleted || isActive ? colors.primary : '#cbd5e1'}
                  strokeWidth={isActive ? 3 : 2}
                  filter={isActive ? 'url(#glow)' : undefined}
                  opacity={task.status === 'upcoming' ? 0.5 : 1}
                  className="transition-all duration-300"
                />

                {/* Status indicator */}
                {isCompleted && (
                  <path
                    d="M -8 -2 L -3 3 L 8 -8"
                    stroke="white"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Task number for upcoming tasks */}
                {!isCompleted && !isActive && (
                  <text
                    textAnchor="middle"
                    dy="5"
                    fontSize="14"
                    fontWeight="bold"
                    fill={colors.primary}
                    opacity={task.status === 'upcoming' ? 0.5 : 1}
                  >
                    {index + 1}
                  </text>
                )}

                {/* Active indicator */}
                {isActive && (
                  <circle
                    r={8}
                    fill={colors.primary}
                    className="animate-ping"
                    opacity="0.75"
                  />
                )}

                {/* Role indicator badge at bottom */}
                <circle
                  cy={nodeRadius + 12}
                  r="5"
                  fill={colors.primary}
                  opacity="0.8"
                />
              </g>
            )
          })}
        </svg>

        {/* Task details overlay */}
        {(hoveredTask || selectedTask) && (
          <div className="mt-8 p-6 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl shadow-lg border border-slate-200">
            {tasks
              .filter(t => t.id === (selectedTask || hoveredTask))
              .map(task => {
                const role = taskRoles.get(task.id) || 'donor'
                const roleColor = roleColors[role]
                const categoryInfo = categoryColors[task.category]
                const blockers = getTaskBlockers(task, tasks)
                const isBlocked = blockers.length > 0

                return (
                  <div key={task.id} className="flex items-start gap-6">
                    <div
                      className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                      style={{ background: `linear-gradient(135deg, ${roleColor.medium}, ${roleColor.primary})` }}
                    >
                      {task.status === 'completed' ? '✓' : isBlocked ? '🔒' : tasks.indexOf(task) + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-slate-900">{task.title}</h3>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide text-white"
                          style={{ backgroundColor: roleColor.primary }}
                        >
                          {roleColor.label}
                        </span>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: categoryInfo.bg,
                            color: categoryInfo.textColor
                          }}
                        >
                          {categoryInfo.label}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : task.status === 'active'
                            ? 'bg-blue-100 text-blue-700'
                            : isBlocked
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {task.status === 'completed' ? '✓ Completed'
                            : task.status === 'active' ? '● In Progress'
                            : isBlocked ? '🔒 Blocked'
                            : 'Upcoming'}
                        </span>
                      </div>
                      <p className="text-slate-700 text-lg">{task.description}</p>

                      {/* Team member avatars */}
                      <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200">
                        <div className="text-sm font-semibold text-slate-700 mb-3">Team Members:</div>
                        <div className="flex flex-wrap gap-3">
                          {task.assignedTo.map(memberId => {
                            const member = TEAM_MEMBERS.find(m => m.id === memberId)
                            if (!member) return null
                            return (
                              <div key={memberId} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-2">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0"
                                  style={{ backgroundColor: member.color }}
                                >
                                  {member.initials}
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{member.name}</div>
                                  <div className="text-xs text-slate-500">{member.title}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Blocker info */}
                      {isBlocked && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            This task is blocked by:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {blockers.map((blocker, bidx) => {
                              const blockerColors = blockerRoleColors[blocker.role as keyof typeof blockerRoleColors]
                              return (
                                <div
                                  key={bidx}
                                  className={`${blockerColors.bg} ${blockerColors.text} px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2`}
                                >
                                  <span className="capitalize font-bold">{blocker.role}</span>
                                  <span>→</span>
                                  <span>{blocker.title}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Progress through all tasks */}
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-sm text-slate-600">
                          Task {tasks.indexOf(task) + 1} of {tasks.length}
                        </span>
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-xs">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${((tasks.indexOf(task) + 1) / tasks.length) * 100}%`,
                              backgroundColor: roleColor.primary
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">💡 Tip:</span> The background shading shows the three phases (Education, Transfer, Review).
          Node colors indicate which role performs each task (Nonprofit, Donor, or Appraiser).
          Hover over or click any node to see full details and watch particles flow along active connections!
        </p>
      </div>
    </div>
  )
}

// Stage-Based Gate System
function StageView() {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null)
  const [selectedStage, setSelectedStage] = useState<number | null>(null)

  // Role colors
  const roleColors = {
    nonprofit: {
      primary: '#ec4899',
      light: '#fce7f3',
      medium: '#f472b6',
      label: 'Nonprofit'
    },
    donor: {
      primary: '#f59e0b',
      light: '#fef3c7',
      medium: '#fbbf24',
      label: 'Donor'
    },
    appraiser: {
      primary: '#8b5cf6',
      light: '#ede9fe',
      medium: '#a78bfa',
      label: 'Appraiser'
    },
  }

  interface StageTask {
    id: string
    title: string
    role: 'nonprofit' | 'donor' | 'appraiser'
    status: 'completed' | 'active' | 'locked'
    level: number // Tasks at the same level can be done in parallel
  }

  interface Stage {
    id: number
    title: string
    description: string
    icon: string
    tasks: StageTask[]
  }

  // Define 5 stages with multiple role-based tasks per stage organized in levels
  const stages: Stage[] = [
    {
      id: 1,
      title: 'Discovery & Education',
      description: 'Learn about equity donations and establish initial contact',
      icon: '🎓',
      tasks: [
        // Level 1: Initial parallel tasks
        { id: 's1-t1', title: 'Review platform materials', role: 'donor', status: 'completed', level: 1 },
        { id: 's1-t2', title: 'Initial donor consultation', role: 'nonprofit', status: 'completed', level: 1 },
        // Level 2: Follow-up tasks after initial contact
        { id: 's1-t3', title: 'Understand tax implications', role: 'donor', status: 'completed', level: 2 },
        { id: 's1-t4', title: 'Verify nonprofit eligibility', role: 'nonprofit', status: 'completed', level: 2 },
      ]
    },
    {
      id: 2,
      title: 'Documentation & Setup',
      description: 'Gather documents and set up accounts',
      icon: '📋',
      tasks: [
        // Level 1: Account creation
        { id: 's2-t1', title: 'Create donor account', role: 'donor', status: 'completed', level: 1 },
        { id: 's2-t2', title: 'Verify identity (KYC)', role: 'donor', status: 'completed', level: 1 },
        // Level 2: Document upload (after account verified)
        { id: 's2-t3', title: 'Upload equity documentation', role: 'donor', status: 'active', level: 2 },
        { id: 's2-t4', title: 'Confirm nonprofit details', role: 'nonprofit', status: 'active', level: 2 },
        // Level 3: Review (after docs uploaded)
        { id: 's2-t5', title: 'Review submitted documents', role: 'nonprofit', status: 'locked', level: 3 },
      ]
    },
    {
      id: 3,
      title: 'Valuation & Appraisal',
      description: 'Professional assessment of equity value',
      icon: '💰',
      tasks: [
        // Level 1: Request valuation
        { id: 's3-t1', title: 'Request equity valuation', role: 'donor', status: 'locked', level: 1 },
        // Level 2: Conduct appraisal
        { id: 's3-t2', title: 'Conduct professional appraisal', role: 'appraiser', status: 'locked', level: 2 },
        { id: 's3-t3', title: 'Review valuation report', role: 'appraiser', status: 'locked', level: 2 },
        // Level 3: Approve and accept
        { id: 's3-t4', title: 'Approve valuation', role: 'nonprofit', status: 'locked', level: 3 },
        { id: 's3-t5', title: 'Accept valuation terms', role: 'donor', status: 'locked', level: 3 },
      ]
    },
    {
      id: 4,
      title: 'Legal & Compliance',
      description: 'Legal review and agreement signing',
      icon: '⚖️',
      tasks: [
        // Level 1: Compliance check and prepare
        { id: 's4-t1', title: 'Legal compliance check', role: 'appraiser', status: 'locked', level: 1 },
        { id: 's4-t2', title: 'Prepare pledge agreement', role: 'nonprofit', status: 'locked', level: 1 },
        // Level 2: Sign agreement
        { id: 's4-t3', title: 'Review and sign agreement', role: 'donor', status: 'locked', level: 2 },
        // Level 3: Countersign
        { id: 's4-t4', title: 'Countersign agreement', role: 'nonprofit', status: 'locked', level: 3 },
      ]
    },
    {
      id: 5,
      title: 'Activation & Monitoring',
      description: 'Finalize setup and begin monitoring for liquidity events',
      icon: '🚀',
      tasks: [
        // Level 1: Verification and setup
        { id: 's5-t1', title: 'Final document verification', role: 'nonprofit', status: 'locked', level: 1 },
        { id: 's5-t2', title: 'Set up liquidity monitoring', role: 'appraiser', status: 'locked', level: 1 },
        { id: 's5-t3', title: 'Configure notifications', role: 'donor', status: 'locked', level: 1 },
        // Level 2: Activation
        { id: 's5-t4', title: 'Activate pledge', role: 'nonprofit', status: 'locked', level: 2 },
        { id: 's5-t5', title: 'Confirm activation', role: 'donor', status: 'locked', level: 2 },
      ]
    }
  ]

  // Check if a stage is unlocked
  const isStageUnlocked = (stageIndex: number): boolean => {
    if (stageIndex === 0) return true

    const previousStage = stages[stageIndex - 1]
    return previousStage.tasks.every(task => task.status === 'completed')
  }

  // Get stage status
  const getStageStatus = (stage: Stage, stageIndex: number): 'completed' | 'active' | 'locked' => {
    if (!isStageUnlocked(stageIndex)) return 'locked'

    const allCompleted = stage.tasks.every(t => t.status === 'completed')
    if (allCompleted) return 'completed'

    const hasActive = stage.tasks.some(t => t.status === 'active')
    if (hasActive) return 'active'

    return 'active' // Unlocked but not started
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Stage Gate System</h2>
      <p className="text-slate-600 mb-8">Complete all tasks in each stage to unlock the next phase</p>

      {/* Legend */}
      <div className="flex items-center gap-8 mb-8 p-4 bg-slate-50 rounded-lg">
        <div className="font-semibold text-slate-700">Role Colors:</div>
        {Object.entries(roleColors).map(([role, colors]) => (
          <div key={role} className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full shadow-sm"
              style={{ backgroundColor: colors.primary }}
            />
            <span className="text-sm font-medium text-slate-700 capitalize">{colors.label}</span>
          </div>
        ))}
      </div>

      {/* Stages */}
      <div className="space-y-8">
        {stages.map((stage, stageIndex) => {
          const stageStatus = getStageStatus(stage, stageIndex)
          const isUnlocked = isStageUnlocked(stageIndex)
          const isExpanded = selectedStage === stageIndex

          return (
            <div
              key={stage.id}
              className={`relative border-2 rounded-2xl overflow-hidden transition-all ${
                stageStatus === 'completed'
                  ? 'border-green-400 bg-green-50'
                  : stageStatus === 'active'
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-300 bg-slate-50 opacity-60'
              }`}
            >
              {/* Stage Header */}
              <div
                className={`p-6 cursor-pointer ${
                  stageStatus === 'completed'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                    : stageStatus === 'active'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-gradient-to-r from-slate-400 to-slate-500 text-white'
                }`}
                onClick={() => setSelectedStage(isExpanded ? null : stageIndex)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">{stage.icon}</div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold">Stage {stage.id}: {stage.title}</h3>
                        {!isUnlocked && (
                          <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium flex items-center gap-1">
                            🔒 Locked
                          </span>
                        )}
                        {stageStatus === 'completed' && (
                          <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium flex items-center gap-1">
                            ✓ Complete
                          </span>
                        )}
                        {stageStatus === 'active' && isUnlocked && (
                          <span className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm font-medium flex items-center gap-1 animate-pulse">
                            ● Active
                          </span>
                        )}
                      </div>
                      <p className="text-white text-opacity-90 mt-1">{stage.description}</p>
                    </div>
                  </div>
                  <div className="text-white text-opacity-75">
                    <div className="text-sm font-medium">
                      {stage.tasks.filter(t => t.status === 'completed').length} / {stage.tasks.length} Complete
                    </div>
                    <div className="w-32 h-2 bg-white bg-opacity-20 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-500"
                        style={{
                          width: `${(stage.tasks.filter(t => t.status === 'completed').length / stage.tasks.length) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Nodes */}
              <div className="p-8">
                <div className="relative">
                  {/* SVG for nodes and connections */}
                  {(() => {
                    // Group tasks by level
                    const tasksByLevel = stage.tasks.reduce((acc, task) => {
                      if (!acc[task.level]) acc[task.level] = []
                      acc[task.level].push(task)
                      return acc
                    }, {} as Record<number, StageTask[]>)

                    const maxLevel = Math.max(...stage.tasks.map(t => t.level))
                    const svgHeight = maxLevel * 120 + 80

                    return (
                      <svg
                        width="100%"
                        height={svgHeight}
                        className="mb-4"
                      >
                        <defs>
                          <linearGradient id={`nonprofitGrad-${stage.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#f472b6', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
                          </linearGradient>
                          <linearGradient id={`donorGrad-${stage.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#fbbf24', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 1 }} />
                          </linearGradient>
                          <linearGradient id={`appraiserGrad-${stage.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" style={{ stopColor: '#a78bfa', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
                          </linearGradient>
                          <filter id={`glow-${stage.id}`}>
                            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                            <feMerge>
                              <feMergeNode in="coloredBlur"/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>

                        {/* Level separators */}
                        {Array.from({ length: maxLevel - 1 }).map((_, idx) => {
                          const y = (idx + 1) * 120 + 40
                          return (
                            <line
                              key={`separator-${idx}`}
                              x1="5%"
                              y1={y}
                              x2="95%"
                              y2={y}
                              stroke="#e2e8f0"
                              strokeWidth="1"
                              strokeDasharray="4,4"
                              opacity="0.5"
                            />
                          )
                        })}

                        {/* Connection lines between levels */}
                        {stage.tasks.map(task => {
                          const currentLevel = task.level
                          const nextLevelTasks = stage.tasks.filter(t => t.level === currentLevel + 1)

                          if (nextLevelTasks.length === 0) return null

                          const currentLevelTasks = tasksByLevel[currentLevel]
                          const taskIndexInLevel = currentLevelTasks.indexOf(task)
                          const tasksInCurrentLevel = currentLevelTasks.length
                          const spacing = 100 / (tasksInCurrentLevel + 1)
                          const x1 = spacing * (taskIndexInLevel + 1)
                          const y1 = currentLevel * 120 - 40

                          return nextLevelTasks.map(nextTask => {
                            const nextLevelTasksInLevel = tasksByLevel[nextTask.level]
                            const nextTaskIndexInLevel = nextLevelTasksInLevel.indexOf(nextTask)
                            const tasksInNextLevel = nextLevelTasksInLevel.length
                            const nextSpacing = 100 / (tasksInNextLevel + 1)
                            const x2 = nextSpacing * (nextTaskIndexInLevel + 1)
                            const y2 = nextTask.level * 120 - 40

                            return (
                              <line
                                key={`line-${task.id}-${nextTask.id}`}
                                x1={`${x1}%`}
                                y1={y1}
                                x2={`${x2}%`}
                                y2={y2}
                                stroke={task.status === 'completed' ? '#22c55e' : '#cbd5e1'}
                                strokeWidth="2"
                                strokeDasharray={task.status === 'completed' ? 'none' : '5,5'}
                                opacity="0.4"
                              />
                            )
                          })
                        })}

                        {/* Task nodes by level */}
                        {Object.entries(tasksByLevel).map(([level, tasksInLevel]) => {
                          const levelNum = parseInt(level)
                          const tasksCount = tasksInLevel.length
                          const spacing = 100 / (tasksCount + 1)
                          const y = levelNum * 120 - 40

                          return tasksInLevel.map((task, indexInLevel) => {
                            const xPercent = spacing * (indexInLevel + 1)
                            const colors = roleColors[task.role]
                            const gradientId = `${task.role}Grad-${stage.id}`
                            const isTaskHovered = hoveredTask === task.id
                            const nodeRadius = isTaskHovered ? 32 : 28

                            return (
                              <g
                                key={task.id}
                                onMouseEnter={() => setHoveredTask(task.id)}
                                onMouseLeave={() => setHoveredTask(null)}
                                style={{ cursor: 'pointer' }}
                              >
                                {/* Node */}
                                <circle
                                  cx={`${xPercent}%`}
                                  cy={y}
                                  r={nodeRadius}
                                  fill={task.status === 'completed' ? `url(#${gradientId})` : task.status === 'locked' ? '#e2e8f0' : colors.medium}
                                  stroke={task.status === 'active' ? colors.primary : task.status === 'completed' ? colors.primary : '#cbd5e1'}
                                  strokeWidth={task.status === 'active' ? 4 : 2}
                                  filter={task.status === 'active' ? `url(#glow-${stage.id})` : undefined}
                                  opacity={task.status === 'locked' ? 0.5 : 1}
                                />

                                {/* Status icon */}
                                {task.status === 'completed' && (
                                  <path
                                    transform={`translate(${xPercent}% ${y})`}
                                    d="M -10 -3 L -5 3 L 10 -10"
                                    stroke="white"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                )}

                                {task.status === 'locked' && (
                                  <text
                                    x={`${xPercent}%`}
                                    y={y + 5}
                                    textAnchor="middle"
                                    fontSize="18"
                                  >
                                    🔒
                                  </text>
                                )}

                                {task.status === 'active' && (
                                  <circle
                                    cx={`${xPercent}%`}
                                    cy={y}
                                    r="12"
                                    fill={colors.primary}
                                    className="animate-ping"
                                    opacity="0.6"
                                  />
                                )}

                                {/* Role label */}
                                <text
                                  x={`${xPercent}%`}
                                  y={y + 45}
                                  textAnchor="middle"
                                  fontSize="11"
                                  fontWeight="600"
                                  fill={colors.primary}
                                >
                                  {colors.label}
                                </text>

                                {/* Level indicator */}
                                {levelNum === 1 && indexInLevel === 0 && (
                                  <text
                                    x="2%"
                                    y={y + 5}
                                    fontSize="12"
                                    fontWeight="600"
                                    fill="#64748b"
                                  >
                                    Level {levelNum}
                                  </text>
                                )}
                                {levelNum > 1 && indexInLevel === 0 && (
                                  <text
                                    x="2%"
                                    y={y + 5}
                                    fontSize="12"
                                    fontWeight="600"
                                    fill="#64748b"
                                  >
                                    Level {levelNum}
                                  </text>
                                )}

                                {/* Task title on hover */}
                                {isTaskHovered && (
                                  <g>
                                    <rect
                                      x={`${xPercent}%`}
                                      y={y - 60}
                                      width="160"
                                      height="45"
                                      transform={`translate(-80, 0)`}
                                      fill="white"
                                      stroke={colors.primary}
                                      strokeWidth="2"
                                      rx="8"
                                      filter="drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))"
                                    />
                                    <text
                                      x={`${xPercent}%`}
                                      y={y - 40}
                                      textAnchor="middle"
                                      fontSize="10"
                                      fontWeight="600"
                                      fill="#1e293b"
                                    >
                                      {task.title.length > 25 ? task.title.substring(0, 25) + '...' : task.title}
                                    </text>
                                  </g>
                                )}
                              </g>
                            )
                          })
                        })}
                      </svg>
                    )
                  })()}
                </div>

                {/* Task List */}
                {isExpanded && (
                  <div className="mt-6 space-y-6">
                    {(() => {
                      // Group tasks by level for display
                      const tasksByLevel = stage.tasks.reduce((acc, task) => {
                        if (!acc[task.level]) acc[task.level] = []
                        acc[task.level].push(task)
                        return acc
                      }, {} as Record<number, StageTask[]>)

                      return Object.entries(tasksByLevel)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([level, tasksInLevel]) => (
                          <div key={`level-${level}`}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="text-sm font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                Level {level}
                              </div>
                              <div className="text-xs text-slate-500">
                                {tasksInLevel.length} task{tasksInLevel.length > 1 ? 's' : ''} (can be done in parallel)
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              {tasksInLevel.map((task) => {
                                const colors = roleColors[task.role]
                                return (
                                  <div
                                    key={task.id}
                                    className={`p-4 rounded-lg border-2 ${
                                      task.status === 'completed'
                                        ? 'border-green-400 bg-green-50'
                                        : task.status === 'active'
                                        ? 'border-blue-400 bg-blue-50'
                                        : 'border-slate-300 bg-slate-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                        style={{ backgroundColor: colors.primary }}
                                      >
                                        {task.status === 'completed' ? '✓' : task.status === 'locked' ? '🔒' : '●'}
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-semibold text-slate-900">{task.title}</div>
                                        <div className="text-xs text-slate-600 mt-1">
                                          <span
                                            className="px-2 py-0.5 rounded-full text-white"
                                            style={{ backgroundColor: colors.primary }}
                                          >
                                            {colors.label}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))
                    })()}
                  </div>
                )}
              </div>

              {/* Expand indicator */}
              <div className="px-6 pb-4 text-center">
                <button
                  onClick={() => setSelectedStage(isExpanded ? null : stageIndex)}
                  className="text-sm text-slate-600 hover:text-slate-900 font-medium"
                >
                  {isExpanded ? '▲ Hide Details' : '▼ Show Details'}
                </button>
              </div>

            </div>
          )
        })}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">💡 How it works:</span> Each stage must be fully completed before the next stage unlocks.
          Within each stage, tasks are organized into levels - tasks at the same level can be done in parallel,
          but each level must be completed before the next level unlocks.
          Hover over nodes to see task details. Click &quot;Show Details&quot; to see the full task list for each stage.
          Node colors represent which role is responsible for each task.
        </p>
      </div>
    </div>
  )
}

export default function TaskListUIPage() {
  return (
    <PageErrorBoundary pageName="TaskListUI">
      <TaskListUIContent />
    </PageErrorBoundary>
  )
}
