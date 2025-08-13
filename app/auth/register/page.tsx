'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { CampaignInvitation } from '@/types/invitations'
import { NonprofitSubrole } from '@/types/auth'
import AuthLayout from '@/components/auth/AuthLayout'
import RegisterForm from '@/components/auth/RegisterForm'

interface TeamInvitation {
  organizationName: string
  inviterName: string
  invitedEmail: string
  subrole: NonprofitSubrole
  personalMessage?: string
  createdAt: Date
  expiresAt: Date
}

interface AppraiserInvitation {
  id: string
  donationId: string
  appraiserEmail: string
  appraiserName: string | null
  inviterName: string
  inviterEmail: string
  personalMessage: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  userExists: boolean
  existingUserId: string | null
  invitedAt: Date
  expiresAt: Date
}

function RegisterPage() {
  const { user, loading, customClaims } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invitation, setInvitation] = useState<CampaignInvitation | null>(null)
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [teamInvitation, setTeamInvitation] = useState<TeamInvitation | null>(null)
  const [teamInvitationLoading, setTeamInvitationLoading] = useState(false)
  const [appraiserInvitation, setAppraiserInvitation] = useState<AppraiserInvitation | null>(null)
  const [appraiserInvitationLoading, setAppraiserInvitationLoading] = useState(false)

  const invitationToken = searchParams.get('invitation')
  const teamInviteToken = searchParams.get('teamInvite')
  const appraiserInvitationToken = searchParams.get('appraiserInvitation')
  const campaignId = searchParams.get('campaign')
  const roleParam = searchParams.get('role')
  const redirectParam = searchParams.get('redirect')
  const returnUrl = searchParams.get('returnUrl')
  const emailParam = searchParams.get('email')

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
        // Role-based redirect
        switch (customClaims?.role) {
          case 'donor':
            router.push('/my-campaign')
            break
          case 'appraiser':
            router.push('/my-campaign')
            break
          case 'nonprofit_admin':
            router.push('/tasks')
            break
          default:
            router.push('/dashboard')
        }
      }
    }
  }, [user, loading, router, campaignId, invitationToken, invitation, redirectParam, customClaims])

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
          // Convert date strings back to Date objects
          const teamInvitation = {
            ...data.invitation,
            createdAt: new Date(data.invitation.createdAt),
            expiresAt: new Date(data.invitation.expiresAt)
          }
          setTeamInvitation(teamInvitation)
        }
      }
    } catch (error) {
      console.error('Error fetching team invitation:', error)
    } finally {
      setTeamInvitationLoading(false)
    }
  }, [teamInviteToken])

  const fetchAppraiserInvitation = useCallback(async () => {
    if (!appraiserInvitationToken) return

    setAppraiserInvitationLoading(true)
    try {
      const response = await fetch(`/api/appraiser/invitations/${appraiserInvitationToken}`)
      
      if (response.ok) {
        const { invitation: invitationData } = await response.json()
        if (invitationData) {
          // Convert date strings back to Date objects
          const appraiserInvitation = {
            ...invitationData,
            invitedAt: new Date(invitationData.invitedAt),
            expiresAt: new Date(invitationData.expiresAt)
          }
          setAppraiserInvitation(appraiserInvitation)
        }
      }
    } catch (error) {
      console.error('Error fetching appraiser invitation:', error)
    } finally {
      setAppraiserInvitationLoading(false)
    }
  }, [appraiserInvitationToken])

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

  useEffect(() => {
    if (appraiserInvitationToken) {
      fetchAppraiserInvitation()
    }
  }, [appraiserInvitationToken, fetchAppraiserInvitation])

  if (loading || invitationLoading || teamInvitationLoading || appraiserInvitationLoading) {
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
        teamInvitation={teamInvitation ? {...teamInvitation} as Record<string, unknown> : undefined}
        teamInviteToken={teamInviteToken}
        appraiserInvitation={appraiserInvitation}
        appraiserInvitationToken={appraiserInvitationToken}
        emailParam={emailParam}
        preselectedRole={
          invitation ? 'donor' : 
          appraiserInvitation ? 'appraiser' :
          roleParam as 'donor' | 'nonprofit_admin' | 'appraiser' | null
        }
        onSuccessRedirect={
          returnUrl 
            ? returnUrl
            : redirectParam 
              ? redirectParam
              : appraiserInvitation
                ? '/my-campaign'
                : campaignId && invitationToken && invitation
                  ? '/my-campaign'
                  : campaignId 
                    ? `/campaigns/${campaignId}/donate` 
                    : undefined
        }
      />
    </AuthLayout>
  )
}

function RegisterPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <RegisterPage />
    </Suspense>
  )
}

export default RegisterPageWrapper