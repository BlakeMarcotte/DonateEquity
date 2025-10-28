import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'
import { withSecurity } from '@/lib/security/api-middleware'
import { secureLogger } from '@/lib/logging/secure-logger'
import { generateInviteCode } from '@/lib/utils/inviteCode'
import { z } from 'zod'

const regenerateCodeSchema = z.object({
  codeType: z.enum(['admin', 'member', 'appraiser', 'donor'])
})

const handleRegenerateCode = async (
  request: NextRequest,
  validatedData?: z.infer<typeof regenerateCodeSchema>
): Promise<NextResponse> => {
  const startTime = Date.now()
  let userId: string | undefined

  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      secureLogger.security('Unauthorized code regeneration attempt', {
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        endpoint: '/api/organizations/regenerate-code',
        method: 'POST',
        statusCode: 401
      })

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    userId = authResult.decodedToken.uid as string
    const { codeType } = validatedData!

    // Get user's custom claims to find their organization
    const userRecord = await adminAuth.getUser(userId)
    const customClaims = userRecord.customClaims || {}
    const organizationId = customClaims.organizationId as string | undefined

    if (!organizationId) {
      secureLogger.warn('Code regeneration attempted by user without organization', {
        userId,
        endpoint: '/api/organizations/regenerate-code'
      })

      return NextResponse.json(
        { error: 'User is not associated with an organization' },
        { status: 403 }
      )
    }

    // Get organization data
    const orgDoc = await adminDb.collection('organizations').doc(organizationId).get()

    if (!orgDoc.exists) {
      secureLogger.error('Organization not found for code regeneration', {
        userId,
        organizationId,
        endpoint: '/api/organizations/regenerate-code'
      })

      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const orgData = orgDoc.data()!

    // Check if user is an admin of the organization
    const isAdmin = orgData.adminIds?.includes(userId)
    const hasAdminRole = customClaims.role === 'nonprofit_admin' && customClaims.subrole === 'admin'

    if (!isAdmin || !hasAdminRole) {
      secureLogger.security('Unauthorized code regeneration attempt by non-admin', {
        userId,
        organizationId,
        userRole: customClaims.role,
        userSubrole: customClaims.subrole,
        endpoint: '/api/organizations/regenerate-code'
      })

      return NextResponse.json(
        { error: 'Insufficient permissions. Only organization admins can regenerate codes.' },
        { status: 403 }
      )
    }

    // Generate new invite code
    const newCode = generateInviteCode()

    // Update organization with new code
    const updateData: {
      inviteCodes: Record<string, string>
      inviteCodesGeneratedAt: Record<string, Date>
      updatedAt: Date
    } = {
      inviteCodes: {
        ...orgData.inviteCodes,
        [codeType]: newCode
      },
      inviteCodesGeneratedAt: {
        ...orgData.inviteCodesGeneratedAt,
        [codeType]: new Date()
      },
      updatedAt: new Date()
    }

    await adminDb.collection('organizations').doc(organizationId).update(updateData)

    // Log successful regeneration
    secureLogger.audit('Invite code regenerated', {
      userId,
      action: 'regenerate_invite_code',
      resource: 'organization',
      resourceId: organizationId,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    }, {
      organizationName: orgData.name,
      codeType
    })

    secureLogger.apiRequest({
      method: 'POST',
      endpoint: '/api/organizations/regenerate-code',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      userId,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      codeType,
      newCode,
      generatedAt: updateData.inviteCodesGeneratedAt[codeType]
    })
  } catch (error: unknown) {
    secureLogger.error('Code regeneration failed', error, {
      userId,
      endpoint: '/api/organizations/regenerate-code',
      method: 'POST',
      requestData: validatedData
    })

    return NextResponse.json(
      { error: 'Failed to regenerate invite code' },
      { status: 500 }
    )
  }
}

export const POST = withSecurity(handleRegenerateCode, regenerateCodeSchema)
