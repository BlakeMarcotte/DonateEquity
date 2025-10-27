/**
 * Debug script to check campaign participants
 */

import { adminDb } from '@/lib/firebase/admin'

async function debugParticipants() {
  console.log('🔍 Checking campaign participants...\n')

  try {
    // Get the UX Testing campaign
    const campaignsSnapshot = await adminDb
      .collection('campaigns')
      .where('title', '==', 'UX Testing')
      .get()

    if (campaignsSnapshot.empty) {
      console.log('❌ UX Testing campaign not found')
      return
    }

    const campaignDoc = campaignsSnapshot.docs[0]
    const campaignId = campaignDoc.id
    const campaignData = campaignDoc.data()

    console.log(`📢 Campaign: ${campaignData.title}`)
    console.log(`   ID: ${campaignId}`)
    console.log(`   Organization ID: ${campaignData.organizationId}`)
    console.log()

    // Get all campaign participants for this campaign
    console.log('👥 Checking campaign_participants...')
    const participantsSnapshot = await adminDb
      .collection('campaign_participants')
      .where('campaignId', '==', campaignId)
      .get()

    console.log(`   Found ${participantsSnapshot.size} participant(s)`)

    participantsSnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log(`\n   Participant ID: ${doc.id}`)
      console.log(`     Campaign ID: ${data.campaignId}`)
      console.log(`     User ID: ${data.userId}`)
      console.log(`     Donor ID: ${data.donorId}`)
      console.log(`     Donor Email: ${data.donorEmail}`)
      console.log(`     Nonprofit ID: ${data.nonprofitId}`)
      console.log(`     Appraiser ID: ${data.appraiserId}`)
      console.log(`     Status: ${data.status}`)
      console.log(`     Estimated Value: $${data.estimatedValue}`)
    })

    // Check all participants in the collection
    console.log('\n\n📋 ALL campaign_participants in database:')
    const allParticipants = await adminDb.collection('campaign_participants').get()
    console.log(`   Total: ${allParticipants.size}`)

    allParticipants.docs.forEach(doc => {
      const data = doc.data()
      console.log(`\n   ID: ${doc.id}`)
      console.log(`     Campaign: ${data.campaignId}`)
      console.log(`     Donor: ${data.donorEmail}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugParticipants()
  .then(() => {
    console.log('\n✅ Debug complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
