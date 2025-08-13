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

    // Get organization
    const orgDoc = await adminDb.collection('organizations').doc(userClaims.organizationId).get()
    
    if (!orgDoc.exists) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const orgData = orgDoc.data()
    
    return NextResponse.json({
      organization: {
        id: orgDoc.id,
        ...orgData,
        createdAt: orgData?.createdAt?.toDate?.(),
        updatedAt: orgData?.updatedAt?.toDate?.()
      }
    })
    
  } catch (error) {
    console.error('Error fetching organization status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}