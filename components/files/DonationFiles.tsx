'use client'

import { useState } from 'react'
import { useDonationFiles } from '@/hooks/useDonationFiles'
import { useParticipantFiles } from '@/hooks/useParticipantFiles'
import { FileUpload } from './FileUpload'
import { useAuth } from '@/contexts/AuthContext'
import { 
  FolderOpen, 
  Download, 
  Trash2, 
  Upload, 
  Plus, 
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import { formatFileSize, getFileIcon } from '@/lib/firebase/storage'
import { FileAccessTest } from '@/components/debug/FileAccessTest'

interface DonationFilesProps {
  donationId: string
  title?: string
  showUpload?: boolean
  className?: string
}

const FOLDER_LABELS = {
  general: 'General Documents',
  legal: 'Legal Documents', 
  financial: 'Financial Documents',
  appraisals: 'Appraisal Documents',
  'signed-documents': 'Signed Documents'
} as const

export function DonationFiles({ 
  donationId, 
  title = 'Shared Files',
  showUpload = true,
  className = '' 
}: DonationFilesProps) {
  const { customClaims } = useAuth()
  
  // Check if donationId is actually a participant path
  const isParticipantPath = donationId?.startsWith('participants/')
  const participantId = isParticipantPath ? donationId.replace('participants/', '') : null
  const actualDonationId = isParticipantPath ? null : donationId
  
  // Use appropriate hook based on path type
  const donationHook = useDonationFiles(actualDonationId)
  const participantHook = useParticipantFiles(participantId, actualDonationId)
  
  // Select the appropriate hook results
  const { 
    files, 
    loading, 
    error, 
    uploads,
    uploadFile, 
    deleteFile, 
    loadFiles,
    getFilesByFolder,
    getAllFolders,
    getTotalSize,
    getFileCount
  } = isParticipantPath ? participantHook : donationHook

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['general']))
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const handleUpload = async (file: File, folder: string) => {
    try {
      await uploadFile(file, folder as 'legal' | 'financial' | 'appraisals' | 'signed-documents' | 'general')
    } catch (error) {
      // Upload failed
      throw error
    }
  }

  const handleDelete = async (filePath: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return
    }

    setDeletingFile(filePath)
    try {
      await deleteFile(filePath)
    } catch {
      // Delete failed
      alert('Failed to delete file')
    } finally {
      setDeletingFile(null)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (loadFiles) {
        await loadFiles()
      }
    } catch {
      // Refresh failed
    } finally {
      setRefreshing(false)
    }
  }

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folder)) {
        newSet.delete(folder)
      } else {
        newSet.add(folder)
      }
      return newSet
    })
  }

  const canDelete = () => {
    // Allow deletion if user is admin or if they have appropriate role
    return customClaims?.role === 'admin' || 
           customClaims?.role === 'donor' || 
           customClaims?.role === 'nonprofit_admin'
  }

  const getFilteredFiles = () => {
    if (selectedFolder === 'all') return files
    return getFilesByFolder(selectedFolder)
  }

  const getFilesByFolderGrouped = () => {
    const folders = getAllFolders()
    const grouped: { [key: string]: typeof files } = {}
    
    folders.forEach(folder => {
      grouped[folder] = getFilesByFolder(folder)
    })
    
    return grouped
  }

  if (loading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  const content = (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {getFileCount()} files • {formatFileSize(getTotalSize())}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {showUpload && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            )}
          </div>
        </div>

        {/* Upload Progress */}
        {uploads.length > 0 && (
          <div className="mb-6 space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Uploading...</h4>
            {uploads.map((upload, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {upload.file.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round(upload.progress.progress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${upload.progress.progress}%` }}
                  />
                </div>
                {upload.error && (
                  <p className="text-sm text-red-600 mt-1">{upload.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-xs">
            <details>
              <summary className="cursor-pointer font-medium text-blue-900 mb-2">
                Debug Info (Dev Only)
              </summary>
              <div className="space-y-1 text-blue-800">
                <div><strong>Donation ID:</strong> {actualDonationId || 'None'}</div>
                <div><strong>Participant ID:</strong> {participantId || 'None'}</div>
                <div><strong>Path Type:</strong> {isParticipantPath ? 'participant' : 'donation'}</div>
                <div><strong>Storage Path:</strong> {isParticipantPath ? `participants/${participantId}` : `donations/${actualDonationId}`}</div>
                <div><strong>Files Loaded:</strong> {files.length}</div>
                <div><strong>Folders:</strong> {getAllFolders().join(', ') || 'None'}</div>
              </div>
              {participantId && (
                <FileAccessTest participantId={participantId} />
              )}
            </details>
          </div>
        )}

        {/* Filter */}
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Folders</option>
              {getAllFolders().map(folder => (
                <option key={folder} value={folder}>
                  {FOLDER_LABELS[folder as keyof typeof FOLDER_LABELS] || folder}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Files Display */}
        {files.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files yet</h3>
            <p className="text-gray-600 mb-4">
              Upload documents to share them with all donation participants.
            </p>
            {showUpload && (
              <Button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload First File
              </Button>
            )}
          </div>
        ) : selectedFolder === 'all' ? (
          // Grouped by folder view
          <div className="space-y-4">
            {Object.entries(getFilesByFolderGrouped()).map(([folder, folderFiles]) => (
              <div key={folder} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => toggleFolder(folder)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <FolderOpen className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900">
                      {FOLDER_LABELS[folder as keyof typeof FOLDER_LABELS] || folder}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({folderFiles.length} files)
                    </span>
                  </div>
                  <div className="text-gray-400">
                    {expandedFolders.has(folder) ? '−' : '+'}
                  </div>
                </button>
                
                {expandedFolders.has(folder) && (
                  <div className="border-t border-gray-200">
                    {folderFiles.map((file) => (
                      <div key={file.fullPath} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <span className="text-lg">{getFileIcon(file.contentType)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {file.name}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{formatFileSize(file.size)}</span>
                              {file.timeCreated && (
                                <span>
                                  {new Date(file.timeCreated).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(file.url, '_blank')}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const a = document.createElement('a')
                              a.href = file.url
                              a.download = file.name
                              a.click()
                            }}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canDelete() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(file.fullPath, file.name)}
                              disabled={deletingFile === file.fullPath}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              {deletingFile === file.fullPath ? (
                                <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Single folder view
          <div className="space-y-2">
            {getFilteredFiles().map((file) => (
              <div key={file.fullPath} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <span className="text-lg">{getFileIcon(file.contentType)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatFileSize(file.size)}</span>
                      {file.timeCreated && (
                        <span>
                          {new Date(file.timeCreated).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(file.url, '_blank')}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = file.url
                      a.download = file.name
                      a.click()
                    }}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete() && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(file.fullPath, file.name)}
                      disabled={deletingFile === file.fullPath}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      {deletingFile === file.fullPath ? (
                        <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )

  if (className.includes('border-0') || className.includes('shadow-none')) {
    // Embedded mode (like in tabs)
    return (
      <div className={className}>
        {content}
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title="Upload Files"
          size="lg"
        >
          <FileUpload
            onUpload={handleUpload}
            className="max-h-96 overflow-y-auto"
          />
          <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
            <Button
              onClick={() => setShowUploadModal(false)}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </Modal>
      </div>
    )
  }

  // Regular card mode
  return (
    <Card className={className}>
      <div className="p-6">
        {content}
      </div>
      
      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Files"
        size="lg"
      >
        <FileUpload
          onUpload={handleUpload}
          className="max-h-96 overflow-y-auto"
        />
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={() => setShowUploadModal(false)}
            variant="outline"
          >
            Close
          </Button>
        </div>
      </Modal>
    </Card>
  )
}