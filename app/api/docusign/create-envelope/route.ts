import { NextRequest, NextResponse } from 'next/server'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { adminDb } from '@/lib/firebase/admin'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    const body = await request.json()
    
    const { 
      signerEmail, 
      signerName, 
      documentName = 'General NDA',
      emailSubject = 'Please sign the General NDA',
      donationId 
    } = body

    // Validate required fields
    if (!signerEmail || !signerName || !donationId) {
      return NextResponse.json({ 
        error: 'Missing required fields: signerEmail, signerName, donationId' 
      }, { status: 400 })
    }

    // Path to the NDA document
    const documentPath = path.join(process.cwd(), 'public', 'nda-general.pdf')

    // Create and send envelope for immediate free-form signing
    const envelope = await docuSignClient.createAndSendEnvelope({
      signerEmail,
      signerName,
      documentPath,
      documentName,
      emailSubject
    })

    // Find and update the DocuSign signature task with the envelope ID
    try {
      // First try to find by participantId (new system)
      let tasksQuery = await adminDb
        .collection('tasks')
        .where('participantId', '==', donationId) // donationId is actually participantId in the new system
        .where('type', '==', 'docusign_signature')
        .where('assignedTo', '==', user.uid)
        .get()

      // If not found, try the old donation-based system for backward compatibility
      if (tasksQuery.empty) {
        tasksQuery = await adminDb
          .collection('tasks')
          .where('donationId', '==', donationId)
          .where('type', '==', 'docusign_signature')
          .where('assignedTo', '==', user.uid)
          .get()
      }

      if (!tasksQuery.empty) {
        const taskDoc = tasksQuery.docs[0]
        await adminDb.collection('tasks').doc(taskDoc.id).update({
          'metadata.docuSignEnvelopeId': envelope.envelopeId,
          'metadata.envelopeStatus': envelope.status,
          'metadata.envelopeSentAt': envelope.statusDateTime,
          updatedAt: new Date()
        })
        
        console.log(`Updated task ${taskDoc.id} with envelope ID: ${envelope.envelopeId}`)
      } else {
        console.log(`No DocuSign signature task found for ID ${donationId} and user ${user.uid}`)
      }
    } catch (taskUpdateError) {
      console.error('Failed to update task with envelope ID:', taskUpdateError)
      // Continue anyway - the envelope was created successfully
    }

    // Return the envelope information
    return NextResponse.json({
      success: true,
      envelopeId: envelope.envelopeId,
      envelopeUri: envelope.uri,
      status: envelope.status,
      statusDateTime: envelope.statusDateTime
    })

  } catch (error) {
    console.error('DocuSign envelope creation error:', error)
    
    return NextResponse.json({
      error: 'Failed to create DocuSign envelope',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}