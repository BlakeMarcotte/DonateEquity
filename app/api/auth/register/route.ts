import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { UserRole, NonprofitSubrole } from '@/types/auth'
import { secureLogger } from '@/lib/logging/secure-logger'
import { generateInviteCode, validateInviteCodeFormat, getRoleFromInviteCode } from '@/lib/utils/inviteCode'

interface RegisterRequest {
  email: string
  password: string
  displayName: string
  role: UserRole
  subrole?: NonprofitSubrole
  organizationId?: string
  organizationName?: string
  inviteCode?: string
  phoneNumber?: string
  teamInviteToken?: string
  appraiserInvitationToken?: string
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
    'create_donation',
    'view_own_donations',
    'manage_own_profile',
    'create_campaign',
    'manage_campaigns',
    'view_donations',
    'manage_organization',
    'view_assigned_tasks',
    'submit_appraisals',
    'system_admin',
    'manage_all_users',
    'access_admin_panel'
  ]
}

const SUBROLE_PERMISSIONS: Record<NonprofitSubrole, string[]> = {
  admin: ['manage_organization_users', 'manage_all_campaigns', 'approve_donations'],
  member: []
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()

    // Validate required fields
    const { email, password, displayName, role, subrole, organizationId, organizationName, inviteCode, phoneNumber, teamInviteToken, appraiserInvitationToken } = body

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

    // All roles now require inviteCode or organizationName (except team invitations)
    if (!teamInviteToken && !inviteCode && !organizationName) {
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

    // Handle invite code validation and organization lookup
    let finalOrganizationId = organizationId
    let grantedRole: UserRole | undefined
    let grantedSubrole: NonprofitSubrole | undefined

    if (inviteCode && !finalOrganizationId) {
      // Validate invite code format
      const normalizedCode = inviteCode.toUpperCase().trim()

      if (!validateInviteCodeFormat(normalizedCode)) {
        await adminAuth.deleteUser(userRecord.uid)
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
        const orgInviteCodes = data.inviteCodes || {}

        // Check if any of the invite codes match
        if (
          orgInviteCodes.admin === normalizedCode ||
          orgInviteCodes.member === normalizedCode ||
          orgInviteCodes.appraiser === normalizedCode ||
          orgInviteCodes.donor === normalizedCode
        ) {
          matchedOrg = {
            id: doc.id,
            inviteCodes: orgInviteCodes
          }
          break
        }
      }

      if (!matchedOrg) {
        await adminAuth.deleteUser(userRecord.uid)
        return NextResponse.json(
          { error: 'Invalid invite code' },
          { status: 404 }
        )
      }

      // Determine which role/subrole this code grants
      const grantedRoleInfo = getRoleFromInviteCode(matchedOrg.inviteCodes, normalizedCode)

      if (!grantedRoleInfo) {
        await adminAuth.deleteUser(userRecord.uid)
        return NextResponse.json(
          { error: 'Invalid invite code configuration' },
          { status: 500 }
        )
      }

      grantedRole = grantedRoleInfo.role
      grantedSubrole = grantedRoleInfo.subrole

      // Verify that the granted role matches the user's selected role
      if (grantedRole !== role || grantedSubrole !== subrole) {
        await adminAuth.deleteUser(userRecord.uid)
        return NextResponse.json(
          {
            error: `This invite code is for ${grantedSubrole ? `${grantedRole} (${grantedSubrole})` : grantedRole} role, but you selected ${subrole ? `${role} (${subrole})` : role}`
          },
          { status: 400 }
        )
      }

      finalOrganizationId = matchedOrg.id
    }

    // Handle organization creation/linking

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
        secureLogger.error('Error fetching team invitation for organization', error)
      }
    }

    if (!finalOrganizationId && organizationName) {
      // Create new organization
      const orgRef = adminDb.collection('organizations').doc()
      let orgType = 'donor' // Default for donors
      if (role === 'nonprofit_admin') orgType = 'nonprofit'
      if (role === 'appraiser') orgType = 'appraiser'

      // Generate invite codes based on organization type
      const now = new Date()
      const inviteCodes: Record<string, string> = {}
      const inviteCodesGeneratedAt: Record<string, Date> = {}

      if (orgType === 'nonprofit') {
        // Nonprofits get admin and member codes
        inviteCodes.admin = generateInviteCode()
        inviteCodes.member = generateInviteCode()
        inviteCodesGeneratedAt.admin = now
        inviteCodesGeneratedAt.member = now
      } else if (orgType === 'appraiser') {
        // Appraisers get appraiser code
        inviteCodes.appraiser = generateInviteCode()
        inviteCodesGeneratedAt.appraiser = now
      } else if (orgType === 'donor') {
        // Donors get donor code
        inviteCodes.donor = generateInviteCode()
        inviteCodesGeneratedAt.donor = now
      }

      await orgRef.set({
        name: organizationName,
        type: orgType,
        createdBy: userRecord.uid,
        createdAt: now,
        updatedAt: now,
        adminIds: [userRecord.uid],
        isActive: true,
        inviteCodes,
        inviteCodesGeneratedAt,
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
      // Only add to adminIds if user has admin subrole or is not a nonprofit_admin
      const currentAdminIds = orgDoc.data()?.adminIds || []
      const shouldBeAdmin = role !== 'nonprofit_admin' || subrole === 'admin'

      if (!currentAdminIds.includes(userRecord.uid) && shouldBeAdmin) {
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

            secureLogger.info('Team invitation accepted during registration', {
              invitationId: invitationDoc.id,
              userId: userRecord.uid,
              organizationId: finalOrganizationId
            })
          }
        }
      } catch (inviteError) {
        secureLogger.error('Error processing team invitation', inviteError)
        // Don't fail registration if invitation processing fails
      }
    }

    // Handle appraiser invitation acceptance if provided
    if (appraiserInvitationToken && role === 'appraiser') {
      try {
        secureLogger.info('Processing appraiser invitation during registration', {
          appraiserInvitationToken,
          userId: userRecord.uid
        })

        // Find the invitation
        const invitationsQuery = adminDb.collection('appraiser_invitations')
          .where('invitationToken', '==', appraiserInvitationToken)
          .limit(1)

        const invitationsSnapshot = await invitationsQuery.get()

        if (!invitationsSnapshot.empty) {
          const invitationDoc = invitationsSnapshot.docs[0]
          const invitationData = invitationDoc.data()

          // Verify the invitation email matches registration email
          if (invitationData.appraiserEmail === email) {
            const donationId = invitationData.donationId
            const batch = adminDb.batch()

            // Update the invitation status
            batch.update(invitationDoc.ref, {
              status: 'accepted',
              respondedAt: FieldValue.serverTimestamp(),
              acceptedBy: userRecord.uid
            })

            // Get donation document
            const donationRef = adminDb.collection('donations').doc(donationId)
            const donationDoc = await donationRef.get()

            if (donationDoc.exists) {
              // Update donation with appraiser ID
              batch.update(donationRef, {
                appraiserId: userRecord.uid,
                appraiserEmail: email,
                appraiserAssignedAt: FieldValue.serverTimestamp(),
              })

              // Update appraiser tasks to assign to this user
              const appraiserTasksQuery = adminDb.collection('tasks')
                .where('donationId', '==', donationId)
                .where('assignedRole', '==', 'appraiser')

              const appraiserTasksSnapshot = await appraiserTasksQuery.get()

              appraiserTasksSnapshot.docs.forEach(taskDoc => {
                batch.update(taskDoc.ref, {
                  assignedTo: userRecord.uid,
                })
              })

              secureLogger.info('Updated appraiser tasks during registration', {
                userId: userRecord.uid,
                donationId,
                taskCount: appraiserTasksSnapshot.size,
              })
            } else {
              secureLogger.warn('Donation not found for appraiser invitation', {
                donationId,
                invitationId: invitationDoc.id,
              })
            }

            await batch.commit()
            secureLogger.info('Appraiser invitation processed successfully during registration', {
              userId: userRecord.uid,
              donationId,
              invitationId: invitationDoc.id,
            })
          } else {
            secureLogger.warn('Invitation email mismatch during registration', {
              invitationEmail: invitationData.appraiserEmail,
              registrationEmail: email
            })
          }
        } else {
          secureLogger.warn('Appraiser invitation not found during registration', {
            appraiserInvitationToken
          })
        }
      } catch (invitationError) {
        secureLogger.error('Error processing appraiser invitation during registration', invitationError, {
          userId: userRecord.uid,
        })
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
    secureLogger.error('Registration error', error)
    
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