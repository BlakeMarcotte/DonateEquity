/**
 * Fix campaign field names to match frontend expectations
 */

import { adminDb } from '@/lib/firebase/admin'

async function fixCampaignFields() {
  console.log('🔧 Fixing campaign field names...\n')

  try {
    // Get all campaigns
    const campaignsSnapshot = await adminDb.collection('campaigns').get()

    if (campaignsSnapshot.empty) {
      console.log('No campaigns found')
      return
    }

    console.log(`Found ${campaignsSnapshot.size} campaign(s) to update`)

    for (const doc of campaignsSnapshot.docs) {
      const data = doc.data()

      // Check if needs update
      if (data.name && !data.title) {
        console.log(`\nUpdating campaign ${doc.id}...`)
        console.log(`  Current name: ${data.name}`)

        const updates: Record<string, unknown> = {
          title: data.name,
          currentAmount: data.currentAmount ?? data.raised ?? 0,
          donorCount: data.donorCount ?? 0,
          updatedAt: new Date(),
        }

        // Add missing fields if they don't exist
        if (!data.tags) {
          updates.tags = []
        }

        if (!data.images || typeof data.images === 'string' || Array.isArray(data.images)) {
          updates.images = {
            hero: '',
            gallery: []
          }
        }

        if (!data.settings) {
          updates.settings = {
            allowRecurring: true
          }
        }

        await adminDb.collection('campaigns').doc(doc.id).update(updates)

        console.log(`  ✅ Updated successfully`)
        console.log(`  New title: ${updates.title}`)
      } else if (data.title) {
        console.log(`\n✅ Campaign ${doc.id} already has correct fields`)
        console.log(`  Title: ${data.title}`)
      }
    }

    console.log('\n✅ All campaigns updated!')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixCampaignFields()
  .then(() => {
    console.log('\n✅ Fix complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
