'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Eye, User, Building2, Search, Settings, ZoomIn, ZoomOut } from 'lucide-react'

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
  
  // Donor Pages
  { path: '/profile', name: 'Profile', description: 'User profile settings', roles: ['donor'] },
  { path: '/invitations', name: 'Campaign Invitations', description: 'View and manage campaign invitations', roles: ['donor'] },
  { path: '/donations', name: 'My Donations', description: 'View all donations and their status', roles: ['donor'] },
  
  // Nonprofit Pages
  { path: '/organization', name: 'My Organization', description: 'Organization dashboard and team management', roles: ['nonprofit'] },
  { path: '/my-campaign', name: 'My Campaign', description: 'Create and manage campaigns', roles: ['nonprofit'] },
  { path: '/campaigns', name: 'All Campaigns', description: 'View all organization campaigns', roles: ['nonprofit'] },
  { path: '/tasks', name: 'Tasks Dashboard', description: 'Organization task management', roles: ['nonprofit'] },
  
  // Appraiser Pages
  { path: '/appraiser', name: 'Appraiser Dashboard', description: 'Main appraiser dashboard', roles: ['appraiser'] },
  { path: '/appraiser/welcome', name: 'Appraiser Welcome', description: 'Onboarding for new appraisers', roles: ['appraiser'] },
]

export default function UIShowcasePage() {
  const [selectedRole, setSelectedRole] = useState<Role>('public')
  const [scale, setScale] = useState(0.25)

  const roles: { id: Role; label: string; icon: React.ReactNode; variant: 'default' | 'primary' | 'success' | 'warning' | 'info' }[] = [
    { id: 'public', label: 'Public', icon: <Eye className="w-4 h-4" />, variant: 'default' },
    { id: 'donor', label: 'Donor', icon: <User className="w-4 h-4" />, variant: 'primary' },
    { id: 'nonprofit', label: 'Nonprofit', icon: <Building2 className="w-4 h-4" />, variant: 'success' },
    { id: 'appraiser', label: 'Appraiser', icon: <Search className="w-4 h-4" />, variant: 'warning' },
    { id: 'admin', label: 'Admin', icon: <Settings className="w-4 h-4" />, variant: 'info' },
  ]

  const filteredPages = pages.filter(page => page.roles.includes(selectedRole))

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 1))
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.1))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="sticky top-0 z-50 bg-white shadow-md border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">UI Showcase</h1>
              <p className="text-sm text-gray-600">Visual overview of all pages by role</p>
            </div>
            
            {/* Zoom Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleZoomOut}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Zoom out"
              >
                <ZoomOut className="w-5 h-5 text-gray-700" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="flex flex-wrap gap-3">
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
        </div>
      </div>

      {/* Page Previews Grid */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPages.map((page) => (
            <div key={page.path} className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Preview Header */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {page.name}
                  </h3>
                  <a
                    href={page.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Open in new tab"
                  >
                    <Eye className="w-5 h-5 text-blue-600" />
                  </a>
                </div>
                <p className="text-sm text-gray-600 mb-2">{page.description}</p>
                <code className="text-xs bg-white px-2 py-1 rounded text-gray-700 font-mono border border-gray-200">
                  {page.path}
                </code>
              </div>

              {/* Iframe Preview */}
              <div className="bg-gray-100 overflow-hidden" style={{ height: '600px' }}>
                <div 
                  style={{ 
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: `${100 / scale}%`,
                    height: `${100 / scale}%`,
                  }}
                >
                  <iframe
                    src={`${page.path}?preview=true`}
                    className="w-full h-full border-0"
                    title={page.name}
                    sandbox="allow-same-origin allow-scripts allow-forms"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPages.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No pages for this role</h3>
            <p className="text-gray-600">Select a different role to view pages.</p>
          </div>
        )}
      </div>

      {/* Note */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">Live page previews</p>
              <p className="text-sm text-blue-800">
                Each card shows a live preview of the page. Use zoom controls to adjust the preview size. 
                Click the eye icon to open the full page in a new tab. Some pages may require authentication 
                or show loading states in the preview.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
