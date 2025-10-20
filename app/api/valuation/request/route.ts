/**
 * API Route: Request AI Appraisal (409.ai Valuation)
 * POST /api/valuation/request
 * 
 * Creates or updates an AI Appraisal task and initiates valuation process
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthSecure } from '@/lib/auth/verify-auth-secure'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { valuationClient } from '@/lib/valuation/client'
import { secureLogger } from '@/lib/logging/secure-logger'
import type { Task } from '@/types/task'

// Request validation schema
const requestSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  participantId: z.string().min(1, 'Participant ID is required'),
  campaignId: z.string().min(1, 'Campaign ID is required'),
  companyInfo: z.object({
    legalName: z.string().min(1, 'Company legal name is required'),
    sicCode: z.string().optional(),
    revenueModel: z.enum(['SaaS', 'Services', 'Product', 'Marketplace', 'Other']).optional(),
    numberOfEmployees: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
    inceptionDate: z.string().optional(),
    exitTimeline: z.string().optional(),
    lawFirm: z.string().optional(),
  }).optional(),
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
    const validatedData = requestSchema.parse(body)

    // 3. Check permissions - user must be the donor for this task
    const taskRef = adminDb.collection('tasks').doc(validatedData.taskId)
    const taskDoc = await taskRef.get()
    
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const taskData = taskDoc.data() as Task
    
    // Verify user is the donor for this task
    if (taskData.assignedTo !== authResult.user.uid || taskData.assignedRole !== 'donor') {
      secureLogger.security('Unauthorized valuation request attempt', {
        userId: authResult.user.uid,
        endpoint: request.url,
        method: request.method,
        statusCode: 403,
      }, {
        taskId: validatedData.taskId,
        actualAssignedTo: taskData.assignedTo,
      })
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify task type is correct
    if (taskData.type !== 'ai_appraisal_request') {
      return NextResponse.json({ error: 'Invalid task type for AI Appraisal' }, { status: 400 })
    }

    // 4. Get user information
    const userDoc = await adminDb.collection('users').doc(authResult.user.uid).get()
    const userData = userDoc.data()
    
    if (!userData) {
      return NextResponse.json({ error: 'User data not found' }, { status: 404 })
    }

    // 5. Create shadow user in 409.ai system
    const valuationUser = await valuationClient.getInstance().createUser({
      email: userData.email || authResult.user.email || '',
      firstName: userData.firstName || userData.displayName?.split(' ')[0] || 'User',
      lastName: userData.lastName || userData.displayName?.split(' ')[1] || 'Name',
      phone: userData.phone,
    })

    // 6. Create valuation record
    const valuation = await valuationClient.getInstance().createValuation({
      userId: valuationUser.user_uuid,
      companyInfo: validatedData.companyInfo,
    })

    // 7. Update task with valuation information
    await taskRef.update({
      status: 'in_progress',
      'metadata.valuationUserId': valuationUser.user_uuid,
      'metadata.valuationId': valuation.valuation_uuid,
      'metadata.valuationStatus': 'pending',
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 8. Generate session token for direct access (if needed)
    const sessionToken = await valuationClient.getInstance().generateSessionToken({
      valuationId: valuation.valuation_uuid,
    })

    // 9. Audit log
    secureLogger.audit('AI Appraisal requested', {
      userId: authResult.user.uid,
      action: 'request_ai_appraisal',
      resource: 'valuation',
      resourceId: valuation.valuation_uuid,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    }, {
      taskId: validatedData.taskId,
      participantId: validatedData.participantId,
      campaignId: validatedData.campaignId,
    })

    return NextResponse.json({
      success: true,
      valuationId: valuation.valuation_uuid,
      valuationUserId: valuationUser.user_uuid,
      sessionUrl: sessionToken.loginUrl,
      message: 'AI Appraisal initiated successfully',
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    secureLogger.error('AI Appraisal request failed', error, {
      endpoint: request.url,
      method: request.method,
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}