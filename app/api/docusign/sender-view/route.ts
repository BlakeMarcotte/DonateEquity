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
    const { envelopeId, donationId } = body

    // Validate required fields
    if (!envelopeId || !donationId) {
      return NextResponse.json({ 
        error: 'Missing required fields: envelopeId, donationId' 
      }, { status: 400 })
    }

    // Create return URL for after tagging
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://donate-equity.vercel.app'
    const returnUrl = `${baseUrl}/donations/${donationId}/tasks?tagged=true`

    // Get sender view URL for tagging
    const viewUrl = await docuSignClient.getSenderView({
      envelopeId,
      returnUrl
    })

    return NextResponse.json({
      success: true,
      taggingUrl: viewUrl.url
    })

  } catch (error) {
    console.error('DocuSign sender view error:', error)
    
    return NextResponse.json({
      error: 'Failed to get DocuSign sender view',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}