'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getInvitationByToken } from '@/lib/firebase/invitations'
import { CampaignInvitation } from '@/types/invitations'
import AuthLayout from '@/components/auth/AuthLayout'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invitation, setInvitation] = useState<CampaignInvitation | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(false)

  const invitationToken = searchParams.get('invitation')
  const campaignId = searchParams.get('campaign')

  useEffect(() => {
    if (!loading && user) {
      // If user is already logged in and has an invitation, redirect to campaign with context
      if (campaignId && invitationToken && invitation) {
        const inviterName = encodeURIComponent(invitation.inviterName)
        const message = invitation.message ? encodeURIComponent(invitation.message) : ''
        const redirectUrl = `/campaigns/${campaignId}/donate?invitation=${invitationToken}&inviter=${inviterName}${message ? `&message=${message}` : ''}`
        router.push(redirectUrl)
      } else if (campaignId) {
        router.push(`/campaigns/${campaignId}/donate`)
      } else {
        router.push('/dashboard')
      }
    }
  }, [user, loading, router, campaignId, invitationToken, invitation])

  useEffect(() => {
    if (invitationToken) {
      fetchInvitation()
    }
  }, [invitationToken])

  const fetchInvitation = async () => {
    if (!invitationToken) return

    setInvitationLoading(true)
    try {
      const response = await fetch(`/api/invitations/get-by-token?token=${invitationToken}`)
      
      if (response.ok) {
        const { invitation: invitationData } = await response.json()
        if (invitationData) {
          // Convert date strings back to Date objects
          const invitation = {
            ...invitationData,
            invitedAt: new Date(invitationData.invitedAt),
            expiresAt: new Date(invitationData.expiresAt),
            respondedAt: invitationData.respondedAt ? new Date(invitationData.respondedAt) : undefined
          }
          setInvitation(invitation)
        }
      }
    } catch (error) {
      console.error('Error fetching invitation:', error)
    } finally {
      setInvitationLoading(false)
    }
  }

  if (loading || invitationLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return null
  }

  return (
    <AuthLayout mode="register">
      <RegisterForm 
        invitation={invitation}
        onSuccessRedirect={
          campaignId && invitationToken && invitation
            ? `/campaigns/${campaignId}/donate?invitation=${invitationToken}&inviter=${encodeURIComponent(invitation.inviterName)}${invitation.message ? `&message=${encodeURIComponent(invitation.message)}` : ''}`
            : campaignId 
              ? `/campaigns/${campaignId}/donate` 
              : '/dashboard'
        }
      />
    </AuthLayout>
  )
}