'use client'

import { useState, useEffect } from 'react'
import { 
  uploadDonationFile, 
  listDonationFiles, 
  deleteDonationFile,
  validateFile,
  UploadProgress,
  FileUploadResult
} from '@/lib/firebase/storage'

export interface DonationFile {
  name: string
  fullPath: string
  url: string
  size: number
  contentType?: string
  timeCreated?: string
  updated?: string
  customMetadata?: { [key: string]: string }
  folder: string
}

export interface FileUpload {
  file: File
  progress: UploadProgress
  result?: FileUploadResult
  error?: string
}

export function useDonationFiles(donationId: string | null) {
  const [files, setFiles] = useState<DonationFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploads, setUploads] = useState<Map<string, FileUpload>>(new Map())

  // Load files on mount and when donationId changes
  useEffect(() => {
    if (!donationId) {
      setFiles([])
      setLoading(false)
      return
    }

    loadFiles()
  }, [donationId])

  const loadFiles = async () => {
    if (!donationId) return

    setLoading(true)
    setError(null)

    try {
      // Load files from all folders
      const folders = ['legal', 'financial', 'appraisals', 'signed-documents', 'general'] as const
      const allFiles: DonationFile[] = []

      for (const folder of folders) {
        try {
          const folderFiles = await listDonationFiles(donationId, folder)
          const filesWithFolder = folderFiles.map(file => ({
            ...file,
            folder
          }))
          allFiles.push(...filesWithFolder)
        } catch (err) {
          // Folder might not exist yet, which is fine
          console.log(`No files in ${folder} folder (or folder doesn't exist)`)
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
      console.error('Error loading donation files:', err)
      setError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (
    file: File,
    folder: 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general' = 'general'
  ) => {
    if (!donationId) {
      throw new Error('No donation ID provided')
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const uploadId = `${Date.now()}_${file.name}`
    
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
    
    setUploads(prev => new Map(prev).set(uploadId, uploadData))

    try {
      const result = await uploadDonationFile(
        donationId,
        folder,
        file,
        (progress) => {
          setUploads(prev => {
            const newMap = new Map(prev)
            const existing = newMap.get(uploadId)
            if (existing) {
              newMap.set(uploadId, { ...existing, progress })
            }
            return newMap
          })
        }
      )

      // Update upload with result
      setUploads(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(uploadId)
        if (existing) {
          newMap.set(uploadId, { ...existing, result })
        }
        return newMap
      })

      // Refresh file list
      await loadFiles()

      // Clean up upload tracking after success
      setTimeout(() => {
        setUploads(prev => {
          const newMap = new Map(prev)
          newMap.delete(uploadId)
          return newMap
        })
      }, 2000)

      return result
    } catch (err) {
      // Update upload with error
      setUploads(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(uploadId)
        if (existing) {
          newMap.set(uploadId, { 
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
          newMap.delete(uploadId)
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
      console.error('Error deleting file:', err)
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