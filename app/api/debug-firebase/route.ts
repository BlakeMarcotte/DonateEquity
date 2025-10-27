import { NextRequest, NextResponse } from 'next/server'
import { getApps } from 'firebase-admin/app'

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY
    const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL
    const hasProjectId = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    const hasFirebaseProjectId = !!process.env.FIREBASE_PROJECT_ID

    // Check if private key format is correct
    const privateKeyPreview = process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50) || 'missing'
    const hasNewlines = process.env.FIREBASE_PRIVATE_KEY?.includes('\\n') || false

    // Check existing Firebase apps
    const existingApps = getApps().length

    // Try to initialize
    let initError = null
    try {
      const { getAdminDb } = await import('@/lib/firebase/admin')
      await getAdminDb().collection('_test').limit(1).get()
    } catch (error) {
      initError = error instanceof Error ? error.message : String(error)
    }

    return NextResponse.json({
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'unknown',
      nodeEnv: process.env.NODE_ENV,
      credentials: {
        hasPrivateKey,
        hasClientEmail,
        hasProjectId,
        hasFirebaseProjectId,
        privateKeyPreview,
        hasNewlines,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'missing',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing',
      },
      firebase: {
        existingApps,
        initError,
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
