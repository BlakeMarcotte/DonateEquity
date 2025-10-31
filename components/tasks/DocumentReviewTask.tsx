'use client'

import { Task } from '@/types/task'
import { Button } from '@/components/ui/button'
import { CheckCircle, Download, FolderOpen } from 'lucide-react'
import { useDonationFiles } from '@/hooks/useDonationFiles'
import { formatFileSize, getFileIcon } from '@/lib/firebase/storage'

interface DocumentReviewTaskProps {
  task: Task
  donationId: string
  onApprove: () => void
  isCompleting: boolean
}

export function DocumentReviewTask({
  task,
  donationId,
  onApprove,
  isCompleting
}: DocumentReviewTaskProps) {
  const { loading, getFilesByRole } = useDonationFiles(donationId)

  // Get roles to review from task metadata
  const reviewRoles = (task.metadata?.reviewRoles || []) as Array<'donor' | 'nonprofit' | 'appraiser'>

  // Group files by role
  const filesByRole = reviewRoles.reduce((acc, role) => {
    acc[role] = getFilesByRole(role)
    return acc
  }, {} as Record<string, typeof files>)

  const getRoleName = (role: string) => {
    switch (role) {
      case 'donor':
        return 'Donor'
      case 'nonprofit':
        return 'NonProfit'
      case 'appraiser':
        return 'Appraiser'
      default:
        return role
    }
  }

  const handleDownload = (url: string, fileName: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Loading documents...</p>
      </div>
    )
  }

  const totalFiles = Object.values(filesByRole).flat().length

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <FolderOpen className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900">Review Documents</h4>
            <p className="text-sm text-blue-700 mt-1">
              Please review the documents uploaded by {reviewRoles.map(r => getRoleName(r)).join(' and ')}.
              {totalFiles === 0 && ' No documents have been uploaded yet.'}
            </p>
          </div>
        </div>
      </div>

      {/* Files grouped by role */}
      <div className="space-y-6">
        {reviewRoles.map((role) => {
          const roleFiles = filesByRole[role] || []

          if (roleFiles.length === 0) {
            return (
              <div key={role} className="border border-gray-200 rounded-xl p-4">
                <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-gray-400 mr-2" />
                  Files from {getRoleName(role)}
                </h5>
                <p className="text-sm text-gray-500 italic">No files uploaded yet</p>
              </div>
            )
          }

          return (
            <div key={role} className="border border-gray-200 rounded-xl p-4">
              <h5 className="font-semibold text-gray-900 mb-3 flex items-center">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2" />
                Files from {getRoleName(role)} ({roleFiles.length})
              </h5>

              <div className="space-y-2">
                {roleFiles.map((file) => (
                  <div
                    key={file.fullPath}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="text-2xl flex-shrink-0">
                        {getFileIcon(file.contentType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {file.name.replace(/^\d+_/, '')}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          {file.customMetadata?.uploaderName && (
                            <span>• Uploaded by {file.customMetadata.uploaderName}</span>
                          )}
                          {file.timeCreated && (
                            <span>• {new Date(file.timeCreated).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleDownload(file.url, file.name)}
                      variant="outline"
                      size="sm"
                      className="ml-3 flex-shrink-0"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Approve Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <Button
          onClick={onApprove}
          disabled={isCompleting || totalFiles === 0}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-3"
        >
          {isCompleting ? (
            <>
              <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Documents
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
