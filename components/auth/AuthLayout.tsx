'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ReactNode } from 'react'
import { CheckCircle } from 'lucide-react'

/**
 * AuthLayout - Split-screen authentication layout
 * Exact implementation following Equity Compass styling guide
 * Left: Dark blue value proposition section
 * Right: White form section
 */

interface AuthLayoutProps {
  children: ReactNode
  mode: 'login' | 'register'
}

export default function AuthLayout({ children, mode }: AuthLayoutProps) {
  const features = [
    'Enterprise-grade security with end-to-end encryption',
    'Role-based access control for all user types',
    'Comprehensive audit trails and compliance tracking',
    'Real-time collaboration tools for all stakeholders',
    'Professional document management and e-signatures',
    'Automated workflow management and notifications'
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Side - Value Proposition (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-4">
              <Image
                src="/images/bfe92aaa-be90-469e-8668-5d1fc1a34371.png"
                alt="Donate Equity Logo"
                width={280}
                height={80}
                className="h-12 w-auto"
                priority
              />
            </div>
            <p className="text-blue-200 text-sm">
              Professional Equity Donation Platform
            </p>
          </div>

          {/* Main Headline */}
          <div className="mb-12">
            <h2 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              Secure Equity
              <br />
              <span className="text-blue-400">Donation Platform</span>
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed max-w-lg">
              Connect donors, nonprofits, and appraisers in a streamlined workflow 
              built for the modern philanthropic landscape.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4 mb-12">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-300 text-sm leading-relaxed">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap gap-6 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>SOC 2 Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>GDPR Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>99.9% Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Authentication Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        {/* Mobile Logo */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/images/b16c1b84-cf9d-4263-b646-0213ed167e38.png"
              alt="Donate Equity"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <h1 className="text-xl font-bold text-gray-900">
              Donate Equity
            </h1>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 sm:px-12">
          <div className="w-full max-w-md space-y-6">
            {/* Form Header */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {mode === 'login' ? 'Welcome back' : 'Get started'}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <Link
                      href="/auth/register"
                      className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                    >
                      Sign up
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <Link
                      href="/auth/login"
                      className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                    >
                      Sign in
                    </Link>
                  </>
                )}
              </p>
            </div>

            {/* Form Content */}
            <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
              {children}
            </div>

            {/* Additional Links */}
            {mode === 'login' && (
              <div className="text-center mt-4">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200"
                >
                  Forgot your password?
                </Link>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-200">
              <p>
                By continuing, you agree to our{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}