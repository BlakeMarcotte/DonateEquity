import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'
import { CustomClaims, NonprofitSubrole } from '@/types/auth'
import { v4 as uuidv4 } from 'uuid'
import { sendTeamInvitationEmail } from '@/lib/email/team-invitation'

interface InviteTeamMemberRequest {
  email: string
  subrole: NonprofitSubrole
  personalMessage?: string
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

    // Check if user has nonprofit admin role
    const decodedToken = authResult.decodedToken
    // Custom claims are stored directly on the token, not in a customClaims property
    const userClaims = {
      role: decodedToken.role,
      subrole: decodedToken.subrole,
      organizationId: decodedToken.organizationId,
      permissions: decodedToken.permissions
    } as CustomClaims
    
    if (!userClaims.role || userClaims.role !== 'nonprofit_admin') {
      return NextResponse.json(
        { error: 'Only nonprofit admins can invite team members' },
        { status: 403 }
      )
    }

    if (!userClaims.organizationId) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400 }
      )
    }

    const body: InviteTeamMemberRequest = await request.json()
    const { email, subrole, personalMessage } = body

    // Validate required fields
    if (!email || !subrole) {
      return NextResponse.json(
        { error: 'Email and subrole are required' },
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

    // Check if user already exists
    let existingUser = null
    try {
      existingUser = await adminAuth.getUserByEmail(email)
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/user-not-found') {
        console.error('Error checking existing user:', error)
        return NextResponse.json(
          { error: 'Failed to check user existence' },
          { status: 500 }
        )
      }
    }

    // If user exists and is already in an organization, check if it's the same one
    if (existingUser) {
      const existingUserClaims = existingUser.customClaims as CustomClaims
      if (existingUserClaims?.organizationId === userClaims.organizationId) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 400 }
        )
      }
      if (existingUserClaims?.organizationId && existingUserClaims.organizationId !== userClaims.organizationId) {
        return NextResponse.json(
          { error: 'User is already a member of another organization' },
          { status: 400 }
        )
      }
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
    
    // Get inviter details
    const inviterDoc = await adminDb.collection('users').doc(authResult.decodedToken.uid as string).get()
    const inviterData = inviterDoc.data()

    // Generate invitation token
    const invitationToken = uuidv4()

    // Create invitation document
    const invitationData = {
      organizationId: userClaims.organizationId,
      organizationName: organization?.name || 'Unknown Organization',
      inviterUserId: authResult.decodedToken.uid,
      inviterName: (inviterData?.displayName as string) || (inviterData?.email as string) || 'Unknown',
      inviterEmail: inviterData?.email,
      invitedEmail: email,
      invitedUserId: existingUser?.uid || null,
      subrole,
      personalMessage: personalMessage || '',
      invitationToken,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    }

    // Save invitation
    const invitationRef = adminDb.collection('team_invitations').doc()
    await invitationRef.set(invitationData)

    // Send email notification
    try {
      // Debug: Log the environment variable
      console.log('NEXT_PUBLIC_APP_URL from env:', process.env.NEXT_PUBLIC_APP_URL)
      
      const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://donate-equity.vercel.app'}/join-team?token=${invitationToken}`
      
      console.log('Generated invitation URL:', invitationUrl)
      
      await sendTeamInvitationEmail({
        to: email,
        inviterName: invitationData.inviterName,
        organizationName: invitationData.organizationName,
        subrole,
        personalMessage,
        invitationUrl,
        expiresAt: invitationData.expiresAt,
      })
      
      console.log('Team invitation email sent successfully:', {
        invitationId: invitationRef.id,
        email,
        subrole,
        organizationName: organization?.name
      })
    } catch (emailError) {
      console.error('Failed to send invitation email, but invitation was saved:', emailError)
      // Don't fail the API request if email fails - invitation is still valid
    }

    return NextResponse.json({
      success: true,
      invitationId: invitationRef.id,
      message: `Invitation sent to ${email}`,
      invitationUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://donate-equity.vercel.app'}/join-team?token=${invitationToken}`
    })

  } catch (error: unknown) {
    console.error('Team invitation error:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

// Get pending invitations for the current organization
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
    
    console.log('DEBUG: Fixed GET - User role:', userClaims.role)
    console.log('DEBUG: Fixed GET - User organization ID:', userClaims.organizationId)
    
    if (!userClaims.role || userClaims.role !== 'nonprofit_admin') {
      return NextResponse.json(
        { error: 'Only nonprofit admins can view invitations' },
        { status: 403 }
      )
    }

    if (!userClaims.organizationId) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400 }
      )
    }

    // Get all invitations for the organization
    const invitationsSnapshot = await adminDb
      .collection('team_invitations')
      .where('organizationId', '==', userClaims.organizationId)
      .orderBy('createdAt', 'desc')
      .get()

    const invitations = invitationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate(),
      expiresAt: doc.data().expiresAt.toDate(),
    }))

    return NextResponse.json({
      success: true,
      invitations
    })

  } catch (error: unknown) {
    console.error('Fetch invitations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}