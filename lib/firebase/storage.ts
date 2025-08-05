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
    console.log('Uploading buffer to path:', filePath)
    console.log('Buffer size:', buffer.length, 'bytes')
    
    // Upload the buffer directly
    const snapshot = await uploadBytesResumable(storageRef, buffer, {
      contentType,
      customMetadata: {
        uploadedBy: 'system',
        source: 'docusign'
      }
    })
    
    console.log('Buffer upload completed, getting download URL...')
    const downloadURL = await getDownloadURL(snapshot.ref)
    console.log('Download URL obtained:', downloadURL)
    
    return {
      url: downloadURL,
      path: filePath,
      name: fileName,
      size: buffer.length,
      type: contentType,
      uploadedAt: new Date()
    }
  } catch (error) {
    console.error('Buffer upload failed:', error)
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
    console.log('Starting upload to path:', filePath)
    console.log('File details:', { name: file.name, size: file.size, type: file.type })
    
    const uploadTask = uploadBytesResumable(storageRef, file)

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        console.log('Upload progress:', progress + '%')
        onProgress?.({
          bytesTransferred: snapshot.bytesTransferred,
          totalBytes: snapshot.totalBytes,
          progress,
          state: snapshot.state as UploadProgress['state']
        })
      },
      (error) => {
        console.error('Upload failed:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        reject(error)
      },
      async () => {
        try {
          console.log('Upload completed, getting download URL...')
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          console.log('Download URL obtained:', downloadURL)
          resolve({
            url: downloadURL,
            path: filePath,
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date()
          })
        } catch (error) {
          console.error('Error getting download URL:', error)
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
    console.error('Error listing files:', error)
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
    console.error('Error deleting file:', error)
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
    console.error('Error getting file metadata:', error)
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
    console.error('Error updating file metadata:', error)
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