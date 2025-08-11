import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

interface TaskData {
  title?: string
  type?: string
  assignedRole?: string
  assignedTo?: string
  status?: string
  order?: number
  dependencies?: string[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const { participantId } = await params

    // Get all tasks for this participant
    const tasksQuery = adminDb.collection('tasks')
      .where('participantId', '==', participantId)

    const tasksSnapshot = await tasksQuery.get()
    
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
      completedAt: doc.data().completedAt?.toDate?.()?.toISOString() || null,
    }))

    // Get participant info
    const participantRef = adminDb.collection('campaign_participants').doc(participantId)
    const participantDoc = await participantRef.get()
    const participantData = participantDoc.exists ? participantDoc.data() : null

    return NextResponse.json({
      success: true,
      participantId,
      currentUserId: decodedToken.uid,
      currentUserRole: decodedToken.role,
      participantData,
      tasks: tasks.map(task => ({
        id: task.id,
        title: (task as TaskData).title,
        type: (task as TaskData).type,
        assignedRole: (task as TaskData).assignedRole,
        assignedTo: (task as TaskData).assignedTo,
        status: (task as TaskData).status,
        order: (task as TaskData).order,
        dependencies: (task as TaskData).dependencies
      })),
      appraiserTasks: tasks.filter(t => (t as TaskData).assignedRole === 'appraiser'),
      totalTasks: tasks.length
    })

  } catch (error) {
    console.error('Error debugging participant tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}