/**
 * Verify task dependencies are correct
 */

import { adminDb } from '@/lib/firebase/admin'

async function verifyTaskDependencies() {
  console.log('🔍 Checking task dependencies...\n')

  try {
    // Get the UX Testing campaign participant
    const participantsSnapshot = await adminDb
      .collection('campaign_participants')
      .where('donorEmail', '==', 'donor-test@example.com')
      .get()

    if (participantsSnapshot.empty) {
      console.log('❌ Participant not found')
      return
    }

    const participantDoc = participantsSnapshot.docs[0]
    const participantId = participantDoc.id

    console.log(`📋 Participant: ${participantId}\n`)

    // Get all tasks for this participant
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('participantId', '==', participantId)
      .orderBy('order', 'asc')
      .get()

    console.log(`Found ${tasksSnapshot.size} tasks:\n`)

    tasksSnapshot.docs.forEach(doc => {
      const data = doc.data()
      console.log(`${data.order}. ${data.title}`)
      console.log(`   ID: ${doc.id}`)
      console.log(`   Status: ${data.status}`)
      console.log(`   Assigned to: ${data.assignedRole}`)
      console.log(`   Dependencies: ${JSON.stringify(data.dependencies || [])}`)
      console.log(`   Type: ${data.type}`)
      console.log()
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

verifyTaskDependencies()
  .then(() => {
    console.log('✅ Verification complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
