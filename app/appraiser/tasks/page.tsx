'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppraiserRoute } from '@/components/auth/ProtectedRoute'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search,
  Filter,
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  ArrowRight,
  Calendar,
  User,
  Building
} from 'lucide-react'
import Link from 'next/link'

type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed'
type TaskPriority = 'high' | 'medium' | 'low'

interface Task {
  id: string
  donationId: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignedRole: string
  createdAt: any
  updatedAt: any
  completedAt?: any
  donorName: string
  donorEmail: string
  organizationName: string
  campaignTitle: string
}

export default function AppraiserTasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')

  useEffect(() => {
    if (user) {
      fetchTasks()
    }
  }, [user])

  useEffect(() => {
    filterTasks()
  }, [tasks, searchQuery, statusFilter, priorityFilter])

  const fetchTasks = async () => {
    try {
      // Mock data for now - in production, this would be an API call
      const mockTasks: Task[] = [
        {
          id: '1',
          donationId: 'donation-1',
          title: 'Initial Equity Assessment',
          description: 'Perform initial assessment of company equity value and provide preliminary valuation range.',
          status: 'pending',
          priority: 'high',
          assignedRole: 'appraiser',
          createdAt: new Date(),
          updatedAt: new Date(),
          donorName: 'John Smith',
          donorEmail: 'john@techstartup.com',
          organizationName: 'TechStartup Inc.',
          campaignTitle: 'Supporting Local Education Initiative'
        },
        {
          id: '2',
          donationId: 'donation-2',
          title: 'Conduct Equity Appraisal',
          description: 'Complete comprehensive equity appraisal including detailed financial analysis and market comparison.',
          status: 'in_progress',
          priority: 'medium',
          assignedRole: 'appraiser',
          createdAt: new Date(Date.now() - 86400000 * 2),
          updatedAt: new Date(Date.now() - 3600000),
          donorName: 'Sarah Johnson',
          donorEmail: 'sarah@greentech.com',
          organizationName: 'GreenTech Solutions',
          campaignTitle: 'Clean Energy Research Fund'
        },
        {
          id: '3',
          donationId: 'donation-3',
          title: 'Initial Equity Assessment',
          description: 'Review company documentation and provide initial equity assessment.',
          status: 'completed',
          priority: 'medium',
          assignedRole: 'appraiser',
          createdAt: new Date(Date.now() - 86400000 * 5),
          updatedAt: new Date(Date.now() - 86400000 * 2),
          completedAt: new Date(Date.now() - 86400000 * 2),
          donorName: 'Michael Brown',
          donorEmail: 'mike@healthtech.com',
          organizationName: 'HealthTech Innovations',
          campaignTitle: 'Medical Research Support'
        }
      ]

      setTasks(mockTasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterTasks = () => {
    let filtered = tasks

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.campaignTitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter)
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter)
    }

    setFilteredTasks(filtered)
  }

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'in_progress':
        return 'In Progress'
      case 'blocked':
        return 'Blocked'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  const getPriorityBadge = (priority: TaskPriority) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full"
    switch (priority) {
      case 'high':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusBadge = (status: TaskStatus) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full"
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'in_progress':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'blocked':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  if (loading) {
    return (
      <AppraiserRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppraiserRoute>
    )
  }

  return (
    <AppraiserRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Tasks</h1>
            <p className="text-gray-600">
              Manage your assigned appraisal tasks and track progress.
            </p>
          </div>

          {/* Filters */}
          <Card className="p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by task, donor, company, or campaign..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Tasks List */}
          <div className="space-y-4">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <Card key={task.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {getStatusIcon(task.status)}
                        <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                        <span className={getPriorityBadge(task.priority)}>
                          {task.priority}
                        </span>
                        <span className={getStatusBadge(task.status)}>
                          {getStatusText(task.status)}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4">{task.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{task.donorName}</p>
                            <p className="text-xs text-gray-500">{task.donorEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{task.organizationName}</p>
                            <p className="text-xs text-gray-500">Company</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{task.campaignTitle}</p>
                            <p className="text-xs text-gray-500">Campaign</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                        {task.completedAt && (
                          <div className="flex items-center space-x-1">
                            <CheckCircle className="h-3 w-3" />
                            <span>Completed {new Date(task.completedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="ml-6">
                      <Link href={`/donations/${task.donationId}/tasks`}>
                        <Button>
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Tasks will appear here when donations are assigned to you for appraisal.'}
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppraiserRoute>
  )
}