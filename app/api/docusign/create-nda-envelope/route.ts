import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { getAccessToken, getUserAccountInfo, createEnvelope, createRecipientView, createNDAEnvelopeDefinition } from '@/lib/docusign/api-client'
import { getAccessTokenForUser, getUserAccountInfo as getAuthCodeUserInfo } from '@/lib/docusign/auth-code-client'
import { getSimpleAccessToken, getAccountInfo, createSimpleEnvelope, getEmbeddedSigningUrl } from '@/lib/docusign/simple-client'
import { FieldValue } from 'firebase-admin/firestore'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    const body = await request.json()
    const { taskId, donationId } = body
    
    if (!taskId || !donationId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Verify user can complete this task
    const taskRef = adminDb.collection('tasks').doc(taskId)
    const taskDoc = await taskRef.get()
    
    if (!taskDoc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    
    const taskData = taskDoc.data()
    
    // Verify this is the correct task and user has permission
    if (taskData?.assignedTo !== decodedToken.uid || taskData?.title !== 'Sign General NDA') {
      return NextResponse.json({ error: 'Unauthorized to complete this task' }, { status: 403 })
    }
    
    // Get user info
    const userRef = adminDb.collection('users').doc(decodedToken.uid)
    const userDoc = await userRef.get()
    const userData = userDoc.data()
    
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Read the NDA document from public folder
    const ndaPath = path.join(process.cwd(), 'public', 'nda-general.pdf')
    const documentBuffer = await fs.readFile(ndaPath)
    
    // Create return URL for after signing
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/docusign/complete-nda-signing?taskId=${taskId}&donationId=${donationId}`
    
    // Try simple token approach first (if configured)
    let accessToken: string
    let accountInfo: { accountId: string; baseUri: string }
    
    try {
      // Try simple access token approach
      accessToken = await getSimpleAccessToken()
      accountInfo = await getAccountInfo(accessToken)
      console.log('Using simple access token approach')
    } catch (simpleError) {
      console.log('Simple token not available, trying JWT:', simpleError)
      
      try {
        // Try JWT authentication (requires consent)
        accessToken = await getAccessToken()
        accountInfo = await getUserAccountInfo(accessToken)
      } catch (jwtError) {
        console.log('JWT auth failed, trying Auth Code flow:', jwtError)
        
        // Fall back to Auth Code flow (if service token is configured)
        try {
          accessToken = await getAccessTokenForUser(decodedToken.uid)
          accountInfo = await getAuthCodeUserInfo(accessToken)
        } catch (authCodeError) {
          console.error('All authentication methods failed')
          throw new Error(
            'DocuSign authentication failed. Please complete setup:\n' +
            '1. Get the authorization code from the consent URL\n' +
            '2. Exchange it using /api/docusign/exchange-code\n' +
            '3. Add DOCUSIGN_ACCESS_TOKEN to .env.local'
          )
        }
      }
    }
    
    const { accountId, baseUri } = accountInfo
    
    // Create the envelope using simple approach
    const signerName = `${userData.firstName} ${userData.lastName}`
    const signerEmail = userData.email
    
    const { envelopeId } = await createSimpleEnvelope(
      accessToken,
      accountId,
      baseUri,
      documentBuffer.toString('base64'),
      signerName,
      signerEmail
    )
    
    // Get embedded signing URL
    const { url: signingUrl } = await getEmbeddedSigningUrl(
      accessToken,
      accountId,
      baseUri,
      envelopeId,
      returnUrl,
      signerEmail,
      signerName
    )
    
    // Store envelope info in Firestore
    await adminDb.collection('docusign_envelopes').doc(envelopeId).set({
      envelopeId,
      taskId,
      donationId,
      userId: decodedToken.uid,
      documentType: 'nda',
      status: 'sent',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })
    
    // Update task with envelope info
    await taskRef.update({
      docuSignEnvelopeId: envelopeId,
      docuSignStatus: 'sent',
      updatedAt: FieldValue.serverTimestamp()
    })
    
    return NextResponse.json({
      success: true,
      envelopeId,
      signingUrl
    })
    
  } catch (error) {
    console.error('Error creating NDA envelope:', error)
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorDetails = {
      message: errorMessage,
      type: error?.constructor?.name || 'UnknownError',
      ...(process.env.NODE_ENV === 'development' && {
        stack: error instanceof Error ? error.stack : undefined,
        fullError: JSON.stringify(error, null, 2)
      })
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create DocuSign envelope',
        details: errorDetails
      },
      { status: 500 }
    )
  }
}