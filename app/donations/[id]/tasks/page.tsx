'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DonationTaskList } from '@/components/tasks/DonationTaskList'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Eye, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Donation } from '@/types/donation'

interface DonationWithCampaign extends Donation {
  campaignTitle?: string
  campaignOrganizationName?: string
}

export default function DonationTasksPage() {
  const { customClaims } = useAuth()
  const params = useParams()
  const router = useRouter()
  const donationId = params.id as string
  const [donation, setDonation] = useState<DonationWithCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    const fetchDonation = async () => {
      try {
        const donationDoc = await getDoc(doc(db, 'donations', donationId))
        if (donationDoc.exists()) {
          const donationData = donationDoc.data()
          
          // Fetch campaign details
          let campaignTitle = 'Unknown Campaign'
          let campaignOrganizationName = 'Unknown Organization'
          
          try {
            const campaignDoc = await getDoc(doc(db, 'campaigns', donationData.campaignId))
            if (campaignDoc.exists()) {
              const campaignData = campaignDoc.data()
              campaignTitle = campaignData.title || 'Unknown Campaign'
              campaignOrganizationName = campaignData.organizationName || 'Unknown Organization'
            }
          } catch (campaignError) {
            console.error('Error fetching campaign details:', campaignError)
          }

          setDonation({
            id: donationDoc.id,
            ...donationData,
            campaignTitle,
            campaignOrganizationName,
            createdAt: donationData.createdAt?.toDate() || new Date(),
            updatedAt: donationData.updatedAt?.toDate() || new Date(),
            completedAt: donationData.completedAt?.toDate() || null,
          } as DonationWithCampaign)
        }
      } catch (error) {
        console.error('Error fetching donation:', error)
      } finally {
        setLoading(false)
      }
    }

    if (donationId) {
      fetchDonation()
    }
  }, [donationId])

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

  if (loading) {
    return (
      <ProtectedRoute requiredRoles={['donor', 'nonprofit_admin', 'appraiser']}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-32 bg-gray-100 rounded mb-4"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={['donor', 'nonprofit_admin', 'appraiser']}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/donations">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Donations
              </Button>
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Donation Tasks</h1>
                {donation && (
                  <p className="text-gray-600 mt-2">
                    {donation.campaignTitle} • {formatAmount(donation.amount)}
                  </p>
                )}
              </div>
              
              {donation && (
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetailsModal(true)}
                    className="inline-flex items-center space-x-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Details</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/campaigns/${donation.campaignId}`)}
                    className="inline-flex items-center space-x-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Campaign</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Task List */}
          <Card className="p-6">
            <DonationTaskList
              donationId={donationId}
              showAllTasks={customClaims?.role === 'nonprofit_admin'}
            />
          </Card>

          {/* Help Section */}
          <Card className="p-6 mt-8 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              How the Task System Works
            </h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• <strong>Donor tasks:</strong> Provide company information and review final documentation</p>
              <p>• <strong>Nonprofit tasks:</strong> Process the donation request and prepare final receipts</p>
              <p>• <strong>Appraiser tasks:</strong> Conduct professional equity valuation</p>
              <p>• Some tasks are blocked until previous tasks are completed</p>
              <p>• Click &quot;Complete Task&quot; when you finish each step</p>
            </div>
          </Card>

          {/* Donation Details Modal */}
          {showDetailsModal && donation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/50">
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    Donation Details
                  </h2>
                  <button
                    onClick={() => setShowDetailsModal(false)}
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
                          {donation.commitmentDetails?.donorOrganizationName || 'Individual Donor'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Anonymous:</span>
                        <span className="font-medium text-gray-900">{donation.isAnonymous ? 'Yes' : 'No'}</span>
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
                        <p className="text-blue-800 italic">&quot;{donation.message}&quot;</p>
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
                    <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}