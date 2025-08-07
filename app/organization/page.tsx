'use client'

import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { getOrCreateOrganization, type Organization, updateOrganization } from '@/lib/firebase/organizations'
import InviteTeamMemberModal from '@/components/organization/InviteTeamMemberModal'
import TeamMemberList from '@/components/organization/TeamMemberList'
import PendingInvitations from '@/components/organization/PendingInvitations'
import { NonprofitSubrole } from '@/types/auth'
import {
  Building2,
  MapPin,
  Globe,
  Phone,
  Mail,
  Users,
  Edit3,
  Save,
  X,
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

export default function OrganizationPage() {
  const { user, userProfile, customClaims, loading: authLoading } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Organization>>({})
  
  // Team management state
  const [activeTab, setActiveTab] = useState<'details' | 'team'>('details')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [teamLoading, setTeamLoading] = useState(false)

  useEffect(() => {
    // Wait for auth to fully load before attempting to fetch
    if (!authLoading && customClaims?.organizationId) {
      fetchOrganization()
    } else if (!authLoading && !customClaims?.organizationId) {
      setLoading(false)
      setError('No organization ID found in user claims')
    }

  }, [customClaims?.organizationId, authLoading, customClaims])

  const fetchOrganization = async () => {
    if (!customClaims?.organizationId || !userProfile) return

    setError(null)
    try {
      console.log('Fetching organization:', customClaims.organizationId)
      console.log('User role:', customClaims.role)
      
      const org = await getOrCreateOrganization(
        customClaims.organizationId,
        userProfile.email,
        userProfile.uid,
        userProfile.displayName ? `${userProfile.displayName}'s Organization` : undefined
      )
      
      if (org) {
        console.log('Organization loaded:', org)
        setOrganization(org)
        setEditForm(org)
      } else {
        console.log('Failed to get or create organization')
        setError('Failed to load organization')
      }
    } catch (error: unknown) {
      console.error('Error fetching organization:', error)
      setError(`Failed to fetch organization: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
    setEditForm(organization || {})
  }

  const handleCancel = () => {
    setEditing(false)
    setEditForm(organization || {})
  }

  const handleSave = async () => {
    if (!organization || !editForm) return

    setSaving(true)
    try {
      const success = await updateOrganization(organization.id, editForm)
      
      if (success) {
        setOrganization({ ...organization, ...editForm, updatedAt: new Date() })
        setEditing(false)
      } else {
        setError('Failed to save organization changes')
      }
    } catch (error) {
      console.error('Error updating organization:', error)
      setError('Failed to save organization changes')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: unknown) => {
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
  const fetchTeamMembers = async () => {
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
        console.error('Failed to fetch team members:', errorData.error)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setTeamLoading(false)
    }
  }

  const fetchPendingInvitations = async () => {
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
        console.error('Failed to fetch invitations:', errorData.error)
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }

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
      console.error('Error inviting team member:', error)
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
      console.error('Error updating member role:', error)
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
      console.error('Error removing member:', error)
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
  }, [activeTab, customClaims?.organizationId])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading organization...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Building2 className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Organization Access Error</h3>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <div className="mt-6 space-y-3">
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                fetchOrganization()
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Debug info:</p>
              <p>Role: {customClaims?.role || 'None'}</p>
              <p>Org ID: {customClaims?.organizationId || 'None'}</p>
              <p>User ID: {userProfile?.uid || 'None'}</p>
            </div>
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
                  {activeTab === 'details' && !editing && (
                    <button
                      onClick={handleEdit}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit Details</span>
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
                  
                  {editing && (
                    <>
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                      </button>
                    </>
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
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Organization Name
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={editForm.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-lg text-gray-900">{organization.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <p className="text-lg text-gray-900 capitalize">{organization.type}</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      {editing ? (
                        <textarea
                          rows={4}
                          value={editForm.description || ''}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.description}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax ID
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          value={editForm.taxId || ''}
                          onChange={(e) => handleInputChange('taxId', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.taxId || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Established Year
                      </label>
                      {editing ? (
                        <input
                          type="number"
                          value={editForm.establishedYear || ''}
                          onChange={(e) => handleInputChange('establishedYear', parseInt(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.establishedYear || 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Contact Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Mail className="inline w-4 h-4 mr-1" />
                        Email
                      </label>
                      {editing ? (
                        <input
                          type="email"
                          value={editForm.email || ''}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="inline w-4 h-4 mr-1" />
                        Phone
                      </label>
                      {editing ? (
                        <input
                          type="tel"
                          value={editForm.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.phone || 'Not provided'}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Globe className="inline w-4 h-4 mr-1" />
                        Website
                      </label>
                      {editing ? (
                        <input
                          type="url"
                          value={editForm.website || ''}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        organization.website ? (
                          <a
                            href={organization.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {organization.website}
                          </a>
                        ) : (
                          <p className="text-gray-900">Not provided</p>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    <MapPin className="inline w-5 h-5 mr-2" />
                    Address
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editForm.address?.street || ''}
                          onChange={(e) => handleInputChange('address.street', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.address?.street || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editForm.address?.city || ''}
                          onChange={(e) => handleInputChange('address.city', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.address?.city || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editForm.address?.state || ''}
                          onChange={(e) => handleInputChange('address.state', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.address?.state || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editForm.address?.zipCode || ''}
                          onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.address?.zipCode || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      {editing ? (
                        <input
                          type="text"
                          value={editForm.address?.country || ''}
                          onChange={(e) => handleInputChange('address.country', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900">{organization.address?.country || 'Not provided'}</p>
                      )}
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