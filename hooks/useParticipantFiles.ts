'use client'

import { useState, useEffect } from 'react'
import { 
  uploadDonationFile, 
  listParticipantFiles, 
  deleteDonationFile,
  validateFile,
  UploadProgress,
  FileUploadResult
} from '@/lib/firebase/storage'

export interface ParticipantFile {
  name: string
  fullPath: string
  url: string
  size: number
  contentType?: string
  timeCreated?: string
  updated?: string
  customMetadata?: { [key: string]: string }
  folder: string
  source: 'participant' | 'donation'
}

export interface FileUpload {
  file: File
  progress: UploadProgress
  result?: FileUploadResult
  error?: string
}

export function useParticipantFiles(participantId: string | null, donationId?: string | null) {
  const [files, setFiles] = useState<ParticipantFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploads, setUploads] = useState<Map<string, FileUpload>>(new Map())

  // Load files on mount and when participantId changes
  useEffect(() => {
    if (!participantId) {
      setFiles([])
      setLoading(false)
      return
    }

    loadFiles()
  }, [participantId, donationId])

  const loadFiles = async () => {
    if (!participantId) return

    setLoading(true)
    setError(null)

    try {
      // Load files from all folders, checking both participant and donation paths
      const folders = ['legal', 'financial', 'appraisals', 'signed-documents', 'general'] as const
      const allFiles: ParticipantFile[] = []

      for (const folder of folders) {
        try {
          const folderFiles = await listParticipantFiles(
            participantId, 
            donationId || undefined, 
            folder
          )
          const filesWithFolder = folderFiles.map(file => ({
            ...file,
            folder
          }))
          allFiles.push(...filesWithFolder)
        } catch (err) {
          // Folder might not exist yet, which is fine
        }
      }

      // Sort by upload date (newest first)
      allFiles.sort((a, b) => {
        const dateA = new Date(a.timeCreated || 0).getTime()
        const dateB = new Date(b.timeCreated || 0).getTime()
        return dateB - dateA
      })

      setFiles(allFiles)
    } catch (err) {
      // Error loading participant files
      setError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (
    file: File,
    folder: 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general' = 'general'
  ) => {
    // For now, still use donation-based upload for user uploads
    // The participant-based storage is primarily for system-generated files like signed documents
    const uploadId = donationId || participantId
    if (!uploadId) {
      throw new Error('No donation ID or participant ID provided')
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const uploadTrackingId = `${Date.now()}_${file.name}`
    
    // Initialize upload tracking
    const uploadData: FileUpload = { 
      file, 
      progress: { 
        bytesTransferred: 0, 
        totalBytes: file.size, 
        progress: 0, 
        state: 'running' 
      } 
    }
    
    setUploads(prev => new Map(prev).set(uploadTrackingId, uploadData))

    try {
      const result = await uploadDonationFile(
        uploadId,
        folder,
        file,
        (progress) => {
          setUploads(prev => {
            const newMap = new Map(prev)
            const existing = newMap.get(uploadTrackingId)
            if (existing) {
              newMap.set(uploadTrackingId, { ...existing, progress })
            }
            return newMap
          })
        }
      )

      // Update upload with result
      setUploads(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(uploadTrackingId)
        if (existing) {
          newMap.set(uploadTrackingId, { ...existing, result })
        }
        return newMap
      })

      // Refresh file list
      await loadFiles()

      // Clean up upload tracking after success
      setTimeout(() => {
        setUploads(prev => {
          const newMap = new Map(prev)
          newMap.delete(uploadTrackingId)
          return newMap
        })
      }, 2000)

      return result
    } catch (err) {
      // Update upload with error
      setUploads(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(uploadTrackingId)
        if (existing) {
          newMap.set(uploadTrackingId, { 
            ...existing, 
            error: err instanceof Error ? err.message : 'Upload failed' 
          })
        }
        return newMap
      })

      // Clean up upload tracking after error
      setTimeout(() => {
        setUploads(prev => {
          const newMap = new Map(prev)
          newMap.delete(uploadTrackingId)
          return newMap
        })
      }, 5000)

      throw err
    }
  }

  const deleteFile = async (filePath: string) => {
    try {
      await deleteDonationFile(filePath)
      await loadFiles() // Refresh file list
    } catch (err) {
      // Error deleting file
      throw err
    }
  }

  const getFilesByFolder = (folder: string) => {
    return files.filter(file => file.folder === folder)
  }

  const getAllFolders = () => {
    const folders = new Set(files.map(file => file.folder))
    return Array.from(folders)
  }

  const getTotalSize = () => {
    return files.reduce((total, file) => total + file.size, 0)
  }

  const getFileCount = () => {
    return files.length
  }

  return {
    files,
    loading,
    error,
    uploads: Array.from(uploads.values()),
    uploadFile,
    deleteFile,
    loadFiles,
    getFilesByFolder,
    getAllFolders,
    getTotalSize,
    getFileCount
  }
}