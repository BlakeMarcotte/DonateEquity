import { db } from '@/lib/firebase/config'
import { doc, getDoc } from 'firebase/firestore'

/**
 * Helper function to get the correct task page URL based on available information
 * Prioritizes participant-based URLs over donation-based URLs
 */
export async function getTaskPageUrl(
  donationId?: string | null,
  campaignId?: string | null,
  donorId?: string | null,
  participantId?: string | null
): Promise<string> {
  // If we already have participantId, use it directly
  if (participantId) {
    const [campaignIdFromParticipant, donorIdFromParticipant] = participantId.split('_')
    return `/campaigns/${campaignIdFromParticipant}/participants/${donorIdFromParticipant}/tasks`
  }

  // If we have both campaignId and donorId, construct participant URL
  if (campaignId && donorId) {
    return `/campaigns/${campaignId}/participants/${donorId}/tasks`
  }

  // If we only have donationId, use donation-based URL directly
  if (donationId) {
    return `/donations/${donationId}/tasks`
  }

  // Fallback to tasks dashboard
  return '/tasks'
}

/**
 * Construct participant ID from campaign and donor IDs
 */
export function constructParticipantId(campaignId: string, donorId: string): string {
  return `${campaignId}_${donorId}`
}

/**
 * Parse participant ID to get campaign and donor IDs
 */
export function parseParticipantId(participantId: string): { campaignId: string; donorId: string } | null {
  const parts = participantId.split('_')
  if (parts.length !== 2) {
    return null
  }
  return {
    campaignId: parts[0],
    donorId: parts[1]
  }
}