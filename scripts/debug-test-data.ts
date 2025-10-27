/**
 * Debug script to verify test data creation
 */

import { adminAuth, adminDb } from '@/lib/firebase/admin'

async function debugTestData() {
  console.log('🔍 Debugging test data...\n')

  try {
    // Check nonprofit user
    const nonprofitEmail = 'nonprofit-test@example.com'
    console.log(`📧 Checking ${nonprofitEmail}...`)

    const nonprofitUser = await adminAuth.getUserByEmail(nonprofitEmail)
    console.log(`  UID: ${nonprofitUser.uid}`)
    console.log(`  Custom Claims:`, nonprofitUser.customClaims)

    // Check user profile
    const userProfile = await adminDb.collection('users').doc(nonprofitUser.uid).get()
    if (userProfile.exists) {
      const userData = userProfile.data()
      console.log(`  Profile organizationId: ${userData?.organizationId}`)
      console.log(`  Profile role: ${userData?.role}`)
    }

    // Check organization
    if (nonprofitUser.customClaims?.organizationId) {
      const orgId = nonprofitUser.customClaims.organizationId as string
      console.log(`\n🏢 Checking organization ${orgId}...`)

      const orgDoc = await adminDb.collection('organizations').doc(orgId).get()
      if (orgDoc.exists) {
        const orgData = orgDoc.data()
        console.log(`  Name: ${orgData?.name}`)
        console.log(`  Type: ${orgData?.type}`)
        console.log(`  Created By: ${orgData?.createdBy}`)
        console.log(`  Admin IDs:`, orgData?.adminIds)
      } else {
        console.log(`  ❌ Organization NOT FOUND`)
      }

      // Check campaigns for this organization
      console.log(`\n📢 Checking campaigns for organization ${orgId}...`)
      const campaignsSnapshot = await adminDb
        .collection('campaigns')
        .where('organizationId', '==', orgId)
        .get()

      console.log(`  Found ${campaignsSnapshot.size} campaign(s)`)

      campaignsSnapshot.docs.forEach(doc => {
        const data = doc.data()
        console.log(`\n  Campaign ID: ${doc.id}`)
        console.log(`    Name: ${data.name}`)
        console.log(`    Organization ID: ${data.organizationId}`)
        console.log(`    Created By: ${data.createdBy}`)
        console.log(`    Status: ${data.status}`)
      })
    }

    // Check all campaigns
    console.log(`\n📢 Checking ALL campaigns...`)
    const allCampaigns = await adminDb.collection('campaigns').get()
    console.log(`  Total campaigns in database: ${allCampaigns.size}`)

    allCampaigns.docs.forEach(doc => {
      const data = doc.data()
      console.log(`\n  Campaign ID: ${doc.id}`)
      console.log(`    Name: ${data.name}`)
      console.log(`    Organization ID: ${data.organizationId}`)
      console.log(`    Created By: ${data.createdBy}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugTestData()
  .then(() => {
    console.log('\n✅ Debug complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
