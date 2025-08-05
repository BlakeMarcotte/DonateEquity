'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
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
  Heart,
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
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DonationWithCampaign extends Donation {
  campaignTitle?: string
  campaignOrganizationName?: string
}

export default function DonationsPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const [donations, setDonations] = useState<DonationWithCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDonation, setSelectedDonation] = useState<DonationWithCampaign | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    if (user) {
      fetchDonations()
    }
  }, [user])

  const fetchDonations = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch user's donations
      const donationsQuery = query(
        collection(db, 'donations'),
        where('donorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(donationsQuery)
      const donationData = await Promise.all(
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

      setDonations(donationData)
    } catch (err) {
      console.error('Error fetching donations:', err)
      setError('Failed to load your donations')
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
      donation.campaignOrganizationName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  const totalDonated = donations.reduce((sum, donation) => sum + donation.amount, 0)
  const completedDonations = donations.filter(d => d.status === 'completed').length
  const pendingDonations = donations.filter(d => d.status === 'pending').length

  if (loading) {
    return (
      <NonprofitAdminRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading donations...</p>
          </div>
        </div>
      </NonprofitAdminRoute>
    )
  }

  return (
    <NonprofitAdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => router.back()}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Heart className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Donations</h1>
                    <p className="mt-1 text-sm text-gray-600">
                      Track your equity donations and their progress
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => router.push('/browse')}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Browse Campaigns</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Donated</p>
                  <p className="text-2xl font-bold text-gray-900">{formatAmount(totalDonated)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Heart className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Donations</p>
                  <p className="text-2xl font-bold text-gray-900">{donations.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedDonations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingDonations}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
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
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
                />
              </div>
            </div>
          </div>

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
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Equity Donations ({filteredDonations.length})
              </h2>
            </div>

            {filteredDonations.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {donations.length === 0 ? 'No donations yet' : 'No donations match your filters'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {donations.length === 0 
                    ? 'Start making equity donations to campaigns you care about.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {donations.length === 0 && (
                  <div className="mt-6">
                    <Button
                      onClick={() => router.push('/browse')}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span>Browse Campaigns</span>
                    </Button>
                  </div>
                )}
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
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center space-x-1">
                            <Building2 className="w-4 h-4" />
                            <span>{donation.campaignOrganizationName}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Donated {donation.createdAt.toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-gray-900">
                              {formatAmount(donation.amount)}
                            </span>
                          </div>
                          {donation.commitmentDetails?.donorOrganizationName && (
                            <div className="flex items-center space-x-1">
                              <Users className="w-4 h-4 text-blue-600" />
                              <span className="text-gray-600">
                                {donation.commitmentDetails.donorOrganizationName}
                              </span>
                            </div>
                          )}
                        </div>

                        {donation.message && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800 italic">"{donation.message}"</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center ml-6">
                        <div className="text-sm text-gray-500">
                          Click to view tasks →
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Donation Details Modal */}
        {showDetailsModal && selectedDonation && (
          <DonationDetailsModal
            donation={selectedDonation}
            onClose={() => {
              setShowDetailsModal(false)
              setSelectedDonation(null)
            }}
          />
        )}
      </div>
    </NonprofitAdminRoute>
  )
}

// Donation Details Modal Component
function DonationDetailsModal({
  donation,
  onClose
}: {
  donation: DonationWithCampaign
  onClose: () => void
}) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            Donation Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Amount */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(donation.status)}`}>
                {donation.status}
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {formatAmount(donation.amount)}
              </span>
            </div>
          </div>

          {/* Campaign Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Campaign:</span>
                <span className="font-medium text-gray-900">{donation.campaignTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Organization:</span>
                <span className="font-medium text-gray-900">{donation.campaignOrganizationName}</span>
              </div>
            </div>
          </div>

          {/* Donation Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Donation Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Donation Type:</span>
                <span className="font-medium text-gray-900">Equity Donation</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Your Organization:</span>
                <span className="font-medium text-gray-900">
                  {donation.donationDetails?.donorOrganizationName || 'Individual Donor'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Requires Appraisal:</span>
                <span className="font-medium text-gray-900">{donation.requiresAppraisal ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Appraisal Status:</span>
                <span className="font-medium text-gray-900 capitalize">{donation.appraisalStatus}</span>
              </div>
            </div>
          </div>

          {/* Message */}
          {donation.message && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Message</h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-blue-800 italic">"{donation.message}"</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium text-gray-900">
                  {donation.createdAt.toLocaleDateString()} at {donation.createdAt.toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium text-gray-900">
                  {donation.updatedAt.toLocaleDateString()} at {donation.updatedAt.toLocaleTimeString()}
                </span>
              </div>
              {donation.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-gray-900">
                    {donation.completedAt.toLocaleDateString()} at {donation.completedAt.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}