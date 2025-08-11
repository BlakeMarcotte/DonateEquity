'use client'

import { useState } from 'react'
import Image from 'next/image'
import { 
  Users, 
  Crown, 
  User, 
  Megaphone, 
  PenTool, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Calendar,
  Mail,
  AlertCircle
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

interface TeamMemberListProps {
  members: TeamMember[]
  currentUserId: string
  onUpdateRole: (userId: string, subrole: NonprofitSubrole) => Promise<void>
  onRemoveMember: (userId: string) => Promise<void>
  loading?: boolean
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

export default function TeamMemberList({ 
  members, 
  currentUserId, 
  onUpdateRole, 
  onRemoveMember, 
  loading = false 
}: TeamMemberListProps) {
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [updateRoleModal, setUpdateRoleModal] = useState<{ member: TeamMember, isOpen: boolean }>({ 
    member: {} as TeamMember, 
    isOpen: false 
  })
  const [removeModal, setRemoveModal] = useState<{ member: TeamMember, isOpen: boolean }>({ 
    member: {} as TeamMember, 
    isOpen: false 
  })
  const [processing, setProcessing] = useState<string | null>(null)

  const isCurrentUserAdmin = members.find(m => m.uid === currentUserId)?.subrole === 'admin'

  const handleUpdateRole = async (userId: string, newSubrole: NonprofitSubrole) => {
    setProcessing(userId)
    try {
      await onUpdateRole(userId, newSubrole)
      setUpdateRoleModal({ member: {} as TeamMember, isOpen: false })
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setProcessing(userId)
    try {
      await onRemoveMember(userId)
      setRemoveModal({ member: {} as TeamMember, isOpen: false })
    } catch (error) {
      console.error('Failed to remove member:', error)
    } finally {
      setProcessing(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
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
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-gray-400" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
                <p className="text-sm text-gray-600">{members.length} member{members.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {members.map((member) => {
            const SubroleIcon = SUBROLE_ICONS[member.subrole]
            const isCurrentUser = member.uid === currentUserId
            const canModify = isCurrentUserAdmin && !isCurrentUser

            return (
              <div key={member.uid} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="relative">
                      {member.photoURL ? (
                        <Image
                          src={member.photoURL}
                          alt={member.displayName}
                          width={48}
                          height={48}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      {!member.isEmailVerified && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-400 rounded-full flex items-center justify-center">
                          <AlertCircle className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Member Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {member.displayName || 'Unnamed User'}
                        </h3>
                        {isCurrentUser && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Mail className="h-4 w-4" />
                          <span>{member.email}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>Joined {new Date(member.joinedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* Role Badge */}
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${SUBROLE_COLORS[member.subrole]}`}>
                      <SubroleIcon className="h-4 w-4" />
                      <span>{SUBROLE_LABELS[member.subrole]}</span>
                    </div>

                    {/* Actions Menu */}
                    {canModify && (
                      <div className="relative">
                        <button
                          onClick={() => setActionMenuOpen(actionMenuOpen === member.uid ? null : member.uid)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                          disabled={processing === member.uid}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </button>

                        {actionMenuOpen === member.uid && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => {
                                setUpdateRoleModal({ member, isOpen: true })
                                setActionMenuOpen(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Change Role</span>
                            </button>
                            <button
                              onClick={() => {
                                setRemoveModal({ member, isOpen: true })
                                setActionMenuOpen(null)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Remove</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Update Role Modal */}
      {updateRoleModal.isOpen && (
        <UpdateRoleModal
          member={updateRoleModal.member}
          onUpdate={handleUpdateRole}
          onClose={() => setUpdateRoleModal({ member: {} as TeamMember, isOpen: false })}
          loading={processing === updateRoleModal.member.uid}
        />
      )}

      {/* Remove Member Modal */}
      {removeModal.isOpen && (
        <RemoveMemberModal
          member={removeModal.member}
          onRemove={handleRemoveMember}
          onClose={() => setRemoveModal({ member: {} as TeamMember, isOpen: false })}
          loading={processing === removeModal.member.uid}
        />
      )}
    </>
  )
}

// Update Role Modal Component
function UpdateRoleModal({ 
  member, 
  onUpdate, 
  onClose, 
  loading 
}: { 
  member: TeamMember
  onUpdate: (userId: string, subrole: NonprofitSubrole) => Promise<void>
  onClose: () => void
  loading: boolean 
}) {
  const [newSubrole, setNewSubrole] = useState<NonprofitSubrole>(member.subrole)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newSubrole !== member.subrole) {
      onUpdate(member.uid, newSubrole)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Change Role for {member.displayName}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              {Object.entries(SUBROLE_LABELS).map(([value, label]) => (
                <label key={value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="subrole"
                    value={value}
                    checked={newSubrole === value}
                    onChange={(e) => setNewSubrole(e.target.value as NonprofitSubrole)}
                    className="text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <span className="text-gray-900">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || newSubrole === member.subrole}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
              >
                {loading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Remove Member Modal Component
function RemoveMemberModal({ 
  member, 
  onRemove, 
  onClose, 
  loading 
}: { 
  member: TeamMember
  onRemove: (userId: string) => Promise<void>
  onClose: () => void
  loading: boolean 
}) {
  const handleRemove = () => {
    onRemove(member.uid)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Remove Team Member
          </h3>
          
          <p className="text-gray-600 mb-6">
            Are you sure you want to remove <strong>{member.displayName}</strong> from your organization? 
            This action cannot be undone and they will lose access to all organization resources.
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleRemove}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg"
            >
              {loading ? 'Removing...' : 'Remove Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}