'use client'

import { useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/contexts/AuthContext'

export default function DebugCampaignData() {
  const { user, customClaims } = useAuth()
  const [results, setResults] = useState<any>({})
  const [campaignId, setCampaignId] = useState('')
  const [loading, setLoading] = useState(false)
  const [permissionTestResults, setPermissionTestResults] = useState<any>(null)

  const debugData = async () => {
    if (!campaignId) return
    setLoading(true)
    const debugResults: any = {}

    try {
      // Check donations
      console.log('Checking donations...')
      const donationsQuery = query(
        collection(db, 'donations'),
        where('campaignId', '==', campaignId)
      )
      const donationsSnapshot = await getDocs(donationsQuery)
      debugResults.donations = {
        count: donationsSnapshot.docs.length,
        data: donationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      }

      // Check campaign_participants
      console.log('Checking campaign_participants...')
      try {
        const participantsQuery = query(
          collection(db, 'campaign_participants'),
          where('campaignId', '==', campaignId)
        )
        const participantsSnapshot = await getDocs(participantsQuery)
        debugResults.campaign_participants = {
          count: participantsSnapshot.docs.length,
          data: participantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }
      } catch (e) {
        debugResults.campaign_participants = { error: e.message }
      }

      // Check campaign_invitations with accepted status
      console.log('Checking accepted campaign_invitations...')
      try {
        const invitationsQuery = query(
          collection(db, 'campaign_invitations'),
          where('campaignId', '==', campaignId),
          where('status', '==', 'accepted')
        )
        const invitationsSnapshot = await getDocs(invitationsQuery)
        debugResults.accepted_invitations = {
          count: invitationsSnapshot.docs.length,
          data: invitationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }
      } catch (e) {
        debugResults.accepted_invitations = { error: e.message }
      }

      // Check campaign_invitations with pending status
      console.log('Checking pending campaign_invitations...')
      try {
        const pendingQuery = query(
          collection(db, 'campaign_invitations'),
          where('campaignId', '==', campaignId),
          where('status', '==', 'pending')
        )
        const pendingSnapshot = await getDocs(pendingQuery)
        debugResults.pending_invitations = {
          count: pendingSnapshot.docs.length,
          data: pendingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }
      } catch (e) {
        debugResults.pending_invitations = { error: e.message }
      }

      // Check tasks
      console.log('Checking tasks...')
      try {
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('donationId', '!=', null)
        )
        const tasksSnapshot = await getDocs(tasksQuery)
        const relevantTasks = tasksSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(task => 
            debugResults.donations.data.some((d: any) => d.id === task.donationId)
          )
        debugResults.tasks = {
          count: relevantTasks.length,
          data: relevantTasks
        }
      } catch (e) {
        debugResults.tasks = { error: e.message }
      }

      // Check campaign
      console.log('Checking campaign...')
      try {
        const campaignQuery = query(
          collection(db, 'campaigns'),
          where('__name__', '==', campaignId)
        )
        const campaignSnapshot = await getDocs(campaignQuery)
        debugResults.campaign = {
          count: campaignSnapshot.docs.length,
          data: campaignSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }
      } catch (e) {
        debugResults.campaign = { error: e.message }
      }

      setResults(debugResults)
    } catch (error) {
      console.error('Debug error:', error)
      debugResults.error = error.message
      setResults(debugResults)
    }
    
    setLoading(false)
  }

  const testPermissions = async () => {
    if (!user) return
    setLoading(true)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/debug/test-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaignId })
      })

      const result = await response.json()
      setPermissionTestResults(result)
    } catch (error) {
      console.error('Permission test error:', error)
      setPermissionTestResults({ error: error.message })
    }
    
    setLoading(false)
  }

  if (!user || customClaims?.role !== 'nonprofit_admin') {
    return <div className="p-8">Access denied. Must be nonprofit admin.</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Campaign Data</h1>
      
      <div className="mb-6">
        <input
          type="text"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          placeholder="Enter Campaign ID"
          className="border rounded px-3 py-2 mr-4 w-96"
        />
        <button
          onClick={debugData}
          disabled={loading || !campaignId}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 mr-2"
        >
          {loading ? 'Loading...' : 'Debug Data'}
        </button>
        <button
          onClick={testPermissions}
          disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Permissions'}
        </button>
      </div>

      {permissionTestResults && (
        <div className="mb-6">
          <div className="bg-red-100 border border-red-200 rounded p-4">
            <h2 className="font-bold text-lg mb-2 text-red-800">Permission Test Results</h2>
            <pre className="text-sm bg-white p-3 rounded overflow-x-auto">
              {JSON.stringify(permissionTestResults, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {Object.keys(results).length > 0 && (
        <div className="space-y-6">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="font-bold text-lg mb-2">User Info</h2>
            <pre className="text-sm overflow-x-auto">
              {JSON.stringify({
                role: customClaims?.role,
                organizationId: customClaims?.organizationId,
                uid: user.uid
              }, null, 2)}
            </pre>
          </div>

          {Object.entries(results).map(([key, value]) => (
            <div key={key} className="bg-white border rounded p-4">
              <h2 className="font-bold text-lg mb-2 capitalize">{key.replace('_', ' ')}</h2>
              <pre className="text-sm bg-gray-50 p-3 rounded overflow-x-auto">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}