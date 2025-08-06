'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

/**
 * @deprecated This page has been deprecated in favor of participant-based task management.
 * This page now redirects to the new participant-based task page.
 */
export default function DonationTasksPageDeprecated() {
  const params = useParams()
  const router = useRouter()
  const donationId = params.id as string

  useEffect(() => {
    const redirectToParticipantTasks = async () => {
      if (!donationId) {
        router.push('/my-campaign')
        return
      }

      try {
        // Fetch donation data to get campaignId and donorId
        const donationDoc = await getDoc(doc(db, 'donations', donationId))
        
        if (donationDoc.exists()) {
          const donation = donationDoc.data()
          const { campaignId, donorId } = donation
          
          if (campaignId && donorId) {
            // Redirect to the new participant-based task page
            router.replace(`/campaigns/${campaignId}/participants/${donorId}/tasks`)
            return
          }
        }
        
        // Fallback if we can't get the donation data
        console.warn('Could not find donation data for redirect, falling back to my-campaign')
        router.push('/my-campaign')
        
      } catch (error) {
        console.error('Error fetching donation for redirect:', error)
        router.push('/my-campaign')
      }
    }

    redirectToParticipantTasks()
  }, [donationId, router])

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to updated task page...</p>
        <p className="text-sm text-gray-500 mt-2">This page has been moved to a new location.</p>
      </div>
    </div>
  )
}