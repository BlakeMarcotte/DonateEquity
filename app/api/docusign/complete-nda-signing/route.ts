import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminStorage } from '@/lib/firebase/admin'
import { getAccessToken, getUserAccountInfo, downloadEnvelopeDocuments } from '@/lib/docusign/api-client'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const event = searchParams.get('event')
    const taskId = searchParams.get('taskId')
    const donationId = searchParams.get('donationId')
    const envelopeId = searchParams.get('envelopeId')
    
    if (!taskId || !donationId) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/donations/${donationId}/tasks?error=missing-params`)
    }
    
    // Handle different DocuSign events
    if (event === 'signing_complete') {
      // Get envelope info from Firestore
      const envelopeQuery = adminDb.collection('docusign_envelopes')
        .where('taskId', '==', taskId)
        .where('donationId', '==', donationId)
        .limit(1)
      
      const envelopeSnapshot = await envelopeQuery.get()
      
      if (envelopeSnapshot.empty) {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/donations/${donationId}/tasks?error=envelope-not-found`)
      }
      
      const envelopeDoc = envelopeSnapshot.docs[0]
      const envelopeData = envelopeDoc.data()
      const actualEnvelopeId = envelopeData.envelopeId
      
      try {
        // Download the signed document
        const accessToken = await getAccessToken()
        const { accountId, baseUri } = await getUserAccountInfo(accessToken)
        const signedDocument = await downloadEnvelopeDocuments(
          accessToken,
          accountId,
          baseUri,
          actualEnvelopeId
        )
        
        // Upload to Firebase Storage
        const fileName = `donations/${donationId}/signed-documents/nda-${Date.now()}.pdf`
        const file = adminStorage.bucket().file(fileName)
        
        await file.save(signedDocument, {
          metadata: {
            contentType: 'application/pdf',
            metadata: {
              taskId,
              donationId,
              envelopeId: actualEnvelopeId,
              documentType: 'nda',
              uploadedBy: envelopeData.userId,
              uploadedAt: new Date().toISOString()
            }
          }
        })
        
        // Get download URL
        const [downloadUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year
        })
        
        // Update envelope status
        await envelopeDoc.ref.update({
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
          signedDocumentUrl: downloadUrl,
          signedDocumentPath: fileName,
          updatedAt: FieldValue.serverTimestamp()
        })
        
        // Complete the task
        const taskRef = adminDb.collection('tasks').doc(taskId)
        const batch = adminDb.batch()
        
        batch.update(taskRef, {
          status: 'completed',
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          docuSignStatus: 'completed',
          completionData: {
            envelopeId: actualEnvelopeId,
            signedDocumentUrl: downloadUrl,
            signedDocumentPath: fileName
          }
        })
        
        // Check for dependent tasks and unblock them
        const tasksQuery = adminDb.collection('tasks').where('donationId', '==', donationId)
        const tasksSnapshot = await tasksQuery.get()
        
        const allTasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        
        // Find tasks that depend on this task
        const dependentTasks = allTasks.filter(task => 
          task.dependencies && task.dependencies.includes(taskId)
        )
        
        // Unblock dependent tasks if all their dependencies are completed
        for (const task of dependentTasks) {
          const allDependenciesCompleted = task.dependencies?.every((depId: string) => {
            const depTask = allTasks.find(t => t.id === depId)
            return depTask?.status === 'completed'
          })
          
          if (allDependenciesCompleted && task.status === 'blocked') {
            const depTaskRef = adminDb.collection('tasks').doc(task.id)
            batch.update(depTaskRef, {
              status: 'pending',
              updatedAt: FieldValue.serverTimestamp()
            })
          }
        }
        
        await batch.commit()
        
        // Redirect back to tasks page with success
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/donations/${donationId}/tasks?success=nda-signed`)
        
      } catch (error) {
        console.error('Error processing signed document:', error)
        
        // Update envelope with error status
        await envelopeDoc.ref.update({
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: FieldValue.serverTimestamp()
        })
        
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/donations/${donationId}/tasks?error=processing-failed`)
      }
      
    } else if (event === 'cancel' || event === 'decline') {
      // Handle cancelled or declined signing
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/donations/${donationId}/tasks?warning=signing-cancelled`)
      
    } else if (event === 'exception' || event === 'session_timeout' || event === 'ttl_expired') {
      // Handle errors
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/donations/${donationId}/tasks?error=signing-error`)
      
    } else {
      // Unknown event - redirect back to tasks
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/donations/${donationId}/tasks`)
    }
    
  } catch (error) {
    console.error('Error in DocuSign callback:', error)
    const donationId = request.nextUrl.searchParams.get('donationId') || ''
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/donations/${donationId}/tasks?error=callback-error`)
  }
}