/**
 * Fix campaign participants to add userRole field
 */

import { adminDb } from '@/lib/firebase/admin'

async function fixParticipantRole() {
  console.log('🔧 Adding userRole field to campaign participants...\n')

  try {
    // Get all campaign participants
    const participantsSnapshot = await adminDb.collection('campaign_participants').get()

    if (participantsSnapshot.empty) {
      console.log('No participants found')
      return
    }

    console.log(`Found ${participantsSnapshot.size} participant(s) to update`)

    for (const doc of participantsSnapshot.docs) {
      const data = doc.data()

      // Check if needs update
      if (!data.userRole) {
        console.log(`\nUpdating participant ${doc.id}...`)
        console.log(`  Donor Email: ${data.donorEmail}`)

        await adminDb.collection('campaign_participants').doc(doc.id).update({
          userRole: 'donor',
          updatedAt: new Date(),
        })

        console.log(`  ✅ Added userRole: 'donor'`)
      } else {
        console.log(`\n✅ Participant ${doc.id} already has userRole: ${data.userRole}`)
      }
    }

    console.log('\n✅ All participants updated!')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixParticipantRole()
  .then(() => {
    console.log('\n✅ Fix complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
