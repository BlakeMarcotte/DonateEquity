'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function DocuSignSetupPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleExchangeCode = async () => {
    if (!code) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/docusign/exchange-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">DocuSign Setup</h1>
      
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Step 1: Get Authorization Code</h2>
        <p className="mb-4">You already have the authorization code from the consent process:</p>
        <code className="block bg-gray-100 p-3 rounded text-xs break-all">
          eyJ0eXAiOiJNVCIsImFsZyI6IlJTMjU2Iiwia2lkIjoiNjgxODVmZjEtNGU1MS00Y2U5LWFmMWMtNjg5ODEyMjAzMzE3In0...
        </code>
      </Card>

      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Step 2: Exchange Code for Access Token</h2>
        <p className="mb-4">Paste your authorization code below to exchange it for an access token:</p>
        
        <textarea
          className="w-full p-3 border rounded mb-4 font-mono text-sm"
          rows={4}
          placeholder="Paste your authorization code here..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        
        <Button 
          onClick={handleExchangeCode}
          disabled={!code || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? 'Exchanging...' : 'Exchange Code for Token'}
        </Button>
      </Card>

      {result && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Result</h2>
          {result.success ? (
            <>
              <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <p className="text-green-800 font-semibold">Success!</p>
              </div>
              <div className="space-y-2">
                {result.instructions.map((instruction: string, index: number) => (
                  <p key={index} className={instruction.includes('DOCUSIGN_ACCESS_TOKEN') ? 'font-mono bg-gray-100 p-2 rounded' : ''}>
                    {instruction}
                  </p>
                ))}
              </div>
              {result.tokenInfo && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <p className="text-sm">
                    <strong>Token Type:</strong> {result.tokenInfo.tokenType}<br />
                    <strong>Expires In:</strong> {result.tokenInfo.expiresIn} seconds ({Math.round(result.tokenInfo.expiresIn / 3600)} hours)
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800">Error: {result.error}</p>
              {result.details && (
                <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(result.details, null, 2)}</pre>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}