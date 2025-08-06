import { NextRequest, NextResponse } from 'next/server'
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { authenticateUser } from '@/lib/firebase/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await authenticateUser(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { participantId, status } = body

    if (!participantId || !status) {
      return NextResponse.json({ 
        error: 'Participant ID and status are required' 
      }, { status: 400 })
    }

    // Validate status
    const validStatuses = ['interested', 'in_process', 'donation_complete']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      }, { status: 400 })
    }

    // Get the participant document
    const participantRef = doc(db, 'campaign_participants', participantId)
    const participantDoc = await getDoc(participantRef)

    if (!participantDoc.exists()) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 })
    }

    const participantData = participantDoc.data()

    // Check if user is authorized to update this participant
    const isAuthorized = (
      participantData.userId === authResult.user.uid || // The participant themselves (using userId field)
      authResult.decodedToken?.role === 'nonprofit_admin' || // Nonprofit admin
      authResult.decodedToken?.role === 'admin' // System admin
    )

    if (!isAuthorized) {
      return NextResponse.json({ 
        error: 'Not authorized to update this participant' 
      }, { status: 403 })
    }

    // Update participant status
    await updateDoc(participantRef, {
      status: status,
      updatedAt: serverTimestamp(),
      ...(status === 'donation_complete' && { donationCompletedAt: serverTimestamp() })
    })

    return NextResponse.json({
      success: true,
      message: 'Participant status updated successfully',
      data: {
        participantId,
        status
      }
    })

  } catch (error) {
    console.error('Error updating participant status:', error)
    return NextResponse.json(
      { error: 'Failed to update participant status' },
      { status: 500 }
    )
  }
}