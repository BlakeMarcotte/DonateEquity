/**
 * API Route: Convert Invitation Task to AI Appraisal Request
 * POST /api/tasks/[id]/convert-to-ai-appraisal
 * 
 * Converts an invitation task to an ai_appraisal_request task
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthSecure } from '@/lib/auth/verify-auth-secure'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { secureLogger } from '@/lib/logging/secure-logger'
import type { Task } from '@/types/task'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params
  const taskId = params.id
  
  try {
    // 1. Authenticate
    const authResult = await verifyAuthSecure(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get the task
    const taskRef = adminDb.collection('tasks').doc(taskId)
    const taskDoc = await taskRef.get()
    
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const taskData = taskDoc.data() as Task
    
    // 3. Verify user is assigned to this task
    if (taskData.assignedTo !== authResult.user.uid) {
      secureLogger.security('Unauthorized task conversion attempt', {
        userId: authResult.user.uid,
        endpoint: request.url,
        method: request.method,
        statusCode: 403,
      }, {
        taskId,
        actualAssignedTo: taskData.assignedTo,
      })
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Verify task type is invitation and relates to appraiser
    if (taskData.type !== 'invitation' || !taskData.title.toLowerCase().includes('appraiser')) {
      return NextResponse.json({ error: 'Invalid task type for conversion' }, { status: 400 })
    }

    // 5. Convert the task to ai_appraisal_request
    await taskRef.update({
      type: 'ai_appraisal_request',
      title: taskData.title.replace(/invite/i, 'AI Appraisal for'),
      description: 'Complete the AI-powered appraisal process for your equity valuation.',
      'metadata.appraisalMethod': 'ai_appraisal',
      'metadata.originalTaskType': 'invitation',
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 6. Audit log
    secureLogger.audit('Task converted to AI Appraisal', {
      userId: authResult.user.uid,
      action: 'convert_task_to_ai_appraisal',
      resource: 'task',
      resourceId: taskId,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    }, {
      originalType: taskData.type,
      newType: 'ai_appraisal_request',
      participantId: taskData.participantId,
      campaignId: taskData.campaignId,
    })

    return NextResponse.json({
      success: true,
      message: 'Task converted to AI Appraisal successfully',
    })

  } catch (error) {
    secureLogger.error('Task conversion failed', error, {
      endpoint: request.url,
      method: request.method,
      taskId,
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}