/**
 * Migration Script: Generate Invite Codes for Existing Organizations
 *
 * This script generates invite codes for all existing organizations that don't have them yet.
 * It creates appropriate codes based on the organization type:
 * - Nonprofit: admin and member codes
 * - Appraiser: appraiser code
 * - Donor: donor code
 *
 * Usage: npx tsx scripts/generate-invite-codes.ts
 */

import { adminDb } from '@/lib/firebase/admin'
import { generateInviteCode } from '@/lib/utils/inviteCode'

async function migrateOrganizations() {
  console.log('🚀 Starting invite codes migration...\n')

  try {
    // Fetch all organizations
    const orgsSnapshot = await adminDb.collection('organizations').get()

    if (orgsSnapshot.empty) {
      console.log('ℹ️  No organizations found.')
      return
    }

    console.log(`📊 Found ${orgsSnapshot.size} organizations\n`)

    let updatedCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Process each organization
    for (const doc of orgsSnapshot.docs) {
      const orgData = doc.data()
      const orgId = doc.id
      const orgName = orgData.name || 'Unknown'
      const orgType = orgData.type || 'unknown'

      try {
        // Check if organization already has invite codes
        if (orgData.inviteCodes && Object.keys(orgData.inviteCodes).length > 0) {
          console.log(`⏭️  Skipping "${orgName}" (${orgType}) - already has invite codes`)
          skippedCount++
          continue
        }

        // Generate invite codes based on organization type
        const now = new Date()
        const inviteCodes: Record<string, string> = {}
        const inviteCodesGeneratedAt: Record<string, Date> = {}

        if (orgType === 'nonprofit') {
          // Nonprofits get admin and member codes
          inviteCodes.admin = generateInviteCode()
          inviteCodes.member = generateInviteCode()
          inviteCodesGeneratedAt.admin = now
          inviteCodesGeneratedAt.member = now
          console.log(`✅ Generated codes for "${orgName}" (nonprofit):`)
          console.log(`   Admin: ${inviteCodes.admin}`)
          console.log(`   Member: ${inviteCodes.member}`)
        } else if (orgType === 'appraiser_firm' || orgType === 'appraiser') {
          // Appraisers get appraiser code
          inviteCodes.appraiser = generateInviteCode()
          inviteCodesGeneratedAt.appraiser = now
          console.log(`✅ Generated codes for "${orgName}" (appraiser):`)
          console.log(`   Appraiser: ${inviteCodes.appraiser}`)
        } else if (orgType === 'donor') {
          // Donors get donor code
          inviteCodes.donor = generateInviteCode()
          inviteCodesGeneratedAt.donor = now
          console.log(`✅ Generated codes for "${orgName}" (donor):`)
          console.log(`   Donor: ${inviteCodes.donor}`)
        } else {
          console.log(`⚠️  Unknown organization type for "${orgName}": ${orgType}`)
          console.log('   Skipping this organization')
          skippedCount++
          continue
        }

        // Update the organization document
        await adminDb.collection('organizations').doc(orgId).update({
          inviteCodes,
          inviteCodesGeneratedAt,
          updatedAt: now
        })

        updatedCount++
        console.log()
      } catch (error) {
        console.error(`❌ Error processing "${orgName}":`, error)
        errorCount++
        console.log()
      }
    }

    // Summary
    console.log('=' .repeat(60))
    console.log('📋 Migration Summary:')
    console.log(`   ✅ Updated: ${updatedCount} organizations`)
    console.log(`   ⏭️  Skipped: ${skippedCount} organizations`)
    console.log(`   ❌ Errors: ${errorCount} organizations`)
    console.log('=' .repeat(60))

    if (updatedCount > 0) {
      console.log('\n🎉 Migration completed successfully!')
      console.log('✨ All organizations now have invite codes.')
    } else if (skippedCount > 0 && updatedCount === 0) {
      console.log('\n✨ All organizations already have invite codes. No updates needed.')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateOrganizations()
  .then(() => {
    console.log('\n👋 Migration script completed.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
