import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)

    // Resolve params using await
    const params = await context.params
    const { userId } = params

    // Users can only access their own data unless they're an admin
    if (decodedToken.uid !== userId && decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user document from Firestore
    const userDoc = await adminDb.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userData = userDoc.data()

    // Return user data
    return NextResponse.json({
      uid: userDoc.id,
      ...userData
    })
  } catch (error) {
    secureLogger.error('Error fetching user data', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 })
  }
}
