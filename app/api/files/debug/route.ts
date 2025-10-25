import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/verify-auth'
import { adminDb, getAdminStorage } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'

/**
 * Diagnostic endpoint to debug file storage and access issues
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = authResult
    const body = await request.json()
    const { participantId, folder } = body

    if (!participantId) {
      return NextResponse.json({ error: 'participantId is required' }, { status: 400 })
    }

    secureLogger.info('File debug requested', {
      participantId,
      folder,
      userId: user?.uid,
      userRole: user?.customClaims?.role
    })

    const storage = getAdminStorage()
    const bucket = storage.bucket()
    
    // Check different possible paths for files
    const pathsToCheck = [
      `participants/${participantId}`,
      `participants/${participantId}/signed-documents`,
      `participants/${participantId}/legal`,
      `participants/${participantId}/financial`,
      `participants/${participantId}/appraisals`,
      `participants/${participantId}/general`,
      `donations/${participantId}`, // Legacy path
      `donations/participants/${participantId}` // Another possible path
    ]

    if (folder) {
      pathsToCheck.unshift(`participants/${participantId}/${folder}`)
    }

    const results = []
    
    for (const path of pathsToCheck) {
      try {
        secureLogger.info(`Checking path: ${path}`)
        
        // List files in this path
        const [files] = await bucket.getFiles({
          prefix: path + '/',
          maxResults: 100
        })

        const fileList = files.map(file => ({
          name: file.name,
          fullPath: file.name,
          size: file.metadata.size || 0,
          contentType: file.metadata.contentType || 'unknown',
          timeCreated: file.metadata.timeCreated || null,
          updated: file.metadata.updated || null,
          customMetadata: file.metadata.metadata || {}
        }))

        results.push({
          path,
          found: true,
          fileCount: fileList.length,
          files: fileList
        })

        secureLogger.info(`Found ${fileList.length} files in path: ${path}`, {
          files: fileList.map(f => f.name)
        })
      } catch (error) {
        results.push({
          path,
          found: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        secureLogger.info(`No files found in path: ${path}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Also check for any tasks with signed documents
    const tasksQuery = await adminDb
      .collection('tasks')
      .where('participantId', '==', participantId)
      .where('type', '==', 'docusign_signature')
      .get()

    const taskInfo = tasksQuery.docs.map(doc => {
      const task = doc.data()
      return {
        id: doc.id,
        status: task.status,
        signedDocumentUrl: task.metadata?.signedDocumentUrl,
        envelopeId: task.metadata?.docuSignEnvelopeId || task.metadata?.envelopeId,
        completedAt: task.completedAt?.toDate?.()?.toISOString() || null
      }
    })

    const summary = {
      participantId,
      folder,
      totalPathsChecked: pathsToCheck.length,
      pathsWithFiles: results.filter(r => r.found && (r.fileCount || 0) > 0).length,
      totalFilesFound: results.reduce((sum, r) => sum + (r.fileCount || 0), 0),
      docusignTasks: taskInfo.length,
      completedDocusignTasks: taskInfo.filter(t => t.status === 'completed').length,
      tasksWithSignedDocs: taskInfo.filter(t => t.signedDocumentUrl).length
    }

    secureLogger.info('File debug summary', summary)

    return NextResponse.json({
      summary,
      pathResults: results,
      taskInfo,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    secureLogger.error('File debug error', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint for quick checks
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')
    
    if (!participantId) {
      return NextResponse.json({ error: 'participantId query parameter required' }, { status: 400 })
    }

    // Quick check of just the signed-documents folder
    const storage = getAdminStorage()
    const bucket = storage.bucket()
    
    const path = `participants/${participantId}/signed-documents`
    
    try {
      const [files] = await bucket.getFiles({
        prefix: path + '/',
        maxResults: 10
      })

      return NextResponse.json({
        participantId,
        path,
        fileCount: files.length,
        files: files.map(file => ({
          name: file.name,
          size: file.metadata.size || 0,
          contentType: file.metadata.contentType || 'unknown',
          timeCreated: file.metadata.timeCreated || null
        }))
      })
    } catch (error) {
      return NextResponse.json({
        participantId,
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
        fileCount: 0,
        files: []
      })
    }
  } catch (error) {
    return NextResponse.json({
      error: 'Quick debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}