/**
 * API Route: Update AI Appraisal Data
 * POST /api/valuation/update
 * 
 * Updates valuation data with company information, cap table info, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthSecure } from '@/lib/auth/verify-auth-secure'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { valuationClient } from '@/lib/valuation/client'
import { secureLogger } from '@/lib/logging/secure-logger'
import { updateValuationRequestSchema } from '@/lib/valuation/schemas'
import type { Task, AIAppraisalData } from '@/types/task'

// Request validation schema
const requestSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  valuationData: updateValuationRequestSchema,
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authResult = await verifyAuthSecure(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate input
    const body = await request.json()
    const validated = requestSchema.parse(body)

    // 3. Get task and verify permissions
    const taskRef = adminDb.collection('tasks').doc(validated.taskId)
    const taskDoc = await taskRef.get()
    
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const taskData = taskDoc.data() as Task
    
    // Verify user is the donor for this task
    if (taskData.assignedTo !== authResult.user.uid || taskData.assignedRole !== 'donor') {
      secureLogger.security('Unauthorized valuation update attempt', {
        userId: authResult.user.uid,
        endpoint: request.url,
        method: request.method,
        statusCode: 403,
      }, {
        taskId: validated.taskId,
        actualAssignedTo: taskData.assignedTo,
      })
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Check if valuation exists
    const valuationId = taskData.metadata?.valuationId
    if (!valuationId || typeof valuationId !== 'string') {
      return NextResponse.json({ 
        error: 'Valuation not found. Please initiate AI Appraisal first.' 
      }, { status: 400 })
    }

    // 5. Update valuation in 409.ai
    const updatedValuation = await valuationClient.getInstance().updateValuation(
      valuationId,
      validated.valuationData
    )

    // 6. Update task metadata
    await taskRef.update({
      'metadata.valuationStatus': updatedValuation.state,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 7. Store valuation data in task completion data (for record keeping)
    if (validated.valuationData.companyInfo || 
        validated.valuationData.capTableInfo || 
        validated.valuationData.reportContact) {
      
      const currentData = taskData.completionData as AIAppraisalData | undefined
      const completionData: AIAppraisalData = {
        ...currentData,
        companyInfo: validated.valuationData.companyInfo || currentData?.companyInfo,
        capTableInfo: validated.valuationData.capTableInfo || currentData?.capTableInfo,
        reportContact: validated.valuationData.reportContact || currentData?.reportContact,
        lastUpdatedAt: new Date().toISOString(),
      }
      
      await taskRef.update({
        completionData,
      })
    }

    // 8. Audit log
    secureLogger.audit('AI Appraisal data updated', {
      userId: authResult.user.uid,
      action: 'update_ai_appraisal',
      resource: 'valuation',
      resourceId: valuationId,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    }, {
      taskId: validated.taskId,
      updatedFields: Object.keys(validated.valuationData),
    })

    return NextResponse.json({
      success: true,
      valuationId: updatedValuation.valuation_uuid,
      status: updatedValuation.state,
      message: 'AI Appraisal data updated successfully',
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    secureLogger.error('AI Appraisal update failed', error, {
      endpoint: request.url,
      method: request.method,
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}