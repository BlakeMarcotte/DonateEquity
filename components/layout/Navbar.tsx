'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import {
  Building2,
  Heart,
  Calculator,
  FileText,
  User,
  Menu,
  X,
  LogOut,
  Home,
  BarChart3,
  Users,
  Settings,
} from 'lucide-react'
import NotificationBell from '@/components/notifications/NotificationBell'
import { useDonorCampaign } from '@/hooks/useDonorCampaign'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const navigationItems: NavItem[] = [
  // Nonprofit Admin specific pages
  {
    name: 'Organization',
    href: '/organization',
    icon: Building2,
    roles: ['nonprofit_admin']
  },
  {
    name: 'Campaigns',
    href: '/campaigns',
    icon: Heart,
    roles: ['nonprofit_admin']
  },
  {
    name: 'Calculator',
    href: '/calculator',
    icon: Calculator,
    roles: ['nonprofit_admin']
  },
  {
    name: 'Resources',
    href: '/resources',
    icon: FileText,
    roles: ['nonprofit_admin']
  },
  // Appraiser specific pages
  {
    name: 'Dashboard',
    href: '/appraiser',
    icon: Home,
    roles: ['appraiser']
  },
  {
    name: 'My Donations',
    href: '/appraiser/donations',
    icon: Heart,
    roles: ['appraiser']
  },
  {
    name: 'My Tasks',
    href: '/appraiser/tasks',
    icon: FileText,
    roles: ['appraiser']
  },
  {
    name: 'Assignments',
    href: '/appraiser/assignments',
    icon: Users,
    roles: ['appraiser']
  },
  {
    name: 'Reports',
    href: '/appraiser/reports',
    icon: BarChart3,
    roles: ['appraiser']
  },
  // Admin specific pages
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    roles: ['admin']
  },
  {
    name: 'System',
    href: '/admin/system',
    icon: Settings,
    roles: ['admin']
  }
]

export default function Navbar() {
  const { user, userProfile, customClaims, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { campaign } = useDonorCampaign()

  // Don't show navbar on auth pages or landing page
  if (pathname?.startsWith('/auth/') || pathname === '/unauthorized' || pathname === '/') {
    return null
  }

  // Don't show navbar if user is not authenticated
  if (!user || loading) {
    return null
  }

  const userRole = customClaims?.role

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter(item =>
    userRole && item.roles.includes(userRole)
  )

  const handleLogout = async () => {
    try {
      const { signOut } = await import('@/lib/firebase/auth')
      await signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isActiveRoute = (href: string) => {
    if (href === '/appraiser') {
      return pathname === '/appraiser'
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Left Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200 hidden lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex items-center px-6 py-4 border-b border-gray-200">
          <Link href={userRole === 'donor' ? '/my-campaign' : '/organization'} className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Donate Equity</span>
          </Link>
        </div>

        {/* Campaign Info for Donors */}
        {userRole === 'donor' && campaign && (
          <div className="px-4 py-4 border-b border-gray-200">
            <Link
              href="/my-campaign"
              className={`flex flex-col space-y-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                pathname === '/my-campaign'
                  ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                Your Campaign
              </div>
              <div className={`font-semibold truncate ${
                pathname === '/my-campaign' ? 'text-blue-600' : 'text-gray-900'
              }`}>
                {campaign.title}
              </div>
              {campaign.organizationName && (
                <div className={`text-xs truncate ${
                  pathname === '/my-campaign' ? 'text-blue-500' : 'text-gray-500'
                }`}>
                  {campaign.organizationName}
                </div>
              )}
            </Link>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 flex flex-col px-4 py-6 space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = isActiveRoute(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            )
          })}
          
          <Link
            href="/profile"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
              pathname === '/profile'
                ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <User className="w-5 h-5" />
            <span>Profile</span>
          </Link>
        </div>

        {/* User Menu */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userProfile?.displayName || user.email}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {userRole?.replace('_', ' ')}
              </p>
            </div>
            <NotificationBell />
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href={userRole === 'donor' ? '/my-campaign' : '/organization'} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-gray-900">Donate Equity</span>
            </Link>
            
            <div className="flex items-center space-x-2">
              <NotificationBell />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white shadow-xl">
              <div className="flex items-center px-4 py-4 border-b border-gray-200">
                <Link href={userRole === 'donor' ? '/my-campaign' : '/organization'} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-bold text-xl text-gray-900">Donate Equity</span>
                </Link>
              </div>
              
              {/* Campaign Info for Donors - Mobile */}
              {userRole === 'donor' && campaign && (
                <div className="px-4 py-4 border-b border-gray-200">
                  <Link
                    href="/my-campaign"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex flex-col space-y-1 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                      pathname === '/my-campaign'
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                      Your Campaign
                    </div>
                    <div className={`font-semibold truncate ${
                      pathname === '/my-campaign' ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {campaign.title}
                    </div>
                    {campaign.organizationName && (
                      <div className={`text-xs truncate ${
                        pathname === '/my-campaign' ? 'text-blue-500' : 'text-gray-500'
                      }`}>
                        {campaign.organizationName}
                      </div>
                    )}
                  </Link>
                </div>
              )}
              
              <div className="flex flex-col px-4 py-6 space-y-2">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = isActiveRoute(item.href)
                  
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
                
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                    pathname === '/profile'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span>Profile</span>
                </Link>
              </div>
              
              <div className="px-4 py-4 border-t border-gray-200 mt-auto">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-900 truncate">
                      {userProfile?.displayName || user.email}
                    </p>
                    <p className="text-sm text-gray-500 capitalize">
                      {userRole?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}