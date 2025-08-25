import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { adminDb } from '@/lib/firebase/admin'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { FieldValue } from 'firebase-admin/firestore'
import { uploadDonationBufferAdmin } from '@/lib/firebase/storage-admin'
import { secureLogger } from '@/lib/logging/secure-logger'

/**
 * Background monitoring service to check incomplete DocuSign tasks
 * This runs periodically to catch any tasks that webhooks might have missed
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication - can be triggered by admin or automated systems
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const startTime = Date.now()
    secureLogger.info('DocuSign monitoring service started', { 
      triggeredBy: authResult.user?.uid,
      timestamp: new Date().toISOString()
    })

    // Find all incomplete DocuSign signature tasks
    const incompleteTasksQuery = await adminDb
      .collection('tasks')
      .where('type', '==', 'docusign_signature')
      .where('status', 'in', ['pending', 'in_progress'])
      .get()

    if (incompleteTasksQuery.empty) {
      secureLogger.info('No incomplete DocuSign tasks found')
      return NextResponse.json({ 
        message: 'No incomplete DocuSign tasks to monitor',
        tasksProcessed: 0
      })
    }

    secureLogger.info('Found incomplete DocuSign tasks to monitor', { 
      count: incompleteTasksQuery.size 
    })

    const results = []
    
    for (const taskDoc of incompleteTasksQuery.docs) {
      const task = taskDoc.data()
      const taskId = taskDoc.id
      
      try {
        const result = await checkDocuSignTaskCompletion(taskDoc)
        results.push({
          taskId,
          participantId: task.participantId,
          ...result
        })
      } catch (error) {
        secureLogger.error('Error checking task completion', error, { taskId })
        results.push({
          taskId,
          participantId: task.participantId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const processingTime = Date.now() - startTime
    const completedTasks = results.filter(r => r.success && 'action' in r && r.action === 'completed').length
    const alreadyCompleted = results.filter(r => r.success && 'action' in r && r.action === 'already_completed').length
    const stillPending = results.filter(r => r.success && 'action' in r && r.action === 'still_pending').length
    const errors = results.filter(r => !r.success).length

    secureLogger.info('DocuSign monitoring completed', {
      totalTasks: results.length,
      completedTasks,
      alreadyCompleted,
      stillPending,
      errors,
      processingTimeMs: processingTime
    })

    return NextResponse.json({
      message: 'DocuSign monitoring completed',
      summary: {
        totalTasks: results.length,
        completedTasks,
        alreadyCompleted,
        stillPending,
        errors,
        processingTimeMs: processingTime
      },
      results
    })

  } catch (error) {
    secureLogger.error('DocuSign monitoring service error', error)
    return NextResponse.json({
      error: 'Monitoring service failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function checkDocuSignTaskCompletion(taskDoc: FirebaseFirestore.QueryDocumentSnapshot) {
  const task = taskDoc.data()
  const taskId = taskDoc.id
  
  secureLogger.info('Checking DocuSign task completion', {
    taskId,
    participantId: task.participantId,
    currentStatus: task.status,
    hasEnvelopeId: !!task.metadata?.docuSignEnvelopeId
  })

  const envelopeId = task.metadata?.docuSignEnvelopeId || task.metadata?.envelopeId
  
  if (!envelopeId) {
    secureLogger.warn('Task has no envelope ID, cannot check completion', { taskId })
    return {
      success: true,
      action: 'no_envelope_id',
      message: 'Task has no envelope ID to check'
    }
  }

  try {
    // Check envelope status from DocuSign API
    const envelopeStatus = await docuSignClient.getEnvelopeStatus(envelopeId)
    
    secureLogger.info('Retrieved envelope status from DocuSign', {
      taskId,
      envelopeId,
      status: envelopeStatus.status,
      completedDateTime: envelopeStatus.completedDateTime
    })

    // If envelope is not completed, no action needed
    if (envelopeStatus.status !== 'completed') {
      // Update task metadata with current status
      await adminDb.collection('tasks').doc(taskId).update({
        metadata: {
          ...task.metadata,
          docuSignStatus: envelopeStatus.status,
          lastMonitoringCheck: new Date().toISOString()
        },
        updatedAt: FieldValue.serverTimestamp()
      })

      return {
        success: true,
        action: 'still_pending',
        envelopeStatus: envelopeStatus.status,
        message: 'Envelope not yet completed'
      }
    }

    // Envelope is completed, but task is not - process completion
    secureLogger.info('Found completed envelope with incomplete task', {
      taskId,
      envelopeId,
      taskStatus: task.status
    })

    // Download and store signed document
    let signedDocumentUrl = null
    try {
      const documentBuffer = await docuSignClient.downloadEnvelopeDocuments(envelopeId)
      
      if (task.participantId) {
        const uploadResult = await uploadDonationBufferAdmin(
          `participants/${task.participantId}`,
          'signed-documents',
          documentBuffer,
          `signed-nda-${envelopeId}.pdf`,
          'application/pdf'
        )
        signedDocumentUrl = uploadResult.url
      }
    } catch (downloadError) {
      secureLogger.error('Failed to download document during monitoring', downloadError, {
        taskId,
        envelopeId
      })
      // Continue with task completion even if document download fails
    }

    // Update task to completed
    await adminDb.collection('tasks').doc(taskId).update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      completedBy: 'monitoring-service',
      metadata: {
        ...task.metadata,
        docuSignStatus: 'completed',
        docuSignCompletedAt: envelopeStatus.completedDateTime || new Date().toISOString(),
        signedDocumentUrl: signedDocumentUrl || null,
        completedViaMonitoring: true,
        monitoringCompletedAt: new Date().toISOString()
      }
    })

    // Process dependent tasks
    await processDependentTasksForMonitoring(task, taskId)

    secureLogger.info('Task completed via monitoring service', {
      taskId,
      envelopeId,
      participantId: task.participantId,
      documentUploaded: !!signedDocumentUrl
    })

    return {
      success: true,
      action: 'completed',
      envelopeId,
      envelopeStatus: envelopeStatus.status,
      completedDateTime: envelopeStatus.completedDateTime,
      signedDocumentUrl,
      message: 'Task completed via monitoring service'
    }

  } catch (docuSignError) {
    secureLogger.error('DocuSign API error during monitoring', docuSignError, {
      taskId,
      envelopeId
    })
    
    return {
      success: false,
      error: `DocuSign API error: ${docuSignError instanceof Error ? docuSignError.message : 'Unknown error'}`,
      envelopeId
    }
  }
}

async function processDependentTasksForMonitoring(completedTask: FirebaseFirestore.DocumentData, completedTaskId: string) {
  try {
    const participantId = completedTask.participantId
    
    if (!participantId) {
      secureLogger.warn('No participant ID for dependency processing', { taskId: completedTaskId })
      return
    }

    // Find dependent tasks
    const dependentTasksQuery = await adminDb
      .collection('tasks')
      .where('participantId', '==', participantId)
      .where('dependencies', 'array-contains', completedTaskId)
      .get()

    if (dependentTasksQuery.empty) {
      secureLogger.info('No dependent tasks found during monitoring', { completedTaskId })
      return
    }

    secureLogger.info('Processing dependent tasks via monitoring', {
      completedTaskId,
      dependentTasksCount: dependentTasksQuery.size
    })

    for (const depTaskDoc of dependentTasksQuery.docs) {
      const depTask = depTaskDoc.data()
      
      if (depTask.status === 'blocked') {
        // Validate all dependencies before unblocking
        const allDependenciesCompleted = await validateDependenciesForMonitoring(depTask, participantId)
        
        if (allDependenciesCompleted) {
          await adminDb.collection('tasks').doc(depTaskDoc.id).update({
            status: 'pending',
            updatedAt: FieldValue.serverTimestamp(),
            metadata: {
              ...depTask.metadata,
              unblockedAt: new Date().toISOString(),
              unblockedBy: completedTaskId,
              unblockedViaMonitoring: true
            }
          })
          
          secureLogger.info('Dependent task unblocked via monitoring', {
            dependentTaskId: depTaskDoc.id,
            dependentTaskType: depTask.type,
            unblockedBy: completedTaskId
          })
        }
      }
    }
  } catch (error) {
    secureLogger.error('Error processing dependent tasks during monitoring', error, {
      completedTaskId
    })
  }
}

async function validateDependenciesForMonitoring(task: FirebaseFirestore.DocumentData, participantId: string): Promise<boolean> {
  if (!task.dependencies || task.dependencies.length === 0) {
    return true
  }

  try {
    const allTasksQuery = await adminDb
      .collection('tasks')
      .where('participantId', '==', participantId)
      .get()
    
    const taskStatusMap = new Map<string, string>()
    allTasksQuery.docs.forEach(doc => {
      taskStatusMap.set(doc.id, doc.data().status)
    })

    const allDependenciesCompleted = task.dependencies.every((depId: string) => {
      const status = taskStatusMap.get(depId)
      return status === 'completed'
    })

    secureLogger.info('Dependency validation during monitoring', {
      taskId: task.id || 'unknown',
      dependencies: task.dependencies,
      allDependenciesCompleted
    })

    return allDependenciesCompleted
  } catch (error) {
    secureLogger.error('Error validating dependencies during monitoring', error, {
      taskId: task.id || 'unknown'
    })
    return false
  }
}

// GET endpoint for manual checks
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return monitoring status/info
    const incompleteTasksQuery = await adminDb
      .collection('tasks')
      .where('type', '==', 'docusign_signature')
      .where('status', 'in', ['pending', 'in_progress'])
      .get()

    return NextResponse.json({
      message: 'DocuSign monitoring service status',
      incompleteTasksCount: incompleteTasksQuery.size,
      lastCheck: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get monitoring status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}