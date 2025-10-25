import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { secureLogger } from '@/lib/logging/secure-logger'

export async function POST(request: NextRequest) {
  let campaignId: string | undefined
  let userId: string | undefined

  try {
    // Verify authentication and admin role
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    userId = decodedToken.uid

    // Only admins can sync campaign stats
    if (decodedToken.role !== 'admin' && decodedToken.role !== 'nonprofit_admin') {
      return NextResponse.json({ error: 'Access denied: Admin privileges required' }, { status: 403 })
    }

    const body = await request.json()
    campaignId = body.campaignId

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    // Get all donations for this campaign
    const donationsSnapshot = await adminDb
      .collection('donations')
      .where('campaignId', '==', campaignId)
      .get()

    // Calculate actual stats from donations
    let totalAmount = 0
    let donorCount = 0

    donationsSnapshot.forEach(doc => {
      const donation = doc.data()
      totalAmount += donation.amount || 0
      donorCount += 1
    })

    // Update campaign with correct stats
    await adminDb.collection('campaigns').doc(campaignId).update({
      currentAmount: totalAmount,
      donorCount: donorCount,
      updatedAt: FieldValue.serverTimestamp()
    })

    secureLogger.info('Campaign statistics synced', {
      campaignId,
      donorCount,
      totalAmount,
      userId
    })

    return NextResponse.json({
      success: true,
      message: `Campaign statistics synced successfully`,
      stats: {
        donorCount,
        totalAmount
      }
    })

  } catch (error) {
    secureLogger.error('Error syncing campaign stats', error, {
      campaignId,
      userId
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Sync all campaigns
export async function PUT(request: NextRequest) {
  let userId: string | undefined

  try {
    // Verify authentication and admin role
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    userId = decodedToken.uid

    // Only admins can sync all campaign stats
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied: Admin privileges required' }, { status: 403 })
    }

    // Get all campaigns
    const campaignsSnapshot = await adminDb.collection('campaigns').get()
    const syncResults = []

    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaignId = campaignDoc.id

      // Get all donations for this campaign
      const donationsSnapshot = await adminDb
        .collection('donations')
        .where('campaignId', '==', campaignId)
        .get()

      // Calculate actual stats from donations
      let totalAmount = 0
      let donorCount = 0

      donationsSnapshot.forEach(doc => {
        const donation = doc.data()
        totalAmount += donation.amount || 0
        donorCount += 1
      })

      // Update campaign with correct stats
      await adminDb.collection('campaigns').doc(campaignId).update({
        currentAmount: totalAmount,
        donorCount: donorCount,
        updatedAt: FieldValue.serverTimestamp()
      })

      syncResults.push({
        campaignId,
        donorCount,
        totalAmount
      })

      secureLogger.info('Campaign statistics synced', {
        campaignId,
        donorCount,
        totalAmount,
        userId
      })
    }

    secureLogger.info('All campaigns synced', {
      campaignCount: syncResults.length,
      userId
    })

    return NextResponse.json({
      success: true,
      message: `Synced ${syncResults.length} campaigns`,
      results: syncResults
    })

  } catch (error) {
    secureLogger.error('Error syncing all campaign stats', error, {
      userId
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}