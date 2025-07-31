import { 
  doc, 
  collection, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp 
} from 'firebase/firestore'
import { db } from './config'
import { CampaignInvitation, CampaignInvitationCreate, Notification, NotificationCreate } from '@/types/invitations'
import { generateInvitationToken } from './utils'

// Check if a user exists by email
export async function checkUserExists(email: string): Promise<{ exists: boolean; userId?: string }> {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase())
    )
    
    const snapshot = await getDocs(usersQuery)
    
    if (snapshot.empty) {
      return { exists: false }
    }
    
    const userDoc = snapshot.docs[0]
    return { 
      exists: true, 
      userId: userDoc.id 
    }
  } catch (error) {
    console.error('Error checking user existence:', error)
    return { exists: false }
  }
}

// Create a campaign invitation
export async function createCampaignInvitation(
  invitation: CampaignInvitationCreate,
  inviterUserId: string,
  inviterName: string,
  organizationId: string,
  campaignDetails?: {
    title: string
    description: string
    goal: number
    raised: number
  }
): Promise<CampaignInvitation | null> {
  try {
    // Check if user already exists
    const userCheck = await checkUserExists(invitation.invitedEmail)
    
    // Check if invitation already exists for this email and campaign
    const existingInvitationQuery = query(
      collection(db, 'campaign_invitations'),
      where('campaignId', '==', invitation.campaignId),
      where('invitedEmail', '==', invitation.invitedEmail.toLowerCase()),
      where('status', '==', 'pending')
    )
    
    const existingSnapshot = await getDocs(existingInvitationQuery)
    if (!existingSnapshot.empty) {
      throw new Error('Invitation already exists for this email and campaign')
    }
    
    const invitationToken = generateInvitationToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Expires in 7 days
    
    const invitationData = {
      campaignId: invitation.campaignId,
      invitedEmail: invitation.invitedEmail.toLowerCase(),
      inviterUserId,
      inviterName,
      organizationId,
      status: 'pending' as const,
      message: invitation.message || '',
      invitedAt: Timestamp.now(),
      expiresAt: Timestamp.fromDate(expiresAt),
      invitationToken,
      userExists: userCheck.exists,
      invitedUserId: userCheck.userId || null,
    }
    
    const docRef = await addDoc(collection(db, 'campaign_invitations'), invitationData)
    
    // If user exists, create a notification
    if (userCheck.exists && userCheck.userId) {
      await createNotification({
        userId: userCheck.userId,
        type: 'campaign_invitation',
        title: 'Campaign Invitation',
        message: `${inviterName} invited you to support their campaign`,
        data: {
          campaignId: invitation.campaignId,
          invitationId: docRef.id
        }
      })
    }
    
    // Send email invitation
    if (campaignDetails) {
      try {
        // We'll call the email API from the client side
        // This is just a placeholder for the campaign details
        console.log('Campaign details ready for email:', campaignDetails)
      } catch (emailError) {
        console.error('Note: Email sending will be handled client-side', emailError)
      }
    }
    
    return {
      id: docRef.id,
      ...invitationData,
      invitedAt: invitationData.invitedAt.toDate(),
      expiresAt: invitationData.expiresAt.toDate(),
    }
  } catch (error) {
    console.error('Error creating campaign invitation:', error)
    return null
  }
}

// Get invitations for a campaign
export async function getCampaignInvitations(campaignId: string): Promise<CampaignInvitation[]> {
  try {
    const invitationsQuery = query(
      collection(db, 'campaign_invitations'),
      where('campaignId', '==', campaignId),
      orderBy('invitedAt', 'desc')
    )
    
    const snapshot = await getDocs(invitationsQuery)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      invitedAt: doc.data().invitedAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate() || new Date(),
      respondedAt: doc.data().respondedAt?.toDate(),
    })) as CampaignInvitation[]
  } catch (error) {
    console.error('Error fetching campaign invitations:', error)
    return []
  }
}

// Get invitations for a user (by email or user ID)
export async function getUserInvitations(userIdOrEmail: string): Promise<CampaignInvitation[]> {
  try {
    // Try to get by user ID first, then by email
    let invitationsQuery
    
    if (userIdOrEmail.includes('@')) {
      // It's an email
      invitationsQuery = query(
        collection(db, 'campaign_invitations'),
        where('invitedEmail', '==', userIdOrEmail.toLowerCase()),
        where('status', '==', 'pending'),
        orderBy('invitedAt', 'desc')
      )
    } else {
      // It's a user ID
      invitationsQuery = query(
        collection(db, 'campaign_invitations'),
        where('invitedUserId', '==', userIdOrEmail),
        where('status', '==', 'pending'),
        orderBy('invitedAt', 'desc')
      )
    }
    
    const snapshot = await getDocs(invitationsQuery)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      invitedAt: doc.data().invitedAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate() || new Date(),
      respondedAt: doc.data().respondedAt?.toDate(),
    })) as CampaignInvitation[]
  } catch (error) {
    console.error('Error fetching user invitations:', error)
    return []
  }
}

// Accept or decline an invitation
export async function respondToInvitation(
  invitationId: string, 
  response: 'accepted' | 'declined',
  userId?: string
): Promise<boolean> {
  try {
    const updateData: any = {
      status: response,
      respondedAt: Timestamp.now(),
    }
    
    // If a userId is provided, link it to the invitation
    if (userId) {
      updateData.invitedUserId = userId
    }
    
    await updateDoc(doc(db, 'campaign_invitations', invitationId), updateData)
    return true
  } catch (error) {
    console.error('Error responding to invitation:', error)
    return false
  }
}

// Get invitation by token (for unauthenticated users)
export async function getInvitationByToken(token: string): Promise<CampaignInvitation | null> {
  try {
    const invitationsQuery = query(
      collection(db, 'campaign_invitations'),
      where('invitationToken', '==', token),
      where('status', '==', 'pending')
    )
    
    const snapshot = await getDocs(invitationsQuery)
    
    if (snapshot.empty) {
      return null
    }
    
    const doc = snapshot.docs[0]
    return {
      id: doc.id,
      ...doc.data(),
      invitedAt: doc.data().invitedAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate() || new Date(),
      respondedAt: doc.data().respondedAt?.toDate(),
    } as CampaignInvitation
  } catch (error) {
    console.error('Error getting invitation by token:', error)
    return null
  }
}

// Create a notification
export async function createNotification(notification: NotificationCreate): Promise<boolean> {
  try {
    const notificationData = {
      ...notification,
      read: false,
      createdAt: Timestamp.now(),
      expiresAt: notification.expiresAt ? Timestamp.fromDate(notification.expiresAt) : null,
    }
    
    await addDoc(collection(db, 'notifications'), notificationData)
    return true
  } catch (error) {
    console.error('Error creating notification:', error)
    return false
  }
}

// Get notifications for a user
export async function getUserNotifications(userId: string): Promise<Notification[]> {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(notificationsQuery)
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      expiresAt: doc.data().expiresAt?.toDate(),
    })) as Notification[]
  } catch (error) {
    console.error('Error getting user notifications:', error)
    return []
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true
    })
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}