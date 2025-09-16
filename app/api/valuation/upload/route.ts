/**
 * API Route: Upload Attachment for AI Appraisal
 * POST /api/valuation/upload
 * 
 * Handles file uploads for AI Appraisal (articles of incorporation, pitch deck, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthSecure } from '@/lib/auth/verify-auth-secure'
import { adminDb, adminStorage } from '@/lib/firebase/admin'
import { valuationClient } from '@/lib/valuation/client'
import { secureLogger } from '@/lib/logging/secure-logger'
import type { Task } from '@/types/task'

// File type validation
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const authResult = await verifyAuthSecure(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse form data
    const formData = await request.formData()
    const taskId = formData.get('taskId') as string
    const attachmentType = formData.get('attachmentType') as string
    const file = formData.get('file') as File

    if (!taskId || !attachmentType || !file) {
      return NextResponse.json({ 
        error: 'Missing required fields: taskId, attachmentType, and file' 
      }, { status: 400 })
    }

    // 3. Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed types: PDF, Excel, Word, JPEG, PNG, GIF' 
      }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 50MB' 
      }, { status: 400 })
    }

    // 4. Get task and verify permissions
    const taskRef = adminDb.collection('tasks').doc(taskId)
    const taskDoc = await taskRef.get()
    
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const taskData = taskDoc.data() as Task
    
    // Verify user is the donor for this task
    if (taskData.assignedTo !== authResult.user.uid || taskData.assignedRole !== 'donor') {
      secureLogger.security('Unauthorized file upload attempt', {
        userId: authResult.user.uid,
        endpoint: request.url,
        method: request.method,
        statusCode: 403,
      }, {
        taskId: taskId,
        fileName: file.name,
      })
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 5. Check if valuation exists
    const valuationId = taskData.metadata?.valuationId
    if (!valuationId || typeof valuationId !== 'string') {
      return NextResponse.json({ 
        error: 'Valuation not found. Please initiate AI Appraisal first.' 
      }, { status: 400 })
    }

    // 6. Upload to Firebase Storage first (for backup)
    const bucket = adminStorage.bucket()
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `valuations/${taskData.campaignId}/${taskData.participantId}/${attachmentType}/${timestamp}_${sanitizedFileName}`
    
    const fileBuffer = await file.arrayBuffer()
    const storageFile = bucket.file(storagePath)
    
    await storageFile.save(Buffer.from(fileBuffer), {
      metadata: {
        contentType: file.type,
        metadata: {
          taskId: taskId,
          valuationId: valuationId,
          attachmentType: attachmentType,
          uploadedBy: authResult.user.uid,
          uploadedAt: new Date().toISOString(),
        }
      }
    })

    // 7. Forward to 409.ai
    const attachment = await valuationClient.uploadAttachment(
      valuationId,
      file,
      attachmentType
    )

    // 8. Update task metadata with attachment info
    const currentAttachments = (taskData.metadata?.documentIds as string[]) || []
    await taskRef.update({
      'metadata.documentIds': [...currentAttachments, storagePath],
      updatedAt: new Date(),
    })

    // 9. Audit log
    secureLogger.audit('AI Appraisal attachment uploaded', {
      userId: authResult.user.uid,
      action: 'upload_valuation_attachment',
      resource: 'valuation_attachment',
      resourceId: attachment.id,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    }, {
      taskId: taskId,
      valuationId: valuationId,
      attachmentType: attachmentType,
      fileName: file.name,
      fileSize: file.size,
      storagePath: storagePath,
    })

    return NextResponse.json({
      success: true,
      attachmentId: attachment.id,
      fileName: file.name,
      fileSize: file.size,
      attachmentType: attachmentType,
      message: 'File uploaded successfully',
    })

  } catch (error) {
    secureLogger.error('AI Appraisal file upload failed', error, {
      endpoint: request.url,
      method: request.method,
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}