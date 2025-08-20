import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  listAll,
  getMetadata,
  updateMetadata
} from 'firebase/storage'
import { storage } from './config'
import { secureLogger } from '@/lib/logging/secure-logger'

export interface UploadProgress {
  bytesTransferred: number
  totalBytes: number
  progress: number
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error'
}

export interface FileUploadResult {
  url: string
  path: string
  name: string
  size: number
  type: string
  uploadedAt: Date
}

/**
 * Upload a buffer to Firebase Storage for a specific donation (server-side)
 */
export async function uploadDonationBuffer(
  donationId: string,
  folder: 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general',
  buffer: Buffer,
  fileName: string,
  contentType: string = 'application/pdf'
): Promise<FileUploadResult> {
  const fullFileName = `${Date.now()}_${fileName}`
  const filePath = `donations/${donationId}/${folder}/${fullFileName}`
  const storageRef = ref(storage, filePath)

  try {
    secureLogger.info('Uploading buffer to Firebase Storage', {
      filePath,
      bufferSize: buffer.length,
      contentType
    })
    
    // Upload the buffer directly
    const snapshot = await uploadBytesResumable(storageRef, buffer, {
      contentType,
      customMetadata: {
        uploadedBy: 'system',
        source: 'docusign'
      }
    })
    
    const downloadURL = await getDownloadURL(snapshot.ref)
    secureLogger.info('Buffer upload completed successfully', {
      filePath,
      fileName
    })
    
    return {
      url: downloadURL,
      path: filePath,
      name: fileName,
      size: buffer.length,
      type: contentType,
      uploadedAt: new Date()
    }
  } catch (error) {
    secureLogger.error('Buffer upload failed', error, {
      filePath,
      fileName,
      contentType
    })
    throw error
  }
}

/**
 * Upload a file to Firebase Storage for a specific donation
 */
export async function uploadDonationFile(
  donationId: string,
  folder: 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general',
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileUploadResult> {
  const fileName = `${Date.now()}_${file.name}`
  const filePath = `donations/${donationId}/${folder}/${fileName}`
  const storageRef = ref(storage, filePath)

  return new Promise((resolve, reject) => {
    secureLogger.info('Starting file upload', {
      filePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })
    
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress,
          state: snapshot.state as UploadProgress['state']
        })
      },
      (error) => {
        secureLogger.error('File upload failed', error, {
          filePath,
          fileName: file.name,
          errorCode: error.code
        })
        reject(error)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          secureLogger.info('File upload completed successfully', {
            filePath,
            fileName: file.name
          })
          resolve({
            url: downloadURL,
            path: filePath,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date()
          })
        } catch (error) {
          secureLogger.error('Error getting download URL after upload', error, {
            filePath,
            fileName: file.name
          })
          reject(error)
        }
      }
    )
  })
}

/**
 * List all files in a donation folder
 */
export async function listDonationFiles(
  donationId: string,
  folder?: 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general'
) {
  const folderPath = folder 
    ? `donations/${donationId}/${folder}`
    : `donations/${donationId}`
  
  const storageRef = ref(storage, folderPath)
  
  try {
    const result = await listAll(storageRef)
    
    const files = await Promise.all(
      result.items.map(async (itemRef) => {
        const metadata = await getMetadata(itemRef)
        const url = await getDownloadURL(itemRef)
        
        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url,
          size: metadata.size,
          contentType: metadata.contentType,
          timeCreated: metadata.timeCreated,
          updated: metadata.updated,
          customMetadata: metadata.customMetadata
        }
      })
    )

    return files
  } catch (error) {
    secureLogger.error('Error listing donation files', error, {
      donationId,
      folder,
      folderPath
    })
    throw error
  }
}

/**
 * Delete a file from donation storage
 */
export async function deleteDonationFile(filePath: string): Promise<void> {
  const storageRef = ref(storage, filePath)
  
  try {
    await deleteObject(storageRef)
  } catch (error) {
    secureLogger.error('Error deleting file', error, {
      filePath
    })
    throw error
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(filePath: string) {
  const storageRef = ref(storage, filePath)
  
  try {
    return await getMetadata(storageRef)
  } catch (error) {
    secureLogger.error('Error getting file metadata', error, {
      filePath
    })
    throw error
  }
}

/**
 * Update file metadata
 */
export async function updateFileMetadata(
  filePath: string, 
  metadata: { [key: string]: string }
) {
  const storageRef = ref(storage, filePath)
  
  try {
    return await updateMetadata(storageRef, { customMetadata: metadata })
  } catch (error) {
    secureLogger.error('Error updating file metadata', error, {
      filePath,
      metadata
    })
    throw error
  }
}

/**
 * Validate file before upload
 */
export function validateFile(
  file: File,
  maxSizeBytes: number = 50 * 1024 * 1024, // 50MB default
  allowedTypes: string[] = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ]
): { valid: boolean; error?: string } {
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size must be less than ${Math.round(maxSizeBytes / 1024 / 1024)}MB`
    }
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'File type not allowed. Please upload PDF, image, Word document, or text file.'
    }
  }

  return { valid: true }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2)
}

/**
 * Get file icon based on type
 */
export function getFileIcon(contentType: string | undefined): string {
  if (!contentType) return '📄'
  
  if (contentType.includes('pdf')) return '📋'
  if (contentType.includes('image')) return '🖼️'
  if (contentType.includes('word') || contentType.includes('document')) return '📝'
  if (contentType.includes('text')) return '📄'
  
  return '📁'
}