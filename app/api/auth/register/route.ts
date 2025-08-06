import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { UserRole, NonprofitSubrole } from '@/types/auth'

interface RegisterRequest {
  email: string
  password: string
  displayName: string
  role: UserRole
  subrole?: NonprofitSubrole
  organizationId?: string
  organizationName?: string
  phoneNumber?: string
  teamInviteToken?: string
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

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    
    // Validate required fields
    const { email, password, displayName, role, subrole, organizationId, organizationName, phoneNumber, teamInviteToken } = body
    
    if (!email || !password || !displayName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['donor', 'nonprofit_admin', 'appraiser'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    // Validate subrole if provided
    if (subrole && role !== 'nonprofit_admin') {
      return NextResponse.json(
        { error: 'Subroles are only valid for nonprofit_admin role' },
        { status: 400 }
      )
    }

    if (subrole && !['admin', 'member', 'marketer', 'signatory'].includes(subrole)) {
      return NextResponse.json(
        { error: 'Invalid subrole specified' },
        { status: 400 }
      )
    }

    // All roles now require organizationId or organizationName (except team invitations)
    if (!teamInviteToken && !organizationId && !organizationName) {
      return NextResponse.json(
        { error: 'Organization information is required for all users' },
        { status: 400 }
      )
    }

    // Create Firebase user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      phoneNumber,
      emailVerified: false,
    })

    // Handle organization creation/linking
    let finalOrganizationId = organizationId

    // For team invitations, we need to get the organizationId from the invitation
    if (teamInviteToken && !finalOrganizationId) {
      try {
        const invitationSnapshot = await adminDb
          .collection('team_invitations')
          .where('invitationToken', '==', teamInviteToken)
          .where('status', '==', 'pending')
          .limit(1)
          .get()

        if (!invitationSnapshot.empty) {
          const invitationData = invitationSnapshot.docs[0].data()
          finalOrganizationId = invitationData.organizationId
        }
      } catch (error) {
        console.error('Error fetching team invitation for organization:', error)
      }
    }

    if (!finalOrganizationId && organizationName) {
      // Create new organization
      const orgRef = adminDb.collection('organizations').doc()
      let orgType = 'donor' // Default for donors
      if (role === 'nonprofit_admin') orgType = 'nonprofit'
      if (role === 'appraiser') orgType = 'appraiser'
      
      await orgRef.set({
        name: organizationName,
        type: orgType,
        createdBy: userRecord.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        adminIds: [userRecord.uid],
        isActive: true,
      })
      finalOrganizationId = orgRef.id
    } else if (finalOrganizationId) {
      // Add user to existing organization
      const orgRef = adminDb.collection('organizations').doc(finalOrganizationId)
      const orgDoc = await orgRef.get()
      
      if (!orgDoc.exists) {
        await adminAuth.deleteUser(userRecord.uid)
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 400 }
        )
      }

      // Add user to organization's member list
      const currentAdminIds = orgDoc.data()?.adminIds || []
      if (!currentAdminIds.includes(userRecord.uid)) {
        await orgRef.update({
          adminIds: [...currentAdminIds, userRecord.uid],
          updatedAt: new Date(),
        })
      }
    }

    // Set custom claims
    let permissions = [...ROLE_PERMISSIONS[role]]
    if (subrole && role === 'nonprofit_admin') {
      permissions = [...permissions, ...SUBROLE_PERMISSIONS[subrole]]
    }

    const customClaims: Record<string, unknown> = {
      role,
      permissions,
    }

    if (subrole) {
      customClaims.subrole = subrole
    }

    // All users now have an organization
    if (!finalOrganizationId) {
      // Clean up created user if we couldn't determine organization
      await adminAuth.deleteUser(userRecord.uid)
      return NextResponse.json(
        { error: 'Could not determine organization for user' },
        { status: 400 }
      )
    }
    
    customClaims.organizationId = finalOrganizationId

    await adminAuth.setCustomUserClaims(userRecord.uid, customClaims)

    // Create user profile in Firestore
    const userProfileData: Record<string, unknown> = {
      uid: userRecord.uid,
      email,
      displayName,
      role,
      photoURL: null,
      isEmailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        signUpMethod: 'email',
        lastLoginAt: null,
      },
    }

    if (subrole) {
      userProfileData.subrole = subrole
    }

    // All users now have an organization
    userProfileData.organizationId = finalOrganizationId

    // Only add phoneNumber if it exists (not undefined)
    if (phoneNumber) {
      userProfileData.phoneNumber = phoneNumber
    }

    await adminDb.collection('users').doc(userRecord.uid).set(userProfileData)

    // Handle team invitation acceptance if token provided
    if (teamInviteToken) {
      try {
        // Find the invitation
        const invitationSnapshot = await adminDb
          .collection('team_invitations')
          .where('invitationToken', '==', teamInviteToken)
          .where('status', '==', 'pending')
          .limit(1)
          .get()

        if (!invitationSnapshot.empty) {
          const invitationDoc = invitationSnapshot.docs[0]
          const invitationData = invitationDoc.data()

          // Verify the invitation is for this email
          if (invitationData.invitedEmail === email) {
            // Update invitation status
            await invitationDoc.ref.update({
              status: 'accepted',
              acceptedAt: new Date(),
              acceptedUserId: userRecord.uid
            })

            console.log('Team invitation accepted during registration:', {
              invitationId: invitationDoc.id,
              userId: userRecord.uid,
              organizationId: finalOrganizationId
            })
          }
        }
      } catch (inviteError) {
        console.error('Error processing team invitation:', inviteError)
        // Don't fail registration if invitation processing fails
      }
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role,
          subrole,
          organizationId: finalOrganizationId,
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error('Registration error:', error)
    
    // Handle Firebase Auth errors
    const authError = error as { code?: string }
    if (authError.code === 'auth/email-already-exists') {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }
    
    if (authError.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    if (authError.code === 'auth/weak-password') {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}