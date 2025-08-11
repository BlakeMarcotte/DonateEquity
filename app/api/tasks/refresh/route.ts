import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    await adminAuth.verifyIdToken(token)
    
    const { participantId } = await request.json()

    if (!participantId) {
      return NextResponse.json(
        { error: 'Participant ID is required' },
        { status: 400 }
      )
    }

    // Get all tasks for this participant
    const tasksQuery = adminDb.collection('tasks').where('participantId', '==', participantId)
    const tasksSnapshot = await tasksQuery.get()
    
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert timestamps to ISO strings for JSON serialization
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      updatedAt: doc.data().updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
      dueDate: doc.data().dueDate?.toDate?.().toISOString() || null,
      completedAt: doc.data().completedAt?.toDate?.().toISOString() || null,
    }))

    console.log(`Refreshed ${tasks.length} tasks for participant ${participantId}`)

    return NextResponse.json({
      success: true,
      tasks,
      message: `Refreshed ${tasks.length} tasks`
    })

  } catch (error) {
    console.error('Error refreshing tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}