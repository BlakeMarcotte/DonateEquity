import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { uploadDonationBufferAdmin } from '@/lib/firebase/storage-admin'
import { secureLogger } from '@/lib/logging/secure-logger'

export async function POST(request: NextRequest) {
  try {
    // Parse the DocuSign webhook payload
    const body = await request.json()
    
    // Log the webhook event for debugging
    secureLogger.info('DocuSign webhook received', { 
      envelopeId: body.envelopeId,
      status: body.status,
      eventKeys: Object.keys(body)
    })

    // DocuSign Connect sends webhook data in this format:
    // For envelope events: body.envelopeId and body.status
    // For recipient events: body.envelopeId and body.recipients
    
    const envelopeId = body.envelopeId
    const envelopeStatus = body.status
    
    if (!envelopeId) {
      secureLogger.info('No envelope ID found in webhook payload')
      return NextResponse.json({ message: 'No envelope ID' }, { status: 400 })
    }

    secureLogger.info('Processing DocuSign envelope', { envelopeId, status: envelopeStatus })

    // We're interested in envelope completion events
    if (envelopeStatus === 'completed' || envelopeStatus === 'sent' || body.recipientStatuses) {
      // Check if any recipients have completed
      let isCompleted = envelopeStatus === 'completed'
      
      if (body.recipientStatuses && Array.isArray(body.recipientStatuses)) {
        const completedRecipients = body.recipientStatuses.filter(
          (r: { status: string }) => r.status === 'completed'
        )
        if (completedRecipients.length > 0) {
          secureLogger.info(`Found ${completedRecipients.length} completed recipients`)
          isCompleted = true
        }
      }
      
      secureLogger.info('Envelope status determined', { envelopeId, isCompleted, status: envelopeStatus })

      // Find the task associated with this envelope
      let tasksQuery = await adminDb
        .collection('tasks')
        .where('metadata.docuSignEnvelopeId', '==', envelopeId)
        .get()

      if (tasksQuery.empty) {
        secureLogger.warn('No task found with envelope ID in metadata, checking all tasks', { envelopeId })
        
        // Fallback: Check all incomplete DocuSign tasks and match by envelope ID
        // This helps if the webhook arrives before the task is updated with envelope ID
        const allDocuSignTasks = await adminDb
          .collection('tasks')
          .where('type', '==', 'docusign_signature')
          .where('status', '!=', 'completed')
          .get()
          
        secureLogger.info('Found incomplete DocuSign tasks', { count: allDocuSignTasks.size })
        
        // Check if any of these tasks might be for this envelope
        for (const doc of allDocuSignTasks.docs) {
          const task = doc.data()
          secureLogger.info('Checking task for envelope match', { 
            taskId: doc.id, 
            taskMetadata: task.metadata,
            searchEnvelopeId: envelopeId,
            participantId: task.participantId,
            donationId: task.donationId
          })
          
          // Check if task metadata contains the envelope ID anywhere
          if (task.metadata?.docuSignEnvelopeId === envelopeId || 
              task.metadata?.envelopeId === envelopeId) {
            tasksQuery = { empty: false, docs: [doc] } as typeof tasksQuery
            secureLogger.info('Found task via fallback search', { taskId: doc.id, envelopeId })
            break
          }
        }
      }
      
      if (tasksQuery.empty) {
        secureLogger.warn('No task found for envelope after fallback search', { envelopeId })
        return NextResponse.json({ message: 'No associated task found' }, { status: 200 })
      }

      // Process each task (should typically be just one)
      for (const taskDoc of tasksQuery.docs) {
        const task = taskDoc.data()
        secureLogger.info('Found task for envelope', { taskId: taskDoc.id, envelopeId })

        // Only complete the task if the envelope is actually completed
        if (isCompleted && task.status !== 'completed') {
          try {
            let signedDocumentUrl = null
            
            // Download and store the signed document
            try {
              secureLogger.info(`Downloading signed document for envelope ${envelopeId}`)
              const documentBuffer = await docuSignClient.downloadEnvelopeDocuments(envelopeId)
              
              // Extract participant ID from task (new structure)
              const participantId = task.participantId
              const donationId = task.donationId // fallback for backward compatibility
              
              if (participantId) {
                secureLogger.info(`Uploading signed document to storage for participant ${participantId}`)
                // Use participant-based storage path
                const uploadResult = await uploadDonationBufferAdmin(
                  `participants/${participantId}`,
                  'signed-documents',
                  documentBuffer,
                  `signed-nda-${envelopeId}.pdf`,
                  'application/pdf'
                )
                
                signedDocumentUrl = uploadResult.url
                secureLogger.info(`Signed document stored at: ${signedDocumentUrl}`)
              } else if (donationId) {
                // Fallback to donation-based storage for backward compatibility
                secureLogger.info(`Uploading signed document to storage for donation ${donationId} (legacy)`)
                const uploadResult = await uploadDonationBufferAdmin(
                  donationId,
                  'signed-documents',
                  documentBuffer,
                  `signed-nda-${envelopeId}.pdf`,
                  'application/pdf'
                )
                
                signedDocumentUrl = uploadResult.url
                secureLogger.info(`Signed document stored at: ${signedDocumentUrl} (legacy path)`)
              } else {
                secureLogger.warn(`No participantId or donationId found in task ${taskDoc.id} metadata`)
              }
            } catch (downloadError) {
              secureLogger.error(`Failed to download/store signed document for envelope ${envelopeId}:`, downloadError)
              // Continue with task completion even if document download fails
            }

            // Update the task status to completed
            await adminDb.collection('tasks').doc(taskDoc.id).update({
              status: 'completed',
              completedAt: FieldValue.serverTimestamp(),
              completedBy: 'docusign-webhook',
              metadata: {
                ...task.metadata,
                docuSignStatus: isCompleted ? 'completed' : envelopeStatus,
                docuSignCompletedAt: new Date().toISOString(),
                signedDocumentUrl: signedDocumentUrl || null
              }
            })

            secureLogger.info('Task marked as completed via DocuSign webhook', { 
              taskId: taskDoc.id,
              envelopeId,
              participantId: task.participantId || task.donationId
            })
            
            // Unblock dependent tasks
            try {
              // Find tasks that depend on this completed task
              const dependentTasksQuery = task.participantId
                ? adminDb.collection('tasks')
                    .where('participantId', '==', task.participantId)
                    .where('dependencies', 'array-contains', taskDoc.id)
                : adminDb.collection('tasks')
                    .where('donationId', '==', task.donationId)
                    .where('dependencies', 'array-contains', taskDoc.id)
                    
              const dependentTasks = await dependentTasksQuery.get()
              
              if (!dependentTasks.empty) {
                secureLogger.info('Found dependent tasks to unblock', { 
                  count: dependentTasks.size,
                  completedTaskId: taskDoc.id 
                })
                
                for (const depTaskDoc of dependentTasks.docs) {
                  const depTask = depTaskDoc.data()
                  if (depTask.status === 'blocked') {
                    await adminDb.collection('tasks').doc(depTaskDoc.id).update({
                      status: 'pending',
                      updatedAt: FieldValue.serverTimestamp()
                    })
                    
                    secureLogger.info('Unblocked dependent task', { 
                      taskId: depTaskDoc.id,
                      taskType: depTask.type
                    })
                  }
                }
              }
            } catch (depError) {
              secureLogger.error('Error unblocking dependent tasks', depError, { taskId: taskDoc.id })
            }
          } catch (error) {
            secureLogger.error(`Failed to update task ${taskDoc.id}:`, error)
          }
        } else if (!isCompleted) {
          // Update task metadata with current status but don't complete
          try {
            await adminDb.collection('tasks').doc(taskDoc.id).update({
              metadata: {
                ...task.metadata,
                docuSignStatus: envelopeStatus,
                docuSignLastUpdate: new Date().toISOString()
              }
            })

            secureLogger.info(`Task ${taskDoc.id} updated with DocuSign status: ${envelopeStatus}`)
          } catch (error) {
            secureLogger.error(`Failed to update task metadata ${taskDoc.id}:`, error)
          }
        }
      }
    }

    // Always return success to DocuSign
    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 })

  } catch (error) {
    secureLogger.error('DocuSign webhook error:', error)
    
    // Return success even on error to prevent DocuSign from retrying
    // Log the error for debugging but don't fail the webhook
    return NextResponse.json({ 
      message: 'Webhook received but processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 })
  }
}

// DocuSign also sends GET requests to verify webhook endpoints
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const challenge = searchParams.get('challenge')
  
  if (challenge) {
    // Return the challenge for webhook verification
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
  
  return NextResponse.json({ message: 'DocuSign webhook endpoint active' }, { status: 200 })
}