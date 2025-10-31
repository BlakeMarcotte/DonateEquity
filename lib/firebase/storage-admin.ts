import { getAdminStorage } from './admin'
import { secureLogger } from '@/lib/logging/secure-logger'

export interface ServerFileUploadResult {
  url: string
  path: string
  name: string
  size: number
  type: string
  uploadedAt: Date
}

/**
 * Upload a buffer to Firebase Storage using Firebase Admin SDK (server-side)
 * Uses role-based path structure: donations/{donationId}/{role}/{fileName}
 */
export async function uploadDonationBufferAdmin(
  donationId: string,
  role: 'donor' | 'nonprofit' | 'appraiser',
  buffer: Buffer,
  fileName: string,
  contentType: string = 'application/pdf',
  uploadedBy?: string,
  uploaderName?: string
): Promise<ServerFileUploadResult> {
  const storage = getAdminStorage()
  const bucket = storage.bucket()

  const fullFileName = `${Date.now()}_${fileName}`
  const filePath = `donations/${donationId}/${role}/${fullFileName}`

  try {
    secureLogger.info('Uploading buffer to admin storage', {
      filePath,
      bufferSize: buffer.length,
      contentType,
      fileName,
      role
    })

    // Create a file reference
    const file = bucket.file(filePath)

    // Upload the buffer
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          uploadedBy: uploadedBy || 'system',
          uploadedByRole: role,
          uploadedAt: new Date().toISOString(),
          uploaderName: uploaderName || 'System',
          source: 'docusign',
          originalFileName: fileName
        }
      }
    })

    // Don't make file public - let Firebase Storage security rules handle access
    // Frontend will use getDownloadURL() which respects security rules
    // Return the storage path so frontend can construct proper URLs
    const storageUrl = `gs://${bucket.name}/${filePath}`

    secureLogger.info('Admin storage upload completed successfully', {
      filePath,
      fileName,
      role,
      storageUrl
    })

    return {
      url: storageUrl,
      path: filePath,
      name: fileName,
      size: buffer.length,
      type: contentType,
      uploadedAt: new Date()
    }
  } catch (error) {
    secureLogger.error('Admin storage upload failed', error, {
      filePath,
      fileName,
      contentType,
      role
    })
    throw error
  }
}

/**
 * Legacy upload function for backward compatibility with participant-based paths
 * @deprecated Use uploadDonationBufferAdmin with role-based paths instead
 */
export async function uploadParticipantBufferAdmin(
  participantId: string,
  folder: 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general',
  buffer: Buffer,
  fileName: string,
  contentType: string = 'application/pdf'
): Promise<ServerFileUploadResult> {
  const storage = getAdminStorage()
  const bucket = storage.bucket()

  const fullFileName = `${Date.now()}_${fileName}`
  const filePath = `participants/${participantId}/${folder}/${fullFileName}`

  try {
    secureLogger.info('Uploading buffer to admin storage (legacy path)', {
      filePath,
      bufferSize: buffer.length,
      contentType,
      fileName
    })

    const file = bucket.file(filePath)

    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: {
          uploadedBy: 'system',
          source: 'docusign',
          originalFileName: fileName
        }
      }
    })

    const storageUrl = `gs://${bucket.name}/${filePath}`

    secureLogger.info('Admin storage upload completed successfully (legacy)', {
      filePath,
      fileName,
      storageUrl
    })

    return {
      url: storageUrl,
      path: filePath,
      name: fileName,
      size: buffer.length,
      type: contentType,
      uploadedAt: new Date()
    }
  } catch (error) {
    secureLogger.error('Admin storage upload failed (legacy)', error, {
      filePath,
      fileName,
      contentType
    })
    throw error
  }
}