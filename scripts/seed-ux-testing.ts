/**
 * UX Testing Seed Script
 *
 * Creates a complete testing environment with:
 * - Test users for all roles (donor, nonprofit, appraiser)
 * - Sample campaigns
 * - Pre-created invitations
 * - Sample donation data
 *
 * Run with: npm run seed-ux-testing
 *
 * ⚠️ STAGING ONLY - Will not run in production
 */

import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { UserRole, NonprofitSubrole } from '@/types/auth'

interface TestUser {
  email: string
  password: string
  displayName: string
  role: UserRole
  subrole?: NonprofitSubrole
  organizationName: string
  phoneNumber?: string
}

// Test users with memorable credentials
const TEST_USERS: TestUser[] = [
  {
    email: 'donor-test@example.com',
    password: 'TestPass123!',
    displayName: 'Sarah Chen',
    role: 'donor',
    organizationName: 'TechStartup Inc.',
    phoneNumber: '+1-555-0101',
  },
  {
    email: 'nonprofit-test@example.com',
    password: 'TestPass123!',
    displayName: 'Michael Rodriguez',
    role: 'nonprofit_admin',
    subrole: 'admin',
    organizationName: 'Save The Planet Foundation',
    phoneNumber: '+1-555-0102',
  },
  {
    email: 'appraiser-test@example.com',
    password: 'TestPass123!',
    displayName: 'Jennifer Liu',
    role: 'appraiser',
    organizationName: 'Elite Appraisal Services',
    phoneNumber: '+1-555-0103',
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
  member: []
}

interface CreatedUser {
  uid: string
  email: string
  role: UserRole
  organizationId: string
}

const createdUsers: Record<string, CreatedUser> = {}

async function createTestUser(testUser: TestUser): Promise<CreatedUser> {
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
        phoneNumber: testUser.phoneNumber,
      })
      console.log(`✓ Created user ${testUser.email} (${userRecord.uid})`)
    }

    // Create or find organization
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
        ...(orgType === 'nonprofit' && {
          taxId: '12-3456789',
          website: 'https://savetheplanet.org',
          description: 'Making the world a better place through environmental conservation.',
        }),
      })
      organizationId = orgRef.id
      console.log(`  ✓ Created organization ${testUser.organizationName} (${organizationId})`)
    } else {
      organizationId = orgSnapshot.docs[0].id
      console.log(`  ✓ Organization already exists (${organizationId})`)
    }

    // Set custom claims
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

    // Create user profile
    const userDoc = await adminDb.collection('users').doc(userRecord.uid).get()

    if (!userDoc.exists) {
      const userProfileData: Record<string, unknown> = {
        uid: userRecord.uid,
        email: testUser.email,
        displayName: testUser.displayName,
        role: testUser.role,
        photoURL: null,
        phoneNumber: testUser.phoneNumber || null,
        isEmailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        organizationId,
        metadata: {
          signUpMethod: 'ux_test_seed',
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

    return {
      uid: userRecord.uid,
      email: testUser.email,
      role: testUser.role,
      organizationId,
    }
  } catch (error) {
    console.error(`❌ Error creating ${testUser.email}:`, error)
    throw error
  }
}

async function createSampleCampaign(nonprofitUser: CreatedUser): Promise<string> {
  try {
    console.log('📢 Creating sample campaign...')

    const campaignRef = adminDb.collection('campaigns').doc()
    const campaignId = campaignRef.id

    await campaignRef.set({
      title: 'UX Testing',
      description:
        'Test campaign for UX testing and demonstration purposes. This campaign includes a complete workflow with donor, nonprofit, and appraiser roles.',
      organizationId: nonprofitUser.organizationId,
      createdBy: nonprofitUser.uid,
      goal: 500000,
      currentAmount: 0,
      donorCount: 0,
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      status: 'active',
      visibility: 'public',
      category: 'Education',
      tags: [],
      images: {
        hero: '',
        gallery: []
      },
      settings: {
        allowRecurring: true
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log(`  ✓ Created campaign: ${campaignId}`)
    return campaignId
  } catch (error) {
    console.error('❌ Error creating campaign:', error)
    throw error
  }
}

async function createSamplePledge(
  donorUser: CreatedUser,
  nonprofitUser: CreatedUser,
  appraiserUser: CreatedUser,
  campaignId: string
): Promise<string> {
  try {
    console.log('💰 Creating sample pledge with complete workflow...')

    const participantId = `${campaignId}_${donorUser.uid}`
    const participantRef = adminDb.collection('campaign_participants').doc(participantId)

    await participantRef.set({
      id: participantId,
      campaignId,
      userId: donorUser.uid,
      userRole: 'donor',
      donorId: donorUser.uid,
      donorEmail: donorUser.email,
      nonprofitId: nonprofitUser.organizationId,
      appraiserId: appraiserUser.uid,
      appraiserEmail: appraiserUser.email,
      appraiserOrganizationId: appraiserUser.organizationId,
      status: 'active',
      equityType: 'common_stock',
      estimatedValue: 50000,
      shareCount: 5000,
      companyName: 'TechStartup Inc.',
      triggerEvent: 'ipo',
      pledgeDate: new Date(),
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log(`  ✓ Created sample pledge: ${participantId}`)

    // Create all tasks for the workflow
    await createTasksForParticipant(participantId, campaignId, donorUser, nonprofitUser, appraiserUser)

    return participantId
  } catch (error) {
    console.error('❌ Error creating pledge:', error)
    throw error
  }
}

async function createTasksForParticipant(
  participantId: string,
  campaignId: string,
  donorUser: CreatedUser,
  nonprofitUser: CreatedUser,
  appraiserUser: CreatedUser
): Promise<void> {
  try {
    console.log('📋 Creating task workflow...')

    const batch = adminDb.batch()

    // Task 1: Donor - Choose Appraisal Method (Already completed - chose to invite appraiser)
    const inviteAppraiserTaskId = `${participantId}_invite_appraiser`
    batch.set(adminDb.collection('tasks').doc(inviteAppraiserTaskId), {
      id: inviteAppraiserTaskId,
      participantId,
      campaignId,
      donorId: donorUser.uid,
      assignedTo: donorUser.uid,
      assignedRole: 'donor',
      title: 'Donor: Invite Appraiser or AI Appraisal',
      description: 'Choose your preferred appraisal method.',
      type: 'invitation',
      status: 'completed',
      priority: 'high',
      order: 1,
      dependencies: [],
      completedAt: new Date(),
      completedBy: donorUser.uid,
      metadata: {
        invitationType: 'appraiser',
        role: 'appraiser',
        appraisalMethod: 'invite_appraiser',
        appraiserEmail: appraiserUser.email,
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: donorUser.uid,
    })

    // Task 2: Donor - Sign NDA
    const signNDATaskId = `${participantId}_sign_nda`
    batch.set(adminDb.collection('tasks').doc(signNDATaskId), {
      id: signNDATaskId,
      participantId,
      campaignId,
      donorId: donorUser.uid,
      assignedTo: donorUser.uid,
      assignedRole: 'donor',
      title: 'Donor: Sign NDA',
      description: 'Review and digitally sign the Non-Disclosure Agreement.',
      type: 'docusign_signature',
      status: 'pending',
      priority: 'high',
      order: 2,
      dependencies: [inviteAppraiserTaskId],
      metadata: {
        documentPath: '/public/nda-general.pdf',
        documentName: 'General NDA',
        envelopeId: null,
        signedAt: null,
        signingUrl: null,
        automatedReminders: true,
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: donorUser.uid,
    })

    // Task 3: Donor - Commitment Decision
    const commitmentTaskId = `${participantId}_commitment_decision`
    batch.set(adminDb.collection('tasks').doc(commitmentTaskId), {
      id: commitmentTaskId,
      participantId,
      campaignId,
      donorId: donorUser.uid,
      assignedTo: donorUser.uid,
      assignedRole: 'donor',
      title: 'Donor: Commitment',
      description: 'Choose when you want to make your donation commitment.',
      type: 'commitment_decision',
      status: 'blocked',
      priority: 'high',
      order: 3,
      dependencies: [signNDATaskId],
      metadata: {
        options: [
          {
            id: 'commit_now',
            label: 'Make Commitment Now',
            description: 'I\'m ready to specify my commitment amount and details now, before the appraisal is complete.'
          },
          {
            id: 'commit_after_appraisal',
            label: 'Wait for Appraisal',
            description: 'I\'d like to see the appraisal results before making my final commitment decision.'
          }
        ]
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: donorUser.uid,
    })

    // Task 4: Donor - Upload Company Information
    const companyInfoTaskId = `${participantId}_company_info`
    batch.set(adminDb.collection('tasks').doc(companyInfoTaskId), {
      id: companyInfoTaskId,
      participantId,
      campaignId,
      donorId: donorUser.uid,
      assignedTo: donorUser.uid,
      assignedRole: 'donor',
      title: 'Donor: Upload Company Information',
      description: 'Upload your company information and financial documents.',
      type: 'document_upload',
      status: 'blocked',
      priority: 'high',
      order: 4,
      dependencies: [commitmentTaskId],
      metadata: {
        documentTypes: ['company_info', 'financial_statements'],
        uploadFolders: ['legal', 'financial'],
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: donorUser.uid,
    })

    // Task 5: Appraiser - Sign NDA
    const appraiserNDATaskId = `${participantId}_appraiser_sign_nda`
    batch.set(adminDb.collection('tasks').doc(appraiserNDATaskId), {
      id: appraiserNDATaskId,
      participantId,
      campaignId,
      donorId: donorUser.uid,
      assignedTo: appraiserUser.uid,
      assignedRole: 'appraiser',
      title: 'Appraiser: Sign NDA',
      description: 'Review and digitally sign the Non-Disclosure Agreement.',
      type: 'docusign_signature',
      status: 'blocked',
      priority: 'high',
      order: 5,
      dependencies: [companyInfoTaskId],
      metadata: {
        documentPath: '/public/nda-appraiser.pdf',
        documentName: 'Appraiser NDA',
        envelopeId: null,
        signedAt: null,
        signingUrl: null,
        automatedReminders: true,
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: donorUser.uid,
    })

    // Task 6: Appraiser - Upload Documents
    const appraiserUploadTaskId = `${participantId}_appraiser_upload`
    batch.set(adminDb.collection('tasks').doc(appraiserUploadTaskId), {
      id: appraiserUploadTaskId,
      participantId,
      campaignId,
      donorId: donorUser.uid,
      assignedTo: appraiserUser.uid,
      assignedRole: 'appraiser',
      title: 'Appraiser: Upload Appraisal Documents',
      description: 'Upload appraisal documents and valuation reports.',
      type: 'document_upload',
      status: 'blocked',
      priority: 'high',
      order: 6,
      dependencies: [appraiserNDATaskId],
      metadata: {
        documentTypes: ['appraisal_report', 'valuation_documents'],
        uploadFolders: ['appraisals'],
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: donorUser.uid,
    })

    // Task 7: Donor - Approve Documents
    const donorApproveTaskId = `${participantId}_donor_approve`
    batch.set(adminDb.collection('tasks').doc(donorApproveTaskId), {
      id: donorApproveTaskId,
      participantId,
      campaignId,
      donorId: donorUser.uid,
      assignedTo: donorUser.uid,
      assignedRole: 'donor',
      title: 'Donor: Approve Documents',
      description: 'Review and approve the appraisal documents.',
      type: 'document_review',
      status: 'blocked',
      priority: 'medium',
      order: 7,
      dependencies: [appraiserUploadTaskId],
      metadata: {
        approvalRequired: true,
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: donorUser.uid,
    })

    // Task 8: Nonprofit - Approve Documents
    const nonprofitApproveTaskId = `${participantId}_nonprofit_approve`
    batch.set(adminDb.collection('tasks').doc(nonprofitApproveTaskId), {
      id: nonprofitApproveTaskId,
      participantId,
      campaignId,
      donorId: donorUser.uid,
      assignedTo: nonprofitUser.uid,
      assignedRole: 'nonprofit_admin',
      title: 'Nonprofit: Approve Documents',
      description: 'Review and approve all donation documentation.',
      type: 'document_review',
      status: 'blocked',
      priority: 'high',
      order: 8,
      dependencies: [donorApproveTaskId],
      metadata: {
        approvalRequired: true,
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: donorUser.uid,
    })

    // Task 9: Nonprofit - Upload Final Documents
    const nonprofitUploadTaskId = `${participantId}_nonprofit_upload`
    batch.set(adminDb.collection('tasks').doc(nonprofitUploadTaskId), {
      id: nonprofitUploadTaskId,
      participantId,
      campaignId,
      donorId: donorUser.uid,
      assignedTo: nonprofitUser.uid,
      assignedRole: 'nonprofit_admin',
      title: 'Nonprofit: Upload Final Documents',
      description: 'Upload final donation receipt and acknowledgement.',
      type: 'document_upload',
      status: 'blocked',
      priority: 'medium',
      order: 9,
      dependencies: [nonprofitApproveTaskId],
      metadata: {
        documentTypes: ['donation_receipt', 'acknowledgement'],
        uploadFolders: ['signed-documents'],
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: donorUser.uid,
    })

    await batch.commit()

    console.log(`  ✓ Created 9 workflow tasks`)
  } catch (error) {
    console.error('❌ Error creating tasks:', error)
    throw error
  }
}

async function seedUXTesting() {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV

  if (environment === 'production') {
    throw new Error('❌ Cannot seed test data in production environment!')
  }

  console.log('🚀 Starting UX Testing Environment Setup...')
  console.log(`📍 Environment: ${environment}\n`)
  console.log('═══════════════════════════════════════════════════\n')

  // Step 1: Create test users
  console.log('👥 Creating test users...\n')
  for (const testUser of TEST_USERS) {
    const created = await createTestUser(testUser)
    createdUsers[testUser.role] = created
  }

  console.log('═══════════════════════════════════════════════════\n')

  // Step 2: Create sample campaign
  const campaignId = await createSampleCampaign(createdUsers.nonprofit_admin)
  console.log()

  // Step 3: Create sample pledge with all three roles connected
  await createSamplePledge(
    createdUsers.donor,
    createdUsers.nonprofit_admin,
    createdUsers.appraiser,
    campaignId
  )

  console.log('\n═══════════════════════════════════════════════════')
  console.log('🎉 UX Testing Environment Ready!\n')

  console.log('📧 TEST ACCOUNTS (All use password: TestPass123!):')
  console.log('─────────────────────────────────────────────────')
  TEST_USERS.forEach((user) => {
    console.log(`\n🔐 ${user.displayName} (${user.role.toUpperCase()})`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Password: ${user.password}`)
    if (user.subrole) {
      console.log(`   Subrole: ${user.subrole}`)
    }
  })
  console.log('\n─────────────────────────────────────────────────')

  console.log('\n📝 WHAT WAS CREATED:')
  console.log('  ✓ 3 test user accounts (donor, nonprofit admin, appraiser)')
  console.log('  ✓ 3 organizations (one for each user)')
  console.log('  ✓ 1 active campaign (UX Testing)')
  console.log('  ✓ 1 pledge/donation with all 3 roles connected')
  console.log('  ✓ 9 workflow tasks (assigned to appropriate roles)')

  console.log('\n💡 TESTING WORKFLOW:')
  console.log('  1. Login as DONOR (donor-test@example.com)')
  console.log('     • View the campaign and your pledge')
  console.log('     • See your assigned tasks (Sign NDA, Upload Documents, etc.)')
  console.log('     • First task already completed (Appraiser was "invited")')
  console.log('')
  console.log('  2. Login as NONPROFIT (nonprofit-test@example.com)')
  console.log('     • View your campaign details')
  console.log('     • See the incoming pledge/donation')
  console.log('     • Review tasks assigned to you (Document approval, etc.)')
  console.log('')
  console.log('  3. Login as APPRAISER (appraiser-test@example.com)')
  console.log('     • View your assigned appraisal tasks')
  console.log('     • See the donation you\'re connected to')
  console.log('     • Review tasks (Sign NDA, Upload Appraisal, etc.)')

  console.log('\n🔄 WORKFLOW STRUCTURE:')
  console.log('  • All three roles are pre-linked to the same donation')
  console.log('  • No email invitations needed - appraiser already connected')
  console.log('  • Tasks follow dependency chain (some blocked until previous complete)')
  console.log('  • UX team can test by logging in/out of different accounts')

  console.log('\n🔧 TO RESET:')
  console.log('  Run: npm run seed-ux-testing')
  console.log('  (Script is idempotent - safe to run multiple times)')

  console.log('\n═══════════════════════════════════════════════════\n')
}

seedUXTesting()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
