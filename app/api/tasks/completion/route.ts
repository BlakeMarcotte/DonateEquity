import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { secureLogger } from '@/lib/logging/secure-logger'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Get task completions for this user
    const docRef = adminDb.collection('task_completions').doc(userId)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json({
        success: true,
        completions: {
          onboarding: {},
          campaigns: {}
        }
      })
    }

    return NextResponse.json({
      success: true,
      completions: doc.data() || { onboarding: {}, campaigns: {} }
    })
  } catch (error) {
    secureLogger.error('Error fetching task completions', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to fetch task completions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const body = await request.json()
    const { taskType, taskId, status, campaignId } = body

    // Validate input
    if (!taskType || !taskId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['not_started', 'in_progress', 'complete'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (!['onboarding', 'campaign'].includes(taskType)) {
      return NextResponse.json({ error: 'Invalid task type' }, { status: 400 })
    }

    if (taskType === 'campaign' && !campaignId) {
      return NextResponse.json({ error: 'Campaign ID required for campaign tasks' }, { status: 400 })
    }

    // Update task completion in Firestore
    const docRef = adminDb.collection('task_completions').doc(userId)

    if (taskType === 'onboarding') {
      // First, get the current document to preserve existing data
      const currentDoc = await docRef.get()
      const currentData = currentDoc.exists ? currentDoc.data() : {}

      // Build the proper nested structure
      const updatedOnboarding = {
        ...((currentData?.onboarding as Record<string, string>) || {}),
        [taskId]: status
      }

      await docRef.set({
        onboarding: updatedOnboarding,
        campaigns: currentData?.campaigns || {},
        updatedAt: new Date()
      }, { merge: true })

      secureLogger.info('Updated onboarding task', {
        userId,
        taskId,
        status,
        updatedOnboarding
      })
    } else if (taskType === 'campaign') {
      // First, get the current document to preserve existing data
      const currentDoc = await docRef.get()
      const currentData = currentDoc.exists ? currentDoc.data() : {}

      // Build the proper nested structure for campaigns
      const currentCampaigns = (currentData?.campaigns as Record<string, Record<string, string>>) || {}
      const campaignData = currentCampaigns[campaignId] || {}

      await docRef.set({
        onboarding: currentData?.onboarding || {},
        campaigns: {
          ...currentCampaigns,
          [campaignId]: {
            ...campaignData,
            [taskId]: status
          }
        },
        updatedAt: new Date()
      }, { merge: true })
    }

    secureLogger.info('Task completion updated', {
      userId,
      taskType,
      taskId,
      status,
      campaignId
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    secureLogger.error('Error updating task completion', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Failed to update task completion' }, { status: 500 })
  }
}
