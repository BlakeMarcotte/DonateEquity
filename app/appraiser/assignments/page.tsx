'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppraiserRoute } from '@/components/auth/ProtectedRoute'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  User,
  Calendar,
  ArrowRight,
  DollarSign
} from 'lucide-react'
import Link from 'next/link'

interface Assignment {
  id: string
  donationId: string
  donorName: string
  donorEmail: string
  organizationName: string
  campaignTitle: string
  estimatedValue: number
  status: 'assigned' | 'in_progress' | 'completed'
  assignedAt: Date
  completedAt?: Date
  tasksCompleted: number
  totalTasks: number
  nextTask?: {
    id: string
    title: string
    description: string
  }
}

export default function AppraiserAssignmentsPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0
  })

  useEffect(() => {
    if (user) {
      fetchAssignments()
    }
  }, [user])

  const fetchAssignments = async () => {
    try {
      // Mock data for now - in production, this would be an API call
      const mockAssignments: Assignment[] = [
        {
          id: '1',
          donationId: 'donation-1',
          donorName: 'John Smith',
          donorEmail: 'john@techstartup.com',
          organizationName: 'TechStartup Inc.',
          campaignTitle: 'Supporting Local Education Initiative',
          estimatedValue: 500000,
          status: 'in_progress',
          assignedAt: new Date(Date.now() - 86400000 * 3),
          tasksCompleted: 1,
          totalTasks: 2,
          nextTask: {
            id: 'task-2',
            title: 'Conduct Equity Appraisal',
            description: 'Complete comprehensive equity appraisal including detailed financial analysis.'
          }
        },
        {
          id: '2',
          donationId: 'donation-2',
          donorName: 'Sarah Johnson',
          donorEmail: 'sarah@greentech.com',
          organizationName: 'GreenTech Solutions',
          campaignTitle: 'Clean Energy Research Fund',
          estimatedValue: 750000,
          status: 'assigned',
          assignedAt: new Date(Date.now() - 86400000),
          tasksCompleted: 0,
          totalTasks: 2,
          nextTask: {
            id: 'task-1',
            title: 'Initial Equity Assessment',
            description: 'Perform initial assessment of company equity value.'
          }
        },
        {
          id: '3',
          donationId: 'donation-3',
          donorName: 'Michael Brown',
          donorEmail: 'mike@healthtech.com',
          organizationName: 'HealthTech Innovations',
          campaignTitle: 'Medical Research Support',
          estimatedValue: 300000,
          status: 'completed',
          assignedAt: new Date(Date.now() - 86400000 * 10),
          completedAt: new Date(Date.now() - 86400000 * 2),
          tasksCompleted: 2,
          totalTasks: 2
        }
      ]

      setAssignments(mockAssignments)

      // Calculate stats
      setStats({
        total: mockAssignments.length,
        active: mockAssignments.filter(a => a.status === 'assigned' || a.status === 'in_progress').length,
        completed: mockAssignments.filter(a => a.status === 'completed').length
      })
    } catch (error) {
      console.error('Error fetching assignments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-xs font-medium rounded-full"
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'in_progress':
        return `${baseClasses} bg-blue-100 text-blue-800`
      case 'assigned':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'Newly Assigned'
      case 'in_progress':
        return 'In Progress'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assignments</h1>
            <p className="text-gray-600">
              View and manage all your equity appraisal assignments.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.active}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Assignments List */}
          <div className="space-y-6">
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <Card key={assignment.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {assignment.organizationName}
                        </h3>
                        <span className={getStatusBadge(assignment.status)}>
                          {getStatusText(assignment.status)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-3">{assignment.campaignTitle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Estimated Value</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ${assignment.estimatedValue.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Donor Information */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{assignment.donorName}</p>
                          <p className="text-xs text-gray-500">{assignment.donorEmail}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">
                            Assigned {new Date(assignment.assignedAt).toLocaleDateString()}
                          </p>
                          {assignment.completedAt && (
                            <p className="text-xs text-gray-500">
                              Completed {new Date(assignment.completedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Progress</span>
                        <span className="text-sm text-gray-600">
                          {assignment.tasksCompleted}/{assignment.totalTasks} tasks
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(assignment.tasksCompleted, assignment.totalTasks)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {getProgressPercentage(assignment.tasksCompleted, assignment.totalTasks)}% complete
                      </p>
                    </div>
                  </div>

                  {/* Next Task */}
                  {assignment.nextTask && assignment.status !== 'completed' && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Next Task</h4>
                      <p className="text-sm font-medium text-blue-800">{assignment.nextTask.title}</p>
                      <p className="text-xs text-blue-700">{assignment.nextTask.description}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span>Est. ${assignment.estimatedValue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>{getProgressPercentage(assignment.tasksCompleted, assignment.totalTasks)}% complete</span>
                      </div>
                    </div>
                    <Link href={`/donations/${assignment.donationId}/tasks`}>
                      <Button variant="outline">
                        {assignment.status === 'completed' ? 'View Details' : 'Continue Work'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
                <p className="text-gray-600">
                  Assignments will appear here when donations are assigned to you for appraisal.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppraiserRoute>
  )
}