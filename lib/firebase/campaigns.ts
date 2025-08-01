import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore'
import { db } from './config'
import { Campaign } from '@/types/campaign'

export interface CampaignFilters {
  category?: string
  status?: Campaign['status']
  minGoal?: number
  maxGoal?: number
  searchTerm?: string
  organizationId?: string
}

export interface CampaignQueryOptions {
  filters?: CampaignFilters
  limit?: number
  lastDoc?: QueryDocumentSnapshot<DocumentData>
  sortBy?: 'createdAt' | 'goal' | 'currentAmount' | 'title'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Fetch public campaigns for donor browsing
 */
export async function getPublicCampaigns(options: CampaignQueryOptions = {}) {
  try {
    const {
      filters = {},
      limit: queryLimit = 12,
      lastDoc,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options

    // Start with a simple query to fetch all campaigns, then apply client-side filtering
    const q = query(collection(db, 'campaigns'), limit(50))

    const snapshot = await getDocs(q)
    
    const campaigns: Campaign[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      campaigns.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || undefined,
      } as Campaign)
    })

    // Apply client-side filters - production ready
    let filteredCampaigns = campaigns

    // Filter by visibility and status
    filteredCampaigns = filteredCampaigns.filter(c => {
      const hasVisibility = c.visibility === 'public'
      const hasStatus = c.status === 'active'
      return hasVisibility && hasStatus
    })

    // Apply other filters
    if (filters.category) {
      filteredCampaigns = filteredCampaigns.filter(c => c.category === filters.category)
    }

    if (filters.organizationId) {
      filteredCampaigns = filteredCampaigns.filter(c => c.organizationId === filters.organizationId)
    }

    if (filters.minGoal) {
      filteredCampaigns = filteredCampaigns.filter(c => c.goal >= filters.minGoal!)
    }

    if (filters.maxGoal) {
      filteredCampaigns = filteredCampaigns.filter(c => c.goal <= filters.maxGoal!)
    }

    // Filter by search term client-side
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filteredCampaigns = filteredCampaigns.filter(campaign => 
        campaign.title.toLowerCase().includes(searchLower) ||
        campaign.description.toLowerCase().includes(searchLower) ||
        campaign.organizationName.toLowerCase().includes(searchLower) ||
        campaign.tags.some(tag => tag.toLowerCase().includes(searchLower))
      )
    }

    // Apply client-side sorting
    filteredCampaigns.sort((a, b) => {
      let aVal: string | number | Date, bVal: string | number | Date
      
      switch (sortBy) {
        case 'goal':
          aVal = a.goal
          bVal = b.goal
          break
        case 'currentAmount':
          aVal = a.currentAmount
          bVal = b.currentAmount
          break
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        default:
          aVal = a.createdAt.getTime()
          bVal = b.createdAt.getTime()
      }

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      }
    })

    // Apply limit after filtering and sorting
    const limitedCampaigns = filteredCampaigns.slice(0, queryLimit)

    return {
      campaigns: limitedCampaigns,
      lastDoc: snapshot.docs[Math.min(limitedCampaigns.length - 1, snapshot.docs.length - 1)],
      hasMore: filteredCampaigns.length > queryLimit
    }
  } catch (error) {
    console.error('Error fetching public campaigns:', error)
    throw new Error('Failed to fetch campaigns')
  }
}

/**
 * Fetch a single campaign by ID for donor viewing
 */
export async function getCampaignById(campaignId: string): Promise<Campaign | null> {
  try {
    const docRef = doc(db, 'campaigns', campaignId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const data = docSnap.data()
    return {
      id: docSnap.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      startDate: data.startDate?.toDate() || new Date(),
      endDate: data.endDate?.toDate() || undefined,
    } as Campaign
  } catch (error) {
    console.error('Error fetching campaign:', error)
    throw new Error('Failed to fetch campaign')
  }
}

/**
 * Get unique campaign categories for filter options
 */
export async function getCampaignCategories(): Promise<string[]> {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('visibility', '==', 'public'),
      where('status', '==', 'active')
    )

    const snapshot = await getDocs(q)
    const categories = new Set<string>()

    snapshot.forEach((doc) => {
      const data = doc.data()
      if (data.category) {
        categories.add(data.category)
      }
    })

    return Array.from(categories).sort()
  } catch (error) {
    console.error('Error fetching campaign categories:', error)
    return []
  }
}

/**
 * Get featured campaigns for homepage/dashboard
 */
export async function getFeaturedCampaigns(count: number = 6): Promise<Campaign[]> {
  try {
    const q = query(
      collection(db, 'campaigns'),
      where('visibility', '==', 'public'),
      where('status', '==', 'active'),
      orderBy('currentAmount', 'desc'),
      limit(count)
    )

    const snapshot = await getDocs(q)
    const campaigns: Campaign[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      campaigns.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || undefined,
      } as Campaign)
    })

    return campaigns
  } catch (error) {
    console.error('Error fetching featured campaigns:', error)
    return []
  }
}

/**
 * Search campaigns by text query
 */
export async function searchCampaigns(
  searchTerm: string, 
  options: Omit<CampaignQueryOptions, 'filters'> = {}
): Promise<{ campaigns: Campaign[]; hasMore: boolean }> {
  // Since Firestore doesn't support full-text search,
  // we fetch all public campaigns and filter client-side
  const result = await getPublicCampaigns({
    ...options,
    filters: { searchTerm }
  })

  return {
    campaigns: result.campaigns,
    hasMore: result.hasMore
  }
}