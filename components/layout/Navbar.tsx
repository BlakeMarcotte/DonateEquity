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
  Settings
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const navigationItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['donor', 'nonprofit_admin', 'appraiser', 'admin']
  },
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
  // Donor specific pages
  {
    name: 'Browse Campaigns',
    href: '/browse',
    icon: Heart,
    roles: ['donor']
  },
  {
    name: 'My Donations',
    href: '/donations',
    icon: BarChart3,
    roles: ['donor']
  },
  // Appraiser specific pages
  {
    name: 'Tasks',
    href: '/tasks',
    icon: FileText,
    roles: ['appraiser']
  },
  {
    name: 'Appraisals',
    href: '/appraisals',
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

  // Don't show navbar on auth pages
  if (pathname?.startsWith('/auth/') || pathname === '/unauthorized') {
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
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname?.startsWith(href)
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">Donate Equity</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = isActiveRoute(item.href)
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/profile"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                pathname === '/profile'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {userProfile?.displayName || user.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole?.replace('_', ' ')}
                </p>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:block">Sign out</span>
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
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

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 pt-2 pb-3 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon
              const isActive = isActiveRoute(item.href)
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
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
              className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-colors duration-200 ${
                pathname === '/profile'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>
          </div>
          
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-900">
                  {userProfile?.displayName || user.email}
                </p>
                <p className="text-sm text-gray-500 capitalize">
                  {userRole?.replace('_', ' ')}
                </p>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}