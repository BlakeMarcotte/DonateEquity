import { User } from 'firebase/auth'
import { UserProfile, CustomClaims, UserRole, NonprofitSubrole } from '@/types/auth'
import { Campaign } from '@/types/campaign'
import { Donation } from '@/types/donation'
import { CampaignInvitation } from '@/types/invitations'

export function isPreviewMode(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('preview') === 'true'
}

export function getPreviewUser(role: UserRole): Partial<User> {
  const claims = getPreviewClaims(role)
  
  const baseUser = {
    uid: `preview-${role}-user`,
    email: `${role}@preview.com`,
    emailVerified: true,
    displayName: `Preview ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    photoURL: null,
    phoneNumber: null,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'preview-token',
    getIdTokenResult: async () => ({
      token: 'preview-token',
      claims: {
        role: claims.role,
        subrole: claims.subrole,
        organizationId: claims.organizationId,
        permissions: claims.permissions,
      },
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: 'preview',
      signInSecondFactor: null,
    }),
    reload: async () => {},
    toJSON: () => ({}),
  }
  
  return baseUser as unknown as Partial<User>
}

export function getPreviewProfile(role: UserRole): UserProfile {
  const profiles: Record<UserRole, UserProfile> = {
    donor: {
      uid: 'preview-donor-user',
      email: 'donor@preview.com',
      displayName: 'John Donor',
      role: 'donor',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      phoneNumber: '+1234567890',
      photoURL: undefined,
      isEmailVerified: true,
      metadata: {
        lastLoginAt: new Date(),
        signUpMethod: 'email',
      },
    },
    nonprofit_admin: {
      uid: 'preview-nonprofit-user',
      email: 'nonprofit@preview.com',
      displayName: 'Jane Nonprofit',
      role: 'nonprofit_admin',
      subrole: 'admin' as NonprofitSubrole,
      organizationId: 'preview-org-1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      phoneNumber: '+1234567891',
      photoURL: undefined,
      isEmailVerified: true,
      metadata: {
        lastLoginAt: new Date(),
        signUpMethod: 'email',
      },
    },
    appraiser: {
      uid: 'preview-appraiser-user',
      email: 'appraiser@preview.com',
      displayName: 'Mike Appraiser',
      role: 'appraiser',
      organizationId: 'preview-appraiser-org',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      phoneNumber: '+1234567892',
      photoURL: undefined,
      isEmailVerified: true,
      metadata: {
        lastLoginAt: new Date(),
        signUpMethod: 'email',
      },
    },
    admin: {
      uid: 'preview-admin-user',
      email: 'admin@preview.com',
      displayName: 'Admin User',
      role: 'admin',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date(),
      phoneNumber: '+1234567893',
      photoURL: undefined,
      isEmailVerified: true,
      metadata: {
        lastLoginAt: new Date(),
        signUpMethod: 'email',
      },
    },
  }
  
  return profiles[role]
}

export function getPreviewClaims(role: UserRole): CustomClaims {
  const claims: Record<UserRole, CustomClaims> = {
    donor: {
      role: 'donor',
      organizationId: '',
      permissions: ['view_campaigns', 'create_donations', 'view_donations'],
    },
    nonprofit_admin: {
      role: 'nonprofit_admin',
      subrole: 'admin',
      organizationId: 'preview-org-1',
      permissions: ['manage_campaigns', 'manage_team', 'view_analytics', 'manage_tasks'],
    },
    appraiser: {
      role: 'appraiser',
      organizationId: 'preview-appraiser-org',
      permissions: ['view_appraisals', 'create_appraisals', 'update_appraisals'],
    },
    admin: {
      role: 'admin',
      organizationId: '',
      permissions: ['*'],
    },
  }
  
  return claims[role]
}

export function getPreviewCampaigns(): Campaign[] {
  return [
    {
      id: 'preview-campaign-1',
      title: 'Tech for Good Initiative',
      description: 'Supporting technology education in underserved communities through equity donations from tech professionals.',
      goal: 500000,
      currentAmount: 325000,
      organizationId: 'preview-org-1',
      organizationName: 'Future Builders Foundation',
      status: 'active',
      images: {
        hero: '',
        gallery: [],
      },
      createdAt: new Date('2024-10-01'),
      updatedAt: new Date(),
      startDate: new Date('2024-10-01'),
      endDate: new Date('2025-01-31'),
      createdBy: 'preview-nonprofit-user',
      donorCount: 12,
      settings: {
        minimumDonation: 10000,
        allowRecurring: false,
      },
    },
    {
      id: 'preview-campaign-2',
      title: 'Climate Action Fund',
      description: 'Funding renewable energy projects and climate research through pre-IPO equity donations.',
      goal: 1000000,
      currentAmount: 750000,
      organizationId: 'preview-org-2',
      organizationName: 'Green Tomorrow',
      status: 'active',
      images: {
        hero: '',
        gallery: [],
      },
      createdAt: new Date('2024-09-15'),
      updatedAt: new Date(),
      startDate: new Date('2024-09-15'),
      endDate: new Date('2025-03-15'),
      createdBy: 'preview-nonprofit-2',
      donorCount: 8,
      settings: {
        minimumDonation: 25000,
        allowRecurring: false,
      },
    },
    {
      id: 'preview-campaign-3',
      title: 'Healthcare Innovation',
      description: 'Bringing cutting-edge medical technology to rural healthcare facilities.',
      goal: 250000,
      currentAmount: 100000,
      organizationId: 'preview-org-3',
      organizationName: 'Health First Alliance',
      status: 'active',
      images: {
        hero: '',
        gallery: [],
      },
      createdAt: new Date('2024-11-01'),
      updatedAt: new Date(),
      startDate: new Date('2024-11-01'),
      endDate: new Date('2025-02-28'),
      createdBy: 'preview-nonprofit-3',
      donorCount: 5,
      settings: {
        minimumDonation: 5000,
        allowRecurring: false,
      },
    },
  ]
}

export function getPreviewDonations(): Donation[] {
  return [
    {
      id: 'preview-donation-1',
      campaignId: 'preview-campaign-1',
      campaignTitle: 'Tech for Good Initiative',
      donorId: 'preview-donor-user',
      donorName: 'John Donor',
      donorEmail: 'donor@preview.com',
      nonprofitAdminId: 'preview-nonprofit-user',
      amount: 50000,
      donationType: 'equity',
      status: 'completed',
      message: 'Excited to support technology education!',
      isAnonymous: false,
      requiresAppraisal: true,
      appraisalStatus: 'completed',
      organizationId: 'preview-org-1',
      organizationName: 'Future Builders Foundation',
      createdAt: new Date('2024-10-15'),
      updatedAt: new Date('2024-11-01'),
      completedAt: new Date('2024-11-01'),
      commitmentDetails: {
        donorOrganizationName: 'TechCorp Inc',
        estimatedValue: 50000,
      },
    },
    {
      id: 'preview-donation-2',
      campaignId: 'preview-campaign-2',
      campaignTitle: 'Climate Action Fund',
      donorId: 'preview-donor-user',
      donorName: 'John Donor',
      donorEmail: 'donor@preview.com',
      nonprofitAdminId: 'preview-nonprofit-2',
      amount: 75000,
      donationType: 'equity',
      status: 'processing',
      message: 'Happy to contribute to climate action.',
      isAnonymous: false,
      requiresAppraisal: true,
      appraisalStatus: 'in_progress',
      organizationId: 'preview-org-2',
      organizationName: 'Green Tomorrow',
      createdAt: new Date('2024-11-10'),
      updatedAt: new Date(),
      completedAt: null,
      commitmentDetails: {
        donorOrganizationName: 'GreenTech Solutions',
        estimatedValue: 75000,
      },
    },
    {
      id: 'preview-donation-3',
      campaignId: 'preview-campaign-3',
      campaignTitle: 'Healthcare Innovation',
      donorId: 'preview-donor-user',
      donorName: 'John Donor',
      donorEmail: 'donor@preview.com',
      nonprofitAdminId: 'preview-nonprofit-3',
      amount: 25000,
      donationType: 'equity',
      status: 'pending',
      isAnonymous: false,
      requiresAppraisal: false,
      appraisalStatus: 'not_required',
      organizationId: 'preview-org-3',
      organizationName: 'Health First Alliance',
      createdAt: new Date('2024-11-20'),
      updatedAt: new Date(),
      completedAt: null,
      commitmentDetails: {
        donorOrganizationName: 'HealthTech Innovations',
        estimatedValue: 25000,
      },
    },
  ]
}

export function getPreviewInvitations(): CampaignInvitation[] {
  return [
    {
      id: 'preview-invitation-1',
      campaignId: 'preview-campaign-1',
      campaignTitle: 'Tech for Good Initiative',
      invitedEmail: 'donor@preview.com',
      invitedUserId: 'preview-donor-user',
      inviterUserId: 'preview-nonprofit-user',
      inviterName: 'Jane Nonprofit',
      organizationId: 'preview-org-1',
      status: 'pending',
      message: 'We would love to have your support for our tech education initiative!',
      invitedAt: new Date('2024-11-15'),
      expiresAt: new Date('2024-12-15'),
      invitationToken: 'preview-token-1',
      userExists: true,
    },
    {
      id: 'preview-invitation-2',
      campaignId: 'preview-campaign-2',
      campaignTitle: 'Climate Action Fund',
      invitedEmail: 'donor@preview.com',
      invitedUserId: 'preview-donor-user',
      inviterUserId: 'preview-nonprofit-2',
      inviterName: 'Green Tomorrow Team',
      organizationId: 'preview-org-2',
      status: 'accepted',
      message: 'Join us in fighting climate change!',
      invitedAt: new Date('2024-11-01'),
      expiresAt: new Date('2024-12-01'),
      respondedAt: new Date('2024-11-10'),
      invitationToken: 'preview-token-2',
      userExists: true,
    },
  ]
}

export function getPreviewTasks() {
  return [
    {
      id: 'preview-task-1',
      donationId: 'preview-donation-1',
      campaignId: 'preview-campaign-1',
      title: 'Upload equity documentation',
      description: 'Please upload your stock certificates or option agreements',
      status: 'completed',
      assignedTo: 'preview-donor-user',
      createdBy: 'preview-nonprofit-user',
      dueDate: new Date('2024-10-20'),
      completedAt: new Date('2024-10-18'),
      createdAt: new Date('2024-10-15'),
      updatedAt: new Date('2024-10-18'),
    },
    {
      id: 'preview-task-2',
      donationId: 'preview-donation-2',
      campaignId: 'preview-campaign-2',
      title: 'Sign transfer agreement',
      description: 'Review and sign the equity transfer documentation',
      status: 'in_progress',
      assignedTo: 'preview-donor-user',
      createdBy: 'preview-nonprofit-user',
      dueDate: new Date('2024-12-01'),
      completedAt: null,
      createdAt: new Date('2024-11-10'),
      updatedAt: new Date('2024-11-15'),
    },
    {
      id: 'preview-task-3',
      donationId: 'preview-donation-3',
      campaignId: 'preview-campaign-3',
      title: 'Provide company valuation',
      description: 'Share the latest company valuation documentation',
      status: 'pending',
      assignedTo: 'preview-donor-user',
      createdBy: 'preview-nonprofit-user',
      dueDate: new Date('2024-12-10'),
      completedAt: null,
      createdAt: new Date('2024-11-20'),
      updatedAt: new Date('2024-11-20'),
    },
  ]
}

export function getPreviewOrganization() {
  return {
    id: 'preview-org-1',
    name: 'Future Builders Foundation',
    ein: '12-3456789',
    website: 'https://futurebuilders.org',
    phone: '+1 (555) 123-4567',
    email: 'contact@futurebuilders.org',
    address: {
      street: '123 Innovation Drive',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'United States',
    },
    mission: 'Empowering the next generation through technology education and workforce development programs.',
    description: 'Future Builders Foundation is dedicated to bridging the digital divide by providing quality technology education to underserved communities. We believe every young person deserves access to the skills and opportunities that will shape their future.',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date(),
    createdBy: 'preview-nonprofit-user',
    adminIds: ['preview-nonprofit-user'],
    memberCount: 5,
    verificationStatus: 'verified' as const,
    taxExemptStatus: '501(c)(3)',
  }
}

export function getPreviewTeamMembers() {
  return [
    {
      uid: 'preview-nonprofit-user',
      email: 'nonprofit@preview.com',
      displayName: 'Jane Nonprofit',
      role: 'nonprofit_admin',
      subrole: 'admin' as NonprofitSubrole,
      joinedAt: new Date('2024-01-01'),
      lastLoginAt: new Date(),
      photoURL: undefined,
      isEmailVerified: true,
      isAdmin: true,
    },
    {
      uid: 'preview-team-member-2',
      email: 'marketer@futurebuilders.org',
      displayName: 'Mike Marketing',
      role: 'nonprofit_admin',
      subrole: 'marketer' as NonprofitSubrole,
      joinedAt: new Date('2024-02-15'),
      lastLoginAt: new Date('2024-11-20'),
      photoURL: undefined,
      isEmailVerified: true,
      isAdmin: false,
    },
    {
      uid: 'preview-team-member-3',
      email: 'signatory@futurebuilders.org',
      displayName: 'Sarah Signatory',
      role: 'nonprofit_admin',
      subrole: 'signatory' as NonprofitSubrole,
      joinedAt: new Date('2024-03-10'),
      lastLoginAt: new Date('2024-11-19'),
      photoURL: undefined,
      isEmailVerified: true,
      isAdmin: false,
    },
  ]
}

export function getPreviewPendingInvitations() {
  return [
    {
      id: 'preview-team-invite-1',
      invitedEmail: 'newmember@example.com',
      subrole: 'member' as NonprofitSubrole,
      inviterName: 'Jane Nonprofit',
      personalMessage: 'Welcome to our team! Looking forward to working with you.',
      createdAt: new Date('2024-11-15'),
      expiresAt: new Date('2024-12-15'),
      invitationToken: 'preview-team-token-1',
      status: 'pending' as const,
    },
  ]
}
