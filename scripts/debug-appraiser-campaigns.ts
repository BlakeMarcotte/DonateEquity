/**
 * Debug script to check appraiser's campaign access
 */

import { adminDb } from '@/lib/firebase/admin'

async function debugAppraiserCampaigns() {
  console.log('🔍 Checking appraiser campaign access...\n')

  try {
    // Get the appraiser user
    const usersSnapshot = await adminDb
      .collection('users')
      .where('email', '==', 'appraiser-test@example.com')
      .get()

    if (usersSnapshot.empty) {
      console.log('❌ Appraiser user not found')
      return
    }

    const appraiserDoc = usersSnapshot.docs[0]
    const appraiserData = appraiserDoc.data()
    const appraiserId = appraiserDoc.id

    console.log(`👤 Appraiser: ${appraiserData.displayName}`)
    console.log(`   ID: ${appraiserId}`)
    console.log(`   Email: ${appraiserData.email}`)
    console.log(`   Role: ${appraiserData.role}`)
    console.log(`   Organization ID: ${appraiserData.organizationId}`)
    console.log()

    // Check campaign_participants for this appraiser
    console.log('📋 Checking campaign_participants...')

    // Check by appraiserId field
    const participantsByAppraiserId = await adminDb
      .collection('campaign_participants')
      .where('appraiserId', '==', appraiserId)
      .get()

    console.log(`   Found ${participantsByAppraiserId.size} participant(s) with appraiserId = ${appraiserId}`)

    participantsByAppraiserId.docs.forEach(doc => {
      const data = doc.data()
      console.log(`\n   Participant ID: ${doc.id}`)
      console.log(`     Campaign ID: ${data.campaignId}`)
      console.log(`     Donor Email: ${data.donorEmail}`)
      console.log(`     Appraiser ID: ${data.appraiserId}`)
      console.log(`     Appraiser Email: ${data.appraiserEmail}`)
      console.log(`     User Role: ${data.userRole}`)
    })

    // Check by userId (in case appraiser needs a participant entry)
    console.log('\n   Checking by userId...')
    const participantsByUserId = await adminDb
      .collection('campaign_participants')
      .where('userId', '==', appraiserId)
      .get()

    console.log(`   Found ${participantsByUserId.size} participant(s) with userId = ${appraiserId}`)

    participantsByUserId.docs.forEach(doc => {
      const data = doc.data()
      console.log(`\n   Participant ID: ${doc.id}`)
      console.log(`     Campaign ID: ${data.campaignId}`)
      console.log(`     User ID: ${data.userId}`)
      console.log(`     User Role: ${data.userRole}`)
    })

    // Get all campaign_participants to see the structure
    console.log('\n📋 ALL campaign_participants in database:')
    const allParticipants = await adminDb.collection('campaign_participants').get()
    console.log(`   Total: ${allParticipants.size}`)

    allParticipants.docs.forEach(doc => {
      const data = doc.data()
      console.log(`\n   ID: ${doc.id}`)
      console.log(`     Campaign: ${data.campaignId}`)
      console.log(`     User ID: ${data.userId}`)
      console.log(`     User Role: ${data.userRole}`)
      console.log(`     Donor: ${data.donorEmail}`)
      console.log(`     Appraiser ID: ${data.appraiserId}`)
      console.log(`     Appraiser Email: ${data.appraiserEmail}`)
    })

    // Check tasks for the appraiser
    console.log('\n\n📋 Checking tasks assigned to appraiser...')
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('assignedTo', '==', appraiserId)
      .get()

    console.log(`   Found ${tasksSnapshot.size} task(s) assigned to appraiser`)

    tasksSnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log(`\n   Task ID: ${doc.id}`)
      console.log(`     Title: ${data.title}`)
      console.log(`     Participant ID: ${data.participantId}`)
      console.log(`     Campaign ID: ${data.campaignId}`)
      console.log(`     Status: ${data.status}`)
      console.log(`     Assigned Role: ${data.assignedRole}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugAppraiserCampaigns()
  .then(() => {
    console.log('\n✅ Debug complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
