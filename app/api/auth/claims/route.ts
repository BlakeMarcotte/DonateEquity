import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { UserRole, CustomClaims } from '@/types/auth'
import { verifyAuthToken } from '@/lib/auth/middleware'

interface UpdateClaimsRequest {
  targetUserId: string
  role?: UserRole
  organizationId?: string
  permissions?: string[]
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  donor: ['create_donation', 'view_own_donations', 'manage_own_profile'],
  nonprofit_admin: [
    'create_campaign',
    'manage_campaigns',
    'view_donations',
    'manage_organization',
    'manage_own_profile'
  ],
  appraiser: [
    'view_assigned_tasks',
    'submit_appraisals',
    'manage_own_profile'
  ],
  admin: [
    'manage_all_users',
    'manage_all_campaigns',
    'manage_all_donations',
    'view_analytics',
    'system_admin'
  ]
}

export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has admin role
    const userClaims = authResult.decodedToken.customClaims as CustomClaims
    if (!userClaims || userClaims.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: UpdateClaimsRequest = await request.json()
    const { targetUserId, role, organizationId, permissions } = body

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      )
    }

    // Get current user record
    const targetUser = await adminAuth.getUser(targetUserId)
    const currentClaims = targetUser.customClaims as CustomClaims || {}

    // Build updated claims
    const updatedClaims: CustomClaims = {
      role: role || currentClaims.role,
      organizationId: organizationId !== undefined ? organizationId : currentClaims.organizationId,
      permissions: permissions || (role ? ROLE_PERMISSIONS[role] : currentClaims.permissions),
    }

    // Set custom claims
    await adminAuth.setCustomUserClaims(targetUserId, updatedClaims)

    // Update user profile in Firestore
    const userRef = adminDb.collection('users').doc(targetUserId)
    await userRef.update({
      role: updatedClaims.role,
      organizationId: updatedClaims.organizationId,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      updatedClaims,
    })
  } catch (error: unknown) {
    console.error('Claims update error:', error)
    
    const authError = error as { code?: string }
    if (authError.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update user claims' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authResult.decodedToken?.uid as string
    const userRecord = await adminAuth.getUser(userId)
    const customClaims = userRecord.customClaims as CustomClaims

    return NextResponse.json({
      success: true,
      claims: customClaims || null,
    })
  } catch (error: unknown) {
    console.error('Claims fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user claims' },
      { status: 500 }
    )
  }
}