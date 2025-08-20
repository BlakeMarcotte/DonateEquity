'use client'

import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc,
  getDoc,
  Timestamp 
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { Campaign } from '@/types/campaign'
import {
  Heart,
  Plus,
  Eye,
  Edit3,
  MoreVertical,
  Target,
  Calendar,
  TrendingUp,
  X,
  DollarSign
} from 'lucide-react'


export default function CampaignsPage() {
  const router = useRouter()
  const { userProfile, customClaims } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const fetchCampaigns = useCallback(async () => {
    if (!customClaims?.organizationId) return

    try {
      const campaignsQuery = query(
        collection(db, 'campaigns'),
        where('organizationId', '==', customClaims.organizationId),
        orderBy('createdAt', 'desc')
      )
      
      const snapshot = await getDocs(campaignsQuery)
      const campaignData = snapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          // Ensure we have currentAmount instead of raised
          currentAmount: data.currentAmount || data.raised || 0,
          donorCount: data.donorCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          endDate: data.endDate?.toDate(),
        }
      }) as Campaign[]
      
      setCampaigns(campaignData)
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }, [customClaims?.organizationId])

  useEffect(() => {
    if (customClaims?.organizationId) {
      fetchCampaigns()
    }
  }, [customClaims?.organizationId, fetchCampaigns])

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getProgressPercentage = (currentAmount: number, goal: number) => {
    return Math.min((currentAmount / goal) * 100, 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                <div className="flex items-center space-x-3">
                  <Heart className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
                    <p className="mt-1 text-sm text-gray-600">
                      Create and manage your fundraising campaigns
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Campaign</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Campaigns</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {campaigns.filter(c => c.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Raised</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(campaigns.reduce((sum, c) => sum + (c.currentAmount || 0), 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Heart className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Goal Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(campaigns.reduce((sum, c) => sum + c.goal, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Your Campaigns</h2>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by creating your first fundraising campaign.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Campaign</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1"
                        onClick={() => router.push(`/campaigns/${campaign.id}`)}
                      >
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors duration-200">
                            {campaign.title}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(campaign.status)}`}>
                            {campaign.status}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {campaign.description}
                        </p>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{Math.round(getProgressPercentage(campaign.currentAmount || 0, campaign.goal))}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${getProgressPercentage(campaign.currentAmount || 0, campaign.goal)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="w-4 h-4" />
                            <span>
                              {formatCurrency(campaign.currentAmount || 0)} of {formatCurrency(campaign.goal)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>Created {campaign.createdAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div 
                        className="flex items-center space-x-2 ml-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/campaigns/${campaign.id}`)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                          title="View Campaign Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCampaign(campaign)
                            setShowEditModal(true)
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                          title="Edit Campaign"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Campaign Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div 
              className="absolute inset-0" 
              onClick={() => setShowCreateModal(false)}
            />
            <CreateCampaignModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={() => {
                setShowCreateModal(false)
                fetchCampaigns()
              }}
              organizationId={customClaims?.organizationId || ''}
              userId={userProfile?.uid || ''}
            />
          </div>
        )}

        {/* Edit Campaign Modal */}
        {showEditModal && selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div 
              className="absolute inset-0" 
              onClick={() => {
                setShowEditModal(false)
                setSelectedCampaign(null)
              }}
            />
            <EditCampaignModal
              campaign={selectedCampaign}
              onClose={() => {
                setShowEditModal(false)
                setSelectedCampaign(null)
              }}
              onSuccess={() => {
                setShowEditModal(false)
                setSelectedCampaign(null)
                fetchCampaigns()
              }}
            />
          </div>
        )}
      </div>
    </NonprofitAdminRoute>
  )
}

// Create Campaign Modal Component
function CreateCampaignModal({ 
  onClose, 
  onSuccess, 
  organizationId, 
  userId 
}: {
  onClose: () => void
  onSuccess: () => void
  organizationId: string
  userId: string
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    goal: '',
    endDate: '',
    category: '',
    status: 'draft' as 'draft' | 'active' | 'paused' | 'completed',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizationId || !userId) return

    setSaving(true)
    try {
      // Fetch organization name
      let organizationName = 'Unknown Organization'
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
        if (orgDoc.exists()) {
          organizationName = orgDoc.data().name || 'Unknown Organization'
        }
      } catch (orgError) {
        console.error('Error fetching organization:', orgError)
      }

      const campaignData = {
        title: formData.title,
        description: formData.description,
        goal: parseInt(formData.goal),
        currentAmount: 0,
        donorCount: 0,
        status: formData.status,
        category: formData.category,
        organizationId,
        organizationName,
        createdBy: userId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        startDate: Timestamp.now(),
        endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
        tags: [],
        images: {
          hero: '',
          gallery: []
        },
        settings: {
          allowRecurring: true
        }
      }

      await addDoc(collection(db, 'campaigns'), campaignData)
      onSuccess()
    } catch (error) {
      console.error('Error creating campaign:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10 transform transition-all">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Campaign</h2>
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
              placeholder="Enter campaign title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={2}
              required
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe your campaign..."
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
                placeholder="100000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a category</option>
                <option value="Technology">Technology</option>
                <option value="Education">Education</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Environment">Environment</option>
                <option value="Arts & Culture">Arts & Culture</option>
                <option value="Community">Community</option>
                <option value="Social Impact">Social Impact</option>
                <option value="Research">Research</option>
                <option value="Emergency Relief">Emergency Relief</option>
                <option value="Other">Other</option>
              </select>
            </div>

          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'draft' | 'active' | 'paused' | 'completed' }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">Draft - Not visible to donors</option>
              <option value="active">Active - Live and accepting donations</option>
              <option value="paused">Paused - Temporarily hidden</option>
              <option value="completed">Completed - Campaign has ended</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Choose the initial status for your campaign. You can change this later.
            </p>
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
              {saving ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
    </div>
  )
}

// Edit Campaign Modal Component (simplified version)
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
    category: campaign.category || '',
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
        category: formData.category,
        updatedAt: Timestamp.now(),
      })
      onSuccess()
    } catch (error) {
      console.error('Error updating campaign:', error)
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
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a category</option>
                <option value="Technology">Technology</option>
                <option value="Education">Education</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Environment">Environment</option>
                <option value="Arts & Culture">Arts & Culture</option>
                <option value="Community">Community</option>
                <option value="Social Impact">Social Impact</option>
                <option value="Research">Research</option>
                <option value="Emergency Relief">Emergency Relief</option>
                <option value="Other">Other</option>
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