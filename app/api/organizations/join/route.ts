import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'
import { CustomClaims, NonprofitSubrole } from '@/types/auth'

interface AcceptInvitationRequest {
  invitationToken: string
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

    const body: AcceptInvitationRequest = await request.json()
    const { invitationToken } = body

    if (!invitationToken) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Find invitation by token
    const invitationSnapshot = await adminDb
      .collection('team_invitations')
      .where('invitationToken', '==', invitationToken)
      .where('status', '==', 'pending')
      .limit(1)
      .get()

    if (invitationSnapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    const invitationDoc = invitationSnapshot.docs[0]
    const invitation = invitationDoc.data()

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = invitation.expiresAt.toDate()
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Get current user info
    const currentUser = await adminAuth.getUser(authResult.decodedToken.uid)
    const currentClaims = currentUser.customClaims as CustomClaims

    // Check if invitation is for this user's email
    if (invitation.invitedEmail !== currentUser.email) {
      return NextResponse.json(
        { error: 'This invitation is not for your email address' },
        { status: 403 }
      )
    }

    // Check if user is already in an organization
    if (currentClaims?.organizationId) {
      return NextResponse.json(
        { error: 'You are already a member of an organization' },
        { status: 400 }
      )
    }

    // Verify organization still exists
    const orgDoc = await adminDb.collection('organizations').doc(invitation.organizationId).get()
    if (!orgDoc.exists) {
      return NextResponse.json(
        { error: 'Organization no longer exists' },
        { status: 404 }
      )
    }

    const organization = orgDoc.data()

    // Calculate permissions for the subrole
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
      member: [],
      marketer: ['create_marketing_content', 'manage_social_media'],
      signatory: ['sign_documents', 'approve_legal_documents']
    }

    const permissions = [
      ...ROLE_PERMISSIONS.nonprofit_admin,
      ...SUBROLE_PERMISSIONS[invitation.subrole as NonprofitSubrole]
    ]

    // Update user's custom claims
    const updatedClaims: CustomClaims = {
      role: 'nonprofit_admin',
      subrole: invitation.subrole as NonprofitSubrole,
      organizationId: invitation.organizationId,
      permissions,
    }

    await adminAuth.setCustomUserClaims(authResult.decodedToken.uid, updatedClaims)

    // Update user profile in Firestore
    await adminDb.collection('users').doc(authResult.decodedToken.uid).update({
      role: 'nonprofit_admin',
      subrole: invitation.subrole,
      organizationId: invitation.organizationId,
      updatedAt: new Date(),
    })

    // Add user to organization
    const orgRef = adminDb.collection('organizations').doc(invitation.organizationId)
    const currentMemberIds = organization?.memberIds || []
    const currentAdminIds = organization?.adminIds || []

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (invitation.subrole === 'admin') {
      // Add to adminIds
      updateData.adminIds = [...currentAdminIds, authResult.decodedToken.uid]
      updateData.memberIds = currentMemberIds.includes(authResult.decodedToken.uid) 
        ? currentMemberIds 
        : [...currentMemberIds, authResult.decodedToken.uid]
    } else {
      // Add to memberIds only
      updateData.memberIds = currentMemberIds.includes(authResult.decodedToken.uid)
        ? currentMemberIds
        : [...currentMemberIds, authResult.decodedToken.uid]
    }

    await orgRef.update(updateData)

    // Mark invitation as accepted
    await invitationDoc.ref.update({
      status: 'accepted',
      acceptedAt: new Date(),
      acceptedBy: authResult.decodedToken.uid,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully joined ${organization?.name} as ${invitation.subrole}`,
      organization: {
        id: invitation.organizationId,
        name: organization?.name,
      },
      role: 'nonprofit_admin',
      subrole: invitation.subrole,
    })

  } catch (error: unknown) {
    console.error('Accept invitation error:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}

// Get invitation details by token (for displaying invitation info before accepting)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    // Find invitation by token
    const invitationSnapshot = await adminDb
      .collection('team_invitations')
      .where('invitationToken', '==', token)
      .limit(1)
      .get()

    if (invitationSnapshot.empty) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    const invitation = invitationSnapshot.docs[0].data()

    // Check if invitation has expired
    const now = new Date()
    const expiresAt = invitation.expiresAt.toDate()
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if invitation is already used
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      invitation: {
        organizationName: invitation.organizationName,
        inviterName: invitation.inviterName,
        invitedEmail: invitation.invitedEmail,
        subrole: invitation.subrole,
        personalMessage: invitation.personalMessage,
        createdAt: invitation.createdAt.toDate(),
        expiresAt: expiresAt,
      }
    })

  } catch (error: unknown) {
    console.error('Get invitation error:', error)
    return NextResponse.json(
      { error: 'Failed to get invitation details' },
      { status: 500 }
    )
  }
}