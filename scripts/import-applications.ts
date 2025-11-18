import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getPayload } from './utils'

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
console.log('')

// Data paths
const QUIZ_DATA_DIR = path.join(__dirname, '../seed_data/quizzes')

// Quiz files to import (in order)
const QUIZ_FILES = [
  'clerks-application-quiz.json',
]

interface QuizQuestion {
  id: string
  type: string
  title: string
  questionType?: string
  [key: string]: any
}

interface ImportStats {
  total: number
  successful: number
  failed: number
  skipped: number
}

/**
 * Import a single application from a quiz JSON file
 */
async function importApplication(
  payload: any,
  filename: string,
): Promise<{ success: boolean; stats: ImportStats }> {
  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  }

  try {
    console.log(`\n📋 Importing application from ${filename}...`)

    const filePath = path.join(QUIZ_DATA_DIR, filename)
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${filename}`)
      return { success: false, stats }
    }

    // Load quiz questions
    const quizData: QuizQuestion[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    stats.total = quizData.length

    console.log(`  Found ${stats.total} questions in ${filename}`)

    // Generate application metadata from filename
    const appSlug = filename.replace('.json', '')
    const appTitle = appSlug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    console.log(`  Application: ${appTitle} (${appSlug})`)

    // Find all imported steps by their original question IDs
    const stepReferences: Array<{ step: number; order: number }> = []
    let notFound = 0

    for (let i = 0; i < quizData.length; i++) {
      const question = quizData[i]

      try {
        // Try to find the step by title (since we imported by title)
        const result = await payload.find({
          collection: 'steps',
          where: {
            title: {
              equals: question.title,
            },
          },
          limit: 1,
        })

        if (result.docs && result.docs.length > 0) {
          stepReferences.push({
            step: result.docs[0].id,
            order: i + 1,
          })
          stats.successful++
        } else {
          console.log(`  ⚠️  Step not found: "${question.title}" (${question.id})`)
          notFound++
          stats.skipped++
        }
      } catch (error) {
        console.error(`  ❌ Error finding step: ${question.id}`, error)
        stats.failed++
      }
    }

    if (stepReferences.length === 0) {
      console.log(`  ⚠️  No steps found for ${filename} - skipping application creation`)
      return { success: false, stats }
    }

    console.log(
      `  Found ${stepReferences.length}/${stats.total} steps (${notFound} not found)`,
    )

    // Create the section
    console.log(`  Creating section...`)
    const section = await payload.create({
      collection: 'sections',
      data: {
        title: `${appTitle} - Main`,
        order: 1,
        steps: stepReferences,
      },
    })

    console.log(`  ✅ Section created: ${section.id}`)

    // Check if application already exists
    const existing = await payload.find({
      collection: 'applications',
      where: {
        slug: {
          equals: appSlug,
        },
      },
      limit: 1,
    })

    let application
    if (existing.docs && existing.docs.length > 0) {
      console.log(`  ⚠️  Application already exists, updating...`)
      application = await payload.update({
        collection: 'applications',
        id: existing.docs[0].id,
        data: {
          title: appTitle,
          description: `Imported from ${filename}`,
          sections: [section.id],
        },
      })
      console.log(`  ✅ Application updated: ${application.id}`)
    } else {
      console.log(`  Creating application...`)
      application = await payload.create({
        collection: 'applications',
        data: {
          title: appTitle,
          slug: appSlug,
          description: `Imported from ${filename}`,
          published: false,
          sections: [section.id],
        },
      })
      console.log(`  ✅ Application created: ${application.id}`)
    }
    console.log(`\n  📊 Summary:`)
    console.log(`     Steps found:    ${stepReferences.length}/${stats.total}`)
    console.log(`     Not found:      ${notFound}`)
    console.log(`     Section ID:     ${section.id}`)
    console.log(`     Application ID: ${application.id}`)

    return { success: true, stats }
  } catch (error) {
    console.error(`\n❌ Error importing ${filename}:`, error)
    return { success: false, stats }
  }
}

/**
 * Main import function
 */
async function run() {
  console.log('📦 Payload CMS - Import Applications\n')

  try {
    // Initialize Payload
    console.log('Initializing Payload...')
    const payload = await getPayload()
    console.log('✅ Payload initialized\n')

    // Use predefined quiz files
    console.log(`Found ${QUIZ_FILES.length} quiz files:\n`)
    QUIZ_FILES.forEach((file, i) => {
      console.log(`  ${i + 1}. ${file}`)
    })

    const overallStats = {
      totalApps: QUIZ_FILES.length,
      successful: 0,
      failed: 0,
      totalSteps: 0,
      stepsImported: 0,
      stepsNotFound: 0,
    }

    // Import each application
    for (const file of QUIZ_FILES) {
      const { success, stats } = await importApplication(payload, file)

      if (success) {
        overallStats.successful++
      } else {
        overallStats.failed++
      }

      overallStats.totalSteps += stats.total
      overallStats.stepsImported += stats.successful
      overallStats.stepsNotFound += stats.skipped
    }

    // Print overall summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 OVERALL SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total quiz files:         ${overallStats.totalApps}`)
    console.log(`✅ Applications created:  ${overallStats.successful}`)
    console.log(`❌ Failed:                ${overallStats.failed}`)
    console.log(`📝 Total steps:           ${overallStats.totalSteps}`)
    console.log(`✅ Steps linked:          ${overallStats.stepsImported}`)
    console.log(`⚠️  Steps not found:      ${overallStats.stepsNotFound}`)
    console.log('='.repeat(60))

    if (overallStats.successful > 0) {
      console.log('\n✅ Import complete!')
      console.log('\n💡 Next steps:')
      console.log('   1. Review applications in admin: /admin/collections/applications')
      console.log('   2. Update application descriptions if needed')
      console.log('   3. Set applications to published when ready')
    } else {
      console.log('\n⚠️  No applications were created')
      console.log(
        '   Make sure steps have been imported first using: npm run import:steps:advanced',
      )
    }

    process.exit(0)
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

run()
