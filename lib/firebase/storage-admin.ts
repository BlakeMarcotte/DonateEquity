import { getStorage } from 'firebase-admin/storage'
import adminApp from './admin'
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
  const storage = getStorage(adminApp)
  const bucket = storage.bucket()
  
  const fullFileName = `${Date.now()}_${fileName}`
  const filePath = `donations/${donationId}/${folder}/${fullFileName}`
  
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
    
    // Make the file publicly accessible
    await file.makePublic()
    
    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`
    
    secureLogger.info('Admin storage upload completed successfully', {
      filePath,
      fileName
    })
    
    return {
      url: publicUrl,
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