'use client'

import { useState, useEffect } from 'react'
import {
  uploadDonationFile,
  listDonationFilesByRoles,
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
  role?: 'donor' | 'nonprofit' | 'appraiser'
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
      // Load files from all role-based folders
      const roles: Array<'donor' | 'nonprofit' | 'appraiser'> = ['donor', 'nonprofit', 'appraiser']
      const allFiles = await listDonationFilesByRoles(donationId, roles)

      // Sort by upload date (newest first)
      allFiles.sort((a, b) => {
        const dateA = new Date(a.timeCreated || 0).getTime()
        const dateB = new Date(b.timeCreated || 0).getTime()
        return dateB - dateA
      })

      setFiles(allFiles as DonationFile[])
    } catch (err) {
      // Error loading donation files
      setError('Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const uploadFile = async (
    file: File,
    role: 'donor' | 'nonprofit' | 'appraiser',
    uploadedBy: string,
    uploaderName: string
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
        role,
        file,
        uploadedBy,
        uploaderName,
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
      // Error deleting file
      throw err
    }
  }

  const getFilesByRole = (role: 'donor' | 'nonprofit' | 'appraiser') => {
    return files.filter(file => file.role === role)
  }

  const getAllRoles = () => {
    const roles = new Set(files.map(file => file.role).filter(Boolean))
    return Array.from(roles) as Array<'donor' | 'nonprofit' | 'appraiser'>
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
    getFilesByRole,
    getAllRoles,
    getTotalSize,
    getFileCount
  }
}