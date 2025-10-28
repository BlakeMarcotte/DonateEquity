import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { withSecurity } from '@/lib/security/api-middleware'
import { secureLogger } from '@/lib/logging/secure-logger'
import { validateInviteCodeFormat, getRoleFromInviteCode } from '@/lib/utils/inviteCode'
import { z } from 'zod'

const validateCodeSchema = z.object({
  code: z.string().min(8).max(8, 'Invite code must be exactly 8 characters')
})

const handleValidateCode = async (request: NextRequest): Promise<NextResponse> => {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    // Validate query parameters
    const queryValidation = validateCodeSchema.safeParse({ code })

    if (!queryValidation.success) {
      secureLogger.warn('Invalid invite code format', {
        endpoint: '/api/organizations/validate-code',
        method: 'GET',
        errors: queryValidation.error.issues
      })

      return NextResponse.json(
        { error: 'Invalid invite code format' },
        { status: 400 }
      )
    }

    const normalizedCode = code!.toUpperCase().trim()

    // Validate code format
    if (!validateInviteCodeFormat(normalizedCode)) {
      return NextResponse.json(
        { error: 'Invalid invite code format' },
        { status: 400 }
      )
    }

    // Search for organization with this invite code
    const orgsSnapshot = await adminDb
      .collection('organizations')
      .where('isActive', '==', true)
      .get()

    let matchedOrg: {
      id: string
      name: string
      type: string
      inviteCodes: {
        admin?: string
        member?: string
        appraiser?: string
        donor?: string
      }
    } | null = null

    // Check each organization for matching invite code
    for (const doc of orgsSnapshot.docs) {
      const data = doc.data()
      const inviteCodes = data.inviteCodes || {}

      // Check if any of the invite codes match
      if (
        inviteCodes.admin === normalizedCode ||
        inviteCodes.member === normalizedCode ||
        inviteCodes.appraiser === normalizedCode ||
        inviteCodes.donor === normalizedCode
      ) {
        matchedOrg = {
          id: doc.id,
          name: data.name,
          type: data.type,
          inviteCodes
        }
        break
      }
    }

    if (!matchedOrg) {
      secureLogger.warn('Invalid invite code used', {
        endpoint: '/api/organizations/validate-code',
        method: 'GET',
        code: normalizedCode.substring(0, 3) + '***' // Log partial code for security
      })

      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    // Determine which role/subrole this code grants
    const grantedRole = getRoleFromInviteCode(matchedOrg.inviteCodes, normalizedCode)

    if (!grantedRole) {
      secureLogger.error('Failed to determine role from valid invite code', {
        endpoint: '/api/organizations/validate-code',
        organizationId: matchedOrg.id
      })

      return NextResponse.json(
        { error: 'Invalid invite code configuration' },
        { status: 500 }
      )
    }

    secureLogger.info('Invite code validated successfully', {
      organizationId: matchedOrg.id,
      organizationName: matchedOrg.name,
      grantedRole: grantedRole.role,
      grantedSubrole: grantedRole.subrole
    })

    secureLogger.apiRequest({
      method: 'GET',
      endpoint: '/api/organizations/validate-code',
      statusCode: 200,
      responseTime: Date.now() - startTime,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    return NextResponse.json({
      success: true,
      organization: {
        id: matchedOrg.id,
        name: matchedOrg.name,
        type: matchedOrg.type
      },
      grantedRole: grantedRole.role,
      grantedSubrole: grantedRole.subrole
    })
  } catch (error: unknown) {
    secureLogger.error('Invite code validation failed', error, {
      endpoint: '/api/organizations/validate-code',
      method: 'GET'
    })

    return NextResponse.json(
      { error: 'Failed to validate invite code' },
      { status: 500 }
    )
  }
}

export const GET = withSecurity(handleValidateCode)
