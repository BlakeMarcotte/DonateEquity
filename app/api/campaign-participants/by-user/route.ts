import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('Querying campaign_participants for user:', userId)

    // Query campaign_participants for this user
    const participantsSnapshot = await adminDb
      .collection('campaign_participants')
      .where('userId', '==', userId)
      .where('userRole', '==', 'donor')
      .get()

    console.log('Query returned', participantsSnapshot.docs.length, 'documents')

    const participants = participantsSnapshot.docs.map(doc => {
      const data = doc.data()
      console.log('Participant document:', { id: doc.id, ...data })
      return {
        id: doc.id,
        ...data,
        joinedAt: data.joinedAt?.toDate?.() || data.joinedAt,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      }
    })

    console.log('Returning participants:', participants.length)

    return NextResponse.json({
      participants,
      count: participants.length
    })
  } catch (error) {
    console.error('Error fetching campaign participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign participants' },
      { status: 500 }
    )
  }
}