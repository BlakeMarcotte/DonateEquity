import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'

interface CreateOrganizationRequest {
  name: string
  type: 'nonprofit' | 'appraiser'
  description?: string
  website?: string
  phone?: string
  address?: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.decodedToken.uid
    const body: CreateOrganizationRequest = await request.json()
    
    const { name, type, description, website, phone, address } = body

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      )
    }

    if (!['nonprofit', 'appraiser'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid organization type' },
        { status: 400 }
      )
    }

    // Check if organization with same name already exists
    const existingOrgs = await adminDb
      .collection('organizations')
      .where('name', '==', name)
      .where('type', '==', type)
      .limit(1)
      .get()

    if (!existingOrgs.empty) {
      return NextResponse.json(
        { error: 'Organization with this name already exists' },
        { status: 409 }
      )
    }

    // Create organization
    const orgRef = adminDb.collection('organizations').doc()
    const organizationData = {
      id: orgRef.id,
      name,
      type,
      description: description || '',
      website: website || '',
      phone: phone || '',
      address: address || null,
      createdBy: userId,
      adminIds: [userId],
      memberIds: [userId],
      isActive: true,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await orgRef.set(organizationData)

    return NextResponse.json(
      {
        success: true,
        organization: organizationData,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Organization creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')

    let query = adminDb.collection('organizations').where('isActive', '==', true)

    if (type && ['nonprofit', 'appraiser'].includes(type)) {
      query = query.where('type', '==', type)
    }

    // For search functionality, we'll need to implement client-side filtering
    // as Firestore doesn't support full-text search natively
    const snapshot = await query.limit(limit).get()
    
    let organizations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<Record<string, unknown>>

    // Client-side search filtering
    if (search) {
      const searchLower = search.toLowerCase()
      organizations = organizations.filter(org => {
        const name = org.name as string
        const description = org.description as string
        return name?.toLowerCase().includes(searchLower) ||
          (description && description.toLowerCase().includes(searchLower))
      })
    }

    return NextResponse.json({
      success: true,
      organizations,
    })
  } catch (error: unknown) {
    console.error('Organizations fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}