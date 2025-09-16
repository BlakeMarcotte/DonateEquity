/**
 * API Route: AI Appraisal Webhook Handler
 * POST /api/valuation/webhook
 * 
 * Receives webhook notifications from 409.ai when valuation status changes
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue, type UpdateData } from 'firebase-admin/firestore'
import { secureLogger } from '@/lib/logging/secure-logger'
import type { Task } from '@/types/task'

// Webhook payload validation schema
const webhookSchema = z.object({
  valuation_id: z.string().min(1),
  user_id: z.string().min(1),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  valuation_amount: z.number().optional(),
  valuation_date: z.string().optional(),
  report_url: z.string().url().optional(),
  completed_at: z.string().datetime().optional(),
  // Include signature for verification
  signature: z.string().optional(),
  timestamp: z.number().optional(),
})

/**
 * Verify webhook signature (implement when 409.ai provides signature method)
 */
function verifyWebhookSignature(
  _payload: string, 
  _signature: string | undefined,
  timestamp: number | undefined
): boolean {
  // TODO: Implement signature verification when 409.ai provides method
  // For now, we'll implement basic timestamp validation
  
  if (!timestamp) {
    return false
  }
  
  const currentTime = Math.floor(Date.now() / 1000)
  const timeDifference = Math.abs(currentTime - timestamp)
  
  // Reject webhooks older than 5 minutes
  return timeDifference <= 300
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await request.text()
    const payload = JSON.parse(rawBody)
    
    // 2. Validate payload structure
    const validated = webhookSchema.parse(payload)
    
    // 3. Verify webhook signature/authenticity
    if (!verifyWebhookSignature(rawBody, validated.signature, validated.timestamp)) {
      secureLogger.security('Invalid webhook signature or timestamp', {
        endpoint: request.url,
        method: request.method,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        statusCode: 401,
      }, {
        valuationId: validated.valuation_id,
        hasSignature: !!validated.signature,
        timestamp: validated.timestamp,
      })
      
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
    
    // 4. Find task(s) associated with this valuation
    const tasksQuery = adminDb.collection('tasks')
      .where('metadata.valuationId', '==', validated.valuation_id)
    
    const tasksSnapshot = await tasksQuery.get()
    
    if (tasksSnapshot.empty) {
      secureLogger.warn('Webhook received for unknown valuation', {
        valuationId: validated.valuation_id,
        status: validated.status,
      })
      
      // Still return 200 to prevent retries
      return NextResponse.json({ 
        success: true, 
        message: 'Valuation not found in system' 
      })
    }
    
    // 5. Update all matching tasks
    const batch = adminDb.batch()
    let updatedTasksCount = 0
    
    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data() as Task
      const taskRef = adminDb.collection('tasks').doc(taskDoc.id)
      
      const updates: UpdateData<Task> = {
        'metadata.valuationStatus': validated.status,
        updatedAt: FieldValue.serverTimestamp(),
      }
      
      // Update valuation amount if provided
      if (validated.valuation_amount) {
        updates['metadata.valuationAmount'] = validated.valuation_amount
      }
      
      // Update report URL if provided
      if (validated.report_url) {
        updates['metadata.valuationReportUrl'] = validated.report_url
      }
      
      // Mark completion timestamp
      if (validated.status === 'completed' && validated.completed_at) {
        updates['metadata.valuationCompletedAt'] = validated.completed_at
        
        // If this is an ai_appraisal_submission task, mark it as completed
        if (taskData.type === 'ai_appraisal_submission') {
          updates['status'] = 'completed'
          updates['completedAt'] = FieldValue.serverTimestamp()
        }
      }
      
      // Handle failed status
      if (validated.status === 'failed') {
        // Keep task status as 'in_progress' but log the failure
        secureLogger.error('AI Appraisal failed', undefined, {
          taskId: taskDoc.id,
          valuationId: validated.valuation_id,
          userId: taskData.assignedTo,
        })
      }
      
      batch.update(taskRef, updates)
      updatedTasksCount++
      
      // Audit log for each task update
      secureLogger.audit('AI Appraisal status updated via webhook', {
        userId: taskData.assignedTo || 'system',
        action: 'update_valuation_status',
        resource: 'valuation',
        resourceId: validated.valuation_id,
      }, {
        taskId: taskDoc.id,
        oldStatus: taskData.metadata?.valuationStatus,
        newStatus: validated.status,
        valuationAmount: validated.valuation_amount,
      })
    }
    
    // 6. Commit all updates
    await batch.commit()
    
    // 7. Log successful webhook processing
    secureLogger.info('Webhook processed successfully', {
      valuationId: validated.valuation_id,
      status: validated.status,
      tasksUpdated: updatedTasksCount,
      valuationAmount: validated.valuation_amount,
    })
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedTasksCount} task(s)`,
      tasksUpdated: updatedTasksCount,
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      secureLogger.warn('Invalid webhook payload', {
        errors: error.issues,
        endpoint: request.url,
      })
      
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      )
    }
    
    secureLogger.error('Webhook processing failed', error, {
      endpoint: request.url,
      method: request.method,
    })
    
    // Return 500 to trigger retries from 409.ai
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}