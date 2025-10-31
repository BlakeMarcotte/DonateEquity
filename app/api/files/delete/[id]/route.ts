import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    // 2. Get file ID from params
    const { id: fileId } = await params

    // 3. Get file document
    const fileDoc = await adminDb.collection('files').doc(fileId).get()

    if (!fileDoc.exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fileData = fileDoc.data()

    // 4. Verify that the user is the uploader
    if (fileData?.uploadedBy !== decodedToken.uid) {
      return NextResponse.json(
        { error: 'You can only delete files you uploaded' },
        { status: 403 }
      )
    }

    // 5. Delete file from Firebase Storage
    const bucket = adminStorage.bucket()
    const storagePath = fileData?.visibility === 'private'
      ? `users/${decodedToken.uid}/files/`
      : `organizations/${fileData?.organizationId}/files/`

    // Extract filename from URL
    const fileUrl = fileData?.fileUrl as string
    const fileName = fileUrl.split('/').pop()

    if (fileName) {
      try {
        const fileRef = bucket.file(`${storagePath}${fileName}`)
        await fileRef.delete()
      } catch (error) {
        secureLogger.warn('Failed to delete file from storage (may not exist)', {
          fileId,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue anyway - we still want to delete the metadata
      }
    }

    // 6. Delete file metadata from Firestore
    await adminDb.collection('files').doc(fileId).delete()

    secureLogger.info('File deleted successfully', {
      fileId,
      fileName: fileData?.fileName,
      deletedBy: decodedToken.uid
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    secureLogger.error('Error deleting file', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
