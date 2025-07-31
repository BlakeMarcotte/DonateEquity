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
      // If user is already logged in and has an invitation, redirect to campaign
      if (campaignId) {
        router.push(`/campaigns/${campaignId}/donate`)
      } else {
        router.push('/dashboard')
      }
    }
  }, [user, loading, router, campaignId])

  useEffect(() => {
    if (invitationToken) {
      fetchInvitation()
    }
  }, [invitationToken])

  const fetchInvitation = async () => {
    if (!invitationToken) return

    setInvitationLoading(true)
    try {
      const invitationData = await getInvitationByToken(invitationToken)
      if (invitationData) {
        setInvitation(invitationData)
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
        onSuccessRedirect={campaignId ? `/campaigns/${campaignId}/donate` : '/dashboard'}
      />
    </AuthLayout>
  )
}