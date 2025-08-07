'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Users,
  Crown,
  User,
  Megaphone,
  PenTool,
  UserPlus,
  X,
  Calendar,
  Mail,
  Trash2,
  CheckCircle
} from 'lucide-react'
import { NonprofitSubrole } from '@/types/auth'

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

interface CampaignAssignment {
  id: string
  campaignId: string
  userId: string
  userEmail: string
  userName: string
  userSubrole: string
  assignedBy: string
  assignedAt: Date
  status: 'active' | 'inactive'
}

interface CampaignAssignmentsProps {
  campaignId: string
  campaignTitle: string
}

const SUBROLE_ICONS = {
  admin: Crown,
  member: User,
  marketer: Megaphone,
  signatory: PenTool,
}

const SUBROLE_COLORS = {
  admin: 'text-yellow-600 bg-yellow-50',
  member: 'text-gray-600 bg-gray-50',
  marketer: 'text-purple-600 bg-purple-50',
  signatory: 'text-blue-600 bg-blue-50',
}

const SUBROLE_LABELS = {
  admin: 'Admin',
  member: 'Member',
  marketer: 'Marketer',
  signatory: 'Signatory',
}

export default function CampaignAssignments({ campaignId, campaignTitle }: CampaignAssignmentsProps) {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<CampaignAssignment[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (campaignId && user) {
      fetchAssignments()
      fetchTeamMembers()
    }
  }, [campaignId, user])

  const fetchAssignments = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/campaigns/${campaignId}/assignments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setAssignments(result.assignments.map((assignment: any) => ({
          ...assignment,
          assignedAt: new Date(assignment.assignedAt)
        })))
      } else {
        console.error('Failed to fetch assignments:', result.error)
        // Don't show error to user, just show empty state
        setAssignments([])
      }
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const fetchTeamMembers = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/organizations/members', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        setTeamMembers(result.members.map((member: any) => ({
          ...member,
          joinedAt: new Date(member.joinedAt),
          lastLoginAt: member.lastLoginAt ? new Date(member.lastLoginAt) : undefined
        })))
      } else {
        console.error('Failed to fetch team members:', result.error)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAssignMembers = async (userIds: string[]) => {
    if (!user || userIds.length === 0) return

    setProcessing('assign')
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/campaigns/${campaignId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userIds })
      })

      const result = await response.json()
      if (result.success) {
        await fetchAssignments()
        setShowAssignModal(false)
      } else {
        console.error('Failed to assign members:', result.error)
      }
    } catch (error) {
      console.error('Error assigning members:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!user) return

    setProcessing(assignmentId)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/campaigns/${campaignId}/assignments?assignmentId=${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()
      if (result.success) {
        await fetchAssignments()
      } else {
        console.error('Failed to remove assignment:', result.error)
      }
    } catch (error) {
      console.error('Error removing assignment:', error)
    } finally {
      setProcessing(null)
    }
  }

  const getAvailableMembers = () => {
    const assignedUserIds = assignments.map(a => a.userId)
    return teamMembers.filter(member => !assignedUserIds.includes(member.uid))
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Team Assignments ({assignments.length})
          </h3>
          <button
            onClick={() => setShowAssignModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Members</span>
          </button>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No team members assigned</h3>
            <p className="mt-1 text-sm text-gray-500">
              Assign team members to help manage this campaign.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAssignModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                <UserPlus className="w-4 h-4" />
                <span>Assign First Member</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const SubroleIcon = SUBROLE_ICONS[assignment.userSubrole as NonprofitSubrole] || User
              
              return (
                <div key={assignment.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <SubroleIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{assignment.userName}</h4>
                        <p className="text-sm text-gray-600">{assignment.userEmail}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>Assigned {assignment.assignedAt.toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${SUBROLE_COLORS[assignment.userSubrole as NonprofitSubrole] || 'text-gray-600 bg-gray-50'}`}>
                        <SubroleIcon className="h-4 w-4" />
                        <span>{SUBROLE_LABELS[assignment.userSubrole as NonprofitSubrole] || assignment.userSubrole}</span>
                      </div>

                      <button
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        disabled={processing === assignment.id}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                        title="Remove from campaign"
                      >
                        {processing === assignment.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Assign Members Modal */}
      {showAssignModal && (
        <AssignMembersModal
          campaignTitle={campaignTitle}
          availableMembers={getAvailableMembers()}
          onAssign={handleAssignMembers}
          onClose={() => setShowAssignModal(false)}
          loading={processing === 'assign'}
        />
      )}
    </>
  )
}

// Assign Members Modal Component
function AssignMembersModal({
  campaignTitle,
  availableMembers,
  onAssign,
  onClose,
  loading
}: {
  campaignTitle: string
  availableMembers: TeamMember[]
  onAssign: (userIds: string[]) => Promise<void>
  onClose: () => void
  loading: boolean
}) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  const handleToggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMembers.length > 0) {
      onAssign(selectedMembers)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-10">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Assign Team Members</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <p className="text-gray-600">
              Select team members to assign to <strong>{campaignTitle}</strong>:
            </p>
          </div>

          {availableMembers.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">All members assigned</h3>
              <p className="mt-1 text-sm text-gray-500">
                All team members are already assigned to this campaign.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {availableMembers.map((member) => {
                const SubroleIcon = SUBROLE_ICONS[member.subrole]
                const isSelected = selectedMembers.includes(member.uid)
                
                return (
                  <div
                    key={member.uid}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors duration-200 ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleToggleMember(member.uid)}
                  >
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleMember(member.uid)}
                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                        disabled={loading}
                      />
                      
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.displayName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {member.displayName || 'Unnamed User'}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Mail className="h-4 w-4" />
                          <span>{member.email}</span>
                        </div>
                      </div>
                      
                      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${SUBROLE_COLORS[member.subrole]}`}>
                        <SubroleIcon className="h-4 w-4" />
                        <span>{SUBROLE_LABELS[member.subrole]}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {availableMembers.length > 0 && (
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
              </p>
              
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedMembers.length === 0}
                  className="inline-flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Assign {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}