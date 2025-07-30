'use client'

import { NonprofitAdminRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import {
  Building2,
  MapPin,
  Globe,
  Phone,
  Mail,
  Users,
  Edit3,
  Save,
  X,
  FileText,
  Calendar,
  DollarSign
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  type: 'nonprofit' | 'appraiser'
  description: string
  website?: string
  phone?: string
  email: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  taxId?: string
  establishedYear?: number
  adminIds: string[]
  memberIds: string[]
  createdAt: Date
  updatedAt: Date
}

export default function OrganizationPage() {
  const { userProfile, customClaims } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Organization>>({})

  useEffect(() => {
    if (customClaims?.organizationId) {
      fetchOrganization()
    }
  }, [customClaims?.organizationId])

  const fetchOrganization = async () => {
    if (!customClaims?.organizationId) return

    try {
      const orgDoc = await getDoc(doc(db, 'organizations', customClaims.organizationId))
      if (orgDoc.exists()) {
        const data = orgDoc.data()
        const org: Organization = {
          id: orgDoc.id,
          name: data.name,
          type: data.type,
          description: data.description,
          website: data.website,
          phone: data.phone,
          email: data.email,
          address: data.address,
          taxId: data.taxId,
          establishedYear: data.establishedYear,
          adminIds: data.adminIds || [],
          memberIds: data.memberIds || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        }
        setOrganization(org)
        setEditForm(org)
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
    setEditForm(organization || {})
  }

  const handleCancel = () => {
    setEditing(false)
    setEditForm(organization || {})
  }

  const handleSave = async () => {
    if (!organization || !editForm) return

    setSaving(true)
    try {
      const updateData = {
        ...editForm,
        updatedAt: new Date(),
      }
      delete updateData.id
      delete updateData.createdAt

      await updateDoc(doc(db, 'organizations', organization.id), updateData)
      
      setOrganization({ ...organization, ...editForm, updatedAt: new Date() })
      setEditing(false)
    } catch (error) {
      console.error('Error updating organization:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setEditForm(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof Organization] as any),
          [child]: value
        }
      }))
    } else {
      setEditForm(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No organization found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your account is not associated with an organization.
          </p>
        </div>
      </div>
    )
  }

  return (
    <NonprofitAdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Organization</h1>
                    <p className="mt-1 text-sm text-gray-600">
                      Manage your nonprofit organization details
                    </p>
                  </div>
                </div>
                
                {!editing && (
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
                
                {editing && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors duration-200"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Organization Name
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-lg text-gray-900">{organization.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <p className="text-lg text-gray-900 capitalize">{organization.type}</p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    {editing ? (
                      <textarea
                        rows={4}
                        value={editForm.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.description}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax ID
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.taxId || ''}
                        onChange={(e) => handleInputChange('taxId', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.taxId || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Established Year
                    </label>
                    {editing ? (
                      <input
                        type="number"
                        value={editForm.establishedYear || ''}
                        onChange={(e) => handleInputChange('establishedYear', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.establishedYear || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Contact Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="inline w-4 h-4 mr-1" />
                      Email
                    </label>
                    {editing ? (
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="inline w-4 h-4 mr-1" />
                      Phone
                    </label>
                    {editing ? (
                      <input
                        type="tel"
                        value={editForm.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.phone || 'Not provided'}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Globe className="inline w-4 h-4 mr-1" />
                      Website
                    </label>
                    {editing ? (
                      <input
                        type="url"
                        value={editForm.website || ''}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      organization.website ? (
                        <a
                          href={organization.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {organization.website}
                        </a>
                      ) : (
                        <p className="text-gray-900">Not provided</p>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  <MapPin className="inline w-5 h-5 mr-2" />
                  Address
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.address?.street || ''}
                        onChange={(e) => handleInputChange('address.street', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.address?.street || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.address?.city || ''}
                        onChange={(e) => handleInputChange('address.city', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.address?.city || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.address?.state || ''}
                        onChange={(e) => handleInputChange('address.state', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.address?.state || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ZIP Code</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.address?.zipCode || ''}
                        onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.address?.zipCode || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    {editing ? (
                      <input
                        type="text"
                        value={editForm.address?.country || ''}
                        onChange={(e) => handleInputChange('address.country', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{organization.address?.country || 'Not provided'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Members</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {organization.memberIds?.length || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Created</span>
                    </div>
                    <span className="text-sm text-gray-900">
                      {organization.createdAt.toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">Updated</span>
                    </div>
                    <span className="text-sm text-gray-900">
                      {organization.updatedAt.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors duration-200">
                    <DollarSign className="w-4 h-4" />
                    <span>View Financial Reports</span>
                  </button>
                  
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-50 hover:bg-green-100 text-green-600 font-medium rounded-lg transition-colors duration-200">
                    <FileText className="w-4 h-4" />
                    <span>Download Tax Documents</span>
                  </button>
                  
                  <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-600 font-medium rounded-lg transition-colors duration-200">
                    <Users className="w-4 h-4" />
                    <span>Manage Team</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NonprofitAdminRoute>
  )
}