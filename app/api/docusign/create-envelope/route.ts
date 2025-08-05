import { NextRequest, NextResponse } from 'next/server'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { verifyAuth } from '@/lib/auth/verify-auth'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
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

    // Create envelope
    const envelope = await docuSignClient.createEnvelope({
      signerEmail,
      signerName,
      documentPath,
      documentName,
      emailSubject
    })

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