import { Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'

/**
 * Appraiser Invitation Status
 */
export type AppraiserInvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'

/**
 * Appraiser Invitation Document
 * Stored in Firestore: appraiser_invitations/{invitationId}
 */
export interface AppraiserInvitation {
  id: string
  donationId: string // Primary key - the donation this invitation is for
  appraiserEmail: string
  appraiserName: string | null
  inviterUserId: string
  inviterName: string
  inviterEmail: string
  personalMessage: string
  invitationToken: string // UUID v4 for URL
  status: AppraiserInvitationStatus
  userExists: boolean // Whether appraiser has existing account
  existingUserId: string | null
  invitedAt: Timestamp
  respondedAt: Timestamp | null
  expiresAt: Timestamp // 7 days from invitedAt
  acceptedBy?: string
  declinedBy?: string
}

/**
 * Serialized version for API responses (Timestamps as ISO strings)
 */
export interface SerializedAppraiserInvitation {
  id: string
  donationId: string
  appraiserEmail: string
  appraiserName: string | null
  inviterUserId: string
  inviterName: string
  inviterEmail: string
  personalMessage: string
  invitationToken: string
  status: AppraiserInvitationStatus
  userExists: boolean
  existingUserId: string | null
  invitedAt: string
  respondedAt: string | null
  expiresAt: string
  acceptedBy?: string
  declinedBy?: string
}

/**
 * Zod Schemas for Validation
 */

// Create invitation request
export const createAppraiserInvitationSchema = z.object({
  donationId: z.string().min(1, 'Donation ID is required'),
  appraiserEmail: z.string().email('Valid email is required'),
  appraiserName: z.string().nullable().optional(),
  personalMessage: z.string().max(1000, 'Message too long').default(''),
})

export type CreateAppraiserInvitationInput = z.infer<typeof createAppraiserInvitationSchema>

// Accept invitation request
export const acceptAppraiserInvitationSchema = z.object({
  token: z.string().uuid('Invalid invitation token'),
})

export type AcceptAppraiserInvitationInput = z.infer<typeof acceptAppraiserInvitationSchema>

// Decline invitation request
export const declineAppraiserInvitationSchema = z.object({
  token: z.string().uuid('Invalid invitation token'),
})

export type DeclineAppraiserInvitationInput = z.infer<typeof declineAppraiserInvitationSchema>

/**
 * Helper to serialize Firestore Timestamps
 */
export function serializeAppraiserInvitation(
  invitation: AppraiserInvitation
): SerializedAppraiserInvitation {
  return {
    ...invitation,
    invitedAt: invitation.invitedAt.toDate().toISOString(),
    respondedAt: invitation.respondedAt?.toDate().toISOString() || null,
    expiresAt: invitation.expiresAt.toDate().toISOString(),
  }
}

/**
 * Helper to check if invitation is expired
 */
export function isInvitationExpired(invitation: AppraiserInvitation): boolean {
  return invitation.expiresAt.toDate() < new Date()
}

/**
 * Helper to check if invitation can be accepted
 */
export function canAcceptInvitation(invitation: AppraiserInvitation): boolean {
  return invitation.status === 'pending' && !isInvitationExpired(invitation)
}
