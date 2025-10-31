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
 * Uses role-based path structure: donations/{donationId}/{role}/{fileName}
 */
export async function uploadDonationBuffer(
  donationId: string,
  role: 'donor' | 'nonprofit' | 'appraiser',
  buffer: Buffer,
  fileName: string,
  contentType: string = 'application/pdf',
  uploadedBy?: string,
  uploaderName?: string
): Promise<FileUploadResult> {
  const fullFileName = `${Date.now()}_${fileName}`
  const filePath = `donations/${donationId}/${role}/${fullFileName}`
  const storageRef = ref(storage, filePath)

  try {
    secureLogger.info('Uploading buffer to Firebase Storage', {
      filePath,
      bufferSize: buffer.length,
      contentType,
      role
    })

    // Upload the buffer directly
    const snapshot = await uploadBytesResumable(storageRef, buffer, {
      contentType,
      customMetadata: {
        uploadedBy: uploadedBy || 'system',
        uploadedByRole: role,
        uploadedAt: new Date().toISOString(),
        uploaderName: uploaderName || 'System',
        source: 'docusign'
      }
    })

    const downloadURL = await getDownloadURL(snapshot.ref)
    secureLogger.info('Buffer upload completed successfully', {
      filePath,
      fileName,
      role
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
      contentType,
      role
    })
    throw error
  }
}

/**
 * Upload a file to Firebase Storage for a specific donation
 */
export async function uploadParticipantFile(
  participantId: string,
  folder: 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general',
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileUploadResult> {
  const fileName = `${Date.now()}_${file.name}`
  const filePath = `participants/${participantId}/${folder}/${fileName}`
  const storageRef = ref(storage, filePath)
  
  return new Promise((resolve, reject) => {
    secureLogger.info('Starting participant file upload', {
      filePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      participantId,
      folder
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
        secureLogger.error('Participant file upload failed', error, {
          filePath,
          fileName: file.name,
          participantId,
          folder,
          errorCode: error.code
        })
        reject(error)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          secureLogger.info('Participant file upload completed', {
            filePath,
            fileName: file.name,
            participantId,
            folder
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
            fileName: file.name,
            participantId,
            folder
          })
          reject(error)
        }
      }
    )
  })
}

/**
 * Upload a file to Firebase Storage for a specific donation
 * Uses role-based path structure: donations/{donationId}/{role}/{fileName}
 */
