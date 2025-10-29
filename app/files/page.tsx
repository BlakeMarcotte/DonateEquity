'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Upload,
  Folder,
  File,
  Trash2,
  Download,
  Plus,
  FolderPlus,
  Lock,
  Users,
  ChevronRight,
  Home
} from 'lucide-react'
import { secureLogger } from '@/lib/logging/secure-logger'
import PageErrorBoundary from '@/components/error/PageErrorBoundary'
import { Modal } from '@/components/ui/modal'

interface FileDocument {
  id: string
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  uploadedBy: string
  uploadedByName: string
  organizationId: string
  visibility: 'private' | 'organization'
  folderId: string | null
  createdAt: string
  updatedAt: string
}

interface FolderDocument {
  id: string
  name: string
  createdBy: string
  organizationId: string
  visibility: 'private' | 'organization'
  parentFolderId: string | null
  createdAt: string
}

function FilesPage() {
  const { user, userProfile, loading: authLoading } = useAuth()
  const [files, setFiles] = useState<FileDocument[]>([])
  const [folders, setFolders] = useState<FolderDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'organization'>('organization')
  const [dragActive, setDragActive] = useState(false)
  const [folderPath, setFolderPath] = useState<FolderDocument[]>([])

  const loadFiles = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()

      const response = await fetch(`/api/files/list?folderId=${currentFolderId || ''}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load files')
      }

      const data = await response.json()
      setFiles(data.files || [])
      setFolders(data.folders || [])
      setFolderPath(data.folderPath || [])
    } catch (error) {
      secureLogger.error('Error loading files', error instanceof Error ? error : new Error(String(error)))
    } finally {
      setLoading(false)
    }
  }, [user, currentFolderId])

  useEffect(() => {
    if (!authLoading && user) {
      loadFiles()
    }
  }, [authLoading, user, loadFiles])

  const handleFileUpload = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0 || !user || !userProfile) return

    try {
      setUploading(true)
      const token = await user.getIdToken()

      for (const file of Array.from(selectedFiles)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('visibility', visibility)
        formData.append('organizationId', userProfile.organizationId)
        if (currentFolderId) {
          formData.append('folderId', currentFolderId)
        }

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }
      }

      setShowUploadModal(false)
      await loadFiles()
    } catch (error) {
      secureLogger.error('Error uploading files', error instanceof Error ? error : new Error(String(error)))
      alert('Failed to upload files. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!user) return
    if (!confirm('Are you sure you want to delete this file?')) return

    try {
      const token = await user.getIdToken()

      const response = await fetch(`/api/files/delete/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      await loadFiles()
    } catch (error) {
      secureLogger.error('Error deleting file', error instanceof Error ? error : new Error(String(error)))
      alert('Failed to delete file. Please try again.')
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user || !userProfile) return

    try {
      const token = await user.getIdToken()

      const response = await fetch('/api/folders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newFolderName,
          visibility,
          organizationId: userProfile.organizationId,
          parentFolderId: currentFolderId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create folder')
      }

      setNewFolderName('')
      setShowNewFolderModal(false)
      await loadFiles()
    } catch (error) {
      secureLogger.error('Error creating folder', error instanceof Error ? error : new Error(String(error)))
      alert('Failed to create folder. Please try again.')
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Please log in to access files.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Files</h1>
          <p className="mt-2 text-gray-600">
            Upload and manage your organization&apos;s files and documents
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center space-x-2 text-sm">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
          {folderPath.map((folder) => (
            <div key={folder.id} className="flex items-center space-x-2">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => setCurrentFolderId(folder.id)}
                className="text-blue-600 hover:text-blue-700"
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Files</span>
          </button>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FolderPlus className="w-5 h-5" />
            <span>New Folder</span>
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        )}

        {/* Files and Folders Grid */}
        {!loading && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {folders.length === 0 && files.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No files or folders</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by uploading files or creating a folder.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {/* Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <Folder className="w-6 h-6 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{folder.name}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {folder.visibility === 'private' ? (
                            <Lock className="w-3 h-3 text-gray-400" />
                          ) : (
                            <Users className="w-3 h-3 text-gray-400" />
                          )}
                          <p className="text-xs text-gray-500">
                            {folder.visibility === 'private' ? 'Only Me' : 'Organization'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Files */}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <File className="w-6 h-6 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1">
                            {file.visibility === 'private' ? (
                              <Lock className="w-3 h-3 text-gray-400" />
                            ) : (
                              <Users className="w-3 h-3 text-gray-400" />
                            )}
                            <p className="text-xs text-gray-500">
                              {file.visibility === 'private' ? 'Only Me' : 'Organization'}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500">{formatFileSize(file.fileSize)}</p>
                          <p className="text-xs text-gray-500">
                            Uploaded by {file.uploadedByName}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <a
                        href={file.fileUrl}
                        download={file.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="w-5 h-5" />
                      </a>
                      {file.uploadedBy === user.uid && (
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Modal */}
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Upload Files"
          size="md"
        >
          {/* Visibility Toggle */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Visibility
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setVisibility('organization')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border ${
                  visibility === 'organization'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Organization</span>
              </button>
              <button
                onClick={() => setVisibility('private')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border ${
                  visibility === 'private'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Only Me</span>
              </button>
            </div>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              Drag and drop files here, or
            </p>
            <label className="mt-2 inline-block cursor-pointer">
              <span className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                browse to upload
              </span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
                disabled={uploading}
              />
            </label>
          </div>

          {uploading && (
            <div className="mt-4 flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-600">Uploading...</span>
            </div>
          )}
        </Modal>

        {/* New Folder Modal */}
        <Modal
          isOpen={showNewFolderModal}
          onClose={() => setShowNewFolderModal(false)}
          title="Create New Folder"
          size="md"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter folder name"
            />
          </div>

          {/* Visibility Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Folder Visibility
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setVisibility('organization')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border ${
                  visibility === 'organization'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Organization</span>
              </button>
              <button
                onClick={() => setVisibility('private')}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border ${
                  visibility === 'private'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Only Me</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowNewFolderModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Folder
            </button>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default function FilesPageWithErrorBoundary() {
  return (
    <PageErrorBoundary pageName="Files">
      <FilesPage />
    </PageErrorBoundary>
  )
}
