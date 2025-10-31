import { adminDb } from '../lib/firebase/admin'

async function checkAppraiserAssignment() {
  const appraiserId = '6s11qBCzD8SNJfyD65VgecPLKz83'

  console.log('\n=== Checking Appraiser Assignment ===')
  console.log('Appraiser ID:', appraiserId)
  console.log('')

  // 1. Check campaign_participants by appraiserId
  console.log('1. Checking campaign_participants where appraiserId =', appraiserId)
  const appraiserIdQuery = await adminDb.collection('campaign_participants')
    .where('appraiserId', '==', appraiserId)
    .get()

  console.log(`   Found ${appraiserIdQuery.docs.length} records with appraiserId`)
  appraiserIdQuery.docs.forEach(doc => {
    console.log('   ->', doc.id, doc.data())
  })
  console.log('')

  // 2. Check campaign_participants by userId
  console.log('2. Checking campaign_participants where userId =', appraiserId)
  const userIdQuery = await adminDb.collection('campaign_participants')
    .where('userId', '==', appraiserId)
    .get()

  console.log(`   Found ${userIdQuery.docs.length} records with userId`)
  userIdQuery.docs.forEach(doc => {
    const data = doc.data()
    console.log('   ->', doc.id)
    console.log('      campaignId:', data.campaignId)
    console.log('      userId:', data.userId)
    console.log('      appraiserId:', data.appraiserId || 'MISSING ❌')
    console.log('      role:', data.role)
    console.log('      linkedDonorParticipantId:', data.linkedDonorParticipantId)
  })
  console.log('')

  // 3. Check appraiser_invitations
  console.log('3. Checking appraiser_invitations')
  const invitationsQuery = await adminDb.collection('appraiser_invitations')
    .where('appraiserEmail', '==', 'blakemarcotte2@gmail.com') // Replace with actual email
    .get()

  console.log(`   Found ${invitationsQuery.docs.length} invitations`)
  invitationsQuery.docs.forEach(doc => {
    const data = doc.data()
    console.log('   ->', doc.id)
    console.log('      status:', data.status)
    console.log('      donationId:', data.donationId)
    console.log('      acceptedBy:', data.acceptedBy)
  })
  console.log('')

  console.log('=== End Check ===\n')
}

checkAppraiserAssignment().catch(console.error)
