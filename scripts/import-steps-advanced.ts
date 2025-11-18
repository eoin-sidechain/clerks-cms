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
interface QuizItem {
  id: string
  label: string
  image_url: string
  cms_slug?: string
  description?: string
}

interface QuizChoice {
  id: string
  label: string
  image_url: string
  cms_slug?: string
  description?: string
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
    items?: QuizItem[]
    choices?: QuizChoice[]
    ratingLabels?: Array<{ label: string; value: number }>
  }
}

// Import statistics
interface ImportStats {
  total: number
  successful: number
  failed: number
  skipped: number
  notFound: number
}

/**
 * Find media item by cms_slug
 * Simple exact match using the cms_slug field from quiz data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findMediaBySlug(payload: any, item: QuizItem | QuizChoice): Promise<any> {
  const collections = ['albums', 'books', 'films', 'art']

  // Use cms_slug if available, otherwise fall back to id
  const slug = item.cms_slug || item.id

  // Try exact slug match across all collections
  for (const collection of collections) {
    try {
      const result = await payload.find({
        collection,
        where: {
          slug: {
            equals: slug,
          },
        },
        limit: 1,
      })

      if (result.docs && result.docs.length > 0) {
        return {
          id: result.docs[0].id,
          collection,
        }
      }
    } catch (error) {
      continue
    }
  }

  console.log(`  ⚠️  Not found: ${slug} (${item.label})`)
  return null
}

/**
 * Import Rating Steps
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importRatingSteps(payload: any): Promise<ImportStats> {
  console.log('\n⭐ Importing Rating Steps...')

  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    notFound: 0,
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

    // Filter for rating questions
    const ratingQuestions = allQuestions.filter(
      (q) => q.type === 'question' && q.questionType === 'rating',
    )

    stats.total = ratingQuestions.length
    console.log(`  Found ${stats.total} rating questions`)

    const progress = new ProgressBar(stats.total)

    for (const question of ratingQuestions) {
      try {
        // Get the item to be rated
        const item = question.properties?.items?.[0]
        if (!item) {
          console.log(`\n  ⚠️  Skipping "${question.id}" - no item found`)
          stats.skipped++
          progress.increment()
          continue
        }

        // Find the media item in the database
        const mediaItem = await findMediaBySlug(payload, item)
        if (!mediaItem || !mediaItem.id) {
          stats.notFound++
          stats.skipped++
          progress.increment()
          continue
        }

        // Build step data
        // For polymorphic relationships, need to specify both relationTo and value
        // Note: title will be auto-generated from ratingItem via beforeChange hook
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stepData: any = {
          title: 'Placeholder', // Will be auto-generated
          stepType: 'question',
          questionType: 'rating',
          mediaType: mediaItem.collection,
          ratingItem: {
            relationTo: mediaItem.collection,
            value: Number(mediaItem.id),
          },
        }

        // Add description if present
        if (question.description) {
          stepData.description = question.description
        }

        // Only add rating labels if they exist in the source data (optional field)
        if (question.properties?.ratingLabels && question.properties.ratingLabels.length > 0) {
          stepData.ratingLabels = question.properties.ratingLabels
        }

        // Create step document
        await payload.create({
          collection: 'steps',
          data: stepData,
        })

        stats.successful++
      } catch (error: any) {
        console.error(`\n  ❌ Failed to import "${question.id}":`)
        console.error('  Error message:', error.message)
        if (error.data?.errors) {
          console.error('  Validation errors:', JSON.stringify(error.data.errors, null, 2))
        }
        console.error('  Full error:', error)
        stats.failed++
      }

      progress.increment()
    }
  } catch (error) {
    console.error('  ❌ Error importing rating steps:', error)
  }

  return stats
}

/**
 * Import This or That Steps
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importThisOrThatSteps(payload: any): Promise<ImportStats> {
  console.log('\n🔀 Importing This or That Steps...')

  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    notFound: 0,
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

    // Filter for this_or_that questions (including with_alternates variant)
    const thisOrThatQuestions = allQuestions.filter(
      (q) =>
        q.type === 'question' &&
        (q.questionType === 'this_or_that' || q.questionType === 'this_or_that_with_alternates'),
    )

    stats.total = thisOrThatQuestions.length
    console.log(`  Found ${stats.total} this-or-that questions`)

    const progress = new ProgressBar(stats.total)

    for (const question of thisOrThatQuestions) {
      try {
        // Get the two choices (skip "I Don't Know These" option if present)
        const choices = question.properties?.choices?.filter((c) => c.id !== 'dont-know') || []

        if (choices.length < 2) {
          console.log(`\n  ⚠️  Skipping "${question.id}" - needs at least 2 choices`)
          stats.skipped++
          progress.increment()
          continue
        }

        // Find both media items
        const mediaA = await findMediaBySlug(payload, choices[0])
        const mediaB = await findMediaBySlug(payload, choices[1])

        if (!mediaA || !mediaB || !mediaA.id || !mediaB.id) {
          stats.notFound++
          stats.skipped++
          progress.increment()
          continue
        }

        // Determine media type (should be same for both)
        const mediaType = mediaA.collection || 'albums'

        // Create step document
        const thisOrThatData: any = {
          title: question.title,
          stepType: 'question',
          questionType: 'this_or_that',
          mediaType: mediaType,
          optionA: {
            relationTo: mediaA.collection,
            value: Number(mediaA.id),
          },
          optionB: {
            relationTo: mediaB.collection,
            value: Number(mediaB.id),
          },
        }

        // Add description if present
        if (question.description) {
          thisOrThatData.description = question.description
        }

        await payload.create({
          collection: 'steps',
          data: thisOrThatData,
        })

        stats.successful++
      } catch (error) {
        console.error(`\n  ❌ Failed to import "${question.id}":`, error)
        stats.failed++
      }

      progress.increment()
    }
  } catch (error) {
    console.error('  ❌ Error importing this-or-that steps:', error)
  }

  return stats
}

/**
 * Import Ranking Steps
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importRankingSteps(payload: any): Promise<ImportStats> {
  console.log('\n📊 Importing Ranking Steps...')

  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    notFound: 0,
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

    // Filter for ranking questions
    const rankingQuestions = allQuestions.filter(
      (q) => q.type === 'question' && q.questionType === 'ranking',
    )

    stats.total = rankingQuestions.length
    console.log(`  Found ${stats.total} ranking questions`)

    const progress = new ProgressBar(stats.total)

    for (const question of rankingQuestions) {
      try {
        // Get the items to rank (uses "choices" array in JSON)
        const items = question.properties?.choices || []

        if (items.length === 0 || items.length > 4) {
          console.log(`\n  ⚠️  Skipping "${question.id}" - needs 1-4 items (has ${items.length})`)
          stats.skipped++
          progress.increment()
          continue
        }

        // Find all media items
        const mediaItems = []
        let allFound = true

        for (const item of items) {
          const media = await findMediaBySlug(payload, item)
          if (!media || !media.id) {
            stats.notFound++
            allFound = false
            break
          }
          mediaItems.push(media)
        }

        if (!allFound) {
          stats.skipped++
          progress.increment()
          continue
        }

        // Determine media type (use first item)
        const mediaType = mediaItems[0].collection || 'albums'

        // Create step document
        const rankingData: any = {
          title: question.title,
          stepType: 'question',
          questionType: 'ranking',
          mediaType: mediaType,
          rankingOptions: mediaItems.map((media) => ({
            item: {
              relationTo: media.collection,
              value: Number(media.id),
            },
          })),
        }

        // Add description if present
        if (question.description) {
          rankingData.description = question.description
        }

        await payload.create({
          collection: 'steps',
          data: rankingData,
        })

        stats.successful++
      } catch (error) {
        console.error(`\n  ❌ Failed to import "${question.id}":`, error)
        stats.failed++
      }

      progress.increment()
    }
  } catch (error) {
    console.error('  ❌ Error importing ranking steps:', error)
  }

  return stats
}

/**
 * Print import summary
 */
