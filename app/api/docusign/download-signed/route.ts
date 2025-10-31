import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { docuSignClient } from '@/lib/docusign/simple-client'
import { uploadDonationBufferAdmin } from '@/lib/firebase/storage-admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication - only admins can manually trigger this
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    if (user.customClaims?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { envelopeId, donationId, role = 'donor' } = body

    if (!envelopeId || !donationId) {
      return NextResponse.json({
        error: 'Missing required fields: envelopeId, donationId'
      }, { status: 400 })
    }

    if (!['donor', 'nonprofit', 'appraiser'].includes(role)) {
      return NextResponse.json({
        error: 'Invalid role. Must be donor, nonprofit, or appraiser'
      }, { status: 400 })
    }

    try {
      console.log(`Manually downloading signed document for envelope ${envelopeId}`)

      // Download the signed document from DocuSign
      const documentBuffer = await docuSignClient.downloadEnvelopeDocuments(envelopeId)
      console.log(`Downloaded ${documentBuffer.length} bytes`)

      // Upload to Firebase Storage with role-based path
      const uploadResult = await uploadDonationBufferAdmin(
        donationId,
        role as 'donor' | 'nonprofit' | 'appraiser',
        documentBuffer,
        `signed-nda-${envelopeId}.pdf`,
        'application/pdf'
      )
      
      console.log(`Signed document stored at: ${uploadResult.url}`)
      
      return NextResponse.json({
        success: true,
        message: 'Signed document downloaded and stored successfully',
        documentUrl: uploadResult.url,
        filePath: uploadResult.path
      })
      
    } catch (error) {
      console.error(`Failed to download/store signed document:`, error)
      return NextResponse.json({
        error: 'Failed to download or store signed document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Download signed document API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}