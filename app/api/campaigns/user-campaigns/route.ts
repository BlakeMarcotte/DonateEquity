import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userClaims = authResult.decodedToken
    
    // Check if user has nonprofit admin role
    if (!userClaims.role || userClaims.role !== 'nonprofit_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!userClaims.organizationId) {
      return NextResponse.json({ error: 'No organization associated with user' }, { status: 400 })
    }

    // Get campaigns for this organization
    const campaignsSnapshot = await adminDb
      .collection('campaigns')
      .where('organizationId', '==', userClaims.organizationId)
      .get()
    
    const campaigns = campaignsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.(),
      updatedAt: doc.data().updatedAt?.toDate?.()
    }))

    return NextResponse.json({
      campaigns,
      count: campaigns.length
    })
    
  } catch (error) {
    console.error('Error fetching user campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}