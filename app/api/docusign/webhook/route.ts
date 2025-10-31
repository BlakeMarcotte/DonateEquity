import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { uploadDonationBufferAdmin, uploadParticipantBufferAdmin } from '@/lib/firebase/storage-admin'
import { secureLogger } from '@/lib/logging/secure-logger'

// Enhanced task completion with robust error handling and fallback mechanisms
async function processTaskCompletion(taskDoc: FirebaseFirestore.QueryDocumentSnapshot, envelopeId: string, isCompleted: boolean) {
  const task = taskDoc.data()
  const taskId = taskDoc.id
  
  secureLogger.info('Processing task completion', { 
    taskId, 
    envelopeId, 
    isCompleted,
    currentStatus: task.status,
    participantId: task.participantId
  })

  // Skip if already completed
  if (task.status === 'completed') {
    secureLogger.info('Task already completed, skipping', { taskId })
    return { success: true, message: 'Task already completed' }
  }

  let signedDocumentUrl = null
  
  try {
    // Download and store signed document with retry logic
    let downloadAttempts = 0
    const maxDownloadAttempts = 3
    
    while (downloadAttempts < maxDownloadAttempts) {
      try {
        secureLogger.info(`Downloading signed document (attempt ${downloadAttempts + 1})`, { 
          envelopeId, 
          taskId 
        })
        
        const documentBuffer = await docuSignClient.downloadEnvelopeDocuments(envelopeId)
        const donationId = task.donationId
        const participantId = task.participantId

        // Use new role-based storage for donation tasks
        if (donationId && task.assignedRole) {
          const role = task.assignedRole === 'nonprofit_admin' ? 'nonprofit' : task.assignedRole as 'donor' | 'nonprofit' | 'appraiser'
          const uploadResult = await uploadDonationBufferAdmin(
            donationId,
            role,
            documentBuffer,
            `signed-document-${envelopeId}.pdf`,
            'application/pdf',
            task.assignedTo || undefined,
            undefined,
            taskId
          )
          signedDocumentUrl = uploadResult.url
          secureLogger.info('Document uploaded successfully (role-based)', {
            taskId,
            envelopeId,
            donationId,
            role,
            url: signedDocumentUrl
          })
          break
        }
        // Fallback to legacy participant-based storage
        else if (participantId) {
          const uploadResult = await uploadParticipantBufferAdmin(
            participantId,
            'signed-documents',
            documentBuffer,
            `signed-nda-${envelopeId}.pdf`,
            'application/pdf'
          )
          signedDocumentUrl = uploadResult.url
          secureLogger.info('Document uploaded successfully (legacy path)', {
            taskId,
            envelopeId,
            participantId,
            url: signedDocumentUrl
          })
          break
        } else {
          secureLogger.warn('No donationId or participantId found for document upload', { taskId })
          break
        }
      } catch (downloadError) {
        downloadAttempts++
        secureLogger.error(`Document download attempt ${downloadAttempts} failed`, downloadError, {
          taskId,
          envelopeId,
          attemptsRemaining: maxDownloadAttempts - downloadAttempts
        })
        
        if (downloadAttempts >= maxDownloadAttempts) {
          secureLogger.error('All document download attempts failed, continuing without document', null, {
            taskId,
            envelopeId
          })
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * downloadAttempts))
        }
      }
    }
  } catch (overallError) {
    secureLogger.error('Critical error during document processing', overallError, { taskId, envelopeId })
  }

  try {
    // Update task status with comprehensive metadata
    const updateData = {
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      completedBy: 'docusign-webhook',
      metadata: {
        ...task.metadata,
        docuSignStatus: isCompleted ? 'completed' : 'processing',
        docuSignCompletedAt: new Date().toISOString(),
        signedDocumentUrl: signedDocumentUrl || null,
        webhookProcessedAt: new Date().toISOString(),
        processingVersion: '2.0' // Track version for debugging
      }
    }

    await adminDb.collection('tasks').doc(taskId).update(updateData)
    
    secureLogger.info('Task marked as completed', { 
      taskId,
      envelopeId,
      participantId: task.participantId,
      documentUploaded: !!signedDocumentUrl
    })

    // Process dependent tasks with enhanced logic
    await processDependentTasks(task, taskId)
    
    return { success: true, taskId, signedDocumentUrl }
    
  } catch (updateError) {
    secureLogger.error('Failed to update task status', updateError, { taskId, envelopeId })
    throw updateError
  }
}

