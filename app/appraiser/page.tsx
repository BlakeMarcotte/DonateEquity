'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppraiserRoute } from '@/components/auth/ProtectedRoute'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Users, 
  CalendarDays,
  ArrowRight,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  totalAssignments: number
  pendingTasks: number
  completedAppraisals: number
  activeProjects: number
}

interface Task {
  id: string
  donationId: string
  title: string
  status: 'pending' | 'in_progress' | 'blocked' | 'completed'
  priority: 'high' | 'medium' | 'low'
  createdAt: any
  donorName: string
  organizationName: string
}

export default function AppraiserDashboard() {
  const { user, userProfile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalAssignments: 0,
    pendingTasks: 0,
    completedAppraisals: 0,
    activeProjects: 0
  })
  const [recentTasks, setRecentTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      // Mock data for now - in production, these would be API calls
      setStats({
        totalAssignments: 12,
        pendingTasks: 3,
        completedAppraisals: 8,
        activeProjects: 4
      })

      setRecentTasks([
        {
          id: '1',
          donationId: 'donation-1',
          title: 'Initial Equity Assessment',
          status: 'pending',
          priority: 'high',
          createdAt: new Date(),
          donorName: 'John Smith',
          organizationName: 'TechStartup Inc.'
        },
        {
          id: '2',
          donationId: 'donation-2',
          title: 'Conduct Equity Appraisal',
          status: 'in_progress',
          priority: 'medium',
          createdAt: new Date(Date.now() - 86400000),
          donorName: 'Sarah Johnson',
          organizationName: 'GreenTech Solutions'
        }
      ])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityBadge = (priority: string) => {
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
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {userProfile?.displayName || 'Appraiser'}
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your equity appraisal assignments and track your progress.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalAssignments}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.pendingTasks}</p>
                </div>
                <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed Appraisals</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.completedAppraisals}</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Projects</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeProjects}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Tasks */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Tasks</h2>
                  <Link href="/appraiser/tasks">
                    <Button variant="outline" size="sm">
                      View All
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>

                <div className="space-y-4">
                  {recentTasks.length > 0 ? (
                    recentTasks.map((task) => (
                      <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {getStatusIcon(task.status)}
                              <h3 className="font-medium text-gray-900">{task.title}</h3>
                              <span className={getPriorityBadge(task.priority)}>
                                {task.priority}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Donor:</strong> {task.donorName}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Company:</strong> {task.organizationName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Created {new Date(task.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Link href={`/donations/${task.donationId}/tasks`}>
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No recent tasks</p>
                      <p className="text-sm text-gray-500">
                        Tasks will appear here when donations are assigned to you for appraisal.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Quick Actions & Info */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/appraiser/tasks" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="h-4 w-4 mr-2" />
                      View All Tasks
                    </Button>
                  </Link>
                  <Link href="/appraiser/assignments" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      My Assignments
                    </Button>
                  </Link>
                  <Link href="/appraiser/reports" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Reports
                    </Button>
                  </Link>
                  <Link href="/profile" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Profile Settings
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Guidelines */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Appraisal Guidelines</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Review company information thoroughly before assessment</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Use industry-standard valuation methods</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Document all assumptions and methodologies</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Complete tasks within assigned timeframes</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppraiserRoute>
  )
}