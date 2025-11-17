import { config } from 'dotenv'
import { getPayload } from './utils'
import readline from 'readline'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from payload directory
const envPath = path.resolve(__dirname, '../.env.local')
const result = config({ path: envPath })

// Debug logging
console.log('🔧 Environment Configuration:')
console.log(`  .env.local path: ${envPath}`)
console.log(`  File exists: ${fs.existsSync(envPath)}`)
if (result.error) {
  console.log(`  ❌ Error loading .env: ${result.error}`)
} else {
  console.log(`  ✅ .env.local loaded`)
}
console.log(`  PAYLOAD_SECRET: ${process.env.PAYLOAD_SECRET ? '✅ Set' : '❌ Missing'}`)
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`)
console.log(`  S3_BUCKET: ${process.env.S3_BUCKET ? '✅ Set' : '❌ Missing'}`)
console.log('')

const COLLECTIONS = ['art', 'books', 'films', 'albums', 'media'] as const

async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

async function clearCollections() {
  console.log('🗑️  Payload CMS Clear Script\n')

  // Check for --force flag
  const force = process.argv.includes('--force')

  try {
    // Initialize Payload
    console.log('Initializing Payload...')
    const payload = await getPayload()
    console.log('✅ Payload initialized\n')

    // Get counts for each collection
    console.log('Fetching collection counts...')
    const counts: Record<string, number> = {}

    for (const collection of COLLECTIONS) {
      try {
        const result = await payload.count({ collection })
        counts[collection] = result.totalDocs
      } catch (error) {
        counts[collection] = 0
      }
    }

    // Display counts
    console.log('\n📊 Current Collection Counts:')
    for (const [collection, count] of Object.entries(counts)) {
      console.log(`  ${collection.padEnd(10)} : ${count} documents`)
    }

    const totalDocs = Object.values(counts).reduce((sum, count) => sum + count, 0)
    console.log(`  ${'TOTAL'.padEnd(10)} : ${totalDocs} documents\n`)

    if (totalDocs === 0) {
      console.log('✅ All collections are already empty!')
      process.exit(0)
    }

    // Confirm deletion
    if (!force) {
      const confirmed = await promptConfirmation(
        `⚠️  This will delete ALL ${totalDocs} documents. Are you sure? (y/N): `,
      )

      if (!confirmed) {
        console.log('❌ Deletion cancelled')
        process.exit(0)
      }
    }

    console.log('\n🗑️  Starting deletion...\n')

    // Delete from each collection
    let deletedCount = 0

    for (const collection of COLLECTIONS) {
      if (counts[collection] === 0) {
        console.log(`  ⏭️  Skipping ${collection} (already empty)`)
        continue
      }

      try {
        console.log(`  🗑️  Deleting ${counts[collection]} documents from ${collection}...`)

        // Get all IDs
        const docs = await payload.find({
          collection,
          limit: 10000,
          pagination: false,
        })

        // Delete each document
        for (const doc of docs.docs) {
          await payload.delete({
            collection,
            id: doc.id,
          })
          deletedCount++
        }

        console.log(`  ✅ Deleted ${counts[collection]} from ${collection}`)
      } catch (error) {
        console.error(`  ❌ Error deleting from ${collection}:`, error)
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} documents!`)
    console.log('\n💡 Note: Media files in Supabase storage have also been deleted.')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error during clear operation:', error)
    process.exit(1)
  }
}

clearCollections()
