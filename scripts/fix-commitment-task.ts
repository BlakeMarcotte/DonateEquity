/**
 * Fix commitment decision task to add options metadata
 */

import { adminDb } from '@/lib/firebase/admin'

async function fixCommitmentTask() {
  console.log('🔧 Adding options to commitment decision task...\n')

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

    // Get the commitment decision task for this participant
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('participantId', '==', participantId)
      .where('type', '==', 'commitment_decision')
      .get()

    if (tasksSnapshot.empty) {
      console.log('❌ Commitment decision task not found')
      return
    }

    const taskDoc = tasksSnapshot.docs[0]
    const taskId = taskDoc.id
    const taskData = taskDoc.data()

    console.log(`📝 Task: ${taskData.title}`)
    console.log(`   ID: ${taskId}`)
    console.log(`   Current metadata: ${JSON.stringify(taskData.metadata || {})}\n`)

    // Update the task with options metadata
    await adminDb.collection('tasks').doc(taskId).update({
      metadata: {
        options: [
          {
            id: 'commit_now',
            label: 'Make Commitment Now',
            description: 'I\'m ready to specify my commitment amount and details now, before the appraisal is complete.'
          },
          {
            id: 'commit_after_appraisal',
            label: 'Wait for Appraisal',
            description: 'I\'d like to see the appraisal results before making my final commitment decision.'
          }
        ]
      },
      updatedAt: new Date(),
    })

    console.log('✅ Task updated with commitment options!')
    console.log('\nNew options:')
    console.log('  1. Make Commitment Now')
    console.log('  2. Wait for Appraisal')

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

fixCommitmentTask()
  .then(() => {
    console.log('\n✅ Fix complete')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
