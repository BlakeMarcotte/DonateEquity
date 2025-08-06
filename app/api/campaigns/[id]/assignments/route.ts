import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { verifyAuthToken } from '@/lib/auth/middleware'
import { CustomClaims } from '@/types/auth'

interface CampaignAssignment {
  id: string
  campaignId: string
  userId: string
  userEmail: string
  userName: string
  userSubrole: string
  assignedBy: string
  assignedAt: Date
  status: 'active' | 'inactive'
}

// GET: Get all assignments for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decodedToken = authResult.decodedToken
    const userClaims = {
      role: decodedToken.role,
      subrole: decodedToken.subrole,
      organizationId: decodedToken.organizationId,
      permissions: decodedToken.permissions
    } as CustomClaims

    if (!userClaims.role || userClaims.role !== 'nonprofit_admin') {
      return NextResponse.json(
        { error: 'Only nonprofit admins can view campaign assignments' },
        { status: 403 }
      )
    }

    if (!userClaims.organizationId) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400 }
      )
    }

    const campaignId = params.id

    // Verify campaign belongs to user's organization
    const campaignDoc = await adminDb.collection('campaigns').doc(campaignId).get()
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = campaignDoc.data()
    if (campaignData?.organizationId !== userClaims.organizationId) {
      return NextResponse.json(
        { error: 'Access denied: Campaign does not belong to your organization' },
        { status: 403 }
      )
    }

    // Get campaign assignments
    const assignmentsSnapshot = await adminDb
      .collection('campaign_assignments')
      .where('campaignId', '==', campaignId)
      .where('status', '==', 'active')
      .orderBy('assignedAt', 'desc')
      .get()

    const assignments = assignmentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      assignedAt: doc.data().assignedAt.toDate()
    })) as CampaignAssignment[]

    return NextResponse.json({
      success: true,
      assignments
    })

  } catch (error) {
    console.error('Error fetching campaign assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaign assignments' },
      { status: 500 }
    )
  }
}

// POST: Assign team members to campaign
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decodedToken = authResult.decodedToken
    const userClaims = {
      role: decodedToken.role,
      subrole: decodedToken.subrole,
      organizationId: decodedToken.organizationId,
      permissions: decodedToken.permissions
    } as CustomClaims

    if (!userClaims.role || userClaims.role !== 'nonprofit_admin') {
      return NextResponse.json(
        { error: 'Only nonprofit admins can assign team members to campaigns' },
        { status: 403 }
      )
    }

    if (!userClaims.organizationId) {
      return NextResponse.json(
        { error: 'User not associated with an organization' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { userIds } = body

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'userIds array is required' },
        { status: 400 }
      )
    }

    const campaignId = params.id

    // Verify campaign belongs to user's organization
    const campaignDoc = await adminDb.collection('campaigns').doc(campaignId).get()
    if (!campaignDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    const campaignData = campaignDoc.data()
    if (campaignData?.organizationId !== userClaims.organizationId) {
      return NextResponse.json(
        { error: 'Access denied: Campaign does not belong to your organization' },
        { status: 403 }
      )
    }

    // Get user details for the assignments
    const userPromises = userIds.map(userId => adminAuth.getUser(userId))
    const users = await Promise.all(userPromises)

    // Verify all users belong to the same organization
    for (const user of users) {
      const userClaims = user.customClaims as CustomClaims
      if (!userClaims?.organizationId || userClaims.organizationId !== userClaims.organizationId) {
        return NextResponse.json(
          { error: `User ${user.email} does not belong to your organization` },
          { status: 400 }
        )
      }
    }

    // Create assignments
    const batch = adminDb.batch()
    const assignmentPromises = users.map(user => {
      const userCustomClaims = user.customClaims as CustomClaims
      const assignmentData = {
        campaignId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || user.email,
        userSubrole: userCustomClaims.subrole || 'member',
        assignedBy: decodedToken.uid,
        assignedAt: new Date(),
        status: 'active'
      }

      const assignmentRef = adminDb.collection('campaign_assignments').doc()
      batch.set(assignmentRef, assignmentData)
      return { id: assignmentRef.id, ...assignmentData }
    })

    await batch.commit()

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${users.length} team member(s) to campaign`,
      assignments: assignmentPromises
    })

  } catch (error) {
    console.error('Error creating campaign assignments:', error)
    return NextResponse.json(
      { error: 'Failed to assign team members to campaign' },
      { status: 500 }
    )
  }
}

// DELETE: Remove assignment from campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authResult = await verifyAuthToken(request)
    if (!authResult.success || !authResult.decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decodedToken = authResult.decodedToken
    const userClaims = {
      role: decodedToken.role,
      subrole: decodedToken.subrole,
      organizationId: decodedToken.organizationId,
      permissions: decodedToken.permissions
    } as CustomClaims

    if (!userClaims.role || userClaims.role !== 'nonprofit_admin') {
      return NextResponse.json(
        { error: 'Only nonprofit admins can remove campaign assignments' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const assignmentId = searchParams.get('assignmentId')

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'assignmentId is required' },
        { status: 400 }
      )
    }

    // Update assignment status to inactive instead of deleting
    await adminDb.collection('campaign_assignments').doc(assignmentId).update({
      status: 'inactive',
      removedAt: new Date(),
      removedBy: decodedToken.uid
    })

    return NextResponse.json({
      success: true,
      message: 'Team member removed from campaign'
    })

  } catch (error) {
    console.error('Error removing campaign assignment:', error)
    return NextResponse.json(
      { error: 'Failed to remove team member from campaign' },
      { status: 500 }
    )
  }
}