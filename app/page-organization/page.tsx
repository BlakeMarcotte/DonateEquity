'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Eye, User, Building2, Search, Settings } from 'lucide-react'

type Role = 'public' | 'donor' | 'nonprofit' | 'appraiser' | 'admin'

interface PageInfo {
  path: string
  name: string
  description: string
  roles: Role[]
}

const pages: PageInfo[] = [
  // Public Pages
  { path: '/', name: 'Home', description: 'Landing page', roles: ['public'] },
  { path: '/calculator', name: 'Donation Calculator', description: 'Calculate potential donation value', roles: ['public'] },
  { path: '/resources', name: 'Resources', description: 'Educational resources and guides', roles: ['public'] },
  { path: '/auth/login', name: 'Login', description: 'User login page', roles: ['public'] },
  { path: '/auth/sign-in', name: 'Sign In', description: 'Alternative sign in page', roles: ['public'] },
  { path: '/auth/register', name: 'Register', description: 'User registration page', roles: ['public'] },
  { path: '/auth/sign-up', name: 'Sign Up', description: 'Alternative sign up page', roles: ['public'] },
  
  // Donor Pages
  { path: '/profile', name: 'Profile', description: 'User profile settings', roles: ['donor'] },
  { path: '/invitations', name: 'Campaign Invitations', description: 'View and manage campaign invitations', roles: ['donor'] },
  { path: '/donations', name: 'My Donations', description: 'View all donations and their status', roles: ['donor'] },
  { path: '/donations/[id]/tasks', name: 'Donation Tasks', description: 'Tasks for a specific donation (dynamic)', roles: ['donor'] },
  { path: '/campaigns/[id]', name: 'Campaign Details', description: 'View campaign details (dynamic)', roles: ['donor', 'public'] },
  { path: '/campaigns/[id]/donate', name: 'Make Donation', description: 'Donation flow for campaign (dynamic)', roles: ['donor'] },
  
  // Nonprofit Pages
  { path: '/organization', name: 'My Organization', description: 'Organization dashboard and team management', roles: ['nonprofit'] },
  { path: '/my-campaign', name: 'My Campaign', description: 'Create and manage campaigns', roles: ['nonprofit'] },
  { path: '/campaigns', name: 'All Campaigns', description: 'View all organization campaigns', roles: ['nonprofit'] },
  { path: '/campaigns/[id]/participants/[donorId]/tasks', name: 'Participant Tasks', description: 'Manage donor tasks (dynamic)', roles: ['nonprofit'] },
  { path: '/tasks', name: 'Tasks Dashboard', description: 'Organization task management', roles: ['nonprofit'] },
  { path: '/join-team', name: 'Join Team', description: 'Accept team invitation', roles: ['nonprofit'] },
  
  // Appraiser Pages
  { path: '/appraiser', name: 'Appraiser Dashboard', description: 'Main appraiser dashboard', roles: ['appraiser'] },
  { path: '/appraiser/welcome', name: 'Appraiser Welcome', description: 'Onboarding for new appraisers', roles: ['appraiser'] },
  { path: '/appraiser/invitations/[token]', name: 'Appraiser Invitation', description: 'Accept appraiser invitation (dynamic)', roles: ['appraiser'] },
  
  // Admin Pages
  { path: '/admin/migrate-tasks', name: 'Migrate Tasks', description: 'Admin task migration tool', roles: ['admin'] },
  
  // Special Pages
  { path: '/unauthorized', name: 'Unauthorized', description: 'Access denied page', roles: ['public'] },
  { path: '/invite/[token]', name: 'Invitation Handler', description: 'Generic invitation handler (dynamic)', roles: ['public'] },
  { path: '/component-test', name: 'Component Test', description: 'UI component showcase', roles: ['admin'] },
]

export default function UIShowcasePage() {
  const [selectedRole, setSelectedRole] = useState<Role>('public')
  const [searchTerm, setSearchTerm] = useState('')

  const roles: { id: Role; label: string; icon: React.ReactNode; variant: 'default' | 'primary' | 'success' | 'warning' | 'info' }[] = [
    { id: 'public', label: 'Public', icon: <Eye className="w-4 h-4" />, variant: 'default' },
    { id: 'donor', label: 'Donor', icon: <User className="w-4 h-4" />, variant: 'primary' },
    { id: 'nonprofit', label: 'Nonprofit', icon: <Building2 className="w-4 h-4" />, variant: 'success' },
    { id: 'appraiser', label: 'Appraiser', icon: <Search className="w-4 h-4" />, variant: 'warning' },
    { id: 'admin', label: 'Admin', icon: <Settings className="w-4 h-4" />, variant: 'info' },
  ]

  const filteredPages = pages.filter(page => {
    const matchesRole = page.roles.includes(selectedRole)
    const matchesSearch = !searchTerm || 
      page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.path.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesRole && matchesSearch
  })

  const handlePageClick = (path: string) => {
    window.open(path, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">UI Showcase</h1>
          <p className="text-gray-600">
            Browse all pages in the platform organized by user role. Click any page to open it in a new tab.
          </p>
        </div>

        {/* Role Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-3 mb-6">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  selectedRole === role.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role.icon}
                {role.label}
                <Badge 
                  variant={selectedRole === role.id ? 'default' : 'secondary'} 
                  size="sm"
                  className={selectedRole === role.id ? 'bg-blue-700 border-blue-700' : ''}
                >
                  {pages.filter(p => p.roles.includes(role.id)).length}
                </Badge>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Pages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPages.map((page) => (
            <button
              key={page.path}
              onClick={() => handlePageClick(page.path)}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-lg transition-all duration-200 text-left border-2 border-transparent hover:border-blue-500 group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {page.name}
                </h3>
                <Eye className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0 ml-2" />
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                {page.description}
              </p>
              
              <div className="flex items-center justify-between">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">
                  {page.path}
                </code>
                
                <div className="flex gap-1">
                  {page.roles.map(roleId => {
                    const roleInfo = roles.find(r => r.id === roleId)
                    return roleInfo ? (
                      <Badge key={roleId} variant={roleInfo.variant} size="sm">
                        {roleInfo.label}
                      </Badge>
                    ) : null
                  })}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Empty State */}
        {filteredPages.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No pages found</h3>
            <p className="text-gray-600">
              Try adjusting your search or selecting a different role.
            </p>
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            {roles.map(role => (
              <div key={role.id}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  {role.icon}
                  <p className="text-sm font-medium text-gray-600">{role.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {pages.filter(p => p.roles.includes(role.id)).length}
                </p>
                <p className="text-xs text-gray-500">pages</p>
              </div>
            ))}
          </div>
        </div>

        {/* Note about dynamic routes */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">Note about dynamic routes</p>
              <p className="text-sm text-blue-800">
                Pages with <code className="bg-blue-100 px-1 rounded">[id]</code> or <code className="bg-blue-100 px-1 rounded">[token]</code> 
                in the path are dynamic routes. To test these, you&apos;ll need to navigate through the app to access them with real data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