// Enhanced dependent task processing with better error handling
async function processDependentTasks(completedTask: FirebaseFirestore.DocumentData, completedTaskId: string) {
  try {
    const participantId = completedTask.participantId
    const donationId = completedTask.donationId
    
    if (!participantId && !donationId) {
      secureLogger.warn('No participant or donation ID found for dependency processing', { 
        taskId: completedTaskId 
      })
      return
    }

    // Find dependent tasks using multiple query strategies
    const dependentTasksQueries = []
    
    if (participantId) {
      dependentTasksQueries.push(
        adminDb.collection('tasks')
          .where('participantId', '==', participantId)
          .where('dependencies', 'array-contains', completedTaskId)
      )
    }
    
    if (donationId) {
      dependentTasksQueries.push(
        adminDb.collection('tasks')
          .where('donationId', '==', donationId)
          .where('dependencies', 'array-contains', completedTaskId)
      )
    }

    const allDependentTasks = []
    
    for (const query of dependentTasksQueries) {
      try {
        const queryResult = await query.get()
        allDependentTasks.push(...queryResult.docs)
      } catch (queryError) {
        secureLogger.error('Error querying dependent tasks', queryError, { 
          completedTaskId,
          participantId,
          donationId
        })
      }
    }

    // Remove duplicates by task ID
    const uniqueDependentTasks = allDependentTasks.filter((task, index, self) => 
      index === self.findIndex(t => t.id === task.id)
    )

    if (uniqueDependentTasks.length === 0) {
      secureLogger.info('No dependent tasks found', { 
        completedTaskId,
        participantId,
        donationId
      })
      return
    }

    secureLogger.info('Processing dependent tasks', { 
      completedTaskId,
      dependentTasksCount: uniqueDependentTasks.length,
      dependentTaskIds: uniqueDependentTasks.map(t => t.id)
    })

    // Process each dependent task
    for (const depTaskDoc of uniqueDependentTasks) {
      try {
        const depTask = depTaskDoc.data()
        
        // Only unblock if task is currently blocked and all dependencies are met
        if (depTask.status === 'blocked') {
          // Double-check that ALL dependencies are completed
          const allDependenciesCompleted = await validateAllDependencies(depTask, participantId, donationId)
          
          if (allDependenciesCompleted) {
            await adminDb.collection('tasks').doc(depTaskDoc.id).update({
              status: 'pending',
              updatedAt: FieldValue.serverTimestamp(),
              metadata: {
                ...depTask.metadata,
                unblockedAt: new Date().toISOString(),
                unblockedBy: completedTaskId
              }
            })
            
            secureLogger.info('Successfully unblocked dependent task', { 
              dependentTaskId: depTaskDoc.id,
              dependentTaskType: depTask.type,
              unblockedBy: completedTaskId
            })
          } else {
            secureLogger.info('Dependent task still has unfulfilled dependencies', {
              dependentTaskId: depTaskDoc.id,
              dependencies: depTask.dependencies
            })
          }
        } else {
          secureLogger.info('Dependent task not in blocked state', {
            dependentTaskId: depTaskDoc.id,
            currentStatus: depTask.status
          })
        }
      } catch (depTaskError) {
        secureLogger.error('Error processing individual dependent task', depTaskError, {
          dependentTaskId: depTaskDoc.id,
          completedTaskId
        })
        // Continue processing other dependent tasks
      }
    }
  } catch (overallError) {
    secureLogger.error('Critical error processing dependent tasks', overallError, { 
      completedTaskId 
    })
  }
}

