import { auth } from '@/lib/firebase/config'

export interface AcceptInvitationData {
  invitationId: string
  acceptanceData?: Record<string, unknown>
}

export interface AcceptInvitationResponse {
  success: boolean
  message: string
  data?: {
    invitationId: string
    participantId: string
    campaignId: string
  }
  error?: string
}

/**
 * Accept a campaign invitation and create a campaign participant record
 */
export async function acceptInvitationAndCreateParticipant(
  data: AcceptInvitationData
): Promise<AcceptInvitationResponse> {
  try {
    const user = auth.currentUser
    if (!user) {
      throw new Error('User must be authenticated')
    }

    const token = await user.getIdToken()
    const response = await fetch('/api/invitations/accept-and-create-participant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to accept invitation')
    }

    return await response.json()
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return {
      success: false,
      message: 'Failed to accept invitation',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Update participant status
 */
export async function updateParticipantStatus(
  participantId: string,
  status: 'interested' | 'in_process' | 'donation_complete'
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = auth.currentUser
    if (!user) {
      throw new Error('User must be authenticated')
    }

    const token = await user.getIdToken()
    const response = await fetch('/api/campaign-participants/update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ participantId, status })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update status')
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating participant status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}