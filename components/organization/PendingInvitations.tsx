'use client'

import { useState } from 'react'
import { 
  Clock, 
  Mail, 
  User, 
  Copy, 
  X, 
  Crown,  
  Megaphone, 
  PenTool,
  RefreshCw
} from 'lucide-react'
import { NonprofitSubrole } from '@/types/auth'
import { Badge } from '@/components/ui/badge'

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

interface PendingInvitationsProps {
  invitations: PendingInvitation[]
  onRefresh: () => void
  onCancel?: (invitationId: string) => Promise<void>
  loading?: boolean
}

const SUBROLE_ICONS = {
  admin: Crown,
  member: User,
  marketer: Megaphone,
  signatory: PenTool,
}

const SUBROLE_VARIANTS = {
  admin: 'warning' as const,
  member: 'default' as const,
  marketer: 'info' as const,
  signatory: 'info' as const,
}

const SUBROLE_LABELS = {
  admin: 'Admin',
  member: 'Member',
  marketer: 'Marketer',
  signatory: 'Signatory',
}

export default function PendingInvitations({ 
  invitations, 
  onRefresh, 
  onCancel, 
  loading = false 
}: PendingInvitationsProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')

  const copyInvitationLink = async (invitation: PendingInvitation) => {
    const invitationUrl = `${window.location.origin}/join-team?token=${invitation.invitationToken}`
    try {
      await navigator.clipboard.writeText(invitationUrl)
      setCopiedToken(invitation.id)
      setTimeout(() => setCopiedToken(null), 2000)
    } catch (error) {
      console.error('Failed to copy invitation link:', error)
    }
  }

  const isExpired = (expiresAt: Date | unknown) => {
    const expiryDate = (expiresAt as { toDate?: () => Date }).toDate ? (expiresAt as { toDate: () => Date }).toDate() : new Date(expiresAt as string | number | Date)
    return new Date() > expiryDate
  }

  const formatTimeRemaining = (expiresAt: Date | unknown) => {
    const now = new Date()
    const expiryDate = (expiresAt as { toDate?: () => Date }).toDate ? (expiresAt as { toDate: () => Date }).toDate() : new Date(expiresAt as string | number | Date)
    const timeRemaining = expiryDate.getTime() - now.getTime()
    
    if (timeRemaining <= 0) return 'Expired'
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d remaining`
    if (hours > 0) return `${hours}h remaining`
    return 'Less than 1h remaining'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (pendingInvitations.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Pending Invitations</h3>
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="text-center py-8">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending invitations</h3>
          <p className="mt-1 text-sm text-gray-500">
            All team invitations have been responded to.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pending Invitations</h3>
              <p className="text-sm text-gray-600">
                {pendingInvitations.length} pending invitation{pendingInvitations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {pendingInvitations.map((invitation) => {
          const SubroleIcon = SUBROLE_ICONS[invitation.subrole]
          const expired = isExpired(invitation.expiresAt)

          return (
            <div key={invitation.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {invitation.invitedEmail}
                      </h4>
                      {expired && (
                        <Badge variant="error" size="sm">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <Badge 
                        variant={SUBROLE_VARIANTS[invitation.subrole]} 
                        size="sm"
                        icon={<SubroleIcon />}
                      >
                        {SUBROLE_LABELS[invitation.subrole]}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Invited by {invitation.inviterName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTimeRemaining(invitation.expiresAt)}
                      </span>
                    </div>
                    {invitation.personalMessage && (
                      <p className="mt-2 text-sm text-gray-600">
                        {`"${invitation.personalMessage}"`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => copyInvitationLink(invitation)}
                    className="inline-flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    <span>{copiedToken === invitation.id ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                  
                  {onCancel && (
                    <button
                      onClick={() => onCancel(invitation.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                      title="Cancel invitation"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}