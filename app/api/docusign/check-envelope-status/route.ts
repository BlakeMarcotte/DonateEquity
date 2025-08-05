import { NextRequest, NextResponse } from 'next/server'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const body = await request.json()
    const { envelopeId, donationId } = body

    // Validate required fields
    if (!envelopeId || !donationId) {
      return NextResponse.json({ 
        error: 'Missing required fields: envelopeId, donationId' 
      }, { status: 400 })
    }

    // Get envelope status from DocuSign
    const envelopeStatus = await docuSignClient.getEnvelopeStatus(envelopeId)

    console.log(`Envelope ${envelopeId} status: ${envelopeStatus.status}`)

    // Find the associated task
    const tasksQuery = await adminDb
      .collection('tasks')
      .where('donationId', '==', donationId)
      .where('type', '==', 'docusign_signature')
      .where('assignedTo', '==', user.uid)
      .get()

    if (tasksQuery.empty) {
      return NextResponse.json({ 
        error: 'No associated DocuSign task found',
        envelopeStatus: envelopeStatus.status
      }, { status: 404 })
    }

    const taskDoc = tasksQuery.docs[0]
    const task = taskDoc.data()

    // Update task metadata with current status
    const updateData: any = {
      'metadata.envelopeStatus': envelopeStatus.status,
      'metadata.docuSignLastUpdate': new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp()
    }

    // If envelope is completed and task isn't already completed, mark it complete
    if (envelopeStatus.status === 'completed' && task.status !== 'completed') {
      updateData.status = 'completed'
      updateData.completedAt = FieldValue.serverTimestamp()
      updateData.completedBy = 'docusign-status-check'
      updateData['metadata.docuSignCompletedAt'] = new Date().toISOString()
      
      console.log(`Marking task ${taskDoc.id} as completed via status check`)
    }

    // Update the task
    await adminDb.collection('tasks').doc(taskDoc.id).update(updateData)

    return NextResponse.json({
      success: true,
      envelopeStatus: envelopeStatus.status,
      taskCompleted: envelopeStatus.status === 'completed' && task.status !== 'completed',
      message: envelopeStatus.status === 'completed' 
        ? 'Document signed successfully! Task marked as complete.'
        : `Document status: ${envelopeStatus.status}`
    })

  } catch (error) {
    console.error('DocuSign envelope status check error:', error)
    
    return NextResponse.json({
      error: 'Failed to check envelope status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}