'use client'

import { useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatFileSize, getFileIcon } from '@/lib/firebase/storage'

interface FileUploadProps {
  onUpload: (file: File, folder: string) => Promise<void>
  disabled?: boolean
  className?: string
  showUploadButton?: boolean
  onFilesChange?: (hasFiles: boolean) => void
}

interface FileUploadRef {
  hasFiles: () => boolean
  triggerUpload: () => Promise<void>
}

const FOLDERS = [
  { value: 'general', label: 'General Documents' },
  { value: 'legal', label: 'Legal Documents' },
  { value: 'financial', label: 'Financial Documents' },
  { value: 'appraisals', label: 'Appraisal Documents' },
  { value: 'signed-documents', label: 'Signed Documents' }
] as const

export const FileUpload = forwardRef<FileUploadRef, FileUploadProps>(({ 
  onUpload, 
  disabled = false, 
  className = '', 
  showUploadButton = true,
  onFilesChange
}, ref) => {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('general')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    hasFiles: () => selectedFiles.length > 0,
    triggerUpload: handleUpload
  }), [selectedFiles.length])

  useEffect(() => {
    onFilesChange?.(selectedFiles.length > 0)
  }, [selectedFiles.length, onFilesChange])

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
    
    if (disabled) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (disabled) return

    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (files: File[]) => {
    setError(null)
    setSelectedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setUploading(true)
    setError(null)

    try {
      for (const file of selectedFiles) {
        await onUpload(file, selectedFolder)
      }
      // Files uploaded successfully - component will close automatically
      setSelectedFiles([])
      setSelectedFolder('general')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Folder Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Upload to folder:
        </label>
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          disabled={disabled || uploading}
          className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
        >
          {FOLDERS.map(folder => (
            <option key={folder.value} value={folder.value}>
              {folder.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 bg-gradient-to-br from-gray-50 to-white
          ${dragActive ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-blue-25 shadow-lg transform scale-105' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-300 hover:shadow-md hover:from-blue-25 hover:to-white'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
          className="hidden"
          disabled={disabled}
        />
        
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Upload className="h-8 w-8 text-white" />
        </div>
        <p className="text-xl font-semibold text-gray-900 mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-600">
          Supports PDF, images, Word documents, and text files up to 50MB
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-red-50 to-red-25 border border-red-200 rounded-xl shadow-sm">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <span className="text-sm font-medium text-red-700">{error}</span>
        </div>
      )}

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-base font-semibold text-gray-900 flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            Selected Files ({selectedFiles.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                    <span className="text-lg">{getFileIcon(file.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(index)
                  }}
                  disabled={uploading}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {showUploadButton && selectedFiles.length > 0 && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-3 font-semibold"
          >
            {uploading ? (
              <>
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload & Complete
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
})

FileUpload.displayName = 'FileUpload'