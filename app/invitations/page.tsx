'use client'

import { DonorRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { getUserInvitations, respondToInvitation } from '@/lib/firebase/invitations'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { CampaignInvitation } from '@/types/invitations'
import { Mail, Heart, CheckCircle, XCircle, Clock, Calendar, Target, DollarSign } from 'lucide-react'

interface Campaign {
  id: string
  title: string
  description: string
  goal: number
  raised: number
  status: string
  organizationId: string
  createdAt: Date
}

interface InvitationWithCampaign extends CampaignInvitation {
  campaign?: Campaign
}

export default function InvitationsPage() {
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<InvitationWithCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    if (!user) return

    try {
      const userInvitations = await getUserInvitations(user.uid, user.email || undefined)
      
      // Fetch campaign details for each invitation
      const invitationsWithCampaigns = await Promise.all(
        userInvitations.map(async (invitation) => {
          try {
            const campaignDoc = await getDoc(doc(db, 'campaigns', invitation.campaignId))
            if (campaignDoc.exists()) {
              const campaignData = campaignDoc.data()
              return {
                ...invitation,
                campaign: {
                  id: campaignDoc.id,
                  ...campaignData,
                  createdAt: campaignData.createdAt?.toDate() || new Date(),
                } as Campaign
              }
            }
            return invitation
          } catch (error) {
            console.error('Error fetching campaign:', error)
            return invitation
          }
        })
      )

      setInvitations(invitationsWithCampaigns)
    } catch (error) {
      console.error('Error fetching invitations:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  const handleResponse = async (invitationId: string, response: 'accepted' | 'declined') => {
    setResponding(invitationId)

    try {
      if (response === 'accepted') {
        // Use the API endpoint for accepting
        const idToken = await user?.getIdToken()
        
        const apiResponse = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            invitationId: invitationId
          })
        })
        
        if (apiResponse.ok) {
          setInvitations(prev => 
            prev.map(inv => 
              inv.id === invitationId 
                ? { ...inv, status: response, respondedAt: new Date() }
                : inv
            )
          )
        } else {
          const error = await apiResponse.json()
          console.error('Error accepting invitation:', error)
          console.error('Response status:', apiResponse.status)
          console.error('Response statusText:', apiResponse.statusText)
        }
      } else {
        // For decline, use the original function
        const success = await respondToInvitation(invitationId, response, user?.uid)
        
        if (success) {
          setInvitations(prev => 
            prev.map(inv => 
              inv.id === invitationId 
                ? { ...inv, status: response, respondedAt: new Date() }
                : inv
            )
          )
        }
      }
    } catch (error) {
      console.error('Error responding to invitation:', error)
    } finally {
      setResponding(null)
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
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'declined':
        return 'bg-red-100 text-red-800'
      case 'expired':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')
  const respondedInvitations = invitations.filter(inv => inv.status !== 'pending')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <DonorRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-3">
                <Mail className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Campaign Invitations</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    Manage your campaign invitations and donation opportunities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Pending Invitations ({pendingInvitations.length})
              </h2>
              <div className="space-y-6">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <Heart className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              {invitation.campaign?.title || 'Campaign'}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Invited by {invitation.inviterName} on {invitation.invitedAt.toLocaleDateString()}
                            </p>
                            {invitation.message && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  <span className="font-medium">Personal message:</span> {invitation.message}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                          {invitation.status}
                        </span>
                      </div>

                      {invitation.campaign && (
                        <div className="mb-6">
                          <p className="text-gray-600 mb-4">{invitation.campaign.description}</p>
                          
                          {/* Campaign Stats */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                            <div className="text-center">
                              <Target className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Goal</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(invitation.campaign.goal)}</p>
                            </div>
                            <div className="text-center">
                              <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Raised</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(invitation.campaign.raised)}</p>
                            </div>
                            <div className="text-center">
                              <Calendar className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">Progress</p>
                              <p className="text-lg font-bold text-gray-900">
                                {Math.round(getProgressPercentage(invitation.campaign.raised, invitation.campaign.goal))}%
                              </p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                              <span>Campaign Progress</span>
                              <span>{Math.round(getProgressPercentage(invitation.campaign.raised, invitation.campaign.goal))}% Complete</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${getProgressPercentage(invitation.campaign.raised, invitation.campaign.goal)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => handleResponse(invitation.id, 'accepted')}
                          disabled={responding === invitation.id}
                          className="inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
                        >
                          {responding === invitation.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-5 h-5 mr-2" />
                              Accept & Donate
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleResponse(invitation.id, 'declined')}
                          disabled={responding === invitation.id}
                          className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
                        >
                          <XCircle className="w-5 h-5 mr-2" />
                          Decline
                        </button>
                      </div>

                      {/* Expiration Notice */}
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                        <div className="flex items-center space-x-2 text-sm text-yellow-800">
                          <Clock className="w-4 h-4" />
                          <span>This invitation expires on {invitation.expiresAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous Invitations */}
          {respondedInvitations.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Previous Invitations ({respondedInvitations.length})
              </h2>
              <div className="space-y-4">
                {respondedInvitations.map((invitation) => (
                  <div key={invitation.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <Heart className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {invitation.campaign?.title || 'Campaign'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Invited by {invitation.inviterName} • {invitation.status} on {invitation.respondedAt?.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
                        {invitation.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {invitations.length === 0 && (
            <div className="text-center py-12">
              <Mail className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No invitations</h3>
              <p className="mt-1 text-sm text-gray-500">
                {`You don't have any campaign invitations yet. When nonprofits invite you to support their campaigns, they'll appear here.`}
              </p>
            </div>
          )}
        </div>
      </div>
    </DonorRoute>
  )
}