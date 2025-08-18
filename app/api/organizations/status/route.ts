import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'
import { CustomClaims } from '@/types/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customClaims = authResult.decodedToken.customClaims as CustomClaims
    
    // Check if user has nonprofit admin role
    if (!customClaims?.role || customClaims.role !== 'nonprofit_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    if (!customClaims.organizationId) {
      return NextResponse.json({ error: 'No organization associated with user' }, { status: 400 })
    }

    // Get organization
    const orgDoc = await adminDb.collection('organizations').doc(customClaims.organizationId).get()
    
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