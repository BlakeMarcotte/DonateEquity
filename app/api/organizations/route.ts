import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'
import { withSecurity } from '@/lib/security/api-middleware'
import { organizationSchema } from '@/lib/validation/schemas'
import { secureLogger } from '@/lib/logging/secure-logger'
import { generateInviteCode } from '@/lib/utils/inviteCode'
import { z } from 'zod'

const createOrganizationSchema = organizationSchema.extend({
  type: z.enum(['nonprofit', 'appraiser', 'donor'])
})

const getOrganizationsSchema = z.object({
  type: z.enum(['nonprofit', 'appraiser', 'donor']).optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  limit: z.number().min(1).max(100).default(20)
})

const handleCreateOrganization = async (
  request: NextRequest,
  validatedData?: z.infer<typeof createOrganizationSchema>
): Promise<NextResponse> => {
  const startTime = Date.now()
  let userId: string | undefined
  
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      secureLogger.security('Unauthorized organization creation attempt', {
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/organizations',
        method: 'POST',
        statusCode: 401
      })
      
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    userId = authResult.decodedToken.uid as string
    const { name, type, description, website, phone, address, taxId } = validatedData!

    // Check if organization with same name already exists
    const existingOrgs = await adminDb
      .collection('organizations')
      .where('name', '==', name)
      .where('type', '==', type)
      .limit(1)
      .get()

    if (!existingOrgs.empty) {
      secureLogger.warn('Duplicate organization creation attempt', {
        userId,
        organizationName: name,
        organizationType: type
      })
      
      return NextResponse.json(
        { error: 'Organization with this name already exists' },
        { status: 409 }
      )
    }

    // Create organization
    const orgRef = adminDb.collection('organizations').doc()

    // Generate invite codes based on organization type
    const now = new Date()
    const inviteCodes: Record<string, string> = {}
    const inviteCodesGeneratedAt: Record<string, Date> = {}

    if (type === 'nonprofit') {
      // Nonprofits get admin and member codes
      inviteCodes.admin = generateInviteCode()
      inviteCodes.member = generateInviteCode()
      inviteCodesGeneratedAt.admin = now
      inviteCodesGeneratedAt.member = now
    } else if (type === 'appraiser') {
      // Appraisers get appraiser code
      inviteCodes.appraiser = generateInviteCode()
      inviteCodesGeneratedAt.appraiser = now
    } else if (type === 'donor') {
      // Donors get donor code
      inviteCodes.donor = generateInviteCode()
      inviteCodesGeneratedAt.donor = now
    }

    const organizationData = {
      id: orgRef.id,
      name,
      type,
      taxId: taxId || '',
      description: description || '',
      website: website || '',
      phone: phone || '',
      address: address || null,
      createdBy: userId,
      adminIds: [userId],
      memberIds: [userId],
      isActive: true,
      isVerified: false,
      inviteCodes,
      inviteCodesGeneratedAt,
      createdAt: now,
      updatedAt: now,
    }

    await orgRef.set(organizationData)

    // Log successful creation
    secureLogger.audit('Organization created', {
      userId,
      action: 'create_organization',
      resource: 'organization',
      resourceId: orgRef.id,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }, {
      organizationName: name,
      organizationType: type
    })

    secureLogger.apiRequest({
      method: 'POST',
      endpoint: '/api/organizations',
      statusCode: 201,
      responseTime: Date.now() - startTime,
      userId,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json(
      {
        success: true,
        organization: organizationData,
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    secureLogger.error('Organization creation failed', error, {
      userId,
      endpoint: '/api/organizations',
      method: 'POST',
      requestData: validatedData
    })
    
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}

export const POST = withSecurity(handleCreateOrganization, createOrganizationSchema)

const handleGetOrganizations = async (request: NextRequest): Promise<NextResponse> => {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    // Validate query parameters
    const queryValidation = getOrganizationsSchema.safeParse({
      type: type || undefined,
      search: search || undefined,
      limit
    })

    if (!queryValidation.success) {
      secureLogger.warn('Invalid query parameters for organizations list', {
        endpoint: '/api/organizations',
        method: 'GET',
        errors: queryValidation.error.issues
      })
      
      return NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      )
    }

    let query = adminDb.collection('organizations').where('isActive', '==', true)

    if (type && ['nonprofit', 'appraiser', 'donor'].includes(type)) {
      query = query.where('type', '==', type)
    }

    // For search functionality, we'll need to implement client-side filtering
    // as Firestore doesn't support full-text search natively
    const snapshot = await query.limit(limit).get()
    
    let organizations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Remove sensitive fields from public API
      createdBy: undefined,
      adminIds: undefined,
      memberIds: undefined
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

    secureLogger.apiRequest({
      method: 'GET',
      endpoint: '/api/organizations',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      organizations,
    })
  } catch (error: unknown) {
    secureLogger.error('Organizations fetch failed', error, {
      endpoint: '/api/organizations',
      method: 'GET'
    })
    
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

export const GET = withSecurity(handleGetOrganizations)