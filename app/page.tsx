'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, DollarSign, Shield, Users } from 'lucide-react'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

// Note: Metadata must be exported from a server component
// Consider creating a separate metadata.ts file or using generateMetadata

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (!loading && user) {
      router.push('/organization')
    }
  }, [user, loading, router])

  // Show nothing while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Redirect is happening, show loading
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${inter.className}`}>
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" role="navigation" aria-label="Main navigation">
          <div className="flex justify-between items-center h-16">
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
                <span className="sr-only">Donate Equity - </span>
                Donate Equity
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link 
                href="/campaigns" 
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
                aria-label="View available campaigns"
              >
                Campaigns
              </Link>
              <Link 
                href="/about" 
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
                aria-label="Learn how the platform works"
              >
                How It Works
              </Link>
              <Link 
                href="/auth/login" 
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
                aria-label="Sign in to your account"
              >
                Sign In
              </Link>
              <Button asChild>
                <Link href="/auth/register" aria-label="Create your account">
                  Get Started
                </Link>
              </Button>
            </div>
            
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="md:hidden"
              aria-label="Open mobile menu"
              aria-expanded="false"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 sm:py-24 lg:py-32 bg-white" aria-labelledby="hero-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-8">
                Pre-commit Equity Donations to{' '}
                <span className="text-blue-600">Nonprofits</span>
              </h2>
              <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                Empower charitable giving by pledging equity upon liquidity events. Connect donors,
                nonprofits, and appraisers in a seamless, secure donation workflow.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                <Button size="lg" asChild>
                  <Link href="/auth/register" aria-label="Start your equity donation journey">
                    Get Started Today
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/campaigns" aria-label="Explore current donation campaigns">
                    Browse Campaigns
                  </Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-600">
                <div className="flex items-center gap-2" role="img" aria-label="Enterprise Security Certified">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Enterprise Security</span>
                </div>
                <div className="flex items-center gap-2" role="img" aria-label="WCAG AA Compliant">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">WCAG AA Compliant</span>
                </div>
                <div className="flex items-center gap-2" role="img" aria-label="SOC 2 Compliant">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">SOC 2 Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-24 bg-gray-50" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 id="features-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                How It Works
              </h3>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Our platform streamlines equity donations through a secure, collaborative workflow 
                built for the modern philanthropic landscape.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {/* Feature 1 */}
              <Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">Equity Commitments</CardTitle>
                  <CardDescription>
                    Pledge stock, options, RSUs, and other equity instruments upon future liquidity
                    events. Set conditions and amounts that work for your specific situation.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 2 */}
              <Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">Secure Workflow</CardTitle>
                  <CardDescription>
                    Enterprise-grade security with role-based access control, encrypted document storage,
                    and comprehensive audit trails for complete transparency and compliance.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Feature 3 */}
              <Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className="text-xl">Collaborative Platform</CardTitle>
                  <CardDescription>
                    Connect donors, nonprofits, and certified appraisers in a streamlined process
                    with shared task lists, real-time communication, and progress tracking.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 sm:py-24 bg-blue-600" aria-labelledby="cta-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 id="cta-heading" className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Make an Impact?
            </h3>
            <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
              Join the platform that&apos;s revolutionizing charitable giving through equity donations.
              Start making a difference with your future liquidity events.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" variant="outline" className="bg-white text-blue-600 border-white hover:bg-gray-50" asChild>
                <Link href="/auth/register" aria-label="Create your account to start donating equity">
                  Create Your Account
                </Link>
              </Button>
              <Button size="lg" variant="ghost" className="border-2 border-white text-white hover:bg-white hover:text-blue-600" asChild>
                <Link href="/campaigns" aria-label="Browse available campaigns to support">
                  Explore Campaigns
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center items-center gap-4 mb-6">
              <Image
                src="/images/bfe92aaa-be90-469e-8668-5d1fc1a34371.png"
                alt="Donate Equity Logo"
                width={280}
                height={80}
                className="h-10 w-auto"
              />
            </div>
            <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
              Empowering charitable giving through innovative equity donation solutions.
              Building the future of philanthropy, one commitment at a time.
            </p>
            <nav className="flex justify-center space-x-8 text-gray-300" aria-label="Footer navigation">
              <Link 
                href="/privacy" 
                className="hover:text-white transition-colors font-medium"
                aria-label="Read our privacy policy"
              >
                Privacy Policy
              </Link>
              <Link 
                href="/terms" 
                className="hover:text-white transition-colors font-medium"
                aria-label="Read our terms of service"
              >
                Terms of Service
              </Link>
              <Link 
                href="/contact" 
                className="hover:text-white transition-colors font-medium"
                aria-label="Contact our support team"
              >
                Contact Us
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  )
}