'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Calculator } from 'lucide-react'

export default function CalculatorPage() {
  return (
    <ProtectedRoute requiredRoles={['donor', 'nonprofit_admin']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center space-x-3">
                <Calculator className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Calculator</h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calculator className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Calculator Coming Soon
            </h2>
            <p className="text-lg text-gray-600">
              This is where we will implement the calculator.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
