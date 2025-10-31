import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from './config'

export interface Organization {
  id: string
  name: string
  type: 'nonprofit' | 'appraiser' | 'appraiser_firm' | 'donor'
  description: string
  website?: string
  phone?: string
  email: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  taxId?: string
  establishedYear?: number
  adminIds: string[]
  memberIds: string[]
  inviteCodes?: {
    admin?: string
    member?: string
    appraiser?: string
    donor?: string
  }
  inviteCodesGeneratedAt?: {
    admin?: Date
    member?: Date
    appraiser?: Date
    donor?: Date
  }
  createdAt: Date
  updatedAt: Date
}

export async function getOrCreateOrganization(
  organizationId: string,
  userEmail: string,
  userId: string,
  organizationName?: string
): Promise<Organization | null> {
  try {
    // Try to get existing organization
    const orgDoc = await getDoc(doc(db, 'organizations', organizationId))
    
    if (orgDoc.exists()) {
      const data = orgDoc.data()
      return {
        id: orgDoc.id,
        name: data.name || '',
        type: data.type || 'nonprofit',
        description: data.description || '',
        website: data.website,
        phone: data.phone,
        email: data.email || userEmail,
        address: data.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'United States'
        },
        taxId: data.taxId,
        establishedYear: data.establishedYear,
        adminIds: data.adminIds || [userId],
        memberIds: data.memberIds || [userId],
        inviteCodes: data.inviteCodes,
        inviteCodesGeneratedAt: data.inviteCodesGeneratedAt ? {
          admin: data.inviteCodesGeneratedAt.admin?.toDate?.(),
          member: data.inviteCodesGeneratedAt.member?.toDate?.(),
          appraiser: data.inviteCodesGeneratedAt.appraiser?.toDate?.(),
          donor: data.inviteCodesGeneratedAt.donor?.toDate?.(),
        } : undefined,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      }
    }

    // Organization doesn't exist, create a default one
    console.log('Creating default organization for:', organizationId)
    
    const defaultOrganization = {
      name: organizationName || `Organization ${organizationId.slice(-4)}`,
      type: 'nonprofit' as const,
      description: 'This organization was created automatically. Please update your organization details.',
      email: userEmail,
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States'
      },
      adminIds: [userId],
      memberIds: [userId],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    await setDoc(doc(db, 'organizations', organizationId), defaultOrganization)
    
    return {
      id: organizationId,
      ...defaultOrganization,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } catch (error) {
    console.error('Error getting or creating organization:', error)
    return null
  }
}

export async function updateOrganization(
  organizationId: string,
  updates: Partial<Omit<Organization, 'id' | 'createdAt'>>
): Promise<boolean> {
  try {
    // Filter out undefined values
    const cleanedUpdates: Record<string, unknown> = {}
    Object.keys(updates).forEach(key => {
      const value = updates[key as keyof typeof updates]
      if (value !== undefined) {
        cleanedUpdates[key] = value
      }
    })
    
    const updateData = {
      ...cleanedUpdates,
      updatedAt: Timestamp.now(),
    }
    
    await setDoc(doc(db, 'organizations', organizationId), updateData, { merge: true })
    return true
  } catch (error) {
    console.error('Error updating organization:', error)
    return false
  }
}