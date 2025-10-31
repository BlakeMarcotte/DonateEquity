import { NextRequest, NextResponse } from 'next/server'
import { docuSignClient } from '@/lib/docusign/simple-client'
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

    // Create return URL for after signing - redirect to dedicated completion page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://donate-equity.vercel.app'
    const returnUrl = `${baseUrl}/docusign/complete?event=signing_complete&donationId=${donationId}`

    // Get recipient view URL for embedded signing
    const viewUrl = await docuSignClient.getRecipientView({
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