function printSummary(questionType: string, stats: ImportStats) {
  console.log(`\n  📊 ${questionType} Import Summary:`)
  console.log(`     Total:          ${stats.total}`)
  console.log(`     ✅ Successful:  ${stats.successful}`)
  console.log(`     ❌ Failed:      ${stats.failed}`)
  console.log(`     ⏭️  Skipped:     ${stats.skipped}`)
  console.log(`     🔍 Not Found:   ${stats.notFound} media items`)
}

/**
 * Main import function
 */
async function runImport() {
  console.log('📦 Payload CMS Advanced Steps Import Script\n')
  console.log('Source: seed_data/quizzes/\n')

  // Parse command line arguments
  const args = process.argv.slice(2)
  const importAll = args.length === 0 || args.includes('--all')
  const importRating = importAll || args.includes('--rating')
  const importThisOrThat = importAll || args.includes('--this-or-that')
  const importRanking = importAll || args.includes('--ranking')

  try {
    // Initialize Payload
    console.log('Initializing Payload...')
    const payload = await getPayload()
    console.log('✅ Payload initialized')

    const allStats: Record<string, ImportStats> = {}

    // Import based on flags
    if (importRating) {
      allStats.rating = await importRatingSteps(payload)
      printSummary('Rating', allStats.rating)
    }

    if (importThisOrThat) {
      allStats.thisOrThat = await importThisOrThatSteps(payload)
      printSummary('This or That', allStats.thisOrThat)
    }

    if (importRanking) {
      allStats.ranking = await importRankingSteps(payload)
      printSummary('Ranking', allStats.ranking)
    }

    // Print overall summary
    const totalStats = Object.values(allStats).reduce(
      (acc, stats) => ({
        total: acc.total + stats.total,
        successful: acc.successful + stats.successful,
        failed: acc.failed + stats.failed,
        skipped: acc.skipped + stats.skipped,
        notFound: acc.notFound + stats.notFound,
      }),
      { total: 0, successful: 0, failed: 0, skipped: 0, notFound: 0 },
    )

    console.log('\n' + '='.repeat(50))
    console.log('📊 OVERALL SUMMARY')
    console.log('='.repeat(50))
    console.log(`Total items processed:    ${totalStats.total}`)
    console.log(`✅ Successfully imported: ${totalStats.successful}`)
    console.log(`❌ Failed:                ${totalStats.failed}`)
    console.log(`⏭️  Skipped:               ${totalStats.skipped}`)
    console.log(`🔍 Media not found:       ${totalStats.notFound}`)
    console.log('='.repeat(50))

    console.log('\n✅ Import complete!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  }
}

runImport()
