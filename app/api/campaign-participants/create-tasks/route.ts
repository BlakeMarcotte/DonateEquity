import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    const { campaignId, participantId } = await request.json()

    if (!campaignId || !participantId) {
      return NextResponse.json(
        { error: 'Campaign ID and participant ID are required' },
        { status: 400 }
      )
    }

    // Get campaign and participant data
    const [campaignDoc, participantDoc] = await Promise.all([
      adminDb.collection('campaigns').doc(campaignId).get(),
      adminDb.collection('campaign_participants').doc(participantId).get()
    ])

    if (!campaignDoc.exists || !participantDoc.exists) {
      return NextResponse.json(
        { error: 'Campaign or participant not found' },
        { status: 404 }
      )
    }

    const campaignData = campaignDoc.data()
    const participantData = participantDoc.data()

    // Create initial tasks for campaign participant
    const batch = adminDb.batch()
    const tasksToCreate = []

    // Task 1: Donation Commitment Decision
    const commitmentTaskId = `${participantId}_commitment_decision`
    const commitmentTask = {
      id: commitmentTaskId,
      participantId: participantId,
      campaignId: campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Donation Commitment Decision',
      description: 'Choose when you want to make your donation commitment: now or after appraisal.',
      type: 'commitment_decision',
      status: 'pending',
      priority: 'high',
      order: 1,
      dependencies: [],
      metadata: {
        options: [
          {
            id: 'commit_now',
            label: 'Make Commitment Now',
            description: 'I\'m ready to commit to a donation amount now and proceed with the workflow.'
          },
          {
            id: 'commit_after_appraisal',
            label: 'Wait for Appraisal',
            description: 'I want to see the appraisal results before making my commitment decision.'
          }
        ],
        campaignTitle: campaignData.title,
        organizationName: campaignData.organizationName
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    const commitmentTaskRef = adminDb.collection('tasks').doc(commitmentTaskId)
    batch.set(commitmentTaskRef, commitmentTask)
    tasksToCreate.push(commitmentTask)

    // Task 2: Company Information (always needed for appraisal)
    const companyInfoTaskId = `${participantId}_company_info`
    const companyInfoTask = {
      id: companyInfoTaskId,
      participantId: participantId,
      campaignId: campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Provide Company Information',
      description: 'Upload your company information and details for the appraisal process.',
      type: 'document_upload',
      status: 'blocked',
      priority: 'high',
      order: 2,
      dependencies: [commitmentTaskId],
      metadata: {
        documentTypes: ['company_info', 'financial_statements'],
        documentPath: `participants/${participantId}/company_info/`,
        requiresApproval: false
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    const companyInfoTaskRef = adminDb.collection('tasks').doc(companyInfoTaskId)
    batch.set(companyInfoTaskRef, companyInfoTask)
    tasksToCreate.push(companyInfoTask)

    // Task 3: Invite Appraiser
    const inviteAppraiserTaskId = `${participantId}_invite_appraiser`
    const inviteAppraiserTask = {
      id: inviteAppraiserTaskId,
      participantId: participantId,
      campaignId: campaignId,
      donorId: participantData.userId,
      assignedTo: participantData.userId,
      assignedRole: 'donor',
      title: 'Invite Appraiser to Platform',
      description: 'Invite a professional appraiser to conduct your equity valuation.',
      type: 'invitation',
      status: 'blocked',
      priority: 'high',
      order: 3,
      dependencies: [companyInfoTaskId],
      metadata: {
        invitationType: 'appraiser',
        role: 'appraiser'
      },
      comments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: participantData.userId
    }

    const inviteAppraiserTaskRef = adminDb.collection('tasks').doc(inviteAppraiserTaskId)
    batch.set(inviteAppraiserTaskRef, inviteAppraiserTask)
    tasksToCreate.push(inviteAppraiserTask)

    // Execute batch to create all initial tasks
    await batch.commit()

    return NextResponse.json({
      success: true,
      tasksCreated: tasksToCreate.length,
      participantId: participantId,
      message: 'Initial tasks created successfully'
    })

  } catch (error) {
    console.error('Error creating participant tasks:', error)
    return NextResponse.json(
      { error: `Failed to create tasks: ${error.message}` },
      { status: 500 }
    )
  }
}