import { NextRequest, NextResponse } from 'next/server'
import { docuSignClient } from '@/lib/docusign/client'
import { verifyAuth } from '@/lib/auth/verify-auth'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      envelopeId, 
      recipientEmail, 
      recipientName,
      donationId 
    } = body

    // Validate required fields
    if (!envelopeId || !recipientEmail || !recipientName || !donationId) {
      return NextResponse.json({ 
        error: 'Missing required fields: envelopeId, recipientEmail, recipientName, donationId' 
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

    // Create return URL for after signing
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const returnUrl = `${baseUrl}/donations/${donationId}/tasks?signed=true`

    // Get recipient view URL for embedded signing
    const viewUrl = await docuSignClient.getRecipientView({
      accountId,
      envelopeId,
      recipientEmail,
      recipientName,
      recipientId: '1', // Default recipient ID from envelope creation
      returnUrl
    })

    return NextResponse.json({
      success: true,
      signingUrl: viewUrl.url
    })

  } catch (error) {
    console.error('DocuSign signing URL error:', error)
    
    return NextResponse.json({
      error: 'Failed to get DocuSign signing URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}