export async function uploadDonationFile(
  donationId: string,
  role: 'donor' | 'nonprofit' | 'appraiser',
  file: File,
  uploadedBy: string,
  uploaderName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileUploadResult> {
  const fileName = `${Date.now()}_${file.name}`
  const filePath = `donations/${donationId}/${role}/${fileName}`
  const storageRef = ref(storage, filePath)

  return new Promise((resolve, reject) => {
    secureLogger.info('Starting file upload', {
      filePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      role,
      uploadedBy
    })

    const uploadTask = uploadBytesResumable(storageRef, file, {
      customMetadata: {
        uploadedBy,
        uploadedByRole: role,
        uploadedAt: new Date().toISOString(),
        uploaderName
      }
    })

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
          errorCode: error.code,
          role
        })
        reject(error)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          secureLogger.info('File upload completed successfully', {
            filePath,
            fileName: file.name,
            role
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
 * Supports role-based paths: donations/{donationId}/{role}
 */
export async function listDonationFiles(
  donationId: string,
  role?: 'donor' | 'nonprofit' | 'appraiser'
) {
  const folderPath = role
    ? `donations/${donationId}/${role}`
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
      role,
      folderPath
    })
    throw error
  }
}

/**
 * List all files from multiple roles in a donation
 */
export async function listDonationFilesByRoles(
  donationId: string,
  roles: Array<'donor' | 'nonprofit' | 'appraiser'>
) {
  const allFiles = []

  for (const role of roles) {
    try {
      const roleFiles = await listDonationFiles(donationId, role)
      const filesWithRole = roleFiles.map(file => ({
        ...file,
        role
      }))
      allFiles.push(...filesWithRole)
    } catch (error) {
      // Role folder might not exist yet, which is fine
      secureLogger.info('No files found for role', { donationId, role })
    }
  }

  return allFiles
}

/**
 * List files for a participant (supports both participant-based and donation-based storage)
 */
export async function listParticipantFiles(
  participantId: string,
  donationId?: string,
  folder?: 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general'
) {
  const allFiles = []
  
  // First, try participant-based storage path
  if (participantId) {
    const participantFolderPath = folder 
      ? `participants/${participantId}/${folder}`
      : `participants/${participantId}`
    
    secureLogger.info('Attempting to list participant files', {
      participantId,
      folder,
      participantFolderPath,
      searchType: folder ? 'specific-folder' : 'all-folders'
    })
    
    const participantStorageRef = ref(storage, participantFolderPath)
    
    try {
      const participantResult = await listAll(participantStorageRef)
      
      secureLogger.info('Storage listing result', {
        participantId,
        folder,
        path: participantFolderPath,
        items: participantResult.items.length,
        prefixes: participantResult.prefixes.length,
        itemNames: participantResult.items.map(item => item.name)
      })
      
      const participantFiles = await Promise.all(
        participantResult.items.map(async (itemRef) => {
          try {
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
              customMetadata: metadata.customMetadata,
              source: 'participant' as const
            }
          } catch (fileError) {
            secureLogger.error('Error processing individual file', fileError, {
              fileName: itemRef.name,
              filePath: itemRef.fullPath
            })
            return null
          }
        })
      )
      
      // Filter out failed files
      const validFiles = participantFiles.filter(file => file !== null)
      allFiles.push(...validFiles)
      
      secureLogger.info('Successfully processed participant files', { 
        participantId, 
        folder, 
        totalFound: participantResult.items.length,
        successfullyProcessed: validFiles.length,
        fileNames: validFiles.map(f => f.name)
      })
    } catch (error) {
      secureLogger.warn('Error listing participant files', { 
        participantId, 
        folder,
        participantFolderPath,
        error: (error as Error).message,
        errorCode: (error as { code?: string }).code || 'unknown'
      })
    }
  }
  
  // Also try donation-based storage path for backward compatibility
  if (donationId) {
    try {
      const donationFiles = await listDonationFiles(donationId, folder)
      const donationFilesWithSource = donationFiles.map(file => ({
        ...file,
        source: 'donation' as const
      }))
      allFiles.push(...donationFilesWithSource)
      secureLogger.info('Found donation-based files', { 
        donationId, 
        folder, 
        count: donationFiles.length 
      })
    } catch (error) {
      secureLogger.info('No donation-based files found', { 
        donationId, 
        folder, 
        error: (error as Error).message 
      })
    }
  }
  
  // Remove duplicates based on file name (prefer participant-based files)
  const uniqueFiles = allFiles.reduce((acc, file) => {
    const existingIndex = acc.findIndex(existing => existing.name === file.name)
    if (existingIndex >= 0) {
      // If we have a participant-based file, keep it over donation-based
      if (file.source === 'participant') {
        acc[existingIndex] = file
      }
    } else {
      acc.push(file)
    }
    return acc
  }, [] as typeof allFiles)
  
  return uniqueFiles
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

/**
 * Upload a profile picture for a user
 */
export async function uploadProfilePicture(
  userId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<FileUploadResult> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are allowed for profile pictures')
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('Profile picture must be less than 5MB')
  }

  const fileName = `profile_${Date.now()}.${file.type.split('/')[1]}`
  const filePath = `users/${userId}/profile/${fileName}`
  const storageRef = ref(storage, filePath)

  return new Promise((resolve, reject) => {
    secureLogger.info('Starting profile picture upload', {
      filePath,
      fileName,
      fileSize: file.size,
      fileType: file.type,
      userId
    })

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: userId,
        uploadType: 'profile_picture'
      }
    })

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
        secureLogger.error('Profile picture upload failed', error, {
          filePath,
          fileName,
          userId,
          errorCode: error.code
        })
        reject(error)
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          secureLogger.info('Profile picture upload completed', {
            filePath,
            fileName,
            userId
          })
          resolve({
            url: downloadURL,
            path: filePath,
            name: fileName,
            size: file.size,
            type: file.type,
            uploadedAt: new Date()
          })
        } catch (error) {
          secureLogger.error('Error getting download URL for profile picture', error, {
            filePath,
            fileName,
            userId
          })
          reject(error)
        }
      }
    )
  })
}

/**
 * Delete a user's profile picture
 */
export async function deleteProfilePicture(userId: string, photoURL: string): Promise<void> {
  try {
    // Extract the path from the photoURL
    const urlObj = new URL(photoURL)
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/)
    if (!pathMatch) {
      throw new Error('Invalid photo URL format')
    }

    const filePath = decodeURIComponent(pathMatch[1])

    // Verify it's a profile picture path
    if (!filePath.startsWith(`users/${userId}/profile/`)) {
      throw new Error('Invalid profile picture path')
    }

    const storageRef = ref(storage, filePath)
    await deleteObject(storageRef)

    secureLogger.info('Profile picture deleted', {
      userId,
      filePath
    })
  } catch (error) {
    secureLogger.error('Error deleting profile picture', error, {
      userId,
      photoURL
    })
    throw error
  }
}