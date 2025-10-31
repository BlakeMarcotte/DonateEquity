import { NextRequest, NextResponse } from 'next/server'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { adminDb } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    const body = await request.json()
    
    const { 
      signerEmail, 
      signerName, 
      documentName = 'General NDA',
      emailSubject = 'Please sign the General NDA',
      donationId 
    } = body

    // Validate required fields
    if (!signerEmail || !signerName || !donationId) {
      return NextResponse.json({ 
        error: 'Missing required fields: signerEmail, signerName, donationId' 
      }, { status: 400 })
    }

    // Path to the NDA document
    const documentPath = path.join(process.cwd(), 'public', 'nda-general.pdf')

    // Create and send envelope for immediate free-form signing
    const envelope = await docuSignClient.createAndSendEnvelope({
      signerEmail,
      signerName,
      documentPath,
      documentName,
      emailSubject
    })

    // Find and update the DocuSign signature task with the envelope ID
    try {
      // Try donation-based system first (our new system)
      let tasksQuery = await adminDb
        .collection('tasks')
        .where('donationId', '==', donationId)
        .where('type', '==', 'docusign_signature')
        .where('assignedTo', '==', user.uid)
        .where('status', 'in', ['pending', 'in_progress'])
        .get()

      secureLogger.info('Task search for envelope ID update', {
        donationId,
        userId: user.uid,
        foundTasks: tasksQuery.size
      })

      // If not found, try legacy participant-based system
      if (tasksQuery.empty) {
        tasksQuery = await adminDb
          .collection('tasks')
          .where('participantId', '==', donationId)
          .where('type', '==', 'docusign_signature')
          .where('assignedTo', '==', user.uid)
          .where('status', 'in', ['pending', 'in_progress'])
          .get()

        secureLogger.info('Legacy participant search for envelope ID update', {
          participantId: donationId,
          userId: user.uid,
          foundTasks: tasksQuery.size
        })
      }

      if (!tasksQuery.empty) {
        const taskDoc = tasksQuery.docs[0]
        const taskData = taskDoc.data()

        await adminDb.collection('tasks').doc(taskDoc.id).update({
          'metadata.docuSignEnvelopeId': envelope.envelopeId,
          'metadata.envelopeStatus': envelope.status,
          'metadata.envelopeSentAt': envelope.statusDateTime,
          updatedAt: new Date()
        })

        secureLogger.info('Updated task with envelope ID', {
          taskId: taskDoc.id,
          taskTitle: taskData.title,
          envelopeId: envelope.envelopeId,
          donationId: donationId,
          userId: user.uid,
          previousEnvelopeId: taskData.metadata?.docuSignEnvelopeId || null
        })
      } else {
        secureLogger.error('No DocuSign signature task found for envelope ID update', {
          donationId,
          userId: user.uid,
          userEmail: user.email,
          taskType: 'docusign_signature',
          envelopeId: envelope.envelopeId
        })
      }
    } catch (taskUpdateError) {
      secureLogger.error('Failed to update task with envelope ID', taskUpdateError, {
      searchId: donationId,
      userId: user.uid,
      envelopeId: envelope.envelopeId
    })
      // Continue anyway - the envelope was created successfully
    }

    // Return the envelope information
    return NextResponse.json({
      success: true,
      envelopeId: envelope.envelopeId,
      envelopeUri: envelope.uri,
      status: envelope.status,
      statusDateTime: envelope.statusDateTime
    })

  } catch (error) {
    secureLogger.error('DocuSign envelope creation error', error)
    
    return NextResponse.json({
      error: 'Failed to create DocuSign envelope',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}