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