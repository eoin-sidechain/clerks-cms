import { config } from 'dotenv'
import { getPayload, ProgressBar } from './utils'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

// Paths to source data
const SEED_DATA_DIR = path.resolve(__dirname, '../seed_data')
const QUIZ_DATA_DIR = path.join(SEED_DATA_DIR, 'quizzes')

// Types for source quiz data
interface QuizChoice {
  id: string
  label: string
}

interface QuizQuestion {
  id: string
  type: string
  title: string
  subtitle?: string
  required?: boolean
  description?: string
  questionType?: string
  properties?: {
    placeholder?: string
    choices?: QuizChoice[]
    button_text?: string
    content?: any[]
  }
}

// Import statistics
interface ImportStats {
  total: number
  successful: number
  failed: number
  skipped: number
}

/**
 * Import Steps from quiz JSON files
 * Supports: short_text, long_text, multiple_choice
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importSteps(payload: any, questionTypes: string[]): Promise<ImportStats> {
  console.log(`\n📝 Importing Steps (${questionTypes.join(', ')})...`)

  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  }

  // Quiz files to import
  const quizFiles = [
    'clerks-application-quiz.json',
    'book-values-quiz-v4.json',
    'music-values-quiz-v4.json',
    'movie-values-quiz-v4.json',
    'art-values-quiz-v4.json',
  ]

  try {
    // Load all quiz questions
    const allQuestions: QuizQuestion[] = []

    for (const file of quizFiles) {
      const filePath = path.join(QUIZ_DATA_DIR, file)
      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  Skipping ${file} (not found)`)
        continue
      }

      const quizData: QuizQuestion[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      allQuestions.push(...quizData)
    }

    // Filter for questions of the specified types
    const filteredQuestions = allQuestions.filter(
      (q) => q.type === 'question' && q.questionType && questionTypes.includes(q.questionType),
    )

    stats.total = filteredQuestions.length
    console.log(`  Found ${stats.total} questions matching: ${questionTypes.join(', ')}`)

    const progress = new ProgressBar(stats.total)

    for (const question of filteredQuestions) {
      try {
        // Base data for all question types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stepData: any = {
          title: question.title,
          stepType: 'question',
          questionType: question.questionType,
        }

        // Add subtitle if present
        if (question.subtitle) {
          stepData.subtitle = question.subtitle
        }

        // Add placeholder for text questions
        if (
          (question.questionType === 'short_text' || question.questionType === 'long_text') &&
          question.properties?.placeholder
        ) {
          stepData.placeholder = question.properties.placeholder
        }

        // Handle multiple_choice: map choices to options
        if (question.questionType === 'multiple_choice' && question.properties?.choices) {
          stepData.options = question.properties.choices.map((choice) => ({
            label: choice.label,
            value: choice.id,
          }))
        }

        // Create step document
        await payload.create({
          collection: 'steps',
          data: stepData,
        })

        stats.successful++
      } catch (error) {
        console.error(`\n  ❌ Failed to import question "${question.id}":`, error)
        stats.failed++
      }

      progress.increment()
    }
  } catch (error) {
    console.error('  ❌ Error importing steps:', error)
  }

  return stats
}

/**
 * Print import summary
 */
function printSummary(stats: ImportStats) {
  console.log(`\n  📊 Import Summary:`)
  console.log(`     Total:          ${stats.total}`)
  console.log(`     ✅ Successful:  ${stats.successful}`)
  console.log(`     ❌ Failed:      ${stats.failed}`)
  console.log(`     ⏭️  Skipped:     ${stats.skipped}`)
}

/**
 * Main import function
 */
async function runImport() {
  console.log('📦 Payload CMS Steps Import Script\n')
  console.log('Source: seed_data/quizzes/\n')

  // Parse command line arguments
  const args = process.argv.slice(2)

  // Determine which question types to import
  let questionTypes: string[] = []

  if (args.includes('--short-text')) {
    questionTypes.push('short_text')
  }
  if (args.includes('--long-text')) {
    questionTypes.push('long_text')
  }
  if (args.includes('--multiple-choice')) {
    questionTypes.push('multiple_choice')
  }
  if (args.includes('--basic')) {
    questionTypes = ['short_text', 'long_text', 'multiple_choice']
  }

  // Default to all basic types if no args
  if (questionTypes.length === 0) {
    questionTypes = ['short_text', 'long_text', 'multiple_choice']
  }

  try {
    // Initialize Payload
    console.log('Initializing Payload...')
    const payload = await getPayload()
    console.log('✅ Payload initialized')

    // Import steps
    const stats = await importSteps(payload, questionTypes)
    printSummary(stats)

    console.log('\n✅ Import complete!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  }
}

runImport()
