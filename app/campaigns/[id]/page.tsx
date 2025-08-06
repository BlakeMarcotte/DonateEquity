'use client'

import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,

} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { createCampaignInvitation, getCampaignInvitations } from '@/lib/firebase/invitations'
import { CampaignInvitation } from '@/types/invitations'
import CampaignAssignments from '@/components/campaigns/CampaignAssignments'
import {
  Heart,
  ArrowLeft,
  DollarSign,
  Target,
  Users,
  TrendingUp,
  Share2,
  Mail,
  Facebook,
  Twitter,
  Copy,
  ExternalLink,
  Edit3,
  BarChart3,
  MessageSquare,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  X,
  Send
} from 'lucide-react'

interface Campaign {
  id: string
  title: string
  description: string
  goal: number
  raised: number
  status: 'draft' | 'active' | 'paused' | 'completed'
  organizationId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  endDate?: Date
  tags: string[]
}

interface Donation {
  id: string
  campaignId: string
  donorId: string
  donorName: string
  donorEmail: string
  amount: number
  status: 'pending' | 'committed' | 'completed' | 'cancelled'
  createdAt: Date
  equityDetails?: {
    companyName: string
    equityPercentage: number
    estimatedValue: number
  }
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile, customClaims } = useAuth()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'donations' | 'marketing' | 'team'>('donations')
  const [shareUrl, setShareUrl] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [syncingStats, setSyncingStats] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchCampaignDetails()
      fetchDonations()
      fetchInvitations()
      setShareUrl(`${window.location.origin}/campaigns/${params.id}/donate`)
    }
  }, [params.id, customClaims?.organizationId])

  const fetchCampaignDetails = async () => {
    if (!params.id) return

    try {
      const campaignDoc = await getDoc(doc(db, 'campaigns', params.id as string))
      if (campaignDoc.exists()) {
        const data = campaignDoc.data()

        // Check if the campaign belongs to the user's organization
        if (customClaims?.organizationId && data.organizationId !== customClaims.organizationId) {
          console.error('Access denied: Campaign does not belong to your organization')
          return
        }

        setCampaign({
          id: campaignDoc.id,
          title: data.title,
          description: data.description,
          goal: data.goal,
          raised: data.raised || 0,
          status: data.status,
          organizationId: data.organizationId,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          endDate: data.endDate?.toDate(),
          tags: data.tags || [],
        })
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDonations = async () => {
    if (!params.id) return

    try {
      // Try to fetch donations for this campaign
      // The security rules should allow nonprofit admins to read donations for their campaigns
      const donationsQuery = query(
        collection(db, 'donations'),
        where('campaignId', '==', params.id),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(donationsQuery)
      const donationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Donation[]

      setDonations(donationData)
    } catch (error) {
      console.error('Error fetching donations:', error)
      // If we can't fetch donations due to permissions, set empty array
      // This allows the page to still load and show the campaign details
      setDonations([])
    }
  }

  const fetchInvitations = async () => {
    if (!params.id) return

    try {
      const invitationData = await getCampaignInvitations(params.id as string)
      setInvitations(invitationData)
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setInvitations([])
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getProgressPercentage = (raised: number, goal: number) => {
    return Math.min((raised / goal) * 100, 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getDonationStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'committed':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const shareToSocial = (platform: string) => {
    const text = `Support ${campaign?.title} - Help us reach our goal of ${formatCurrency(campaign?.goal || 0)}`
    const url = shareUrl

    let shareLink = ''
    switch (platform) {
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        break
      case 'email':
        shareLink = `mailto:?subject=${encodeURIComponent(campaign?.title || '')}&body=${encodeURIComponent(`${text}\n\n${url}`)}`
        break
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400')
    }
  }

  const syncCampaignStats = async () => {
    if (!user || !params.id) return

    setSyncingStats(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/admin/sync-campaign-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaignId: params.id })
      })

      const result = await response.json()
      
      if (result.success) {
        // Refresh campaign data to show updated stats
        await fetchCampaignDetails()
        await fetchDonations()
        console.log('Campaign stats synced:', result.stats)
      } else {
        console.error('Failed to sync campaign stats:', result.error)
      }
    } catch (error) {
      console.error('Error syncing campaign stats:', error)
    } finally {
      setSyncingStats(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Campaign not found</h3>
          <p className="mt-1 text-sm text-gray-500">
            The campaign you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <NonprofitAdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.back()}
                    className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Campaigns</span>
                  </button>
                  <div className="h-6 w-px bg-gray-300" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        Created {campaign.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button className="inline-flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 rounded-lg transition-colors duration-200">
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Campaign</span>
                  </button>
                  <button className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
                    <ExternalLink className="w-4 h-4" />
                    <span>View Public Page</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Campaign Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Goal</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(campaign.goal)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Raised</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(campaign.raised)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Donors</p>
                  <p className="text-2xl font-bold text-gray-900">{donations.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Progress</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(getProgressPercentage(campaign.raised, campaign.goal))}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Campaign Progress</span>
              <span>{Math.round(getProgressPercentage(campaign.raised, campaign.goal))}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage(campaign.raised, campaign.goal)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>{formatCurrency(campaign.raised)} raised</span>
              <span>{formatCurrency(campaign.goal - campaign.raised)} remaining</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'donations', name: 'Donations', icon: Heart },
                  { id: 'marketing', name: 'Marketing', icon: Share2 },
                  { id: 'team', name: 'Team', icon: Users },
                ].map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as 'donations' | 'marketing' | 'team')}
                      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.name}</span>
                      {tab.id === 'donations' && (
                        <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                          {donations.length}
                        </span>
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'donations' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Campaign Donations ({donations.length})
                    </h3>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite Donors</span>
                      </button>
                      <button
                        onClick={syncCampaignStats}
                        disabled={syncingStats}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors duration-200"
                      >
                        {syncingStats ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Syncing...</span>
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4" />
                            <span>Sync Stats</span>
                          </>
                        )}
                      </button>
                      <button className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200">
                        <BarChart3 className="w-4 h-4" />
                        <span>Export Data</span>
                      </button>
                    </div>
                  </div>

                  {donations.length === 0 ? (
                    <div className="text-center py-12">
                      <Heart className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No donations yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        When people donate to your campaign, they'll appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {donations.map((donation) => (
                        <div 
                          key={donation.id} 
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                          onClick={() => router.push(`/donations/${donation.id}/tasks`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{donation.donorName}</h4>
                                <p className="text-sm text-gray-600">{donation.donorEmail}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                  {formatCurrency(donation.amount)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {donation.createdAt.toLocaleDateString()}
                                </p>
                              </div>

                              <div className="flex items-center space-x-2">
                                {getDonationStatusIcon(donation.status)}
                                <span className="text-sm text-gray-600 capitalize">
                                  {donation.status}
                                </span>
                              </div>

                              <div className="text-sm text-gray-500">
                                Click to view tasks →
                              </div>
                            </div>
                          </div>

                          {donation.equityDetails && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Company</p>
                                  <p className="font-medium">{donation.equityDetails.companyName}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Equity %</p>
                                  <p className="font-medium">{donation.equityDetails.equityPercentage}%</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Est. Value</p>
                                  <p className="font-medium">
                                    {formatCurrency(donation.equityDetails.estimatedValue)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'marketing' && (
                <div>
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Share Your Campaign</h3>
                    <p className="text-gray-600 mb-6">
                      Spread the word about your campaign to reach more potential donors.
                    </p>

                    {/* Share URL */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campaign URL
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={shareUrl}
                          readOnly
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(shareUrl)}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                        >
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* Social Sharing */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Share on Social Media</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                          onClick={() => shareToSocial('twitter')}
                          className="flex items-center justify-center space-x-3 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
                        >
                          <Twitter className="w-5 h-5" />
                          <span>Share on Twitter</span>
                        </button>

                        <button
                          onClick={() => shareToSocial('facebook')}
                          className="flex items-center justify-center space-x-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                        >
                          <Facebook className="w-5 h-5" />
                          <span>Share on Facebook</span>
                        </button>

                        <button
                          onClick={() => shareToSocial('email')}
                          className="flex items-center justify-center space-x-3 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                        >
                          <Mail className="w-5 h-5" />
                          <span>Share via Email</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Marketing Stats */}
                  <div className="border-t border-gray-200 pt-8">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Marketing Analytics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <Eye className="w-6 h-6 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Page Views</p>
                            <p className="text-2xl font-bold text-gray-900">1,234</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <Share2 className="w-6 h-6 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Shares</p>
                            <p className="text-2xl font-bold text-gray-900">89</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <MessageSquare className="w-6 h-6 text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                            <p className="text-2xl font-bold text-gray-900">12.5%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <CampaignAssignments 
                  campaignId={campaign.id} 
                  campaignTitle={campaign.title}
                />
              )}
            </div>
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0"
              onClick={() => setShowInviteModal(false)} />
            <InviteModal
              campaign={campaign}
              onClose={() => setShowInviteModal(false)}
              onSuccess={() => {
                setShowInviteModal(false)
                fetchInvitations()
              }}
              user={user}
              userProfile={userProfile}
              customClaims={customClaims}
            />
          </div>
        )}
      </div>
    </NonprofitAdminRoute>
  )
}

// Invite Modal Component
function InviteModal({
  campaign,
  onClose,
  onSuccess,
  user,
  userProfile,
  customClaims
}: {
  campaign: Campaign | null
  onClose: () => void
  onSuccess: () => void
  user: any
  userProfile: any
  customClaims: any
}) {
  const [formData, setFormData] = useState({
    email: '',
    message: '',
  })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaign || !userProfile || !customClaims?.organizationId) return

    setSending(true)
    setError('')

    try {
      const invitation = await createCampaignInvitation(
        {
          campaignId: campaign.id,
          invitedEmail: formData.email,
          message: formData.message,
        },
        userProfile.uid,
        userProfile.displayName || userProfile.email,
        customClaims.organizationId,
        {
          title: campaign.title,
          description: campaign.description,
          goal: campaign.goal,
          raised: campaign.raised,
        }
      )

      if (invitation) {
        // Send email via API
        try {
          const response = await fetch('/api/email/send-invitation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await user?.getIdToken()}`,
            },
            body: JSON.stringify({
              inviterName: userProfile.displayName || userProfile.email,
              invitedEmail: formData.email,
              campaignTitle: campaign.title,
              campaignDescription: campaign.description,
              campaignGoal: campaign.goal,
              campaignRaised: campaign.raised,
              message: formData.message,
              invitationToken: invitation.invitationToken,
              isExistingUser: invitation.userExists,
            }),
          })

          const emailResult = await response.json()
          if (!emailResult.success) {
            console.error('Email sending failed:', emailResult)
          }
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError)
          // Continue even if email fails
        }

        onSuccess()
      } else {
        setError('Failed to send invitation. Please try again.')
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error)
      setError(error.message || 'Failed to send invitation. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative z-10 transform transition-all">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Invite Donor</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          disabled={sending}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="donor@example.com"
            disabled={sending}
          />
          <p className="text-sm text-gray-500 mt-1">
            We'll check if they have an account and send them the appropriate invitation.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personal Message (Optional)
          </label>
          <textarea
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Add a personal message to your invitation..."
            disabled={sending}
          />
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Heart className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">
                You're inviting them to: {campaign?.title}
              </h4>
              <p className="text-sm text-blue-800 mt-1">
                They'll receive an email with details about your campaign and how to get started.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
            disabled={sending}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Invitation</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}