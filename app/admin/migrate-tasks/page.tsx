'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function MigrateTasksPage() {
  const { user } = useAuth()
  const [participantId, setParticipantId] = useState('')
  const [migrating, setMigrating] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleMigrate = async () => {
    if (!participantId.trim()) {
      setResult({ success: false, message: 'Please enter a participant ID' })
      return
    }

    setMigrating(true)
    setResult(null)

    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/campaign-participants/migrate-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ participantId: participantId.trim() })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to migrate tasks')
      }

      setResult({ success: true, message: data.message })
      setParticipantId('')
    } catch (err) {
      console.error('Error migrating tasks:', err)
      setResult({ 
        success: false, 
        message: err instanceof Error ? err.message : 'Failed to migrate tasks' 
      })
    } finally {
      setMigrating(false)
    }
  }

  return (
    <ProtectedRoute requiredRoles={['donor']}>
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Migrate Tasks to New 9-Step Structure
            </h1>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800">
                    This tool migrates existing tasks to the new 9-step workflow structure. 
                    Use this if you&apos;re experiencing issues with the &quot;Reset Tasks&quot; button.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    Your participant ID can be found in the URL when viewing your tasks.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="participantId" className="block text-sm font-medium text-gray-700 mb-1">
                  Participant ID
                </label>
                <input
                  type="text"
                  id="participantId"
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  placeholder="e.g., 9oC2tBRnWo1zkpiolwSk_ho5xA5rDSHVgCrFKoUcR9ubPb0K2"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={migrating}
                />
              </div>

              <button
                onClick={handleMigrate}
                disabled={migrating || !participantId.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {migrating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Migrating...
                  </>
                ) : (
                  'Migrate Tasks'
                )}
              </button>

              {result && (
                <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-start">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    )}
                    <p className={`text-sm ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.message}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">What This Does:</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Deletes all existing tasks (both old and new formats)</li>
                <li>Creates the first 3 tasks of the new 9-step workflow</li>
                <li>Preserves your campaign participant connection</li>
                <li>Resets your participant status to allow fresh start</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}