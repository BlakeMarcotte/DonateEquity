import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const visibility = formData.get('visibility') as 'private' | 'organization'
    const organizationId = formData.get('organizationId') as string
    const folderId = formData.get('folderId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    if (!visibility || !['private', 'organization'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility setting' }, { status: 400 })
    }

    // 3. Get user profile for name
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()
    const userName = userData?.displayName || decodedToken.email || 'Unknown User'

    // 4. Upload file to Firebase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name
    const fileType = file.type
    const fileSize = file.size

    // Create storage path based on visibility
    const storagePath = visibility === 'private'
      ? `users/${decodedToken.uid}/files/${Date.now()}_${fileName}`
      : `organizations/${organizationId}/files/${Date.now()}_${fileName}`

    const bucket = adminStorage.bucket()
    const fileRef = bucket.file(storagePath)

    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: fileType,
        metadata: {
          uploadedBy: decodedToken.uid,
          uploadedByName: userName,
          organizationId,
          visibility
        }
      }
    })

    // Make file publicly accessible (with signed URL)
    await fileRef.makePublic()
    const fileUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`

    // 5. Save file metadata to Firestore
    const fileDocument = {
      fileName,
      fileUrl,
      fileSize,
      fileType,
      uploadedBy: decodedToken.uid,
      uploadedByName: userName,
      organizationId,
      visibility,
      folderId: folderId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const docRef = await adminDb.collection('files').add(fileDocument)

    secureLogger.info('File uploaded successfully', {
      fileId: docRef.id,
      fileName,
      uploadedBy: decodedToken.uid,
      visibility,
      organizationId
    })

    return NextResponse.json({
      success: true,
      file: {
        id: docRef.id,
        ...fileDocument
      }
    })
  } catch (error) {
    secureLogger.error('Error uploading file', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
