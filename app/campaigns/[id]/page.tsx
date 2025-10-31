'use client'

import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  updateDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { createCampaignInvitation, getCampaignInvitations } from '@/lib/firebase/invitations'
import { CampaignInvitation } from '@/types/invitations'
import { Campaign } from '@/types/campaign'
import { Donation } from '@/types/donation'
import { secureLogger } from '@/lib/logging/secure-logger'
import CampaignAssignments from '@/components/campaigns/CampaignAssignments'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  ArrowLeft,
  Users,
  Share2,
  Mail,
  Facebook,
  Twitter,
  Copy,
  Edit3,
  MessageSquare,
  Eye,
  CheckCircle,
  Clock,
  UserPlus,
  X,
  Send,
  CheckCircle2,
  ChevronDown
} from 'lucide-react'



interface CampaignParticipant {
  userId: string // Maps to userId in the database
  donorName: string
  donorEmail: string
  participantId: string
  joinedAt: Date
  status: 'active' | 'completed'
  hasDonation: boolean
  donation?: Donation
  taskProgress?: {
    total: number
    completed: number
  }
}

interface CampaignTask {
  id: string
  title: string
  description: string
  status: 'not_started' | 'in_progress' | 'complete'
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile, customClaims } = useAuth()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [participants, setParticipants] = useState<CampaignParticipant[]>([])
  const [, setInvitations] = useState<unknown[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<CampaignInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'tasks' | 'donations' | 'marketing' | 'team' | 'pending'>('tasks')
  const [shareUrl, setShareUrl] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [campaignTasks, setCampaignTasks] = useState<CampaignTask[]>([])

  // Load campaign tasks from Firestore
  useEffect(() => {
    if (!params.id || !userProfile?.uid || !user) return

    const fetchCampaignTasks = async () => {
      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/tasks/completion', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const result = await response.json()
        if (result.success) {
          const campaignKey = params.id as string
          const campaignCompletions = result.completions.campaigns?.[campaignKey] || {}

          const tasks: CampaignTask[] = [
            {
              id: 'marketing',
              title: 'Create Marketing Materials',
              description: 'Set up your campaign description, images, and story to attract donors. Visit the Marketing tab to add your campaign details.',
              status: (campaignCompletions['marketing'] as 'not_started' | 'in_progress' | 'complete') || 'not_started'
            },
            {
              id: 'team',
              title: 'Invite Internal Team Members',
              description: 'Add team members from your organization to help manage this campaign. Visit the Team tab to invite collaborators.',
              status: (campaignCompletions['team'] as 'not_started' | 'in_progress' | 'complete') || 'not_started'
            },
            {
              id: 'donors',
              title: 'Invite Donors',
              description: 'Start inviting potential donors to your campaign. They will receive an invitation to participate and contribute.',
              status: (campaignCompletions['donors'] as 'not_started' | 'in_progress' | 'complete') || 'not_started'
            }
          ]

          setCampaignTasks(tasks)
        }
      } catch (error) {
        console.error('Error fetching campaign tasks:', error)
      }
    }

    fetchCampaignTasks()
  }, [params.id, userProfile?.uid, user])

  const handleSetCampaignTaskStatus = async (taskId: string, newStatus: 'not_started' | 'in_progress' | 'complete') => {
    if (!userProfile?.uid || !user) return

    // Update state immediately
    setCampaignTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: newStatus } : t
    ))

    // Save to Firestore
    try {
      const token = await user.getIdToken()
      await fetch('/api/tasks/completion', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskType: 'campaign',
          campaignId: params.id,
          taskId,
          status: newStatus
        })
      })
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const fetchCampaignDetails = useCallback(async () => {
    if (!params.id) return

    try {
      const campaignDoc = await getDoc(doc(db, 'campaigns', params.id as string))
      if (campaignDoc.exists()) {
        const data = campaignDoc.data()

        // Check if the campaign belongs to the user's organization
        if (customClaims?.organizationId && data.organizationId !== customClaims.organizationId) {
          secureLogger.error('Access denied: Campaign does not belong to organization', new Error('Access denied'), {
          campaignId: params.id,
          userOrganizationId: customClaims?.organizationId,
          campaignOrganizationId: data.organizationId
        })
          return
        }

        setCampaign({
          id: campaignDoc.id,
          title: data.title,
          description: data.description,
          goal: data.goal,
          currentAmount: data.raised || data.currentAmount || 0,
          donorCount: data.donorCount || 0,
          status: data.status,
          organizationId: data.organizationId,
          organizationName: data.organizationName || '',
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate(),
          images: {
            hero: data.images?.hero || '',
            gallery: data.images?.gallery || []
          },
          settings: {
            minimumDonation: data.settings?.minimumDonation,
            maximumDonation: data.settings?.maximumDonation,
            allowRecurring: data.settings?.allowRecurring || false
          }
        })
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id, customClaims?.organizationId])

  const fetchDonations = useCallback(async () => {
    if (!params.id) return []

    // Removed console logs to prevent spam

    try {
      // First try with orderBy, if that fails due to index issues, try without
      const donationsQuery = query(
        collection(db, 'donations'),
        where('campaignId', '==', params.id),
        orderBy('createdAt', 'desc')
      )

      // Executing query with orderBy
      const snapshot = await getDocs(donationsQuery)
      // Found donations
      
      const donationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Donation[]

      // Processed donation data
      setDonations(donationData)
      return donationData
    } catch (error) {
      console.error('fetchDonations: Error with orderBy, trying without...', error)
      
      try {
        // Fallback: try without orderBy
        const simpleQuery = query(
          collection(db, 'donations'),
          where('campaignId', '==', params.id)
        )

        // Executing simple query
        const snapshot = await getDocs(simpleQuery)
        // Found donations (simple)
        
        const donationData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Donation[]

        // Sort manually since we couldn't orderBy in the query
        donationData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        // Processed donation data (simple)
        setDonations(donationData)
        return donationData
      } catch (secondError) {
        console.error('fetchDonations: Error with simple query too:', secondError)
        // If we can't fetch donations due to permissions, set empty array
        // This allows the page to still load and show the campaign details
        setDonations([])
        return []
      }
    }
  }, [params.id])

  const fetchParticipants = useCallback(async (donationData: Donation[] = donations) => {
    if (!params.id) return

    try {
      // Build participants directly from donations - no need for campaign_participants collection
      const fullParticipants: CampaignParticipant[] = donationData.map(donation => {
        return {
          userId: donation.donorId,
          donorName: donation.donorName || 'Unknown Donor',
          donorEmail: donation.donorEmail || 'Unknown Email',
          participantId: donation.id, // Use donation ID as participant ID
          joinedAt: donation.createdAt,
          status: 'active' as const,
          hasDonation: true,
          donation: donation,
          taskProgress: {
            total: 0,
            completed: 0
          }
        }
      })

      setParticipants(fullParticipants)
    } catch (error) {
      console.error('fetchParticipants: Error fetching participants:', error)
      console.error('fetchParticipants: Error details:', {
        code: (error as { code?: string })?.code,
        message: (error as Error)?.message,
        name: (error as Error)?.name
      })
      setParticipants([])
    }
  }, [params.id, donations])

  const fetchInvitations = useCallback(async () => {
    if (!params.id) return

    try {
      const invitationData = await getCampaignInvitations(params.id as string)
      setInvitations(invitationData)
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setInvitations([])
    }
  }, [params.id])

  const fetchPendingInvitations = useCallback(async () => {
    if (!params.id) return

    // Looking for pending invitations

    try {
      // Fetch pending campaign invitations for this campaign
      let pendingQuery = query(
        collection(db, 'campaign_invitations'),
        where('campaignId', '==', params.id),
        where('status', '==', 'pending'),
        orderBy('invitedAt', 'desc')
      )

      // Executing query
      let snapshot
      
      try {
        snapshot = await getDocs(pendingQuery)
      } catch {
        // OrderBy failed, trying without
        // Fallback without orderBy
        pendingQuery = query(
          collection(db, 'campaign_invitations'),
          where('campaignId', '==', params.id),
          where('status', '==', 'pending')
        )
        snapshot = await getDocs(pendingQuery)
      }
      
      // Found pending invitations
      
      const pendingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        invitedAt: doc.data().invitedAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate() || null,
      })) as CampaignInvitation[]

      // Processed pending invitations
      setPendingInvitations(pendingData)
    } catch (error) {
      console.error('fetchPendingInvitations: Error fetching pending invitations:', error)
      setPendingInvitations([])
    }
  }, [params.id])

  useEffect(() => {
    if (params.id) {
      fetchCampaignDetails()
      fetchDonations().then((donationData) => {
        // Fetch participants after donations are loaded
        fetchParticipants(donationData)
      })
      fetchInvitations()
      fetchPendingInvitations()
      setShareUrl(`${window.location.origin}/campaigns/${params.id}/donate`)
    }
    // Only include actual data dependencies, not the functions themselves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, customClaims?.organizationId])

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

  const getStatusVariant = (status: string): 'success' | 'default' | 'warning' | 'info' => {
    switch (status) {
      case 'active':
        return 'success'
      case 'draft':
        return 'default'
      case 'paused':
        return 'warning'
      case 'completed':
        return 'info'
      default:
        return 'default'
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
            {`The campaign you're looking for doesn't exist or has been removed.`}
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
                      <Badge variant={getStatusVariant(campaign.status)} size="sm" className="capitalize">
                        {campaign.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Created {campaign.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-medium border border-gray-300 rounded-lg transition-colors duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit Campaign</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Bar */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Campaign Progress</span>
              <span>{Math.round(getProgressPercentage(campaign.currentAmount, campaign.goal))}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage(campaign.currentAmount, campaign.goal)}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>{formatCurrency(campaign.currentAmount)} raised</span>
              <span>{formatCurrency(campaign.goal - campaign.currentAmount)} remaining</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'tasks', name: 'Tasks', icon: CheckCircle },
                  { id: 'donations', name: 'Donation Projects', icon: Users },
                  { id: 'pending', name: 'Pending Donor Invitations', icon: Clock },
                  { id: 'marketing', name: 'Marketing', icon: Share2 },
                  { id: 'team', name: 'Team', icon: Heart },
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
                        <Badge variant="default" size="sm">
                          {participants.length}
                        </Badge>
                      )}
                      {tab.id === 'pending' && (
                        <Badge variant="warning" size="sm">
                          {pendingInvitations.length}
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'tasks' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    Campaign Setup Tasks
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Complete these tasks to get your campaign ready for donors.
                  </p>

                  {/* Progress Overview */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-gray-900">Setup Progress</h4>
                      <span className="text-2xl font-bold text-blue-600">
                        {campaignTasks.filter(t => t.status === 'complete').length}/{campaignTasks.length}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${campaignTasks.length > 0 ? (campaignTasks.filter(t => t.status === 'complete').length / campaignTasks.length) * 100 : 0}%`
                        }}
                      ></div>
                    </div>

                    <p className="text-sm text-gray-600">
                      {campaignTasks.filter(t => t.status === 'complete').length === campaignTasks.length
                        ? "🎉 Great job! You've completed all setup tasks. Your campaign is ready to receive donors!"
                        : `${campaignTasks.length - campaignTasks.filter(t => t.status === 'complete').length} task${campaignTasks.length - campaignTasks.filter(t => t.status === 'complete').length === 1 ? '' : 's'} remaining to complete your campaign setup.`
                      }
                    </p>
                  </div>

                  <div className="space-y-4">
                    {campaignTasks.map((task, index) => (
                      <div
                        key={task.id}
                        className={`border rounded-lg p-6 transition-all duration-200 ${
                          task.status === 'complete' ? 'border-green-200 bg-green-50' :
                          task.status === 'in_progress' ? 'border-blue-200 bg-blue-50' :
                          'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {/* Number Badge */}
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              task.status === 'complete' ? 'bg-green-600' :
                              task.status === 'in_progress' ? 'bg-blue-600' :
                              'bg-gray-300'
                            }`}>
                              {task.status === 'complete' ? (
                                <CheckCircle2 className="w-5 h-5 text-white" />
                              ) : task.status === 'in_progress' ? (
                                <Clock className="w-5 h-5 text-white" />
                              ) : (
                                <span className="text-sm font-semibold text-gray-600">{index + 1}</span>
                              )}
                            </div>

                            {/* Task Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className={`text-lg font-semibold ${
                                  task.status === 'complete' ? 'text-green-900 line-through' : 'text-gray-900'
                                }`}>
                                  {task.title}
                                </h4>
                                {task.status === 'in_progress' && (
                                  <Badge variant="info" size="sm">In Progress</Badge>
                                )}
                                {task.status === 'complete' && (
                                  <Badge variant="success" size="sm">Complete</Badge>
                                )}
                              </div>
                              <p className="text-gray-600 mb-4">
                                {task.description}
                              </p>

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-3">
                                {task.status !== 'complete' && (
                                  <>
                                    {index === 0 && (
                                      <button
                                        onClick={() => setActiveTab('marketing')}
                                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                                      >
                                        <Share2 className="w-4 h-4" />
                                        <span>Go to Marketing</span>
                                      </button>
                                    )}
                                    {index === 1 && (
                                      <button
                                        onClick={() => setActiveTab('team')}
                                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                                      >
                                        <Heart className="w-4 h-4" />
                                        <span>Go to Team</span>
                                      </button>
                                    )}
                                    {index === 2 && (
                                      <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                                      >
                                        <UserPlus className="w-4 h-4" />
                                        <span>Invite Donors</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status Dropdown */}
                          <div className="flex-shrink-0 ml-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Status
                            </label>
                            <div className="relative">
                              <select
                                value={task.status}
                                onChange={(e) => handleSetCampaignTaskStatus(task.id, e.target.value as 'not_started' | 'in_progress' | 'complete')}
                                className={`appearance-none w-full px-3 py-2 pr-8 text-sm font-medium rounded-lg border transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  task.status === 'complete'
                                    ? 'bg-green-50 text-green-700 border-green-300'
                                    : task.status === 'in_progress'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-gray-50 text-gray-700 border-gray-300'
                                }`}
                              >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="complete">Complete</option>
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'donations' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Campaign Donors ({participants.length})
                    </h3>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite Donors</span>
                      </button>
                    </div>
                  </div>

                  {participants.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No participants yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {`When people join your campaign, they'll appear here.`}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {participants.map((participant) => (
                        <div 
                          key={participant.participantId} 
                          className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                          onClick={() => {
                            // Navigate to donor's shared task list using participantId
                            if (participant.donation) {
                              // If they have a donation, use the existing donation tasks flow
                              router.push(`/donations/${participant.donation.id}/tasks`)
                            } else {
                              // If no donation yet, navigate to participant task flow
                              router.push(`/campaigns/${params.id}/participants/${participant.userId}/tasks`)
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{participant.donorName}</h4>
                                <p className="text-sm text-gray-600">{participant.donorEmail}</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="text-right">
                                {participant.status === 'completed' && participant.donation ? (
                                  <>
                                    <p className="font-semibold text-gray-900">
                                      {formatCurrency(participant.donation.amount)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Donated {participant.donation.createdAt.toLocaleDateString()}
                                    </p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-sm text-gray-600">
                                      Joined {participant.joinedAt.toLocaleDateString()}
                                    </p>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                {participant.status === 'completed' ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-600">
                                      Completed
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm text-blue-600">
                                      Active
                                    </span>
                                  </>
                                )}
                                <span className="text-sm text-gray-500 ml-4">
                                  View tasks →
                                </span>
                              </div>
                            </div>
                          </div>

                          {participant.donation?.commitmentDetails && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">Organization</p>
                                  <p className="font-medium">{participant.donation.commitmentDetails.donorOrganizationName || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Est. Value</p>
                                  <p className="font-medium">
                                    {formatCurrency(participant.donation.commitmentDetails.estimatedValue || 0)}
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

              {activeTab === 'pending' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Pending Invitations ({pendingInvitations.length})
                    </h3>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Send New Invitation</span>
                      </button>
                      <button
                        onClick={fetchPendingInvitations}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Refresh</span>
                      </button>
                    </div>
                  </div>

                  {pendingInvitations.length === 0 ? (
                    <div className="text-center py-12">
                      <Clock className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No pending invitations</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {`All invitations have been responded to, or you haven't sent any yet.`}
                      </p>
                      <div className="mt-6">
                        <button
                          onClick={() => setShowInviteModal(true)}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                        >
                          <UserPlus className="w-4 h-4" />
                          <span>Send First Invitation</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingInvitations.map((invitation) => (
                        <div 
                          key={invitation.id} 
                          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:bg-yellow-100 transition-colors duration-200"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Clock className="w-5 h-5 text-yellow-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{invitation.invitedEmail}</h4>
                                <p className="text-sm text-gray-600">
                                  Invited by {invitation.inviterName}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="font-medium text-yellow-700">
                                  Waiting for Response
                                </p>
                                <p className="text-sm text-gray-600">
                                  Sent {invitation.invitedAt.toLocaleDateString()}
                                </p>
                                {invitation.expiresAt && (
                                  <p className="text-xs text-gray-500">
                                    Expires {invitation.expiresAt.toLocaleDateString()}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    // Copy invitation URL to clipboard
                                    const invitationUrl = `${window.location.origin}/invite/${invitation.invitationToken}`
                                    navigator.clipboard.writeText(invitationUrl)
                                    // You could add a toast notification here
                                  }}
                                  className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm rounded-md transition-colors duration-200"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Link</span>
                                </button>
                                
                                <button
                                  onClick={() => {
                                    // TODO: Implement resend functionality
                                    console.log('Resend invitation:', invitation.id)
                                  }}
                                  className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 text-sm rounded-md transition-colors duration-200"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Resend</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {invitation.message && (
                            <div className="mt-3 pt-3 border-t border-yellow-200">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Personal message:</span> {invitation.message}
                              </p>
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

        {/* Edit Campaign Modal */}
        {showEditModal && campaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="absolute inset-0 bg-black/50"
              onClick={() => setShowEditModal(false)} />
            <EditCampaignModal
              campaign={campaign}
              onClose={() => setShowEditModal(false)}
              onSuccess={() => {
                setShowEditModal(false)
                fetchCampaignDetails()
              }}
            />
          </div>
        )}
      </div>
    </NonprofitAdminRoute>
  )
}

// Edit Campaign Modal Component
function EditCampaignModal({
  campaign,
  onClose,
  onSuccess
}: {
  campaign: Campaign
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    title: campaign.title,
    description: campaign.description,
    goal: campaign.goal.toString(),
    status: campaign.status,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await updateDoc(doc(db, 'campaigns', campaign.id), {
        title: formData.title,
        description: formData.description,
        goal: parseInt(formData.goal),
        status: formData.status,
        updatedAt: Timestamp.now(),
      })
      onSuccess()
    } catch (error) {
      secureLogger.error('Error updating campaign', error, { campaignId: campaign.id })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 transform transition-all">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Campaign</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Funding Goal ($)
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.goal}
                onChange={(e) => setFormData(prev => ({ ...prev, goal: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as Campaign['status'] }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
    </div>
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
  user: { getIdToken(): Promise<string> } | null
  userProfile: { uid: string; displayName?: string; email?: string } | null
  customClaims: { organizationId?: string } | null
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
        userProfile?.uid || '',
        userProfile?.displayName || userProfile?.email || '',
        customClaims.organizationId,
        {
          title: campaign.title,
          description: campaign.description,
          goal: campaign.goal,
          raised: campaign.currentAmount,
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
              campaignRaised: campaign.currentAmount,
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
    } catch (error: unknown) {
      console.error('Error sending invitation:', error)
      setError(error instanceof Error ? error.message : 'Failed to send invitation. Please try again.')
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
            {`We'll check if they have an account and send them the appropriate invitation.`}
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
                {`You're inviting them to: ${campaign?.title}`}
              </h4>
              <p className="text-sm text-blue-800 mt-1">
                {`They'll receive an email with details about your campaign and how to get started.`}
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
            className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
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