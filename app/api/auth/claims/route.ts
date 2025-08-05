import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { UserRole, CustomClaims, NonprofitSubrole } from '@/types/auth'
import { verifyAuthToken } from '@/lib/auth/middleware'

interface UpdateClaimsRequest {
  targetUserId: string
  role?: UserRole
  subrole?: NonprofitSubrole
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
  ]
}

const SUBROLE_PERMISSIONS: Record<NonprofitSubrole, string[]> = {
  admin: ['manage_organization_users', 'manage_all_campaigns', 'approve_donations'],
  member: [],
  marketer: ['create_marketing_content', 'manage_social_media'],
  signatory: ['sign_documents', 'approve_legal_documents']
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

    // Check if user has nonprofit admin role with admin subrole
    const userClaims = authResult.decodedToken.customClaims as CustomClaims
    if (!userClaims || userClaims.role !== 'nonprofit_admin' || userClaims.subrole !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body: UpdateClaimsRequest = await request.json()
    const { targetUserId, role, subrole, organizationId, permissions } = body

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
    const newRole = role || currentClaims.role
    const newSubrole = subrole !== undefined ? subrole : currentClaims.subrole
    
    let newPermissions = permissions
    if (!newPermissions) {
      newPermissions = [...ROLE_PERMISSIONS[newRole]]
      if (newSubrole && newRole === 'nonprofit_admin') {
        newPermissions = [...newPermissions, ...SUBROLE_PERMISSIONS[newSubrole]]
      }
    }

    const updatedClaims: CustomClaims = {
      role: newRole,
      subrole: newSubrole,
      organizationId: organizationId !== undefined ? organizationId : currentClaims.organizationId,
      permissions: newPermissions,
    }

    // Set custom claims
    await adminAuth.setCustomUserClaims(targetUserId, updatedClaims)

    // Update user profile in Firestore
    const userRef = adminDb.collection('users').doc(targetUserId)
    const updateData: any = {
      role: updatedClaims.role,
      organizationId: updatedClaims.organizationId,
      updatedAt: new Date(),
    }
    if (updatedClaims.subrole) {
      updateData.subrole = updatedClaims.subrole
    }
    await userRef.update(updateData)

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