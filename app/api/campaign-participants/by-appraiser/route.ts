import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const appraiserId = searchParams.get('appraiserId')

    if (!appraiserId) {
      return NextResponse.json({ error: 'Appraiser ID is required' }, { status: 400 })
    }

    // Query campaign_participants where appraiserId matches
    console.log('Querying for appraiser participants with appraiserId:', appraiserId)
    const participantsQuery = adminDb.collection('campaign_participants')
      .where('appraiserId', '==', appraiserId)

    const participantsSnapshot = await participantsQuery.get()
    console.log(`Found ${participantsSnapshot.docs.length} appraiser participant records for appraiserId: ${appraiserId}`)

    // Debug: Log all participant records to see what we're getting
    if (participantsSnapshot.docs.length > 0) {
      participantsSnapshot.docs.forEach((doc, index) => {
        console.log(`Participant ${index + 1}:`, {
          id: doc.id,
          campaignId: doc.data().campaignId,
          userId: doc.data().userId,
          appraiserId: doc.data().appraiserId,
          role: doc.data().role
        })
      })
    } else {
      // Debug: Check if there are ANY participant records for this user ID
      console.log('No records found with appraiserId. Checking for userId:', appraiserId)
      const userIdQuery = adminDb.collection('campaign_participants')
        .where('userId', '==', appraiserId)
      const userIdSnapshot = await userIdQuery.get()
      console.log(`Found ${userIdSnapshot.docs.length} records with userId: ${appraiserId}`)

      if (userIdSnapshot.docs.length > 0) {
        console.log('Records found by userId (missing appraiserId field):')
        userIdSnapshot.docs.forEach((doc, index) => {
          const data = doc.data()
          console.log(`Record ${index + 1}:`, {
            id: doc.id,
            campaignId: data.campaignId,
            userId: data.userId,
            appraiserId: data.appraiserId || 'MISSING',
            role: data.role
          })
        })
      }
    }

    const participants = participantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null
    }))

    return NextResponse.json({ participants })

  } catch (error) {
    console.error('Error fetching participants by appraiser:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}