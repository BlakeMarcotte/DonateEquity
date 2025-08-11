import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Participant ID is required' }, { status: 400 })
    }

    // Get the participant document
    const participantRef = adminDb.collection('campaign_participants').doc(id)
    const participantDoc = await participantRef.get()

    if (!participantDoc.exists) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    const participant = {
      id: participantDoc.id,
      ...participantDoc.data(),
      createdAt: participantDoc.data()?.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: participantDoc.data()?.updatedAt?.toDate?.()?.toISOString() || null,
      joinedAt: participantDoc.data()?.joinedAt?.toDate?.()?.toISOString() || null
    }

    return NextResponse.json({ participant })

  } catch (error) {
    console.error('Error fetching participant:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}