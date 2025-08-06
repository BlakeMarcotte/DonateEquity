'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CampaignInvitation } from '@/types/invitations'
import AuthLayout from '@/components/auth/AuthLayout'
import RegisterForm from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invitation, setInvitation] = useState<CampaignInvitation | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [teamInvitation, setTeamInvitation] = useState<any>(null)
  const [teamInvitationLoading, setTeamInvitationLoading] = useState(false)

  const invitationToken = searchParams.get('invitation')
  const teamInviteToken = searchParams.get('teamInvite')
  const campaignId = searchParams.get('campaign')
  const roleParam = searchParams.get('role')
  const redirectParam = searchParams.get('redirect')
  const returnUrl = searchParams.get('returnUrl')

  useEffect(() => {
    if (!loading && user) {
      // If user is already logged in, handle redirects
      if (redirectParam) {
        // Appraiser invitation redirect
        router.push(redirectParam)
      } else if (campaignId && invitationToken && invitation) {
        // Campaign invitation redirect - take donor to my-campaign page
        router.push('/my-campaign')
      } else if (campaignId) {
        router.push(`/campaigns/${campaignId}/donate`)
      } else {
        router.push('/organization')
      }
    }
  }, [user, loading, router, campaignId, invitationToken, invitation, redirectParam])

  const fetchInvitation = useCallback(async () => {
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
  }, [invitationToken])

  const fetchTeamInvitation = useCallback(async () => {
    if (!teamInviteToken) return

    setTeamInvitationLoading(true)
    try {
      const response = await fetch(`/api/organizations/join?token=${teamInviteToken}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.invitation) {
          setTeamInvitation(data.invitation)
        }
      }
    } catch (error) {
      console.error('Error fetching team invitation:', error)
    } finally {
      setTeamInvitationLoading(false)
    }
  }, [teamInviteToken])

  useEffect(() => {
    if (invitationToken) {
      fetchInvitation()
    }
  }, [invitationToken, fetchInvitation])

  useEffect(() => {
    if (teamInviteToken) {
      fetchTeamInvitation()
    }
  }, [teamInviteToken, fetchTeamInvitation])

  if (loading || invitationLoading || teamInvitationLoading) {
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
        teamInvitation={teamInvitation}
        teamInviteToken={teamInviteToken}
        preselectedRole={
          invitation ? 'donor' : 
          roleParam as 'donor' | 'nonprofit_admin' | 'appraiser' | null
        }
        onSuccessRedirect={
          returnUrl 
            ? returnUrl
            : redirectParam 
              ? redirectParam
              : campaignId && invitationToken && invitation
                ? '/my-campaign'
                : campaignId 
                  ? `/campaigns/${campaignId}/donate` 
                  : '/organization'
        }
      />
    </AuthLayout>
  )
}