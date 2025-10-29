import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Invitation Accept API Called ===')
    console.log('Request URL:', request.url)
    console.log('Request method:', request.method)

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

    // Set user role to donor if they don't have a role yet
    const currentRole = decodedToken.role
    if (!currentRole || currentRole === 'donor') {
      try {
        // Update custom claims
        await adminAuth.setCustomUserClaims(decodedToken.uid, {
          ...decodedToken,
          role: 'donor'
        })

        // Update user profile document
        await adminDb.collection('users').doc(decodedToken.uid).update({
          role: 'donor',
          updatedAt: new Date()
        })

        console.log('Set user role to donor:', decodedToken.uid)
      } catch (roleError) {
        console.error('Error setting user role to donor:', roleError)
        // Don't fail the invitation if role setting fails
      }
    }

    // Update the invitation and create campaign participant record
    const batch = adminDb.batch()
    let donationId = ''

    try {
      // Update the invitation
      batch.update(invitationDoc.ref, {
        invitedUserId: decodedToken.uid,
        status: 'accepted',
        respondedAt: new Date(),
        updatedAt: new Date()
      })

      // Get campaign details for donation creation
      const campaignRef = adminDb.collection('campaigns').doc(invitationData.campaignId)
      const campaignDoc = await campaignRef.get()

      if (!campaignDoc.exists) {
        return NextResponse.json(
          { error: 'Campaign not found' },
          { status: 404 }
        )
      }

      const campaignData = campaignDoc.data()
      if (!campaignData) {
        return NextResponse.json(
          { error: 'Campaign data not found' },
          { status: 404 }
        )
      }

      // Create a donation record instead of just a participant record
      // This represents the donor's commitment to the campaign
      const donationRef = adminDb.collection('donations').doc()
      donationId = donationRef.id

      // Get donor's organization info if available
      let donorOrganizationName = 'Individual Donor'
      let donorOrganizationId = null

      if (userData?.organizationId) {
        donorOrganizationId = userData.organizationId
        try {
          const orgDoc = await adminDb.collection('organizations').doc(donorOrganizationId).get()
          if (orgDoc.exists) {
            donorOrganizationName = orgDoc.data()?.name || 'Unknown Organization'
          }
        } catch (orgError) {
          console.error('Error fetching donor organization:', orgError)
        }
      }

      const donationData = {
        campaignId: invitationData.campaignId,
        campaignTitle: campaignData.title,
        donorId: decodedToken.uid,
        donorName: userData?.displayName || userEmail || 'Unknown Donor',
        donorEmail: userEmail || '',
        nonprofitAdminId: campaignData.createdBy,
        amount: 0, // Initial amount, to be set later
        donationType: 'equity',
        status: 'pending', // Pending until donor provides commitment details
        message: invitationData.message || '',
        isAnonymous: false,

        // Equity-specific fields
        commitmentDetails: {
          donorOrganizationId: donorOrganizationId,
          donorOrganizationName: donorOrganizationName,
          estimatedValue: 0
        },
        requiresAppraisal: true,
        appraiserId: null,
        appraiserEmail: null,
        appraisalStatus: 'not_required' as const, // Will change when commitment is made

        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,

        // Organization context
        organizationId: campaignData.organizationId,
        organizationName: campaignData.organizationName,

        // Metadata
        invitationId: invitationDoc.id,
        inviterUserId: invitationData.inviterUserId,
        invitedVia: 'invitation'
      }

      console.log('Creating donation record:', {
        donationId: donationRef.id,
        campaignId: invitationData.campaignId,
        donorId: decodedToken.uid,
        status: 'pending'
      })

      batch.set(donationRef, donationData)

      // Create initial tasks for the donation workflow with donationId field
      const tasksToCreate = [
        {
          id: `${donationId}_sign_nda`,
          donationId: donationId,
          campaignId: invitationData.campaignId,
          donorId: decodedToken.uid,
          assignedTo: decodedToken.uid,
          assignedRole: 'donor',
          title: 'Donor: Sign NDA',
          description: 'Review and digitally sign the Non-Disclosure Agreement before proceeding with the donation process.',
          type: 'docusign_signature',
          status: 'pending',
          priority: 'high',
          order: 1,
          dependencies: [],
          metadata: {
            documentPath: '/public/nda-general.pdf',
            documentName: 'General NDA',
            envelopeId: null,
            signedAt: null,
            signingUrl: null,
            automatedReminders: true
          },
          comments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: decodedToken.uid
        },
        {
          id: `${donationId}_invite_appraiser`,
          donationId: donationId,
          campaignId: invitationData.campaignId,
          donorId: decodedToken.uid,
          assignedTo: decodedToken.uid,
          assignedRole: 'donor',
          title: 'Donor: Invite Appraiser or AI Appraisal',
          description: 'Choose your preferred appraisal method: invite a professional appraiser or use our AI-powered appraisal service.',
          type: 'invitation',
          status: 'blocked',
          priority: 'high',
          order: 2,
          dependencies: [`${donationId}_sign_nda`],
          metadata: {
            invitationType: 'appraiser',
            role: 'appraiser'
          },
          comments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: decodedToken.uid
        },
        {
          id: `${donationId}_commitment_decision`,
          donationId: donationId,
          campaignId: invitationData.campaignId,
          donorId: decodedToken.uid,
          assignedTo: decodedToken.uid,
          assignedRole: 'donor',
          title: 'Donor: Commitment',
          description: 'Choose when you want to make your donation commitment: now or after appraisal.',
          type: 'commitment_decision',
          status: 'blocked',
          priority: 'high',
          order: 3,
          dependencies: [`${donationId}_invite_appraiser`],
          metadata: {
            options: [
              {
                id: 'commit_now',
                label: 'Make Commitment Now',
                description: 'I\'m ready to commit to a donation amount now and proceed with the workflow.'
              },
              {
                id: 'commit_after_appraisal',
                label: 'Make Commitment After Appraisal',
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
        },
        {
          id: `${donationId}_company_info`,
          donationId: donationId,
          campaignId: invitationData.campaignId,
          donorId: decodedToken.uid,
          assignedTo: decodedToken.uid,
          assignedRole: 'donor',
          title: 'Donor: Upload Company Information (File Upload)',
          description: 'Upload your company information and financial documents for the appraisal process.',
          type: 'document_upload',
          status: 'blocked',
          priority: 'high',
          order: 4,
          dependencies: [`${donationId}_commitment_decision`],
          metadata: {
            documentTypes: ['company_info', 'financial_statements'],
            documentPath: `donations/${donationId}/financial/`,
            requiresApproval: false,
            uploadFolders: ['legal', 'financial']
          },
          comments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: decodedToken.uid
        },
        {
          id: `${donationId}_appraiser_sign_nda`,
          donationId: donationId,
          campaignId: invitationData.campaignId,
          donorId: decodedToken.uid,
          assignedTo: null,
          assignedRole: 'appraiser',
          title: 'Appraiser: Sign NDA',
          description: 'Review and digitally sign the Non-Disclosure Agreement to access donor information.',
          type: 'docusign_signature',
          status: 'blocked',
          priority: 'high',
          order: 5,
          dependencies: [`${donationId}_company_info`],
          metadata: {
            documentPath: '/public/nda-appraiser.pdf',
            documentName: 'Appraiser NDA',
            envelopeId: null,
            signedAt: null,
            signingUrl: null,
            automatedReminders: true
          },
          comments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: decodedToken.uid
        },
        {
          id: `${donationId}_appraiser_upload`,
          donationId: donationId,
          campaignId: invitationData.campaignId,
          donorId: decodedToken.uid,
          assignedTo: null,
          assignedRole: 'appraiser',
          title: 'Appraiser: Upload Documents (File Upload)',
          description: 'Upload appraisal documents and valuation reports.',
          type: 'document_upload',
          status: 'blocked',
          priority: 'high',
          order: 6,
          dependencies: [`${donationId}_appraiser_sign_nda`],
          metadata: {
            documentTypes: ['appraisal_report', 'valuation_documents'],
            documentPath: `donations/${donationId}/appraisals/`,
            requiresApproval: false,
            uploadFolders: ['appraisals']
          },
          comments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: decodedToken.uid
        },
        {
          id: `${donationId}_donor_approve`,
          donationId: donationId,
          campaignId: invitationData.campaignId,
          donorId: decodedToken.uid,
          assignedTo: decodedToken.uid,
          assignedRole: 'donor',
          title: 'Donor: Approve Documents',
          description: 'Review and approve the appraisal documents and valuation reports.',
          type: 'document_review',
          status: 'blocked',
          priority: 'medium',
          order: 7,
          dependencies: [`${donationId}_appraiser_upload`],
          metadata: {
            documentIds: [],
            approvalRequired: true,
            automatedReminders: true
          },
          comments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: decodedToken.uid
        },
        {
          id: `${donationId}_nonprofit_approve`,
          donationId: donationId,
          campaignId: invitationData.campaignId,
          donorId: decodedToken.uid,
          assignedTo: campaignData.createdBy,
          assignedRole: 'nonprofit_admin',
          title: 'Nonprofit: Approve Documents',
          description: 'Review and approve all donation documentation and appraisal reports.',
          type: 'document_review',
          status: 'blocked',
          priority: 'high',
          order: 8,
          dependencies: [`${donationId}_donor_approve`],
          metadata: {
            documentIds: [],
            approvalRequired: true,
            automatedReminders: true
          },
          comments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: decodedToken.uid
        },
        {
          id: `${donationId}_nonprofit_upload`,
          donationId: donationId,
          campaignId: invitationData.campaignId,
          donorId: decodedToken.uid,
          assignedTo: campaignData.createdBy,
          assignedRole: 'nonprofit_admin',
          title: 'Nonprofit: Upload Documents (File Upload)',
          description: 'Upload final donation receipt and acknowledgement documents.',
          type: 'document_upload',
          status: 'blocked',
          priority: 'medium',
          order: 9,
          dependencies: [`${donationId}_nonprofit_approve`],
          metadata: {
            documentTypes: ['donation_receipt', 'acknowledgement'],
            documentPath: `donations/${donationId}/signed-documents/`,
            requiresApproval: false,
            uploadFolders: ['signed-documents']
          },
          comments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: decodedToken.uid
        }
      ]

      // Add all tasks to the batch
      for (const task of tasksToCreate) {
        const taskRef = adminDb.collection('tasks').doc(task.id)
        batch.set(taskRef, task)
      }

      // Execute batch
      await batch.commit()
      console.log('Successfully updated invitation and created donation record with tasks:', {
        invitationId: invitationDoc.id,
        donationId: donationRef.id,
        userId: decodedToken.uid,
        tasksCreated: tasksToCreate.length
      })

      // Verify donation was created
      const verifyDonation = await donationRef.get()
      if (verifyDonation.exists) {
        console.log('Verified donation record exists:', verifyDonation.data())
      } else {
        console.error('WARNING: Donation record was not created!')
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
      requiresTokenRefresh: !currentRole, // Let client know to refresh token if role was just set
      data: {
        campaignId: invitationData.campaignId,
        donationId: donationId,
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