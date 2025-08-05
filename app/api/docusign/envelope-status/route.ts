import { NextRequest, NextResponse } from 'next/server'
import { docuSignClient } from '@/lib/docusign/client'
import { verifyAuth } from '@/lib/auth/verify-auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const envelopeId = searchParams.get('envelopeId')

    if (!envelopeId) {
      return NextResponse.json({ 
        error: 'Missing envelopeId parameter' 
      }, { status: 400 })
    }

    // Get DocuSign account ID from environment
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID
    if (!accountId) {
      return NextResponse.json({ 
        error: 'DocuSign account ID not configured' 
      }, { status: 500 })
    }

    // Authenticate with DocuSign
    await docuSignClient.authenticateJWT()

    // Get envelope status
    const envelope = await docuSignClient.getEnvelopeStatus(accountId, envelopeId)

    return NextResponse.json({
      success: true,
      envelopeId: envelope.envelopeId,
      status: envelope.status,
      statusDateTime: envelope.statusDateTime,
      emailSubject: envelope.emailSubject,
      recipients: envelope.recipients
    })

  } catch (error) {
    console.error('DocuSign envelope status error:', error)
    
    return NextResponse.json({
      error: 'Failed to get DocuSign envelope status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}