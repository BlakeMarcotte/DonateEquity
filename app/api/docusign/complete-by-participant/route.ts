import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { uploadParticipantBufferAdmin } from '@/lib/firebase/storage-admin'
import { secureLogger } from '@/lib/logging/secure-logger'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const body = await request.json()
    const { participantId } = body

    if (!participantId) {
      return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
    }

    secureLogger.info('Manual DocuSign completion requested', { 
      participantId, 
      userId: user?.uid 
    })

    // Find DocuSign signature tasks for this participant
    const tasksQuery = await adminDb
      .collection('tasks')
      .where('participantId', '==', participantId)
      .where('type', '==', 'docusign_signature')
      .where('status', '!=', 'completed')
      .get()

    if (tasksQuery.empty) {
      secureLogger.warn('No incomplete DocuSign tasks found', { participantId })
      return NextResponse.json({ 
        error: 'No incomplete DocuSign signature tasks found for this participant' 
      }, { status: 404 })
    }

    const results = []

    for (const taskDoc of tasksQuery.docs) {
      const task = taskDoc.data()
      const taskId = taskDoc.id

      secureLogger.info('Processing DocuSign task', { 
        taskId, 
        participantId,
        taskMetadata: task.metadata 
      })

      // Get envelope ID from task metadata
      const envelopeId = task.metadata?.docuSignEnvelopeId

      if (!envelopeId) {
        secureLogger.warn('No envelope ID in task metadata', { taskId })
        results.push({
          taskId,
          success: false,
          error: 'No envelope ID found in task metadata'
        })
        continue
      }

      try {
        // Check envelope status from DocuSign
        const envelopeStatus = await docuSignClient.getEnvelopeStatus(envelopeId)
        
        secureLogger.info('DocuSign envelope status', {
          taskId,
          envelopeId,
          status: envelopeStatus.status,
          completedDateTime: envelopeStatus.completedDateTime
        })

        // Only complete if envelope is actually completed
        if (envelopeStatus.status !== 'completed') {
          results.push({
            taskId,
            success: false,
            error: `Envelope status is ${envelopeStatus.status}, not completed`,
            envelopeStatus: envelopeStatus.status
          })
          continue
        }

        let signedDocumentUrl = null

        // Try to download and store the signed document
        try {
          const documentBuffer = await docuSignClient.downloadEnvelopeDocuments(envelopeId)

          const uploadResult = await uploadParticipantBufferAdmin(
            participantId,
            'signed-documents',
            documentBuffer,
            `signed-nda-${envelopeId}.pdf`,
            'application/pdf'
          )
          
          signedDocumentUrl = uploadResult.url
          secureLogger.info('Signed document stored', { 
            taskId, 
            envelopeId, 
            url: signedDocumentUrl 
          })
        } catch (downloadError) {
          secureLogger.error('Failed to download/store signed document', downloadError, {
            taskId,
            envelopeId
          })
          // Continue with task completion even if document download fails
        }

        // Update task to completed
        await adminDb.collection('tasks').doc(taskId).update({
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
          completedBy: user?.uid || 'manual-completion',
          metadata: {
            ...task.metadata,
            docuSignStatus: 'completed',
            docuSignCompletedAt: envelopeStatus.completedDateTime || new Date().toISOString(),
            signedDocumentUrl: signedDocumentUrl || null,
            manualCompletion: true,
            manualCompletionTimestamp: new Date().toISOString()
          }
        })

        // Unblock dependent tasks
        try {
          const dependentTasksQuery = await adminDb
            .collection('tasks')
            .where('participantId', '==', participantId)
            .where('dependencies', 'array-contains', taskId)
            .get()
            
          for (const depTaskDoc of dependentTasksQuery.docs) {
            const depTask = depTaskDoc.data()
            if (depTask.status === 'blocked') {
              await adminDb.collection('tasks').doc(depTaskDoc.id).update({
                status: 'pending',
                updatedAt: FieldValue.serverTimestamp()
              })
            }
          }

          secureLogger.info('Task completed and dependents unblocked', { 
            taskId,
            dependentTasksCount: dependentTasksQuery.size
          })
        } catch (depError) {
          secureLogger.error('Error unblocking dependent tasks', depError, { taskId })
        }

        results.push({
          taskId,
          success: true,
          envelopeId,
          envelopeStatus: envelopeStatus.status,
          signedDocumentUrl
        })

      } catch (docuSignError) {
        secureLogger.error('DocuSign API error during manual completion', docuSignError, {
          taskId,
          envelopeId
        })
        
        results.push({
          taskId,
          success: false,
          error: `DocuSign API error: ${docuSignError instanceof Error ? docuSignError.message : 'Unknown error'}`,
          envelopeId
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Manual completion processing finished',
      participantId,
      results
    })

  } catch (error) {
    secureLogger.error('Manual DocuSign completion error', error)
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}