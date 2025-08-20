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
    if (!invitationData) {
      return NextResponse.json(
        { error: 'Invitation data not found' },
        { status: 404 }
      )
    }
    
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
        status: 'active', // active -> completed
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

      // Create the full 9-step task workflow for the participant
      try {
        const participantId = `${invitationData.campaignId}_${decodedToken.uid}`
        
        // Use the task creation API endpoint to create the full workflow
        const createTasksUrl = `${request.url.split('/api/')[0]}/api/campaign-participants/create-tasks`
        const taskCreationResponse = await fetch(createTasksUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authHeader.split('Bearer ')[1]}`
          },
          body: JSON.stringify({
            campaignId: invitationData.campaignId,
            participantId: participantId
          })
        })

        if (taskCreationResponse.ok) {
          const taskResult = await taskCreationResponse.json()
          console.log('Successfully created full task workflow for participant:', participantId, 'Tasks:', taskResult.tasksCreated)
        } else {
          const taskError = await taskCreationResponse.text()
          console.error('Failed to create full task workflow:', taskError)
        }
      } catch (taskError) {
        console.error('Error creating initial tasks:', taskError)
        // Don't fail the invitation acceptance if task creation fails
      }
    } catch (updateError) {
      console.error('Error updating invitation or creating participant record:', updateError)
      return NextResponse.json(
        { error: `Failed to process invitation acceptance: ${updateError instanceof Error ? updateError.message : 'Unknown error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        campaignId: invitationData.campaignId,
        participantId: `${invitationData.campaignId}_${decodedToken.uid}`,
        donorId: decodedToken.uid
      }
    })
  } catch (error: unknown) {
    console.error('Error accepting invitation:', error)
    
    // Check if it's a Firebase permission error
    const firebaseError = error as { code?: string }
    if (firebaseError.code === 'permission-denied') {
      return NextResponse.json(
        { error: 'Permission denied. You may not have access to this invitation.' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: `Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}