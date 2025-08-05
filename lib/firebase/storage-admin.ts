import { getStorage } from 'firebase-admin/storage'
import adminApp from './admin'

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
    console.log('Uploading buffer to admin storage path:', filePath)
    console.log('Buffer size:', buffer.length, 'bytes')
    
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
    
    console.log('Admin storage upload completed, making file public...')
    
    // Make the file publicly accessible
    await file.makePublic()
    
    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`
    
    console.log('Public URL generated:', publicUrl)
    
    return {
      url: publicUrl,
      path: filePath,
      name: fileName,
      size: buffer.length,
      type: contentType,
      uploadedAt: new Date()
    }
  } catch (error) {
    console.error('Admin storage upload failed:', error)
    throw error
  }
}