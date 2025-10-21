'use client'

import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PageLoading, ErrorState } from '@/components/shared/LoadingStates'
import { formatPhoneNumber, formatEIN } from '@/lib/utils/formatters'
import { secureLogger } from '@/lib/logging/secure-logger'
import { getOrCreateOrganization, type Organization, updateOrganization } from '@/lib/firebase/organizations'
import InviteTeamMemberModal from '@/components/organization/InviteTeamMemberModal'
import TeamMemberList from '@/components/organization/TeamMemberList'
import PendingInvitations from '@/components/organization/PendingInvitations'
import { NonprofitSubrole } from '@/types/auth'
import { isPreviewMode } from '@/lib/preview-mode/preview-data'
import { usePreviewMode } from '@/contexts/PreviewModeContext'
import {
  Building2,
  Globe,
  Phone,
  Users,
  Save,
  FileText,
  Calendar,
  DollarSign,
  UserPlus,
  Settings
} from 'lucide-react'


interface TeamMember {
  uid: string
  email: string
  displayName: string
  role: string
  subrole: NonprofitSubrole
  joinedAt: Date
  lastLoginAt?: Date
  photoURL?: string
  isEmailVerified: boolean
  isAdmin: boolean
}

interface PendingInvitation {
  id: string
  invitedEmail: string
  subrole: NonprofitSubrole
  inviterName: string
  personalMessage?: string
  createdAt: Date
  expiresAt: Date
  invitationToken: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
}


