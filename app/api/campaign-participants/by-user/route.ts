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

    // Query campaign_participants for this user
    const participantsSnapshot = await adminDb
      .collection('campaign_participants')
      .where('userId', '==', userId)
      .where('userRole', '==', 'donor')
      .get()

    const participants = participantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      joinedAt: doc.data().joinedAt?.toDate?.() || doc.data().joinedAt,
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt,
    }))

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