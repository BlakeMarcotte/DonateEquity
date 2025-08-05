import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { uploadDonationBufferAdmin } from '@/lib/firebase/storage-admin'

export async function POST(request: NextRequest) {
  try {
    // Parse the DocuSign webhook payload
    const body = await request.json()
    
    // Log the webhook event for debugging
    console.log('DocuSign webhook received:', JSON.stringify(body, null, 2))

    // DocuSign sends webhook data in this format
    const { event, data } = body
    
    if (!event || !data) {
      console.log('Invalid webhook payload - missing event or data')
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 })
    }

    // We're interested in envelope completion events
    if (event === 'envelope-completed' || event === 'envelope-sent' || event === 'recipient-completed') {
      const envelopeId = data.envelopeId || data.envelopeSummary?.envelopeId
      const envelopeStatus = data.envelopeStatus || data.envelopeSummary?.status
      
      if (!envelopeId) {
        console.log('No envelope ID found in webhook data')
        return NextResponse.json({ message: 'No envelope ID' }, { status: 400 })
      }

      console.log(`Processing envelope ${envelopeId} with status: ${envelopeStatus}`)

      // Find the task associated with this envelope
      const tasksQuery = await adminDb
        .collection('tasks')
        .where('metadata.docuSignEnvelopeId', '==', envelopeId)
        .get()

      if (tasksQuery.empty) {
        console.log(`No task found for envelope ID: ${envelopeId}`)
        return NextResponse.json({ message: 'No associated task found' }, { status: 200 })
      }

      // Process each task (should typically be just one)
      for (const taskDoc of tasksQuery.docs) {
        const task = taskDoc.data()
        console.log(`Found task ${taskDoc.id} for envelope ${envelopeId}`)

        // Only complete the task if the envelope is actually completed
        if (envelopeStatus === 'completed' && task.status !== 'completed') {
          try {
            let signedDocumentUrl = null
            
            // Download and store the signed document
            try {
              console.log(`Downloading signed document for envelope ${envelopeId}`)
              const documentBuffer = await docuSignClient.downloadEnvelopeDocuments(envelopeId)
              
              // Extract donation ID from task
              const donationId = task.donationId
              if (donationId) {
                console.log(`Uploading signed document to storage for donation ${donationId}`)
                const uploadResult = await uploadDonationBufferAdmin(
                  donationId,
                  'signed-documents',
                  documentBuffer,
                  `signed-nda-${envelopeId}.pdf`,
                  'application/pdf'
                )
                
                signedDocumentUrl = uploadResult.url
                console.log(`Signed document stored at: ${signedDocumentUrl}`)
              } else {
                console.warn(`No donationId found in task ${taskDoc.id} metadata`)
              }
            } catch (downloadError) {
              console.error(`Failed to download/store signed document for envelope ${envelopeId}:`, downloadError)
              // Continue with task completion even if document download fails
            }

            // Update the task status to completed
            await adminDb.collection('tasks').doc(taskDoc.id).update({
              status: 'completed',
              completedAt: FieldValue.serverTimestamp(),
              completedBy: 'docusign-webhook',
              metadata: {
                ...task.metadata,
                docuSignStatus: envelopeStatus,
                docuSignCompletedAt: new Date().toISOString(),
                signedDocumentUrl: signedDocumentUrl || null
              }
            })

            console.log(`Task ${taskDoc.id} marked as completed via DocuSign webhook`)
          } catch (error) {
            console.error(`Failed to update task ${taskDoc.id}:`, error)
          }
        } else if (envelopeStatus !== 'completed') {
          // Update task metadata with current status but don't complete
          try {
            await adminDb.collection('tasks').doc(taskDoc.id).update({
              metadata: {
                ...task.metadata,
                docuSignStatus: envelopeStatus,
                docuSignLastUpdate: new Date().toISOString()
              }
            })

            console.log(`Task ${taskDoc.id} updated with DocuSign status: ${envelopeStatus}`)
          } catch (error) {
            console.error(`Failed to update task metadata ${taskDoc.id}:`, error)
          }
        }
      }
    }

    // Always return success to DocuSign
    return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 })

  } catch (error) {
    console.error('DocuSign webhook error:', error)
    
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