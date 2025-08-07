import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { authenticateUser } from '@/lib/firebase/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await authenticateUser(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId } = body

    const testResults = {
      user: {
        uid: authResult.user.uid,
        email: authResult.user.email,
        role: authResult.decodedToken?.role,
        organizationId: authResult.decodedToken?.organizationId
      },
      tests: {} as Record<string, unknown>
    }

    // Test 1: Basic collection access
    try {
      console.log('Testing basic campaign_participants access...')
      const basicQuery = query(collection(db, 'campaign_participants'), limit(1))
      const basicSnapshot = await getDocs(basicQuery)
      testResults.tests.basicAccess = {
        success: true,
        count: basicSnapshot.docs.length,
        message: 'Can access campaign_participants collection'
      }
    } catch (error) {
      testResults.tests.basicAccess = {
        success: false,
        error: error instanceof Error ? {
          code: (error as { code?: string }).code,
          message: error.message,
          name: error.name
        } : String(error)
      }
    }

    // Test 2: Campaign-specific query
    if (campaignId) {
      try {
        console.log('Testing campaign-specific query...')
        const campaignQuery = query(
          collection(db, 'campaign_participants'),
          where('campaignId', '==', campaignId)
        )
        const campaignSnapshot = await getDocs(campaignQuery)
        testResults.tests.campaignQuery = {
          success: true,
          count: campaignSnapshot.docs.length,
          message: 'Can query participants for specific campaign',
          data: campaignSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
        }
      } catch (error) {
        testResults.tests.campaignQuery = {
          success: false,
          error: error instanceof Error ? {
            code: (error as { code?: string }).code,
            message: error.message,
            name: error.name
          } : String(error)
        }
      }
    }

    // Test 3: Campaign access
    if (campaignId) {
      try {
        console.log('Testing campaign access...')
        const campaignQuery = query(
          collection(db, 'campaigns'),
          where('__name__', '==', campaignId)
        )
        const campaignSnapshot = await getDocs(campaignQuery)
        testResults.tests.campaignAccess = {
          success: true,
          count: campaignSnapshot.docs.length,
          message: 'Can access campaign document',
          data: campaignSnapshot.docs.map(doc => ({
            id: doc.id,
            organizationId: doc.data().organizationId,
            title: doc.data().title,
            createdBy: doc.data().createdBy
          }))
        }
      } catch (error) {
        testResults.tests.campaignAccess = {
          success: false,
          error: error instanceof Error ? {
            code: (error as { code?: string }).code,
            message: error.message,
            name: error.name
          } : String(error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      results: testResults
    })

  } catch (error) {
    console.error('Error in test permissions:', error)
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? {
          code: (error as { code?: string }).code,
          message: error.message,
          name: error.name
        } : String(error)
      },
      { status: 500 }
    )
  }
}