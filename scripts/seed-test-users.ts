import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { UserRole, NonprofitSubrole } from '@/types/auth'

interface TestUser {
  email: string
  password: string
  displayName: string
  role: UserRole
  subrole?: NonprofitSubrole
  organizationName: string
}

const TEST_USERS: TestUser[] = [
  {
    email: 'donor@test.com',
    password: 'TestPassword123!',
    displayName: 'Test Donor',
    role: 'donor',
    organizationName: 'Test Donor Company',
  },
  {
    email: 'nonprofit@test.com',
    password: 'TestPassword123!',
    displayName: 'Test Nonprofit Admin',
    role: 'nonprofit_admin',
    subrole: 'admin',
    organizationName: 'Test Nonprofit Org',
  },
  {
    email: 'appraiser@test.com',
    password: 'TestPassword123!',
    displayName: 'Test Appraiser',
    role: 'appraiser',
    organizationName: 'Test Appraisal Firm',
  },
]

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  donor: ['create_donation', 'view_own_donations', 'manage_own_profile'],
  nonprofit_admin: [
    'create_campaign',
    'manage_campaigns',
    'view_donations',
    'manage_organization',
    'manage_own_profile',
  ],
  appraiser: ['view_assigned_tasks', 'submit_appraisals', 'manage_own_profile'],
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
    'access_admin_panel',
  ],
}

const SUBROLE_PERMISSIONS: Record<NonprofitSubrole, string[]> = {
  admin: [
    'manage_organization_users',
    'manage_all_campaigns',
    'approve_donations',
  ],
  member: [],
  marketer: ['create_marketing_content', 'manage_social_media'],
  signatory: ['sign_documents', 'approve_legal_documents'],
}

async function seedTestUsers() {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV

  if (environment === 'production') {
    throw new Error('❌ Cannot seed test users in production environment!')
  }

  console.log(`🌱 Seeding test users in ${environment} environment...\n`)

  for (const testUser of TEST_USERS) {
    try {
      let userRecord

      try {
        userRecord = await adminAuth.getUserByEmail(testUser.email)
        console.log(`✓ User ${testUser.email} already exists (${userRecord.uid})`)
      } catch (error) {
        userRecord = await adminAuth.createUser({
          email: testUser.email,
          password: testUser.password,
          displayName: testUser.displayName,
          emailVerified: true,
        })
        console.log(`✓ Created user ${testUser.email} (${userRecord.uid})`)
      }

      const orgRef = adminDb.collection('organizations').doc()
      let orgType = 'donor'
      if (testUser.role === 'nonprofit_admin') orgType = 'nonprofit'
      if (testUser.role === 'appraiser') orgType = 'appraiser'

      const orgSnapshot = await adminDb
        .collection('organizations')
        .where('createdBy', '==', userRecord.uid)
        .limit(1)
        .get()

      let organizationId: string

      if (orgSnapshot.empty) {
        await orgRef.set({
          name: testUser.organizationName,
          type: orgType,
          createdBy: userRecord.uid,
          createdAt: new Date(),
          updatedAt: new Date(),
          adminIds: [userRecord.uid],
          isActive: true,
        })
        organizationId = orgRef.id
        console.log(`  ✓ Created organization ${testUser.organizationName} (${organizationId})`)
      } else {
        organizationId = orgSnapshot.docs[0].id
        console.log(`  ✓ Organization already exists (${organizationId})`)
      }

      let permissions = [...ROLE_PERMISSIONS[testUser.role]]
      if (testUser.subrole && testUser.role === 'nonprofit_admin') {
        permissions = [...permissions, ...SUBROLE_PERMISSIONS[testUser.subrole]]
      }

      const customClaims: Record<string, unknown> = {
        role: testUser.role,
        permissions,
        organizationId,
      }

      if (testUser.subrole) {
        customClaims.subrole = testUser.subrole
      }

      await adminAuth.setCustomUserClaims(userRecord.uid, customClaims)
      console.log(`  ✓ Set custom claims (role: ${testUser.role})`)

      const userDoc = await adminDb.collection('users').doc(userRecord.uid).get()

      if (!userDoc.exists) {
        const userProfileData: Record<string, unknown> = {
          uid: userRecord.uid,
          email: testUser.email,
          displayName: testUser.displayName,
          role: testUser.role,
          photoURL: null,
          isEmailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          organizationId,
          metadata: {
            signUpMethod: 'test_seed',
            lastLoginAt: null,
          },
        }

        if (testUser.subrole) {
          userProfileData.subrole = testUser.subrole
        }

        await adminDb.collection('users').doc(userRecord.uid).set(userProfileData)
        console.log(`  ✓ Created user profile document`)
      } else {
        console.log(`  ✓ User profile already exists`)
      }

      console.log(`✅ ${testUser.displayName} setup complete\n`)
    } catch (error) {
      console.error(`❌ Error seeding ${testUser.email}:`, error)
    }
  }

  console.log('🎉 Test user seeding complete!')
  console.log('\n📧 Test Accounts:')
  TEST_USERS.forEach((user) => {
    console.log(`   ${user.email} / ${user.password} (${user.role})`)
  })
}

seedTestUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
