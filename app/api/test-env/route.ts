import { NextResponse } from 'next/server'

export async function GET() {
  const envCheck = {
    hasFirebaseProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    hasFirebasePrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasFirebaseClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    privateKeyStart: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50) || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
  }

  return NextResponse.json(envCheck)
}
