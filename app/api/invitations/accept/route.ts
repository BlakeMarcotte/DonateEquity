import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Invitation Accept API Called ===')
    
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No auth header found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    
    console.log('User token decoded:', { uid: decodedToken.uid, email: decodedToken.email, role: decodedToken.role })
    
    const { invitationId, invitationToken } = await request.json()
    
    if (!invitationId && !invitationToken) {
      return NextResponse.json(
        { error: 'Missing invitation ID or token' },
        { status: 400 }
      )
    }

    // Get the invitation
    let invitationDoc
    if (invitationId) {
      invitationDoc = await adminDb.collection('campaign_invitations').doc(invitationId).get()
    } else {
      // Find by token
      const invitationsQuery = await adminDb
        .collection('campaign_invitations')
        .where('invitationToken', '==', invitationToken)
        .where('status', '==', 'pending')
        .limit(1)
        .get()
      
      if (!invitationsQuery.empty) {
        invitationDoc = invitationsQuery.docs[0]
      }
    }

    if (!invitationDoc || !invitationDoc.exists) {
      console.log('Invitation not found:', { invitationId, invitationToken })
      return NextResponse.json(
        { error: 'Invitation not found or already processed' },
        { status: 404 }
      )
    }

    const invitationData = invitationDoc.data()
    console.log('Invitation data:', { 
      invitedEmail: invitationData.invitedEmail, 
      invitedUserId: invitationData.invitedUserId,
      status: invitationData.status 
    })
    
    // Check if invitation is expired
    if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Get user profile to check email match
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
    const userData = userDoc.data()
    
    console.log('User data:', { 
      userEmail: userData?.email, 
      tokenEmail: decodedToken.email,
      invitedEmail: invitationData.invitedEmail 
    })
    
    // Verify that the user's email matches the invitation email (if no userId is set)
    const userEmail = (userData?.email || decodedToken.email)?.toLowerCase()
    const invitedEmail = invitationData.invitedEmail?.toLowerCase()
    
    if (!invitationData.invitedUserId && userEmail !== invitedEmail) {
      console.log('Email mismatch:', { userEmail, invitedEmail, invitedUserId: invitationData.invitedUserId })
      return NextResponse.json(
        { error: `This invitation was sent to ${invitationData.invitedEmail}, but you're logged in as ${userEmail}` },
        { status: 403 }
      )
    }

    // Update the invitation and create campaign participant record
    const batch = adminDb.batch()
    
    try {
      // Update the invitation
      batch.update(invitationDoc.ref, {
        invitedUserId: decodedToken.uid,
        status: 'accepted',
        respondedAt: new Date(),
        updatedAt: new Date()
      })

      // Create campaign participant record to track donor interest
      const participantRef = adminDb.collection('campaign_participants').doc(`${invitationData.campaignId}_${decodedToken.uid}`)
      batch.set(participantRef, {
        campaignId: invitationData.campaignId,
        userId: decodedToken.uid,
        userRole: 'donor',
        status: 'interested', // interested -> committed -> donated
        joinedAt: new Date(),
        joinedVia: 'invitation',
        invitationId: invitationDoc.id,
        inviterUserId: invitationData.inviterUserId,
        metadata: {
          invitedEmail: invitationData.invitedEmail,
          inviterName: invitationData.inviterName
        },
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Execute batch
      await batch.commit()
      console.log('Successfully updated invitation and created participant record:', invitationDoc.id)

      // Create initial tasks for the participant directly
      try {
        const participantId = `${invitationData.campaignId}_${decodedToken.uid}`
        
        // Get campaign data
        const campaignDoc = await adminDb.collection('campaigns').doc(invitationData.campaignId).get()
        if (!campaignDoc.exists) {
          console.error('Campaign not found for task creation')
        } else {
          const campaignData = campaignDoc.data()

          // Task 1: Donation Commitment Decision
          const commitmentTaskId = `${participantId}_commitment_decision`
          const commitmentTask = {
            id: commitmentTaskId,
            participantId: participantId,
            campaignId: invitationData.campaignId,
            donorId: decodedToken.uid,
            assignedTo: decodedToken.uid,
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
            createdBy: decodedToken.uid
          }

          // Task 2: Company Information
          const companyInfoTaskId = `${participantId}_company_info`
          const companyInfoTask = {
            id: companyInfoTaskId,
            participantId: participantId,
            campaignId: invitationData.campaignId,
            donorId: decodedToken.uid,
            assignedTo: decodedToken.uid,
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
            createdBy: decodedToken.uid
          }

          // Task 3: Invite Appraiser
          const inviteAppraiserTaskId = `${participantId}_invite_appraiser`
          const inviteAppraiserTask = {
            id: inviteAppraiserTaskId,
            participantId: participantId,
            campaignId: invitationData.campaignId,
            donorId: decodedToken.uid,
            assignedTo: decodedToken.uid,
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
            createdBy: decodedToken.uid
          }

          // Create all tasks in batch
          const taskBatch = adminDb.batch()
          const commitmentTaskRef = adminDb.collection('tasks').doc(commitmentTaskId)
          const companyInfoTaskRef = adminDb.collection('tasks').doc(companyInfoTaskId)
          const inviteAppraiserTaskRef = adminDb.collection('tasks').doc(inviteAppraiserTaskId)

          taskBatch.set(commitmentTaskRef, commitmentTask)
          taskBatch.set(companyInfoTaskRef, companyInfoTask)
          taskBatch.set(inviteAppraiserTaskRef, inviteAppraiserTask)

          await taskBatch.commit()
          console.log('Successfully created initial tasks for participant:', participantId)
        }
      } catch (taskError) {
        console.error('Error creating initial tasks:', taskError)
        // Don't fail the invitation acceptance if task creation fails
      }
    } catch (updateError) {
      console.error('Error updating invitation or creating participant record:', updateError)
      return NextResponse.json(
        { error: `Failed to process invitation acceptance: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      campaignId: invitationData.campaignId,
      message: 'Invitation accepted successfully'
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    
    // Check if it's a Firebase permission error
    if (error.code === 'permission-denied') {
      return NextResponse.json(
        { error: 'Permission denied. You may not have access to this invitation.' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: `Failed to accept invitation: ${error.message}` },
      { status: 500 }
    )
  }
}