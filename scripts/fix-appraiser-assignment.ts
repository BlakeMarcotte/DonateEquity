import dotenv from 'dotenv'
import path from 'path'

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { adminDb } from '../lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

async function fixAppraiserAssignment() {
  const oldAppraiserId = 'rhWKmzgvHaebkPEka2MWTzOJvZy1' // Deleted user
  const newAppraiserId = 'aeynkoVzQfaMYAUDSXjhS7uUguD3' // Real appraiser
  const newAppraiserEmail = 'appraiser@gmail.com'

  console.log('\n=== Fixing Appraiser Assignment ===')
  console.log('Old (deleted) Appraiser ID:', oldAppraiserId)
  console.log('New (real) Appraiser ID:', newAppraiserId)
  console.log('')

  const batch = adminDb.batch()

  // 1. Find and update the orphaned appraiser participant record
  console.log('1. Finding orphaned appraiser participant record...')
  const appraiserParticipantQuery = await adminDb.collection('campaign_participants')
    .where('userId', '==', oldAppraiserId)
    .where('role', '==', 'appraiser')
    .get()

  if (appraiserParticipantQuery.empty) {
    console.log('   ❌ No orphaned appraiser participant found')
  } else {
    appraiserParticipantQuery.docs.forEach(doc => {
      const data = doc.data()
      console.log('   Found orphaned record:', doc.id)
      console.log('      campaignId:', data.campaignId)
      console.log('      linkedDonorParticipantId:', data.linkedDonorParticipantId)

      // Update the record with new appraiser ID
      batch.update(doc.ref, {
        userId: newAppraiserId,
        userEmail: newAppraiserEmail,
        appraiserId: newAppraiserId, // CRITICAL: Add this field!
        updatedAt: FieldValue.serverTimestamp()
      })
      console.log('   ✅ Will update to use new appraiser ID')
    })
  }
  console.log('')

  // 2. Find and update donor participant records that reference the old appraiser
  console.log('2. Finding donor participant records with old appraiserId...')
  const donorParticipantQuery = await adminDb.collection('campaign_participants')
    .where('appraiserId', '==', oldAppraiserId)
    .get()

  if (donorParticipantQuery.empty) {
    console.log('   No donor participants with old appraiserId')
  } else {
    donorParticipantQuery.docs.forEach(doc => {
      const data = doc.data()
      console.log('   Found donor participant:', doc.id)
      console.log('      userId:', data.userId)
      console.log('      campaignId:', data.campaignId)

      batch.update(doc.ref, {
        appraiserId: newAppraiserId,
        appraiserEmail: newAppraiserEmail,
        updatedAt: FieldValue.serverTimestamp()
      })
      console.log('   ✅ Will update appraiserId to new appraiser')
    })
  }
  console.log('')

  // 3. Find and update any tasks assigned to the old appraiser
  console.log('3. Finding tasks assigned to old appraiser...')
  const tasksQuery = await adminDb.collection('tasks')
    .where('assignedTo', '==', oldAppraiserId)
    .get()

  if (tasksQuery.empty) {
    console.log('   No tasks assigned to old appraiser')
  } else {
    console.log(`   Found ${tasksQuery.docs.length} tasks`)
    tasksQuery.docs.forEach(doc => {
      const data = doc.data()
      console.log('   ->', doc.id)
      console.log('      type:', data.type)
      console.log('      title:', data.title)
      console.log('      assignedRole:', data.assignedRole)

      batch.update(doc.ref, {
        assignedTo: newAppraiserId,
        updatedAt: FieldValue.serverTimestamp()
      })
      console.log('   ✅ Will reassign to new appraiser')
    })
  }
  console.log('')

  // 4. Update any appraiser invitations
  console.log('4. Finding appraiser invitations accepted by old user...')
  const invitationsQuery = await adminDb.collection('appraiser_invitations')
    .where('acceptedBy', '==', oldAppraiserId)
    .get()

  if (invitationsQuery.empty) {
    console.log('   No invitations found')
  } else {
    invitationsQuery.docs.forEach(doc => {
      console.log('   Found invitation:', doc.id)
      batch.update(doc.ref, {
        acceptedBy: newAppraiserId,
        updatedAt: FieldValue.serverTimestamp()
      })
      console.log('   ✅ Will update acceptedBy to new appraiser')
    })
  }
  console.log('')

  // Commit all changes
  console.log('=== Committing Changes ===')
  try {
    await batch.commit()
    console.log('✅ All changes committed successfully!')
  } catch (error) {
    console.error('❌ Error committing changes:', error)
    throw error
  }

  // Verify the changes
  console.log('\n=== Verifying Changes ===')

  const verifyParticipantQuery = await adminDb.collection('campaign_participants')
    .where('userId', '==', newAppraiserId)
    .get()

  console.log(`Found ${verifyParticipantQuery.docs.length} participant records for new appraiser:`)
  verifyParticipantQuery.docs.forEach(doc => {
    const data = doc.data()
    console.log('   ->', doc.id)
    console.log('      role:', data.role)
    console.log('      appraiserId:', data.appraiserId)
    console.log('      linkedDonorParticipantId:', data.linkedDonorParticipantId)
  })
  console.log('')

  console.log('=== Done ===\n')
}

fixAppraiserAssignment().catch(console.error)
