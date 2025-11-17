import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getPayload, ProgressBar } from './utils'

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
const WEB_DIR = path.resolve('../web')
const QUIZ_DATA_DIR = path.join(WEB_DIR, 'src/data/quiz-templates-json')

interface QuizQuestion {
  id: string
  type: string
  title: string
  properties?: {
    button_text?: string
    content?: any[]
    [key: string]: any
  }
  [key: string]: any
}

interface ImportStats {
  total: number
  successful: number
  failed: number
  skipped: number
}

/**
 * Import Statement Steps
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importStatementSteps(payload: any): Promise<ImportStats> {
  console.log('\n📄 Importing Statement Steps...')

  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  }

  // Quiz files to import
  const quizFiles = ['clerks-application-quiz.json']

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

    // Filter for statement types
    const statementQuestions = allQuestions.filter(
      (q) =>
        q.type === 'statement' ||
        q.type === 'video_statement' ||
        q.type === 'audio_statement' ||
        q.type === 'text_statement',
    )

    stats.total = statementQuestions.length
    console.log(`  Found ${stats.total} statement questions`)

    const progress = new ProgressBar(stats.total)

    for (const question of statementQuestions) {
      try {
        // Determine statement type based on the type field
        let statementType: 'text' | 'video' | 'audio' = 'text'
        if (question.type === 'video_statement') {
          statementType = 'video'
        } else if (question.type === 'audio_statement') {
          statementType = 'audio'
        }

        // Build the step data
        const stepData: any = {
          title: question.title,
          stepType: 'statement',
          statementType: statementType,
        }

        // Add CTA if button text is provided
        if (question.properties?.button_text) {
          stepData.cta = {
            text: question.properties.button_text,
            url: '', // No URL in the source data
          }
        }

        // For text statements, add content if available
        if (statementType === 'text' && question.properties?.content) {
          // Convert content array to rich text format
          // For now, just store as simple text
          const textContent = question.properties.content
            .map((item: any) => {
              if (typeof item === 'string') return item
              if (item.text) return item.text
              return ''
            })
            .filter((t: string) => t)
            .join('\n\n')

          if (textContent) {
            stepData.textContent = [
              {
                children: [
                  {
                    text: textContent,
                  },
                ],
              },
            ]
          }
        }

        // Create the step
        await payload.create({
          collection: 'steps',
          data: stepData,
        })

        stats.successful++
        progress.increment()
      } catch (error) {
        console.error(`\n  ❌ Error importing "${question.id}":`, error)
        stats.failed++
        progress.increment()
      }
    }

    return stats
  } catch (error) {
    console.error('\n❌ Fatal error during statement import:', error)
    return stats
  }
}

/**
 * Main script
 */
async function run() {
  try {
    console.log('📦 Payload CMS - Import Statements\n')
    const payload = await getPayload()
    console.log('✅ Payload initialized\n')

    // Import statements
    const stats = await importStatementSteps(payload)

    // Print summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 IMPORT SUMMARY')
    console.log('='.repeat(50))
    console.log(`Total statements:     ${stats.total}`)
    console.log(`✅ Successfully imported: ${stats.successful}`)
    console.log(`❌ Failed:                ${stats.failed}`)
    console.log(`⏭️  Skipped:               ${stats.skipped}`)
    console.log('='.repeat(50))

    if (stats.successful > 0) {
      console.log('\n✅ Import complete!')
    }

    process.exit(0)
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

run()
