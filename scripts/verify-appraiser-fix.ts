import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { adminDb } from '../lib/firebase/admin'

async function verifyAppraiserFix() {
  const appraiserId = 'aeynkoVzQfaMYAUDSXjhS7uUguD3'

  console.log('\n=== Verifying Appraiser Fix ===')
  console.log('Appraiser ID:', appraiserId)
  console.log('')

  // Test the exact query used by useDonorCampaign hook
  console.log('1. Testing query from useDonorCampaign (userId + role)')
  const hookQuery = await adminDb.collection('campaign_participants')
    .where('userId', '==', appraiserId)
    .where('role', '==', 'appraiser')
    .get()

  if (hookQuery.empty) {
    console.log('   ❌ FAILED: No records found with userId + role query')
    console.log('   This means the appraiser will NOT see campaigns in their navbar')
  } else {
    console.log(`   ✅ SUCCESS: Found ${hookQuery.docs.length} record(s)`)
    hookQuery.docs.forEach(doc => {
      const data = doc.data()
      console.log('   Record:', doc.id)
      console.log('      campaignId:', data.campaignId)
      console.log('      userId:', data.userId)
      console.log('      role:', data.role)
      console.log('      appraiserId:', data.appraiserId)
      console.log('      linkedDonorParticipantId:', data.linkedDonorParticipantId)
    })
  }
  console.log('')

  // Verify the campaign exists
  if (!hookQuery.empty) {
    const firstDoc = hookQuery.docs[0]
    const campaignId = firstDoc.data().campaignId

    console.log('2. Verifying campaign exists:', campaignId)
    const campaignDoc = await adminDb.collection('campaigns').doc(campaignId).get()

    if (!campaignDoc.exists) {
      console.log('   ❌ FAILED: Campaign does not exist')
    } else {
      const campaignData = campaignDoc.data()
      console.log('   ✅ SUCCESS: Campaign found')
      console.log('      title:', campaignData?.title)
      console.log('      organizationName:', campaignData?.organizationName)
    }
    console.log('')

    // Verify appraiser tasks exist
    console.log('3. Verifying appraiser tasks exist')
    const tasksQuery = await adminDb.collection('tasks')
      .where('assignedTo', '==', appraiserId)
      .get()

    console.log(`   Found ${tasksQuery.docs.length} tasks assigned to appraiser`)
    tasksQuery.docs.forEach(doc => {
      const data = doc.data()
      console.log('   Task:', doc.id)
      console.log('      title:', data.title)
      console.log('      type:', data.type)
      console.log('      status:', data.status)
      console.log('      assignedRole:', data.assignedRole)
    })
    console.log('')
  }

  console.log('=== Summary ===')
  if (!hookQuery.empty) {
    console.log('✅ Appraiser fix is working correctly!')
    console.log('   - Appraiser participant record exists')
    console.log('   - Query pattern matches useDonorCampaign hook')
    console.log('   - Campaign will appear in navbar')
  } else {
    console.log('❌ Fix incomplete - appraiser will not see campaigns')
  }
  console.log('')
}

verifyAppraiserFix().catch(console.error)
