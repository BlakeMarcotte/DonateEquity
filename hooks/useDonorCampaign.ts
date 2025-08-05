'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/AuthContext'

interface DonorCampaign {
  id: string
  title: string
  organizationName: string
}

interface DonorDonation {
  id: string
  campaignId: string
  campaignTitle: string
  organizationName: string
  amount: number
  status: string
}

export function useDonorCampaign() {
  const { user, customClaims } = useAuth()
  const [campaign, setCampaign] = useState<DonorCampaign | null>(null)
  const [donation, setDonation] = useState<DonorDonation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || customClaims?.role !== 'donor') {
      setLoading(false)
      return
    }

    const donationsQuery = query(
      collection(db, 'donations'),
      where('donorId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(
      donationsQuery,
      async (snapshot) => {
        try {
          if (snapshot.empty) {
            setCampaign(null)
            setDonation(null)
            setLoading(false)
            return
          }

          // Get the first donation to extract campaign info
          const firstDonationDoc = snapshot.docs[0]
          const firstDonation = firstDonationDoc.data()
          
          // Set donation data
          setDonation({
            id: firstDonationDoc.id,
            campaignId: firstDonation.campaignId,
            campaignTitle: firstDonation.campaignTitle || '',
            organizationName: firstDonation.organizationName || '',
            amount: firstDonation.amount || 0,
            status: firstDonation.status || 'pending'
          })
          
          // If campaign info is embedded in donation, use it
          if (firstDonation.campaignTitle) {
            setCampaign({
              id: firstDonation.campaignId,
              title: firstDonation.campaignTitle,
              organizationName: firstDonation.organizationName || ''
            })
            setLoading(false)
            return
          }

          // Otherwise fetch campaign details
          const campaignDoc = await getDoc(doc(db, 'campaigns', firstDonation.campaignId))
          if (campaignDoc.exists()) {
            const campaignData = campaignDoc.data()
            setCampaign({
              id: firstDonation.campaignId,
              title: campaignData.title,
              organizationName: campaignData.organizationName || ''
            })
          } else {
            setCampaign(null)
          }
          setLoading(false)
        } catch (err) {
          console.error('Error fetching donor campaign:', err)
          setError('Failed to load campaign information')
          setLoading(false)
        }
      },
      (err) => {
        console.error('Error listening to donations:', err)
        setError('Failed to load campaign information')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, customClaims?.role])

  return { campaign, donation, loading, error }
}