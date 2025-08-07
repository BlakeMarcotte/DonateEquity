'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppraiserRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc,
  getDoc 
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Donation } from '@/types/donation'
import {
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
  Filter,
  Search,
  ArrowLeft,
  Users,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface DonationWithCampaign extends Donation {
  campaignTitle?: string
  campaignOrganizationName?: string
}

export default function AppraiserDonationsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [donations, setDonations] = useState<DonationWithCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (user) {
      fetchAssignedDonations()
    }
  }, [user])

  const fetchAssignedDonations = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Query donations where appraiserId matches current user
      const donationsQuery = query(
        collection(db, 'donations'),
        where('appraiserId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(donationsQuery)
      
      let donationData: DonationWithCampaign[] = []
      
      if (snapshot.empty) {
        console.log('No donations found assigned to this appraiser')
        
        // Demo data for development - replace with actual data in production
        donationData = [
          {
            id: 'donation-1',
            campaignId: 'campaign-1',
            donorId: 'donor-1',
            donorName: 'John Smith',
            donorEmail: 'john@techstartup.com',
            nonprofitAdminId: 'nonprofit-1',
            amount: 500000,
            donationType: 'equity' as const,
            status: 'processing' as const,
            requiresAppraisal: true,
            appraisalStatus: 'in_progress',
            appraiserId: user.uid,
            campaignTitle: 'Supporting Local Education Initiative',
            campaignOrganizationName: 'Education Foundation',
            organizationId: 'org-1',
            organizationName: 'TechStartup Inc.',
            isAnonymous: false,
            createdAt: new Date(Date.now() - 86400000 * 3),
            updatedAt: new Date(Date.now() - 3600000),
            completedAt: null,
            message: 'Happy to support this important cause with our equity.',
            commitmentDetails: {
              donorOrganizationId: 'org-1',
              donorOrganizationName: 'TechStartup Inc.',
              estimatedValue: 500000
            }
          },
          {
            id: 'donation-2',
            campaignId: 'campaign-2',
            donorId: 'donor-2',
            donorName: 'Sarah Johnson',
            donorEmail: 'sarah@greentech.com',
            nonprofitAdminId: 'nonprofit-2',
            amount: 750000,
            donationType: 'equity' as const,
            status: 'pending' as const,
            requiresAppraisal: true,
            appraisalStatus: 'pending',
            appraiserId: user.uid,
            campaignTitle: 'Clean Energy Research Fund',
            campaignOrganizationName: 'GreenTech Research Institute',
            organizationId: 'org-2',
            organizationName: 'GreenTech Solutions',
            isAnonymous: false,
            createdAt: new Date(Date.now() - 86400000),
            updatedAt: new Date(Date.now() - 3600000 * 2),
            completedAt: null,
            message: 'Excited to contribute to clean energy innovation.',
            commitmentDetails: {
              donorOrganizationId: 'org-2',
              donorOrganizationName: 'GreenTech Solutions',
              estimatedValue: 750000
            }
          },
          {
            id: 'donation-3',
            campaignId: 'campaign-3',
            donorId: 'donor-3',
            donorName: 'Michael Brown',
            donorEmail: 'mike@healthtech.com',
            nonprofitAdminId: 'nonprofit-3',
            amount: 300000,
            donationType: 'equity' as const,
            status: 'completed' as const,
            requiresAppraisal: true,
            appraisalStatus: 'completed',
            appraiserId: user.uid,
            campaignTitle: 'Medical Research Support',
            campaignOrganizationName: 'Medical Research Foundation',
            organizationId: 'org-3',
            organizationName: 'HealthTech Innovations',
            isAnonymous: false,
            createdAt: new Date(Date.now() - 86400000 * 10),
            updatedAt: new Date(Date.now() - 86400000 * 2),
            completedAt: new Date(Date.now() - 86400000 * 2),
            message: 'Proud to support medical research breakthroughs.',
            commitmentDetails: {
              donorOrganizationId: 'org-3',
              donorOrganizationName: 'HealthTech Innovations',
              estimatedValue: 300000
            }
          }
        ]
      } else {
        donationData = await Promise.all(
          snapshot.docs.map(async (donationDoc) => {
            const data = donationDoc.data()
            
            // Fetch campaign details
            let campaignTitle = 'Unknown Campaign'
            let campaignOrganizationName = 'Unknown Organization'
            
            try {
              const campaignDoc = await getDoc(doc(db, 'campaigns', data.campaignId))
              if (campaignDoc.exists()) {
                const campaignData = campaignDoc.data()
                campaignTitle = campaignData.title || 'Unknown Campaign'
                campaignOrganizationName = campaignData.organizationName || 'Unknown Organization'
              }
            } catch (campaignError) {
              console.error('Error fetching campaign details:', campaignError)
            }

            return {
              id: donationDoc.id,
              ...data,
              campaignTitle,
              campaignOrganizationName,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              completedAt: data.completedAt?.toDate() || null,
            } as DonationWithCampaign
          })
        )
      }

      setDonations(donationData)
    } catch (err) {
      console.error('Error fetching assigned donations:', err)
      setError('Failed to load assigned donations')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'processing':
        return <Clock className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getAppraisalStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const filteredDonations = donations.filter(donation => {
    const matchesStatus = filterStatus === 'all' || donation.status === filterStatus
    const matchesSearch = !searchTerm || 
      donation.campaignTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.campaignOrganizationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      donation.donorName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  const totalAssigned = donations.length
  const completedAppraisals = donations.filter(d => d.appraisalStatus === 'completed').length
  const pendingAppraisals = donations.filter(d => d.appraisalStatus === 'pending').length
  const inProgressAppraisals = donations.filter(d => d.appraisalStatus === 'in_progress').length

  if (loading) {
    return (
      <AppraiserRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assigned donations...</p>
          </div>
        </div>
      </AppraiserRoute>
    )
  }

  return (
    <AppraiserRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Link href="/appraiser">
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Dashboard
                    </Button>
                  </Link>
                  <FileText className="h-8 w-8 text-purple-600" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Assigned Donations</h1>
                    <p className="mt-1 text-sm text-gray-600">
                      Equity donations assigned to you for appraisal
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Assigned</p>
                  <p className="text-2xl font-bold text-gray-900">{totalAssigned}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingAppraisals}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{inProgressAppraisals}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedAppraisals}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search donations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                />
              </div>
            </div>
          </Card>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Donations List */}
          <Card>
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Assigned Donations ({filteredDonations.length})
              </h2>
            </div>

            {filteredDonations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {donations.length === 0 ? 'No assigned donations' : 'No donations match your filters'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {donations.length === 0 
                    ? `Donations will appear here when they are assigned to you for appraisal.`
                    : `Try adjusting your search or filter criteria.`
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredDonations.map((donation) => (
                  <div 
                    key={donation.id} 
                    className="p-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                    onClick={() => router.push(`/donations/${donation.id}/tasks`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {donation.campaignTitle}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(donation.status)}`}>
                            {getStatusIcon(donation.status)}
                            <span className="ml-1">{donation.status}</span>
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getAppraisalStatusColor(donation.appraisalStatus || 'pending')}`}>
                            {donation.appraisalStatus || 'pending'} appraisal
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-1">
                            <Building2 className="w-4 h-4" />
                            <span>{donation.campaignOrganizationName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{donation.donorName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Assigned {donation.createdAt.toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-gray-900">
                              {formatAmount(donation.amount)}
                            </span>
                          </div>
                          {donation.commitmentDetails?.estimatedValue && (
                            <div className="flex items-center space-x-1">
                              <TrendingUp className="w-4 h-4 text-blue-600" />
                              <span className="text-gray-600">
                                Est. {formatAmount(donation.commitmentDetails.estimatedValue)}
                              </span>
                            </div>
                          )}
                        </div>

                        {donation.message && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800 italic">{`"${donation.message}"`}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center ml-6">
                        <Button variant="outline">
                          <Eye className="w-4 h-4 mr-2" />
                          View Tasks
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppraiserRoute>
  )
}