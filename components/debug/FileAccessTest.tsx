'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

interface FileAccessTestProps {
  participantId: string
}

export function FileAccessTest({ participantId }: FileAccessTestProps) {
  const [testResult, setTestResult] = useState<{ type: string; result: unknown } | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, customClaims } = useAuth()

  const testAuth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/test-claims', {
        headers: {
          'Authorization': `Bearer ${await user?.getIdToken()}`
        }
      })
      const result = await response.json()
      setTestResult({ type: 'auth', result })
    } catch (error) {
      setTestResult({ 
        type: 'auth', 
        result: { error: error instanceof Error ? error.message : 'Unknown error' } 
      })
    } finally {
      setLoading(false)
    }
  }

  const testFileDebug = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/files/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user?.getIdToken()}`
        },
        body: JSON.stringify({ participantId })
      })
      const result = await response.json()
      setTestResult({ type: 'files', result })
    } catch (error) {
      setTestResult({ 
        type: 'files', 
        result: { error: error instanceof Error ? error.message : 'Unknown error' } 
      })
    } finally {
      setLoading(false)
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return null // Only show in development
  }

  return (
    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
      <h4 className="font-medium text-yellow-900 mb-2">File Access Debug (Dev Only)</h4>
      
      <div className="space-y-2 text-sm">
        <div><strong>User ID:</strong> {user?.uid || 'Not logged in'}</div>
        <div><strong>Email:</strong> {user?.email || 'Unknown'}</div>
        <div><strong>Role:</strong> {customClaims?.role || 'No role'}</div>
        <div><strong>Participant ID:</strong> {participantId}</div>
      </div>

      <div className="flex space-x-2 mt-3">
        <Button
          onClick={testAuth}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          Test Auth Claims
        </Button>
        <Button
          onClick={testFileDebug}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          Test File Access
        </Button>
      </div>

      {testResult && (
        <div className="mt-3 p-3 bg-gray-100 rounded text-xs">
          <div className="font-medium mb-2">
            {testResult.type === 'auth' ? 'Auth Test Result:' : 'File Debug Result:'}
          </div>
          <pre className="whitespace-pre-wrap overflow-auto max-h-40">
            {JSON.stringify(testResult.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}