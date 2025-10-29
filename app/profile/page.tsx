'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { updateProfile } from 'firebase/auth'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import ProfilePictureUpload from '@/components/profile/ProfilePictureUpload'
import {
  User,
  Mail,
  Building2,
  Save,
  Calendar,
  CheckCircle
} from 'lucide-react'

interface UserProfileData {
  displayName: string
  email: string
  phoneNumber: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  bio: string
  title: string
}

// Format phone number as user types
const formatPhoneNumber = (value: string) => {
  // Remove all non-digits
  const phoneNumber = value.replace(/\D/g, '')
  
  // Format as (XXX) XXX-XXXX
  if (phoneNumber.length <= 3) {
    return phoneNumber
  } else if (phoneNumber.length <= 6) {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`
  } else {
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
  }
}

function ProfilePageContent() {
  const { user, userProfile, customClaims, refreshUserData } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [hasChanges, setHasChanges] = useState(false)
  const [organization, setOrganization] = useState<Record<string, unknown> | null>(null)

  const [profileData, setProfileData] = useState<UserProfileData>({
    displayName: '',
    email: '',
    phoneNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    bio: '',
    title: ''
  })

  const fetchOrganization = useCallback(async () => {
    if (!customClaims?.organizationId) return

    try {
      const orgDoc = await getDoc(doc(db, 'organizations', customClaims.organizationId))
      if (orgDoc.exists()) {
        setOrganization({ id: orgDoc.id, ...orgDoc.data() })
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }, [customClaims?.organizationId])

  useEffect(() => {
    if (userProfile && user) {
      setProfileData({
        displayName: userProfile.displayName || '',
        email: user.email || '',
        phoneNumber: userProfile.phoneNumber || '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        },
        bio: '',
        title: ''
      })

      if (customClaims?.organizationId) {
        fetchOrganization()
      }

      setLoading(false)
    }
  }, [userProfile, user, customClaims, fetchOrganization])

  const handleInputChange = (field: string, value: unknown) => {
    setHasChanges(true)
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setProfileData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof UserProfileData] as Record<string, unknown>),
          [child]: value
        }
      }))
    } else {
      setProfileData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleSaveProfile = async () => {
    if (!user || !userProfile) return

    setSaving(true)
    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: profileData.displayName
      })

      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profileData.displayName,
        phoneNumber: profileData.phoneNumber,
        updatedAt: new Date()
      })

      await refreshUserData()
      setHasChanges(false)

      // If coming from tasks page, redirect back
      if (searchParams.get('from') === 'tasks' && customClaims?.role === 'nonprofit_admin') {
        router.push('/tasks')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center space-x-3">
              <User className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage your account information and preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              {/* Profile Summary */}
              <div className="text-center mb-6">
                {user && (
                  <div className="mb-4">
                    <ProfilePictureUpload
                      user={user}
                      currentPhotoURL={userProfile?.photoURL}
                      size="md"
                      onUploadComplete={refreshUserData}
                    />
                  </div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 mt-4">
                  {userProfile?.displayName || 'User'}
                </h3>
                <p className="text-sm text-gray-500 capitalize">
                  {customClaims?.role?.replace('_', ' ')}
                </p>
                {organization && (
                  <p className="text-sm text-blue-600 mt-1">{organization.name as React.ReactNode}</p>
                )}
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{tab.name}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                    {hasChanges && (
                      <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors duration-200"
                      >
                        <Save className="w-4 h-4" />
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={profileData.displayName}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-lg text-gray-900">{profileData.email}</p>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={profileData.phoneNumber}
                        onChange={(e) => {
                          const formatted = formatPhoneNumber(e.target.value)
                          handleInputChange('phoneNumber', formatted)
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        placeholder="(555) 123-4567"
                        maxLength={14}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <p className="text-lg text-gray-900 capitalize">
                          {customClaims?.role?.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    {organization && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Organization
                        </label>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <p className="text-lg text-gray-900">{organization.name as React.ReactNode}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Account Info */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                      <div>
                        <p className="font-medium text-gray-700">Account Created</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="w-4 h-4" />
                          <span>{userProfile?.createdAt?.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Last Updated</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="w-4 h-4" />
                          <span>{userProfile?.updatedAt?.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ProfilePageContent />
    </Suspense>
  )
}