// Validate that all dependencies for a task are completed
async function validateAllDependencies(task: FirebaseFirestore.DocumentData, participantId?: string, donationId?: string): Promise<boolean> {
  if (!task.dependencies || task.dependencies.length === 0) {
    return true
  }

  try {
    // Get all tasks for this participant/donation
    const allTasksQuery = participantId
      ? adminDb.collection('tasks').where('participantId', '==', participantId)
      : adminDb.collection('tasks').where('donationId', '==', donationId || '')
    
    const allTasksSnapshot = await allTasksQuery.get()
    const taskStatusMap = new Map<string, string>()
    
    allTasksSnapshot.docs.forEach(doc => {
      taskStatusMap.set(doc.id, doc.data().status)
    })

    // Check each dependency
    const dependencyStatuses = task.dependencies.map((depId: string) => {
      const status = taskStatusMap.get(depId)
      return status === 'completed'
    })

    const allCompleted = dependencyStatuses.every((status: boolean) => status === true)
    
    secureLogger.info('Dependency validation result', {
      taskId: task.id || 'unknown',
      dependencies: task.dependencies,
      dependencyStatuses,
      allCompleted
    })
    
    return allCompleted
  } catch (validationError) {
    secureLogger.error('Error validating dependencies', validationError, {
      taskId: task.id || 'unknown',
      dependencies: task.dependencies
    })
    return false
  }
}

