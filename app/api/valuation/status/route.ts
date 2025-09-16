/**
 * API Route: Check AI Appraisal Status
 * GET /api/valuation/status?taskId={taskId}
 * 
 * Retrieves the current status of an AI Appraisal
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthSecure } from '@/lib/auth/verify-auth-secure'
import { adminDb } from '@/lib/firebase/admin'
import { valuationClient } from '@/lib/valuation/client'
import { secureLogger } from '@/lib/logging/secure-logger'
import type { Task } from '@/types/task'

// Query parameter validation
const querySchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
})

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const authResult = await verifyAuthSecure(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate query parameters
    const searchParams = request.nextUrl.searchParams
    const queryData = {
      taskId: searchParams.get('taskId') || '',
    }
    const validated = querySchema.parse(queryData)

    // 3. Get task and verify permissions
    const taskRef = adminDb.collection('tasks').doc(validated.taskId)
    const taskDoc = await taskRef.get()
    
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const taskData = taskDoc.data() as Task
    
    // Verify user has access to this task (donor, nonprofit admin, or admin)
    const hasAccess = (
      taskData.assignedTo === authResult.user.uid ||
      taskData.donorId === authResult.user.uid ||
      authResult.user.customClaims?.role === 'admin'
    )

    if (!hasAccess) {
      secureLogger.security('Unauthorized status check attempt', {
        userId: authResult.user.uid,
        endpoint: request.url,
        method: request.method,
        statusCode: 403,
      }, {
        taskId: validated.taskId,
      })
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Check if valuation exists
    const valuationId = taskData.metadata?.valuationId
    if (!valuationId) {
      return NextResponse.json({
        success: true,
        status: 'not_started',
        message: 'AI Appraisal has not been initiated for this task',
      })
    }

    // 5. Get valuation status from 409.ai
    try {
      const valuation = await valuationClient.getInstance().getValuation(valuationId as string)
      
      // 6. Update task metadata with latest status
      const updates: Record<string, unknown> = {
        'metadata.valuationStatus': valuation.status,
        updatedAt: new Date(),
      }
      
      if (valuation.valuationAmount) {
        updates['metadata.valuationAmount'] = valuation.valuationAmount
      }
      
      if (valuation.reportUrl) {
        updates['metadata.valuationReportUrl'] = valuation.reportUrl
      }
      
      if (valuation.status === 'completed') {
        updates['metadata.valuationCompletedAt'] = valuation.updatedAt
      }
      
      await taskRef.update(updates)

      // 7. Return status information
      return NextResponse.json({
        success: true,
        status: valuation.status,
        valuationId: valuation.id,
        valuationAmount: valuation.valuationAmount,
        reportUrl: valuation.reportUrl,
        completedAt: valuation.status === 'completed' ? valuation.updatedAt : null,
        message: getStatusMessage(valuation.status),
      })

    } catch (valuationError) {
      // If valuation not found in 409.ai, return task metadata status
      secureLogger.warn('Unable to fetch valuation status from external service', {
        valuationId: valuationId,
        error: valuationError,
      })
      
      return NextResponse.json({
        success: true,
        status: taskData.metadata?.valuationStatus || 'unknown',
        valuationId: valuationId,
        message: 'Unable to retrieve latest status from valuation service',
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.issues },
        { status: 400 }
      )
    }

    secureLogger.error('AI Appraisal status check failed', error, {
      endpoint: request.url,
      method: request.method,
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'AI Appraisal is waiting to be processed'
    case 'in_progress':
      return 'AI Appraisal is currently being processed'
    case 'completed':
      return 'AI Appraisal has been completed successfully'
    case 'failed':
      return 'AI Appraisal failed to complete'
    default:
      return 'AI Appraisal status is unknown'
  }
}