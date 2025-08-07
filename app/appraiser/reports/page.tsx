'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AppraiserRoute } from '@/components/auth/ProtectedRoute'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart3,
  TrendingUp,
  FileText,
  DollarSign,
  Clock,
  Download,
  Eye
} from 'lucide-react'

interface AppraisalReport {
  id: string
  donationId: string
  donorName: string
  organizationName: string
  appraisalValue: number
  estimatedValue: number
  variance: number
  completedAt: Date
  status: 'draft' | 'final' | 'submitted'
  methodUsed: string
}

interface PerformanceMetrics {
  totalAppraisals: number
  averageCompletionTime: number // in days
  accuracyScore: number // percentage
  totalValueAppraised: number
  monthlyTrend: {
    month: string
    count: number
    value: number
  }[]
}

export default function AppraiserReportsPage() {
  const { user } = useAuth()
  const [reports, setReports] = useState<AppraisalReport[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1m' | '3m' | '6m' | '1y'>('3m')

  useEffect(() => {
    if (user) {
      fetchReportsData()
    }
  }, [user, selectedTimeframe])

  const fetchReportsData = async () => {
    try {
      // Mock data for now - in production, these would be API calls
      const mockReports: AppraisalReport[] = [
        {
          id: '1',
          donationId: 'donation-1',
          donorName: 'John Smith',
          organizationName: 'TechStartup Inc.',
          appraisalValue: 485000,
          estimatedValue: 500000,
          variance: -3.0,
          completedAt: new Date(Date.now() - 86400000 * 5),
          status: 'final',
          methodUsed: 'Discounted Cash Flow'
        },
        {
          id: '2',
          donationId: 'donation-2',
          donorName: 'Sarah Johnson',
          organizationName: 'GreenTech Solutions',
          appraisalValue: 820000,
          estimatedValue: 750000,
          variance: 9.3,
          completedAt: new Date(Date.now() - 86400000 * 12),
          status: 'final',
          methodUsed: 'Market Comparables'
        },
        {
          id: '3',
          donationId: 'donation-3',
          donorName: 'Michael Brown',
          organizationName: 'HealthTech Innovations',
          appraisalValue: 275000,
          estimatedValue: 300000,
          variance: -8.3,
          completedAt: new Date(Date.now() - 86400000 * 18),
          status: 'final',
          methodUsed: 'Asset-Based Approach'
        }
      ]

      const mockMetrics: PerformanceMetrics = {
        totalAppraisals: 12,
        averageCompletionTime: 7.5,
        accuracyScore: 92.5,
        totalValueAppraised: 5750000,
        monthlyTrend: [
          { month: 'Jan', count: 2, value: 950000 },
          { month: 'Feb', count: 3, value: 1200000 },
          { month: 'Mar', count: 4, value: 1850000 },
          { month: 'Apr', count: 3, value: 1750000 }
        ]
      }

      setReports(mockReports)
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Error fetching reports data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full"
    switch (status) {
      case 'final':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'draft':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'submitted':
        return `${baseClasses} bg-blue-100 text-blue-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600'
    if (variance < 0) return 'text-red-600'
    return 'text-gray-600'
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
              <p className="text-gray-600">
                View your appraisal performance and generate reports.
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as '1m' | '3m' | '6m' | '1y')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1m">Last Month</option>
                <option value="3m">Last 3 Months</option>
                <option value="6m">Last 6 Months</option>
                <option value="1y">Last Year</option>
              </select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>

          {/* Performance Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Appraisals</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.totalAppraisals}</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg. Completion Time</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.averageCompletionTime}</p>
                    <p className="text-xs text-gray-500">days</p>
                  </div>
                  <div className="h-12 w-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Accuracy Score</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.accuracyScore}%</p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Value Appraised</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${(metrics.totalValueAppraised / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Monthly Trend Chart */}
          {metrics && (
            <Card className="p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Performance Trend</h3>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                {metrics.monthlyTrend.map((month, index) => (
                  <div key={index} className="text-center">
                    <div className="bg-blue-100 rounded-lg p-4 mb-2">
                      <div className="text-2xl font-bold text-blue-600">{month.count}</div>
                      <div className="text-xs text-blue-800">appraisals</div>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{month.month}</div>
                    <div className="text-xs text-gray-500">
                      ${(month.value / 1000000).toFixed(1)}M
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Appraisal Reports */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Appraisal Reports</h3>
              <Button variant="outline" size="sm">
                View All Reports
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estimated Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Appraised Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{report.organizationName}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{report.donorName}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-gray-900">${report.estimatedValue.toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          ${report.appraisalValue.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`font-medium ${getVarianceColor(report.variance)}`}>
                          {report.variance > 0 ? '+' : ''}{report.variance.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{report.methodUsed}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(report.status)}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reports.length === 0 && (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No appraisal reports available</p>
                <p className="text-sm text-gray-500">
                  Reports will appear here once you complete appraisals.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppraiserRoute>
  )
}