export async function POST(request: NextRequest) {
  const webhookStartTime = Date.now()
  let envelopeId = 'unknown'
  
  try {
    // Parse the DocuSign webhook payload with timeout protection
    const body = await Promise.race([
      request.json(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Request parsing timeout')), 10000))
    ]) as { 
      envelopeId?: string
      status?: string
      recipientStatuses?: Array<{ 
        status: string
        email?: string
        completedDateTime?: string 
      }>
    }
    
    envelopeId = body.envelopeId || 'unknown'
    
    // Enhanced webhook event logging
    secureLogger.info('DocuSign webhook received', { 
      envelopeId,
      status: body.status,
      eventKeys: Object.keys(body),
      hasRecipientStatuses: !!body.recipientStatuses,
      recipientStatusCount: body.recipientStatuses?.length || 0,
      webhookTimestamp: new Date().toISOString()
    })

    if (!envelopeId || envelopeId === 'unknown') {
      secureLogger.warn('No envelope ID found in webhook payload', { body })
      return NextResponse.json({ message: 'No envelope ID' }, { status: 400 })
    }

    // Determine completion status with enhanced logic
    const envelopeStatus = body.status
    let isCompleted = envelopeStatus === 'completed'
    let completedRecipients = []
    
    if (body.recipientStatuses && Array.isArray(body.recipientStatuses)) {
      completedRecipients = body.recipientStatuses.filter(
        (r: { status: string }) => r.status === 'completed'
      )
      if (completedRecipients.length > 0) {
        isCompleted = true
        secureLogger.info(`Found ${completedRecipients.length} completed recipients`, {
          envelopeId,
          completedRecipients: completedRecipients.map(r => ({ 
            email: r.email, 
            status: r.status, 
            completedDateTime: r.completedDateTime 
          }))
        })
      }
    }
    
    secureLogger.info('Envelope completion status determined', { 
      envelopeId, 
      isCompleted, 
      envelopeStatus,
      completedRecipientsCount: completedRecipients.length
    })

    // Only process completion events
    if (!isCompleted) {
      secureLogger.info('Envelope not completed, updating metadata only', { envelopeId, envelopeStatus })
      await updateTaskMetadataOnly(envelopeId, envelopeStatus || 'unknown')
      return NextResponse.json({ message: 'Status updated but not completed' }, { status: 200 })
    }

    // Find associated tasks with enhanced search strategy
    const associatedTasks = await findTasksForEnvelope(envelopeId)
    
    if (associatedTasks.length === 0) {
      secureLogger.warn('No tasks found for completed envelope', { 
        envelopeId, 
        envelopeStatus,
        searchStrategiesUsed: ['metadata.docuSignEnvelopeId', 'metadata.envelopeId', 'incomplete_tasks_search']
      })
      return NextResponse.json({ message: 'No associated tasks found' }, { status: 200 })
    }

    secureLogger.info('Processing envelope completion for tasks', {
      envelopeId,
      taskCount: associatedTasks.length,
      taskIds: associatedTasks.map(t => t.id)
    })

    // Process each task with the enhanced completion logic
    const results = []
    for (const taskDoc of associatedTasks) {
      try {
        const result = await processTaskCompletion(taskDoc, envelopeId, isCompleted)
        results.push(result)
        
        secureLogger.info('Task processing completed', {
          taskId: taskDoc.id,
          envelopeId,
          success: result.success,
          processingTimeMs: Date.now() - webhookStartTime
        })
      } catch (taskError) {
        secureLogger.error('Failed to process individual task', taskError, {
          taskId: taskDoc.id,
          envelopeId
        })
        results.push({ 
          success: false, 
          taskId: taskDoc.id, 
          error: taskError instanceof Error ? taskError.message : 'Unknown error' 
        })
      }
    }

    // Return comprehensive response
    const totalProcessingTime = Date.now() - webhookStartTime
    secureLogger.info('Webhook processing completed', {
      envelopeId,
      tasksProcessed: results.length,
      successfulTasks: results.filter(r => r.success).length,
      failedTasks: results.filter(r => !r.success).length,
      totalProcessingTimeMs: totalProcessingTime
    })

    return NextResponse.json({ 
      message: 'Webhook processed successfully',
      envelopeId,
      tasksProcessed: results.length,
      results,
      processingTimeMs: totalProcessingTime
    }, { status: 200 })

  } catch (error) {
    const processingTime = Date.now() - webhookStartTime
    secureLogger.error('Critical DocuSign webhook error', error, {
      envelopeId,
      processingTimeMs: processingTime,
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    })
    
    // Always return 200 to prevent DocuSign retries
    return NextResponse.json({ 
      message: 'Webhook received but processing failed',
      envelopeId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: processingTime
    }, { status: 200 })
  }
}

// Enhanced task search with multiple fallback strategies
async function findTasksForEnvelope(envelopeId: string) {
  const foundTasks = []
  
  // Strategy 1: Direct metadata search
  try {
    const directQuery = await adminDb
      .collection('tasks')
      .where('metadata.docuSignEnvelopeId', '==', envelopeId)
      .get()
    
    if (!directQuery.empty) {
      foundTasks.push(...directQuery.docs)
      secureLogger.info('Found tasks via direct metadata search', { 
        envelopeId, 
        count: directQuery.size 
      })
    }
  } catch (error) {
    secureLogger.error('Error in direct metadata search', error, { envelopeId })
  }

  // Strategy 2: Alternative metadata field search
  if (foundTasks.length === 0) {
    try {
      const altQuery = await adminDb
        .collection('tasks')
        .where('metadata.envelopeId', '==', envelopeId)
        .get()
      
      if (!altQuery.empty) {
        foundTasks.push(...altQuery.docs)
        secureLogger.info('Found tasks via alternative metadata search', { 
          envelopeId, 
          count: altQuery.size 
        })
      }
    } catch (error) {
      secureLogger.error('Error in alternative metadata search', error, { envelopeId })
    }
  }

  // Strategy 3: Comprehensive fallback search
  if (foundTasks.length === 0) {
    try {
      const incompleteDocuSignTasks = await adminDb
        .collection('tasks')
        .where('type', '==', 'docusign_signature')
        .where('status', '!=', 'completed')
        .get()
        
      secureLogger.info('Searching through incomplete DocuSign tasks', { 
        envelopeId, 
        totalIncomplete: incompleteDocuSignTasks.size 
      })
      
      for (const doc of incompleteDocuSignTasks.docs) {
        const task = doc.data()
        
        // Check multiple possible metadata fields
        const taskEnvelopeId = task.metadata?.docuSignEnvelopeId || 
                              task.metadata?.envelopeId ||
                              task.metadata?.envelope_id ||
                              task.envelopeId // Direct field fallback
        
        if (taskEnvelopeId === envelopeId) {
          foundTasks.push(doc)
          secureLogger.info('Found task via comprehensive search', { 
            taskId: doc.id, 
            envelopeId,
            matchedField: taskEnvelopeId 
          })
        }
      }
    } catch (error) {
      secureLogger.error('Error in comprehensive fallback search', error, { envelopeId })
    }
  }

  return foundTasks
}

// Update task metadata for non-completion events
async function updateTaskMetadataOnly(envelopeId: string, status: string) {
  try {
    const tasks = await findTasksForEnvelope(envelopeId)
    
    for (const taskDoc of tasks) {
      const task = taskDoc.data()
      await adminDb.collection('tasks').doc(taskDoc.id).update({
        metadata: {
          ...task.metadata,
          docuSignStatus: status,
          docuSignLastUpdate: new Date().toISOString()
        },
        updatedAt: FieldValue.serverTimestamp()
      })
      
      secureLogger.info('Updated task metadata', {
        taskId: taskDoc.id,
        envelopeId,
        status
      })
    }
  } catch (error) {
    secureLogger.error('Error updating task metadata', error, { envelopeId, status })
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