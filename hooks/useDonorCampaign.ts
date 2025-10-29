'use client'

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/AuthContext'

interface DonorCampaign {
  id: string
  title: string
  organizationName: string
  participantId?: string // For appraisers, store the participant ID
}

interface DonorDonation {
  id: string
  campaignId: string
  campaignTitle: string
  organizationName: string
  amount: number
  status: string
}

export function useDonorCampaign(forceRefresh = false) {
  const { user, customClaims } = useAuth()
  const [campaign, setCampaign] = useState<DonorCampaign | null>(null)
  const [donation, setDonation] = useState<DonorDonation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (forceRefresh) {
      setRefreshKey(prev => prev + 1)
    }
  }, [forceRefresh])

  useEffect(() => {
    if (!user || (customClaims?.role !== 'donor' && customClaims?.role !== 'appraiser')) {
      setLoading(false)
      return
    }

    // For appraisers, query donations where they are assigned
    if (customClaims?.role === 'appraiser') {
      console.log('Setting up donations listener for appraiser:', user.uid)
      const appraiserDonationsQuery = query(
        collection(db, 'donations'),
        where('appraiserId', '==', user.uid)
      )

      const unsubscribeAppraiserDonations = onSnapshot(
        appraiserDonationsQuery,
        async (snapshot) => {
          try {
            console.log('Appraiser donations snapshot received:', snapshot.docs.length, 'documents')

            if (!snapshot.empty) {
              // Get the first donation assigned to this appraiser
              const firstDonationDoc = snapshot.docs[0]
              const firstDonation = firstDonationDoc.data()

              console.log('Found donation for appraiser:', {
                id: firstDonationDoc.id,
                campaignId: firstDonation.campaignId,
                donorId: firstDonation.donorId,
                appraiserId: firstDonation.appraiserId
              })

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
              return
            }

            // No donations assigned to this appraiser
            console.log('No donations found for appraiser')
            setCampaign(null)
            setDonation(null)
            setLoading(false)
          } catch (err) {
            console.error('Error fetching appraiser donations:', err)
            setError('Failed to load donation information')
            setLoading(false)
          }
        },
        (err) => {
          console.error('Error listening to appraiser donations:', err)
          setError('Failed to load donation information')
          setLoading(false)
        }
      )

      return () => unsubscribeAppraiserDonations()
    }

    // For donors, check for actual donations first
    console.log('Setting up donations listener for user:', user.uid)
    const donationsQuery = query(
      collection(db, 'donations'),
      where('donorId', '==', user.uid)
    )

    const unsubscribeDonations = onSnapshot(
      donationsQuery,
      async (snapshot) => {
        try {
          console.log('Donations snapshot received:', snapshot.docs.length, 'documents')

          if (!snapshot.empty) {
            // Get the first donation to extract campaign info
            const firstDonationDoc = snapshot.docs[0]
            const firstDonation = firstDonationDoc.data()

            console.log('Found donation:', {
              id: firstDonationDoc.id,
              campaignId: firstDonation.campaignId,
              status: firstDonation.status,
              amount: firstDonation.amount
            })

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
            return
          }

          // If no donations, check campaign_participants via API for interested donors
          try {
            console.log('Checking for campaign participants for user:', user.uid)
            const response = await fetch(`/api/campaign-participants/by-user?userId=${user.uid}`)
            console.log('Participants API response status:', response.status)
            
            if (response.ok) {
              const { participants } = await response.json()
              console.log('Found participants:', participants?.length || 0)
              
              if (participants && participants.length > 0) {
                const firstParticipant = participants[0]
                console.log('First participant campaign ID:', firstParticipant.campaignId)
                
                // Fetch campaign details
                const campaignResponse = await fetch(`/api/campaigns/${firstParticipant.campaignId}`)
                console.log('Campaign API response status:', campaignResponse.status)
                
                if (campaignResponse.ok) {
                  const { campaign: campaignData } = await campaignResponse.json()
                  console.log('Campaign data found:', campaignData.title)
                  setCampaign({
                    id: firstParticipant.campaignId,
                    title: campaignData.title,
                    organizationName: campaignData.organizationName || ''
                  })
                  
                  // No donation yet, just participation
                  setDonation(null)
                } else {
                  console.log('Campaign not found for participant')
                  setCampaign(null)
                  setDonation(null)
                }
              } else {
                // No donations or participation
                console.log('No participants found for user')
                setCampaign(null)
                setDonation(null)
              }
            } else {
              // API error, fallback to no campaign
              console.log('Participants API error:', response.status)
              setCampaign(null)
              setDonation(null)
            }
          } catch (apiError) {
            console.error('Error fetching campaign participants:', apiError)
            // Fallback to no campaign
            setCampaign(null)
            setDonation(null)
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

    return () => unsubscribeDonations()
  }, [user, customClaims?.role, refreshKey])

  return { campaign, donation, loading, error }
}