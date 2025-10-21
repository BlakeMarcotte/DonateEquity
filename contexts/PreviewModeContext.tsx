'use client'

import { createContext, useContext, ReactNode } from 'react'
import { 
  isPreviewMode, 
  getPreviewCampaigns, 
  getPreviewDonations, 
  getPreviewInvitations,
  getPreviewTasks,
  getPreviewOrganization,
  getPreviewTeamMembers,
  getPreviewPendingInvitations
} from '@/lib/preview-mode/preview-data'
import { Campaign } from '@/types/campaign'
import { Donation } from '@/types/donation'
import { CampaignInvitation } from '@/types/invitations'

interface PreviewModeContextType {
  isPreview: boolean
  campaigns: Campaign[]
  donations: Donation[]
  invitations: CampaignInvitation[]
  tasks: any[]
  organization: any
  teamMembers: any[]
  pendingTeamInvitations: any[]
}

const PreviewModeContext = createContext<PreviewModeContextType | undefined>(undefined)

interface PreviewModeProviderProps {
  children: ReactNode
}

export function PreviewModeProvider({ children }: PreviewModeProviderProps) {
  const isPreview = isPreviewMode()

  const value: PreviewModeContextType = {
    isPreview,
    campaigns: isPreview ? getPreviewCampaigns() : [],
    donations: isPreview ? getPreviewDonations() : [],
    invitations: isPreview ? getPreviewInvitations() : [],
    tasks: isPreview ? getPreviewTasks() : [],
    organization: isPreview ? getPreviewOrganization() : null,
    teamMembers: isPreview ? getPreviewTeamMembers() : [],
    pendingTeamInvitations: isPreview ? getPreviewPendingInvitations() : [],
  }

  return (
    <PreviewModeContext.Provider value={value}>
      {children}
    </PreviewModeContext.Provider>
  )
}

export function usePreviewMode() {
  const context = useContext(PreviewModeContext)
  if (context === undefined) {
    throw new Error('usePreviewMode must be used within a PreviewModeProvider')
  }
  return context
}
