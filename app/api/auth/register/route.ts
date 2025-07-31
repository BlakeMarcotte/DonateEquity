import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { UserRole } from '@/types/auth'

interface RegisterRequest {
  email: string
  password: string
  displayName: string
  role: UserRole
  organizationId?: string
  organizationName?: string
  phoneNumber?: string
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

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    
    // Validate required fields
    const { email, password, displayName, role, organizationId, organizationName, phoneNumber } = body
    
    if (!email || !password || !displayName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['donor', 'nonprofit_admin', 'appraiser', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    // All roles now require organizationId or organizationName
    if (!organizationId && !organizationName) {
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
      await orgRef.update({
        adminIds: [...(orgDoc.data()?.adminIds || []), userRecord.uid],
        updatedAt: new Date(),
      })
    }

    // Set custom claims
    const customClaims: Record<string, unknown> = {
      role,
      permissions: ROLE_PERMISSIONS[role],
    }

    // All users now have an organization
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

    // All users now have an organization
    userProfileData.organizationId = finalOrganizationId

    // Only add phoneNumber if it exists (not undefined)
    if (phoneNumber) {
      userProfileData.phoneNumber = phoneNumber
    }

    await adminDb.collection('users').doc(userRecord.uid).set(userProfileData)

    // Send welcome email (non-blocking)
    try {
      const idToken = await adminAuth.createCustomToken(userRecord.uid)
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/email/send-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userEmail: email,
          userFirstName: displayName.split(' ')[0],
          userRole: role,
        }),
      }).catch(emailError => {
        console.error('Failed to send welcome email:', emailError)
      })
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't block registration if email fails
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role,
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