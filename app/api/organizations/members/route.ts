import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'
import { CustomClaims, NonprofitSubrole } from '@/types/auth'

interface UpdateMemberRequest {
  userId: string
  subrole: NonprofitSubrole
}

interface RemoveMemberRequest {
  userId: string
}

// Get all team members for the current organization
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

    // Check if user has nonprofit admin role
    const decodedToken = authResult.decodedToken
    // Custom claims are stored directly on the token, not in a customClaims property
    const userClaims = {
      role: decodedToken.role,
      subrole: decodedToken.subrole,
      organizationId: decodedToken.organizationId,
      permissions: decodedToken.permissions
    } as CustomClaims
    
    console.log('DEBUG: Fixed - User role:', userClaims.role)
    console.log('DEBUG: Fixed - User subrole:', userClaims.subrole)
    console.log('DEBUG: Fixed - User organization ID:', userClaims.organizationId)
    
    if (!userClaims.role || userClaims.role !== 'nonprofit_admin') {
      return NextResponse.json(
        { error: 'Only nonprofit admins can view team members' },
        { status: 403 }
      )
    }

    if (!userClaims.organizationId) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400 }
      )
    }

    // Get organization details
    const orgDoc = await adminDb.collection('organizations').doc(userClaims.organizationId).get()
    if (!orgDoc.exists) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const organization = orgDoc.data()
    const allMemberIds = [...(organization?.adminIds || []), ...(organization?.memberIds || [])]
    const uniqueMemberIds = [...new Set(allMemberIds)]

    // Get user profiles and auth data for all members
    const members = []
    for (const userId of uniqueMemberIds) {
      try {
        // Get user profile from Firestore
        const userDoc = await adminDb.collection('users').doc(userId).get()
        if (!userDoc.exists) continue

        const userProfile = userDoc.data()

        // Get auth data and custom claims
        const userRecord = await adminAuth.getUser(userId)
        const customClaims = userRecord.customClaims as CustomClaims

        members.push({
          uid: userId,
          email: userProfile?.email || userRecord.email,
          displayName: userProfile?.displayName || userRecord.displayName,
          role: customClaims?.role || 'nonprofit_admin',
          subrole: customClaims?.subrole || userProfile?.subrole || 'member',
          joinedAt: userProfile?.createdAt?.toDate() || userRecord.metadata.creationTime,
          lastLoginAt: userProfile?.metadata?.lastLoginAt?.toDate() || null,
          photoURL: userProfile?.photoURL || userRecord.photoURL,
          isEmailVerified: userRecord.emailVerified,
          isAdmin: organization?.adminIds?.includes(userId) || false,
        })
      } catch (error) {
        console.error('Error fetching member data for', userId, error)
        // Continue with other members even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      members: members.sort((a, b) => {
        // Sort by: admins first, then by join date
        if (a.isAdmin && !b.isAdmin) return -1
        if (!a.isAdmin && b.isAdmin) return 1
        return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
      })
    })

  } catch (error: unknown) {
    console.error('Fetch team members error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}

// Update a team member's subrole
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has nonprofit admin role with admin subrole
    const decodedToken = authResult.decodedToken
    const userClaims = {
      role: decodedToken.role,
      subrole: decodedToken.subrole,
      organizationId: decodedToken.organizationId,
      permissions: decodedToken.permissions
    } as CustomClaims
    
    if (!userClaims.role || userClaims.role !== 'nonprofit_admin' || userClaims.subrole !== 'admin') {
      return NextResponse.json(
        { error: 'Only organization admins can update member roles' },
        { status: 403 }
      )
    }

    if (!userClaims.organizationId) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400 }
      )
    }

    const body: UpdateMemberRequest = await request.json()
    const { userId, subrole } = body

    if (!userId || !subrole) {
      return NextResponse.json(
        { error: 'User ID and subrole are required' },
        { status: 400 }
      )
    }

    // Validate subrole
    if (!['admin', 'member', 'marketer', 'signatory'].includes(subrole)) {
      return NextResponse.json(
        { error: 'Invalid subrole specified' },
        { status: 400 }
      )
    }

    // Prevent users from modifying their own role
    if (userId === authResult.decodedToken.uid) {
      return NextResponse.json(
        { error: 'Cannot modify your own role' },
        { status: 400 }
      )
    }

    // Get target user's current claims
    const targetUser = await adminAuth.getUser(userId)
    const targetClaims = targetUser.customClaims as CustomClaims

    // Verify the target user belongs to the same organization
    if (targetClaims?.organizationId !== userClaims.organizationId) {
      return NextResponse.json(
        { error: 'User does not belong to your organization' },
        { status: 403 }
      )
    }

    // Calculate new permissions
    const ROLE_PERMISSIONS = {
      nonprofit_admin: [
        'create_campaign',
        'manage_campaigns',
        'view_donations',
        'manage_organization',
        'manage_own_profile'
      ]
    }

    const SUBROLE_PERMISSIONS: Record<NonprofitSubrole, string[]> = {
      admin: ['manage_organization_users', 'manage_all_campaigns', 'approve_donations'],
      member: []
    }

    const newPermissions = [
      ...ROLE_PERMISSIONS.nonprofit_admin,
      ...SUBROLE_PERMISSIONS[subrole]
    ]

    // Update custom claims
    const updatedClaims: CustomClaims = {
      role: 'nonprofit_admin',
      subrole,
      organizationId: userClaims.organizationId,
      permissions: newPermissions,
    }

    await adminAuth.setCustomUserClaims(userId, updatedClaims)

    // Update user profile in Firestore
    await adminDb.collection('users').doc(userId).update({
      subrole,
      updatedAt: new Date(),
    })

    // Update organization memberIds/adminIds if changing to/from admin
    const orgRef = adminDb.collection('organizations').doc(userClaims.organizationId)
    const orgDoc = await orgRef.get()
    const orgData = orgDoc.data()

    if (subrole === 'admin') {
      // Add to adminIds if not already there
      const adminIds = orgData?.adminIds || []
      if (!adminIds.includes(userId)) {
        await orgRef.update({
          adminIds: [...adminIds, userId],
          updatedAt: new Date(),
        })
      }
    } else {
      // Remove from adminIds if present
      const adminIds = orgData?.adminIds || []
      if (adminIds.includes(userId)) {
        await orgRef.update({
          adminIds: adminIds.filter((id: string) => id !== userId),
          updatedAt: new Date(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Member role updated to ${subrole}`,
    })

  } catch (error: unknown) {
    console.error('Update member role error:', error)
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    )
  }
}

// Remove a team member from the organization
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has nonprofit admin role with admin subrole
    const decodedToken = authResult.decodedToken
    const userClaims = {
      role: decodedToken.role,
      subrole: decodedToken.subrole,
      organizationId: decodedToken.organizationId,
      permissions: decodedToken.permissions
    } as CustomClaims
    
    if (!userClaims.role || userClaims.role !== 'nonprofit_admin' || userClaims.subrole !== 'admin') {
      return NextResponse.json(
        { error: 'Only organization admins can remove members' },
        { status: 403 }
      )
    }

    if (!userClaims.organizationId) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400 }
      )
    }

    const body: RemoveMemberRequest = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Prevent users from removing themselves
    if (userId === authResult.decodedToken.uid) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the organization' },
        { status: 400 }
      )
    }

    // Get target user's current claims
    const targetUser = await adminAuth.getUser(userId)
    const targetClaims = targetUser.customClaims as CustomClaims

    // Verify the target user belongs to the same organization
    if (targetClaims?.organizationId !== userClaims.organizationId) {
      return NextResponse.json(
        { error: 'User does not belong to your organization' },
        { status: 403 }
      )
    }

    // Remove user from organization
    const orgRef = adminDb.collection('organizations').doc(userClaims.organizationId)
    const orgDoc = await orgRef.get()
    const orgData = orgDoc.data()

    const adminIds = (orgData?.adminIds || []).filter((id: string) => id !== userId)
    const memberIds = (orgData?.memberIds || []).filter((id: string) => id !== userId)

    await orgRef.update({
      adminIds,
      memberIds,
      updatedAt: new Date(),
    })

    // Clear user's organization claims
    const updatedClaims: CustomClaims = {
      role: 'donor', // Default role when removed from organization
      organizationId: undefined,
      permissions: ['create_donation', 'view_own_donations', 'manage_own_profile'],
    }

    await adminAuth.setCustomUserClaims(userId, updatedClaims)

    // Update user profile
    await adminDb.collection('users').doc(userId).update({
      role: 'donor',
      subrole: null,
      organizationId: null,
      updatedAt: new Date(),
    })

    return NextResponse.json({
      success: true,
      message: 'Member removed from organization',
    })

  } catch (error: unknown) {
    console.error('Remove member error:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}