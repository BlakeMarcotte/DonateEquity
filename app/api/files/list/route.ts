import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'

interface FileData {
  id: string
  visibility: 'private' | 'organization'
  uploadedBy: string
  [key: string]: unknown
}

interface FolderData {
  id: string
  visibility: 'private' | 'organization'
  createdBy: string
  [key: string]: unknown
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)

    // 2. Get user profile to find organization
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()

    if (!userData?.organizationId) {
      return NextResponse.json({ error: 'User not associated with organization' }, { status: 400 })
    }

    const organizationId = userData.organizationId

    // 3. Get folder ID from query params (null for root)
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId') || null

    // 4. Query files - get both private (user's own) and organization-wide files
    const filesSnapshot = await adminDb
      .collection('files')
      .where('organizationId', '==', organizationId)
      .where('folderId', '==', folderId)
      .get()

    const files = filesSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as FileData)
      .filter((file: FileData) => {
        // Include if:
        // 1. File is organization-wide, OR
        // 2. File is private and belongs to current user
        return file.visibility === 'organization' ||
               (file.visibility === 'private' && file.uploadedBy === decodedToken.uid)
      })

    // 5. Query folders - get both private (user's own) and organization-wide folders
    const foldersSnapshot = await adminDb
      .collection('folders')
      .where('organizationId', '==', organizationId)
      .where('parentFolderId', '==', folderId)
      .get()

    const folders = foldersSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as FolderData)
      .filter((folder: FolderData) => {
        // Include if:
        // 1. Folder is organization-wide, OR
        // 2. Folder is private and belongs to current user
        return folder.visibility === 'organization' ||
               (folder.visibility === 'private' && folder.createdBy === decodedToken.uid)
      })

    // 6. Build folder path for breadcrumb navigation
    const folderPath = []
    if (folderId) {
      let currentFolderId = folderId
      while (currentFolderId) {
        const folderDoc = await adminDb.collection('folders').doc(currentFolderId).get()
        if (!folderDoc.exists) break

        const folderData = folderDoc.data()
        folderPath.unshift({
          id: folderDoc.id,
          ...folderData
        })
        currentFolderId = folderData?.parentFolderId || null
      }
    }

    return NextResponse.json({
      files,
      folders,
      folderPath
    })
  } catch (error) {
    secureLogger.error('Error listing files', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    )
  }
}
