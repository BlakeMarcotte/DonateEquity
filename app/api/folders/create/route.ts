import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
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

    // 2. Parse request body
    const body = await request.json()
    const { name, visibility, organizationId, parentFolderId } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Folder name is required' }, { status: 400 })
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    if (!visibility || !['private', 'organization'].includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility setting' }, { status: 400 })
    }

    // 3. Create folder document
    const folderDocument = {
      name: name.trim(),
      createdBy: decodedToken.uid,
      organizationId,
      visibility,
      parentFolderId: parentFolderId || null,
      createdAt: new Date().toISOString()
    }

    const docRef = await adminDb.collection('folders').add(folderDocument)

    secureLogger.info('Folder created successfully', {
      folderId: docRef.id,
      folderName: name,
      createdBy: decodedToken.uid,
      visibility,
      organizationId
    })

    return NextResponse.json({
      success: true,
      folder: {
        id: docRef.id,
        ...folderDocument
      }
    })
  } catch (error) {
    secureLogger.error('Error creating folder', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}
