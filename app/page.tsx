export default function Home() {
  return (
    <div className="bg-gradient-to-br from-white via-blue-50/30 to-primary-50/20 min-h-screen">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h2 className="text-xl font-bold text-gray-900">Donate Equity</h2>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="/campaigns" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                Campaigns
              </a>
              <a href="/about" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                How It Works
              </a>
              <a href="/auth/sign-in" className="text-gray-600 hover:text-primary-600 font-medium transition-colors">
                Sign In
              </a>
              <a href="/auth/sign-up" className="btn-primary">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 sm:pt-24 sm:pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6 animate-fade-in">
              Pre-commit Equity Donations to{' '}
              <span className="text-primary-600">Nonprofits</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in">
              Empower charitable giving by pledging equity upon liquidity events. Connect donors,
              nonprofits, and appraisers in a seamless, secure donation workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in">
              <a
                href="/auth/sign-up"
                className="btn-primary px-8 py-3 text-lg font-semibold shadow-custom-lg hover:shadow-custom-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Get Started Today
                <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="/campaigns"
                className="btn-secondary px-8 py-3 text-lg font-semibold hover:shadow-custom-md transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Browse Campaigns
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Enterprise Security
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                WCAG AA Compliant
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-success-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                SOC 2 Compliant
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform streamlines equity donations through a secure, collaborative workflow
            </p>
          </div>

          <div className="grid gap-8 md:gap-12 md:grid-cols-3">
            <div className="text-center group">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 group-hover:bg-primary-200 transition-colors duration-300">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12s-1.536.219-2.121.659c-1.172.879-1.172 2.303 0 3.182l.879.659z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-semibold text-gray-900">Equity Commitments</h3>
              <p className="text-gray-600 leading-relaxed">
                Pledge stock, options, RSUs, and other equity instruments upon future liquidity
                events. Set conditions and amounts that work for your situation.
              </p>
            </div>

            <div className="text-center group">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 group-hover:bg-primary-200 transition-colors duration-300">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.623 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-semibold text-gray-900">Secure Workflow</h3>
              <p className="text-gray-600 leading-relaxed">
                Enterprise-grade security with role-based access control, encrypted document storage,
                and comprehensive audit trails for complete transparency.
              </p>
            </div>

            <div className="text-center group">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 group-hover:bg-primary-200 transition-colors duration-300">
                <svg
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                  />
                </svg>
              </div>
              <h3 className="mb-4 text-xl font-semibold text-gray-900">Collaborative Platform</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect donors, nonprofits, and certified appraisers in a streamlined process
                with shared task lists and real-time communication.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-primary-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Make an Impact?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join the platform that&apos;s revolutionizing charitable giving through equity donations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="/auth/sign-up"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold rounded-lg bg-white text-primary-600 hover:bg-gray-50 transition-colors duration-200 shadow-custom-lg"
            >
              Create Your Account
            </a>
            <a
              href="/campaigns"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold rounded-lg border-2 border-white text-white hover:bg-white hover:text-primary-600 transition-colors duration-200"
            >
              Explore Campaigns
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4">Donate Equity</h3>
            <p className="text-gray-400 mb-6">
              Empowering charitable giving through innovative equity donation solutions
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <a href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="/contact" className="hover:text-white transition-colors">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
