import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { uploadDonationBufferAdmin } from '@/lib/firebase/storage-admin'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Only allow this in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'This endpoint is only available in development' }, { status: 403 })
    }

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(idToken)

    // Get the task
    const taskDoc = await adminDb.collection('tasks').doc(params.id).get()
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const task = taskDoc.data()!
    
    // Only allow DocuSign signature tasks
    if (task.type !== 'docusign_signature') {
      return NextResponse.json({ error: 'This endpoint only works for DocuSign signature tasks' }, { status: 400 })
    }

    // Only allow if task is not already completed
    if (task.status === 'completed') {
      return NextResponse.json({ error: 'Task is already completed' }, { status: 400 })
    }

    // Get the DocuSign envelope ID from task metadata
    const envelopeId = task.metadata?.docuSignEnvelopeId
    if (!envelopeId) {
      return NextResponse.json({ error: 'No DocuSign envelope ID found in task metadata' }, { status: 400 })
    }

    let signedDocumentUrl = null

    // Try to download and store the signed document
    try {
      console.log(`[DEV] Downloading signed document for envelope ${envelopeId}`)
      const documentBuffer = await docuSignClient.downloadEnvelopeDocuments(envelopeId)
      
      // Use participant ID if available, otherwise fall back to donation ID
      const participantId = task.participantId
      const donationId = task.donationId
      
      if (participantId) {
        console.log(`[DEV] Uploading signed document to storage for participant ${participantId}`)
        const uploadResult = await uploadDonationBufferAdmin(
          `participants/${participantId}`,
          'signed-documents',
          documentBuffer,
          `signed-nda-${envelopeId}.pdf`,
          'application/pdf'
        )
        
        signedDocumentUrl = uploadResult.url
        console.log(`[DEV] Signed document stored at: ${signedDocumentUrl}`)
      } else if (donationId) {
        console.log(`[DEV] Uploading signed document to storage for donation ${donationId} (legacy)`)
        const uploadResult = await uploadDonationBufferAdmin(
          donationId,
          'signed-documents',
          documentBuffer,
          `signed-nda-${envelopeId}.pdf`,
          'application/pdf'
        )
        
        signedDocumentUrl = uploadResult.url
        console.log(`[DEV] Signed document stored at: ${signedDocumentUrl} (legacy path)`)
      } else {
        console.warn(`[DEV] No participantId or donationId found in task ${params.id} metadata`)
        return NextResponse.json({ error: 'No participant ID or donation ID found in task' }, { status: 400 })
      }
    } catch (downloadError) {
      console.error(`[DEV] Failed to download/store signed document for envelope ${envelopeId}:`, downloadError)
      return NextResponse.json({ 
        error: 'Failed to download or store signed document',
        details: downloadError instanceof Error ? downloadError.message : 'Unknown error'
      }, { status: 500 })
    }

    // Update the task status to completed
    await adminDb.collection('tasks').doc(params.id).update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      completedBy: decodedToken.uid,
      metadata: {
        ...task.metadata,
        docuSignStatus: 'completed',
        docuSignCompletedAt: new Date().toISOString(),
        signedDocumentUrl: signedDocumentUrl,
        developmentCompletion: true
      }
    })

    console.log(`[DEV] Task ${params.id} marked as completed manually in development mode`)

    return NextResponse.json({ 
      success: true, 
      message: 'Task completed and signed document stored',
      signedDocumentUrl 
    })

  } catch (error) {
    console.error('Development DocuSign completion error:', error)
    return NextResponse.json({ 
      error: 'Failed to complete task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}