function OrganizationPageContent() {
  const { user, userProfile, customClaims, loading: authLoading } = useAuth()
  const previewMode = usePreviewMode()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Organization>>({})
  const [hasChanges, setHasChanges] = useState(false)
  
  // Team management state
  const [activeTab, setActiveTab] = useState<'details' | 'team'>(
    searchParams.get('tab') === 'team' ? 'team' : 'details'
  )
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [teamLoading, setTeamLoading] = useState(false)

  const fetchOrganization = useCallback(async () => {
    if (!customClaims?.organizationId || !userProfile) return

    setError(null)
    try {
      secureLogger.info('Fetching organization data', { 
        organizationId: customClaims.organizationId, 
        userRole: customClaims.role 
      })
      
      const org = await getOrCreateOrganization(
        customClaims.organizationId,
        userProfile.email,
        userProfile.uid,
        userProfile.displayName ? `${userProfile.displayName}'s Organization` : undefined
      )
      
      if (org) {
        secureLogger.info('Organization loaded successfully')
        setOrganization(org)
        setEditForm(org)
      } else {
        secureLogger.error('Failed to get or create organization')
        setError('Failed to load organization')
      }
    } catch (error: unknown) {
      secureLogger.error('Error fetching organization', error, { userId: userProfile?.uid })
      setError(`Failed to fetch organization: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [customClaims?.organizationId, customClaims?.role, userProfile])

  useEffect(() => {
    // Handle preview mode
    if (isPreviewMode() && previewMode.isPreview) {
      setOrganization(previewMode.organization)
      setEditForm(previewMode.organization)
      setTeamMembers(previewMode.teamMembers)
      setPendingInvitations(previewMode.pendingTeamInvitations)
      setLoading(false)
      return
    }

    // Wait for auth to fully load before attempting to fetch
    if (!authLoading && customClaims?.organizationId) {
      fetchOrganization()
    } else if (!authLoading && !customClaims?.organizationId) {
      setLoading(false)
      setError('No organization ID found in user claims')
    }

  }, [customClaims?.organizationId, authLoading, customClaims, fetchOrganization, previewMode])


  const handleSave = async () => {
    if (!organization || !editForm) return

    setSaving(true)
    try {
      // Clean up the data to remove undefined values
      const cleanedData: Record<string, unknown> = {}
      Object.keys(editForm).forEach(key => {
        const value = editForm[key as keyof Organization]
        if (value !== undefined && value !== '') {
          cleanedData[key] = value
        }
      })

      const success = await updateOrganization(organization.id, cleanedData)
      
      if (success) {
        setOrganization({ ...organization, ...cleanedData, updatedAt: new Date() })
        setHasChanges(false)
        // Redirect back to tasks page after successful save
        router.push('/tasks')
      } else {
        setError('Failed to save organization changes')
      }
    } catch (error) {
      secureLogger.error('Error updating organization', error, { organizationId: organization.id })
      setError('Failed to save organization changes')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: unknown) => {
    setHasChanges(true)
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setEditForm(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof Organization] as Record<string, unknown>),
          [child]: value
        }
      }))
    } else {
      setEditForm(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  // Team management functions
  const fetchTeamMembers = useCallback(async () => {
    if (!customClaims?.organizationId || !user) return

    setTeamLoading(true)
    try {
      // Get Firebase Auth token
      const token = await user.getIdToken()
      
      const response = await fetch('/api/organizations/members', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.members || [])
      } else {
        const errorData = await response.json()
        secureLogger.error('Failed to fetch team members', new Error(errorData.error), { organizationId: customClaims?.organizationId })
      }
    } catch (error) {
      secureLogger.error('Error fetching team members', error, { organizationId: customClaims?.organizationId })
    } finally {
      setTeamLoading(false)
    }
  }, [customClaims?.organizationId, user])

  const fetchPendingInvitations = useCallback(async () => {
    if (!customClaims?.organizationId || !user) return

    try {
      // Get Firebase Auth token
      const token = await user.getIdToken()
      
      const response = await fetch('/api/organizations/invite', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPendingInvitations(data.invitations || [])
      } else {
        const errorData = await response.json()
        secureLogger.error('Failed to fetch invitations', new Error(errorData.error), { organizationId: customClaims?.organizationId })
      }
    } catch (error) {
      secureLogger.error('Error fetching invitations', error, { organizationId: customClaims?.organizationId })
    }
  }, [customClaims?.organizationId, user])

  const handleInviteTeamMember = async (email: string, subrole: NonprofitSubrole, personalMessage?: string) => {
    if (!user) throw new Error('Not authenticated')
    
    try {
      // Get Firebase Auth token
      const token = await user.getIdToken()
      
      const response = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, subrole, personalMessage }),
      })

      if (response.ok) {
        await fetchPendingInvitations()
        // Show success message or notification here
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send invitation')
      }
    } catch (error) {
      secureLogger.error('Error inviting team member', error, { organizationId: customClaims?.organizationId })
      throw error
    }
  }

  const handleUpdateMemberRole = async (userId: string, subrole: NonprofitSubrole) => {
    if (!user) throw new Error('Not authenticated')
    
    try {
      // Get Firebase Auth token
      const token = await user.getIdToken()
      
      const response = await fetch('/api/organizations/members', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, subrole }),
      })

      if (response.ok) {
        await fetchTeamMembers()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update member role')
      }
    } catch (error) {
      secureLogger.error('Error updating member role', error, { userId, organizationId: customClaims?.organizationId })
      throw error
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!user) throw new Error('Not authenticated')
    
    try {
      // Get Firebase Auth token
      const token = await user.getIdToken()
      
      const response = await fetch('/api/organizations/members', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      })

      if (response.ok) {
        await fetchTeamMembers()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove member')
      }
    } catch (error) {
      secureLogger.error('Error removing member', error, { userId, organizationId: customClaims?.organizationId })
      throw error
    }
  }

  const handleRefreshInvitations = () => {
    fetchPendingInvitations()
  }

  // Fetch team data when switching to team tab
  useEffect(() => {
    if (activeTab === 'team' && customClaims?.organizationId) {
      fetchTeamMembers()
      fetchPendingInvitations()
    }
  }, [activeTab, customClaims?.organizationId, fetchTeamMembers, fetchPendingInvitations])

  if (loading || authLoading) {
    return (
      <PageLoading 
        title="Loading Organization" 
        description="Retrieving your organization details..." 
      />
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <ErrorState
            title="Organization Access Error"
            message={error}
            onRetry={() => {
              setError(null)
              setLoading(true)
              fetchOrganization()
            }}
            retryText="Try Again"
          />
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>Debug info:</p>
            <p>Role: {customClaims?.role || 'None'}</p>
            <p>Org ID: {customClaims?.organizationId || 'None'}</p>
            <p>User ID: {userProfile?.uid || 'None'}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No organization found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your account is not associated with an organization.
          </p>
          <div className="mt-4 text-xs text-gray-400">
            <p>Organization ID: {customClaims?.organizationId || 'Not set'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <NonprofitAdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Organization Management</h1>
                    <p className="mt-1 text-sm text-gray-600">
                      Manage your nonprofit organization and team
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {activeTab === 'details' && hasChanges && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  )}
                  
                  {activeTab === 'team' && (
                    <button
                      onClick={() => setInviteModalOpen(true)}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Invite Member</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="inline w-4 h-4 mr-2" />
                Organization Details
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'team'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="inline w-4 h-4 mr-2" />
                Team Management
              </button>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Essential Information */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Essential Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Name *
                      </label>
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="Enter organization name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        EIN (Tax ID) *
                      </label>
                      <input
                        type="text"
                        value={editForm.taxId || ''}
                        onChange={(e) => {
                          const formatted = formatEIN(e.target.value)
                          handleInputChange('taxId', formatted)
                        }}
                        placeholder="XX-XXXXXXX"
                        maxLength={10}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Globe className="inline w-4 h-4 mr-1" />
                        Website *
                      </label>
                      <input
                        type="url"
                        value={editForm.website || ''}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://www.example.org"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="inline w-4 h-4 mr-1" />
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value)
                          handleInputChange('phone', formatted)
                        }}
                        placeholder="(555) 123-4567"
                        maxLength={14}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={editForm.address?.city || ''}
                        onChange={(e) => handleInputChange('address.city', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="Enter city"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={editForm.address?.state || ''}
                        onChange={(e) => handleInputChange('address.state', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="Enter state"
                        required
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Members</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {organization.memberIds?.length || 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Created</span>
                      </div>
                      <span className="text-sm text-gray-900">
                        {organization.createdAt.toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">Updated</span>
                      </div>
                      <span className="text-sm text-gray-900">
                        {organization.updatedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => setActiveTab('team')}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors duration-200"
                    >
                      <Users className="w-4 h-4" />
                      <span>Manage Team</span>
                    </button>
                    
                    <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-600 font-medium rounded-lg transition-colors duration-200">
                      <FileText className="w-4 h-4" />
                      <span>Download Tax Documents</span>
                    </button>
                    
                    <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-600 font-medium rounded-lg transition-colors duration-200">
                      <DollarSign className="w-4 h-4" />
                      <span>View Financial Reports</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="space-y-8">
              {/* Team Members */}
              <TeamMemberList
                members={teamMembers}
                currentUserId={userProfile?.uid || ''}
                onUpdateRole={handleUpdateMemberRole}
                onRemoveMember={handleRemoveMember}
                loading={teamLoading}
              />

              {/* Pending Invitations */}
              <PendingInvitations
                invitations={pendingInvitations}
                onRefresh={handleRefreshInvitations}
                loading={false}
              />
            </div>
          )}
        </div>

        {/* Invite Team Member Modal */}
        <InviteTeamMemberModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          onInvite={handleInviteTeamMember}
        />
      </div>
    </NonprofitAdminRoute>
  )
}

export default function OrganizationPage() {
  return (
    <Suspense fallback={
      <PageLoading 
        title="Loading Organization" 
        description="Setting up your organization page..." 
      />
    }>
      <OrganizationPageContent />
    </Suspense>
  )
}