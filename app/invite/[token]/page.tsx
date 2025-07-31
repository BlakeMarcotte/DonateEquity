'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getInvitationByToken, respondToInvitation } from '@/lib/firebase/invitations'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { CampaignInvitation } from '@/types/invitations'
import { Heart, Mail, Calendar, Target, DollarSign, CheckCircle, XCircle, Clock } from 'lucide-react'

interface Campaign {
  id: string
  title: string
  description: string
  goal: number
  raised: number
  status: string
  organizationId: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export default function InvitationPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile, loading: authLoading } = useAuth()
  const [invitation, setInvitation] = useState<CampaignInvitation | null>(null)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [error, setError] = useState('')
  const [responded, setResponded] = useState(false)

  useEffect(() => {
    // If user is not authenticated, redirect to signup with invitation token
    if (!authLoading && !user) {
      router.push(`/auth/register?invitation=${params.token}`)
      return
    }
    
    // If user is authenticated, fetch invitation
    if (params.token && user) {
      fetchInvitation()
    }
  }, [params.token, user, authLoading, router])

  const fetchInvitation = async () => {
    if (!params.token) return

    try {
      const invitationData = await getInvitationByToken(params.token as string)
      
      if (!invitationData) {
        setError('Invalid or expired invitation')
        setLoading(false)
        return
      }

      // Check if invitation is expired
      if (new Date() > invitationData.expiresAt) {
        setError('This invitation has expired')
        setLoading(false)
        return
      }

      // Check if invitation has already been responded to
      if (invitationData.status !== 'pending') {
        setResponded(true)
        setInvitation(invitationData)
        setLoading(false)
        return
      }

      setInvitation(invitationData)

      // Fetch campaign details
      const campaignDoc = await getDoc(doc(db, 'campaigns', invitationData.campaignId))
      if (campaignDoc.exists()) {
        const campaignData = campaignDoc.data()
        setCampaign({
          id: campaignDoc.id,
          ...campaignData,
          createdAt: campaignData.createdAt?.toDate() || new Date(),
          updatedAt: campaignData.updatedAt?.toDate() || new Date(),
        } as Campaign)
      }
    } catch (error) {
      console.error('Error fetching invitation:', error)
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (response: 'accepted' | 'declined') => {
    if (!invitation) return

    setResponding(true)
    setError('')

    try {
      const success = await respondToInvitation(
        invitation.id, 
        response, 
        user?.uid
      )

      if (success) {
        setInvitation(prev => prev ? { ...prev, status: response } : null)
        setResponded(true)
        
        // If accepted, redirect to campaign or signup
        if (response === 'accepted') {
          if (user) {
            // User is logged in, redirect to campaign
            setTimeout(() => {
              router.push(`/campaigns/${invitation.campaignId}/donate`)
            }, 2000)
          } else {
            // User needs to sign up, redirect to signup with campaign context
            setTimeout(() => {
              router.push(`/auth/register?invitation=${params.token}&campaign=${invitation.campaignId}`)
            }, 2000)
          }
        }
      } else {
        setError('Failed to respond to invitation. Please try again.')
      }
    } catch (error) {
      console.error('Error responding to invitation:', error)
      setError('Failed to respond to invitation. Please try again.')
    } finally {
      setResponding(false)
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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (responded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          {invitation?.status === 'accepted' ? (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Accepted!</h1>
              <p className="text-gray-600 mb-6">
                Thank you for accepting the invitation. 
                {user ? ' Redirecting you to the campaign...' : ' Redirecting you to create your account...'}
              </p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Declined</h1>
              <p className="text-gray-600 mb-6">
                You have declined this invitation. You can change your mind later by contacting the campaign organizer.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">You're Invited!</h1>
          <p className="text-lg text-gray-600">
            {invitation?.inviterName} has invited you to support their campaign
          </p>
        </div>

        {/* Campaign Details */}
        {campaign && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
            <div className="p-8">
              <div className="flex items-start space-x-4 mb-6">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Heart className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{campaign.title}</h2>
                  <p className="text-gray-600 mb-4">{campaign.description}</p>
                </div>
              </div>

              {/* Campaign Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <Target className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Goal</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(campaign.goal)}</p>
                </div>
                <div className="text-center">
                  <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Raised</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(campaign.raised)}</p>
                </div>
                <div className="text-center">
                  <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Progress</p>
                  <p className="text-xl font-bold text-gray-900">
                    {Math.round(getProgressPercentage(campaign.raised, campaign.goal))}%
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
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
              </div>

              {/* Personal Message */}
              {invitation?.message && (
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">Personal Message</h3>
                  <p className="text-blue-800">{invitation.message}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleResponse('accepted')}
                  disabled={responding}
                  className="inline-flex items-center justify-center px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  {responding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Accept Invitation
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleResponse('declined')}
                  disabled={responding}
                  className="inline-flex items-center justify-center px-8 py-3 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Decline
                </button>
              </div>

              {/* User Status Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>
                    {user ? 
                      'You are already signed in. Accepting will take you directly to the campaign.' :
                      'New to our platform? Accepting will guide you through creating your account.'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>This invitation expires on {invitation?.expiresAt.toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  )
}