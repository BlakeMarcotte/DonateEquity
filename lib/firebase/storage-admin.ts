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
 */
export async function uploadDonationBufferAdmin(
  donationId: string,
  folder: 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general',
  buffer: Buffer,
  fileName: string,
  contentType: string = 'application/pdf'
): Promise<ServerFileUploadResult> {
  const storage = getAdminStorage()
  const bucket = storage.bucket()
  
  const fullFileName = `${Date.now()}_${fileName}`
  // Handle both donation-based and participant-based paths
  const filePath = donationId.startsWith('participants/') 
    ? `${donationId}/${folder}/${fullFileName}`
    : `donations/${donationId}/${folder}/${fullFileName}`
  
  try {
    secureLogger.info('Uploading buffer to admin storage', {
      filePath,
      bufferSize: buffer.length,
      contentType,
      fileName
    })
    
    // Create a file reference
    const file = bucket.file(filePath)
    
    // Upload the buffer
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

    // Don't make file public - let Firebase Storage security rules handle access
    // Frontend will use getDownloadURL() which respects security rules
    // Return the storage path so frontend can construct proper URLs
    const storageUrl = `gs://${bucket.name}/${filePath}`

    secureLogger.info('Admin storage upload completed successfully', {
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
    secureLogger.error('Admin storage upload failed', error, {
      filePath,
      fileName,
      contentType
    })
    throw error
  }
}