'use client'

import { useState, useRef } from 'react'
import { Camera, X, Upload, Loader2 } from 'lucide-react'
import { uploadProfilePicture, deleteProfilePicture } from '@/lib/firebase/storage'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { secureLogger } from '@/lib/logging/secure-logger'
import Image from 'next/image'
import type { User } from 'firebase/auth'

interface ProfilePictureUploadProps {
  user: User
  currentPhotoURL?: string | null
  onUploadComplete?: (photoURL: string) => void
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ProfilePictureUpload({
  user,
  currentPhotoURL,
  onUploadComplete,
  disabled = false,
  size = 'md'
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewURL, setPreviewURL] = useState<string | null>(currentPhotoURL || null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40'
  }

  const iconSizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setError(null)
    setUploading(true)
    setUploadProgress(0)

    try {
      // Create preview
      const objectURL = URL.createObjectURL(file)
      setPreviewURL(objectURL)

      // Delete old profile picture if exists
      if (currentPhotoURL) {
        try {
          await deleteProfilePicture(user.uid, currentPhotoURL)
        } catch (deleteError) {
          secureLogger.warn('Could not delete old profile picture', {
            error: deleteError,
            userId: user.uid
          })
          // Continue with upload even if delete fails
        }
      }

      // Upload to Firebase Storage
      const result = await uploadProfilePicture(
        user.uid,
        file,
        (progress) => {
          setUploadProgress(progress.progress)
        }
      )

      // Update Firebase Auth profile
      await updateProfile(user, {
        photoURL: result.url
      })

      // Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, {
        photoURL: result.url,
        updatedAt: new Date()
      })

      // Clean up object URL
      URL.revokeObjectURL(objectURL)

      setPreviewURL(result.url)
      onUploadComplete?.(result.url)

      secureLogger.info('Profile picture updated successfully', {
        userId: user.uid,
        photoURL: result.url
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload profile picture'
      setError(errorMessage)
      setPreviewURL(currentPhotoURL || null)
      secureLogger.error('Profile picture upload error', err, {
        userId: user.uid
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    if (!user || !currentPhotoURL) return

    setError(null)
    setUploading(true)

    try {
      // Delete from storage
      await deleteProfilePicture(user.uid, currentPhotoURL)

      // Update Firebase Auth profile
      await updateProfile(user, {
        photoURL: null
      })

      // Update Firestore user document
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, {
        photoURL: null,
        updatedAt: new Date()
      })

      setPreviewURL(null)
      onUploadComplete?.(null as unknown as string)

      secureLogger.info('Profile picture removed successfully', {
        userId: user.uid
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove profile picture'
      setError(errorMessage)
      secureLogger.error('Profile picture removal error', err, {
        userId: user.uid
      })
    } finally {
      setUploading(false)
    }
  }

  const openFileDialog = () => {
    if (!disabled && !uploading && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Profile Picture Display */}
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden border-4 border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative`}
        >
          {previewURL ? (
            <Image
              src={previewURL}
              alt="Profile"
              fill
              className="object-cover"
              sizes={size === 'sm' ? '80px' : size === 'md' ? '128px' : '160px'}
            />
          ) : (
            <Camera className={`${iconSizeClasses[size]} text-gray-400`} />
          )}

          {/* Upload Progress Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className={`${iconSizeClasses[size]} text-white animate-spin mx-auto mb-1`} />
                {uploadProgress > 0 && (
                  <p className="text-xs text-white font-medium">{Math.round(uploadProgress)}%</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Remove Button */}
        {previewURL && !uploading && !disabled && (
          <button
            onClick={handleRemove}
            className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200"
            title="Remove profile picture"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Upload Button */}
        {!uploading && (
          <button
            onClick={openFileDialog}
            disabled={disabled}
            className="absolute -bottom-1 -right-1 w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Upload profile picture"
          >
            <Upload className="w-5 h-5" />
          </button>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">
          {previewURL ? 'Update profile picture' : 'Add profile picture'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          JPG, PNG or WebP • Max 5MB
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="w-full max-w-xs p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 text-center">{error}</p>
        </div>
      )}
    </div>
  )
}
