import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { uploadDonationBufferAdmin, uploadParticipantBufferAdmin } from '@/lib/firebase/storage-admin'
import { secureLogger } from '@/lib/logging/secure-logger'
import { verifyAuth } from '@/lib/auth/verify-auth'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { taskId, envelopeId } = body

    if (!taskId && !envelopeId) {
      return NextResponse.json({ 
        error: 'Either taskId or envelopeId must be provided' 
      }, { status: 400 })
    }

    // Find the task
    let taskDoc
    if (taskId) {
      const doc = await adminDb.collection('tasks').doc(taskId).get()
      if (doc.exists) {
        taskDoc = doc
      }
    } else if (envelopeId) {
      const query = await adminDb
        .collection('tasks')
        .where('metadata.docuSignEnvelopeId', '==', envelopeId)
        .get()
      
      if (!query.empty) {
        taskDoc = query.docs[0]
      }
    }

    if (!taskDoc || !taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const task = taskDoc.data()
    const taskEnvelopeId = task?.metadata?.docuSignEnvelopeId

    if (!taskEnvelopeId) {
      return NextResponse.json({ 
        error: 'Task does not have an associated DocuSign envelope' 
      }, { status: 400 })
    }

    // Check envelope status from DocuSign
    try {
      const envelopeStatus = await docuSignClient.getEnvelopeStatus(taskEnvelopeId)
      
      secureLogger.info('DocuSign envelope status check', {
        taskId: taskDoc.id,
        envelopeId: taskEnvelopeId,
        status: envelopeStatus.status,
        completedDateTime: envelopeStatus.completedDateTime
      })

      // If envelope is completed and task is not, update the task
      if (envelopeStatus.status === 'completed' && task?.status !== 'completed') {
        let signedDocumentUrl = null

        // Try to download and store the signed document
        try {
          const documentBuffer = await docuSignClient.downloadEnvelopeDocuments(taskEnvelopeId)

          const participantId = task?.participantId
          const donationId = task?.donationId

          // Use new role-based storage for donation tasks
          if (donationId && task?.assignedRole) {
            const role = task.assignedRole === 'nonprofit_admin' ? 'nonprofit' : task.assignedRole as 'donor' | 'nonprofit' | 'appraiser'
            const uploadResult = await uploadDonationBufferAdmin(
              donationId,
              role,
              documentBuffer,
              `signed-document-${taskEnvelopeId}.pdf`,
              'application/pdf',
              task.assignedTo || undefined,
              undefined
            )
            signedDocumentUrl = uploadResult.url
          }
          // Fallback to legacy participant-based storage
          else if (participantId) {
            const uploadResult = await uploadParticipantBufferAdmin(
              participantId,
              'signed-documents',
              documentBuffer,
              `signed-nda-${taskEnvelopeId}.pdf`,
              'application/pdf'
            )
            signedDocumentUrl = uploadResult.url
          }
        } catch (downloadError) {
          secureLogger.error('Failed to download signed document', downloadError, {
            envelopeId: taskEnvelopeId
          })
        }

        // Update task to completed
        await adminDb.collection('tasks').doc(taskDoc.id).update({
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
          completedBy: 'manual-check',
          metadata: {
            ...task?.metadata,
            docuSignStatus: 'completed',
            docuSignCompletedAt: envelopeStatus.completedDateTime || new Date().toISOString(),
            signedDocumentUrl: signedDocumentUrl || null
          }
        })

        // Unblock dependent tasks
        try {
          const dependentTasksQuery = task?.participantId
            ? adminDb.collection('tasks')
                .where('participantId', '==', task?.participantId)
                .where('dependencies', 'array-contains', taskDoc.id)
            : adminDb.collection('tasks')
                .where('donationId', '==', task?.donationId)
                .where('dependencies', 'array-contains', taskDoc.id)
                
          const dependentTasks = await dependentTasksQuery.get()
          
          for (const depTaskDoc of dependentTasks.docs) {
            const depTask = depTaskDoc.data()
            if (depTask.status === 'blocked') {
              await adminDb.collection('tasks').doc(depTaskDoc.id).update({
                status: 'pending',
                updatedAt: FieldValue.serverTimestamp()
              })
            }
          }
        } catch (depError) {
          secureLogger.error('Error unblocking dependent tasks', depError, { 
            taskId: taskDoc.id 
          })
        }

        return NextResponse.json({
          success: true,
          message: 'Task completed successfully',
          task: {
            id: taskDoc.id,
            status: 'completed',
            docuSignStatus: 'completed',
            signedDocumentUrl
          }
        })
      } else {
        // Return current status
        return NextResponse.json({
          success: true,
          task: {
            id: taskDoc.id,
            status: task?.status,
            docuSignStatus: envelopeStatus.status,
            completedDateTime: envelopeStatus.completedDateTime
          }
        })
      }
    } catch (docuSignError) {
      secureLogger.error('DocuSign API error', docuSignError, {
        taskId: taskDoc.id,
        envelopeId: taskEnvelopeId
      })
      
      return NextResponse.json({
        error: 'Failed to check DocuSign status',
        details: docuSignError instanceof Error ? docuSignError.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    secureLogger.error('Check task status error', error)
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}