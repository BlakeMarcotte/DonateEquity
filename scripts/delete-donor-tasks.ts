/**
 * Script to delete all donor tasks from Firestore
 * This removes all tasks where assignedRole === 'donor'
 * Run with: npx tsx scripts/delete-donor-tasks.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

import { adminDb } from '../lib/firebase/admin'
import * as readline from 'readline'

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y')
    })
  })
}

async function deleteDonorTasks() {
  try {
    console.log('🔍 Fetching all donor tasks...\n')

    // Query all tasks where assignedRole === 'donor'
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('assignedRole', '==', 'donor')
      .get()

    if (tasksSnapshot.empty) {
      console.log('✅ No donor tasks found in the database.')
      return
    }

    console.log(`📋 Found ${tasksSnapshot.size} donor task(s)\n`)

    // Show sample of tasks to be deleted
    console.log('Sample of tasks to be deleted:')
    tasksSnapshot.docs.slice(0, 5).forEach((doc, index) => {
      const task = doc.data()
      console.log(`  ${index + 1}. ${task.title} (${task.participantId})`)
    })

    if (tasksSnapshot.size > 5) {
      console.log(`  ... and ${tasksSnapshot.size - 5} more`)
    }
    console.log('')

    // Ask for confirmation
    const confirmed = await askConfirmation(
      `⚠️  Are you sure you want to delete ALL ${tasksSnapshot.size} donor tasks? (yes/no): `
    )

    if (!confirmed) {
      console.log('❌ Operation cancelled.')
      return
    }

    console.log('\n🗑️  Deleting donor tasks...')

    // Delete tasks in batches (Firestore batch limit is 500)
    const batchSize = 500
    const batches: any[] = []
    let currentBatch = adminDb.batch()
    let operationCount = 0
    let totalDeleted = 0

    for (const doc of tasksSnapshot.docs) {
      currentBatch.delete(doc.ref)
      operationCount++
      totalDeleted++

      // When we reach batch size, commit and start new batch
      if (operationCount === batchSize) {
        batches.push(currentBatch)
        currentBatch = adminDb.batch()
        operationCount = 0
      }
    }

    // Add the last batch if it has operations
    if (operationCount > 0) {
      batches.push(currentBatch)
    }

    // Commit all batches
    console.log(`📦 Committing ${batches.length} batch(es)...`)
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit()
      console.log(`  ✓ Batch ${i + 1}/${batches.length} committed`)
    }

    console.log(`\n✅ Successfully deleted ${totalDeleted} donor task(s)!`)
    console.log('\n🎉 You can now rebuild your donor workflow with the new step-by-step process.')

  } catch (error) {
    console.error('❌ Error deleting donor tasks:', error)
    throw error
  }
}

// Run the script
deleteDonorTasks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
