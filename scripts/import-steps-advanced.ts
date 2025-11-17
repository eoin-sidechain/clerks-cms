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
const WEB_DIR = path.resolve('../web')
const QUIZ_DATA_DIR = path.join(WEB_DIR, 'src/data/quiz-templates-json')

// Types for source quiz data
interface QuizItem {
  id: string
  label: string
  image_url: string
  description?: string
}

interface QuizChoice {
  id: string
  label: string
  image_url: string
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
 * Normalize text for matching (remove accents, lowercase)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special chars except dash and space
    .trim()
}

/**
 * Parse slug formats - returns multiple possible interpretations
 * - title-year-creator (e.g., "the-help-2009-kathryn-stockett")
 * - title-creator-year (e.g., "the-help-kathryn-stockett-2009")
 * - creator-title-year (e.g., "metallica-master-of-puppets-1986")
 */
function parseSlug(
  slug: string,
): Array<{ title?: string; creator?: string; year?: number }> {
  const parts = slug.split('-')
  const results: Array<{ title?: string; creator?: string; year?: number }> = []

  // Look for year (4 consecutive digits)
  const yearIndex = parts.findIndex((part) => /^\d{4}$/.test(part))
  const year = yearIndex !== -1 ? parseInt(parts[yearIndex], 10) : undefined

  if (yearIndex !== -1) {
    // Year found - try different interpretations
    const beforeYear = parts.slice(0, yearIndex).join(' ')
    const afterYear = parts.slice(yearIndex + 1).join(' ')

    // Interpretation 1: title-year-creator
    if (beforeYear && afterYear) {
      results.push({ title: beforeYear, creator: afterYear, year })
      // Also try swapped (creator-year-title)
      results.push({ title: afterYear, creator: beforeYear, year })
    } else if (beforeYear) {
      results.push({ title: beforeYear, year })
    } else if (afterYear) {
      results.push({ title: afterYear, year })
    }

    // Interpretation 2: try splitting before-year into title and creator
    if (beforeYear) {
      const beforeParts = beforeYear.split(' ')
      for (let split = 1; split < beforeParts.length; split++) {
        const titlePart = beforeParts.slice(0, split).join(' ')
        const creatorPart = beforeParts.slice(split).join(' ')
        results.push({ title: titlePart, creator: creatorPart, year })
        // Also try swapped
        results.push({ title: creatorPart, creator: titlePart, year })
      }
    }

    // Interpretation 3: try splitting after-year into title and creator
    if (afterYear) {
      const afterParts = afterYear.split(' ')
      for (let split = 1; split < afterParts.length; split++) {
        const titlePart = afterParts.slice(0, split).join(' ')
        const creatorPart = afterParts.slice(split).join(' ')
        results.push({ title: titlePart, creator: creatorPart, year })
        // Also try swapped
        results.push({ title: creatorPart, creator: titlePart, year })
      }
    }
  } else {
    // No year - try different split points
    for (let split = 1; split < parts.length; split++) {
      const firstPart = parts.slice(0, split).join(' ')
      const secondPart = parts.slice(split).join(' ')
      results.push({ title: firstPart, creator: secondPart })
      // Also try swapped
      results.push({ title: secondPart, creator: firstPart })
    }
  }

  return results
}

/**
 * Find media item by slug with three-tier matching strategy:
 * 1. Exact slug match
 * 2. Match without year (removes -YYYY- from both sides)
 * 3. Fuzzy title matching
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findMediaBySlug(
  payload: any,
  slug: string,
  label?: string,
): Promise<any> {
  const collections = ['albums', 'books', 'films', 'art']

  // STRATEGY 1: Try exact slug match
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
        console.log(`  ✓ Found by exact slug: ${slug}`)
        return {
          id: result.docs[0].id,
          collection,
        }
      }
    } catch (error) {
      continue
    }
  }

  // STRATEGY 1b: Try slug with underscores converted to dashes (for art filenames)
  if (slug.includes('_')) {
    const slugWithDashes = slug.replace(/_/g, '-')
    console.log(`  🔍 Trying with dashes: "${slug}" → "${slugWithDashes}"`)

    for (const collection of collections) {
      try {
        const result = await payload.find({
          collection,
          where: {
            slug: {
              equals: slugWithDashes,
            },
          },
          limit: 1,
        })

        if (result.docs && result.docs.length > 0) {
          console.log(`  ✓ Found by slug with dashes: ${slugWithDashes}`)
          return {
            id: result.docs[0].id,
            collection,
          }
        }
      } catch (error) {
        continue
      }
    }
  }

  // STRATEGY 2: Try matching without year on both sides
  // Remove year pattern (YYYY with optional surrounding dashes/underscores)
  const slugWithoutYear = slug
    .replace(/[-_]?\d{4}[-_]?/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')

  if (slugWithoutYear !== slug) {
    console.log(`  🔍 Trying without year: "${slug}" → "${slugWithoutYear}"`)

    for (const collection of collections) {
      try {
        const result = await payload.find({
          collection,
          where: {
            slug: {
              equals: slugWithoutYear,
            },
          },
          limit: 1,
        })

        if (result.docs && result.docs.length > 0) {
          console.log(`  ✓ Found by slug without year: ${slugWithoutYear}`)
          return {
            id: result.docs[0].id,
            collection,
          }
        }
      } catch (error) {
        continue
      }
    }
  }

  // STRATEGY 3: Fuzzy matching on title
  // Extract search terms from slug (use label if available, otherwise parse slug)
  let searchTerms: string[] = []

  if (label) {
    // Parse label format: "Title (Creator)" or "Title - Creator"
    const titleMatch = label.match(/^(.+?)\s*[\(\-]/)
    if (titleMatch) {
      searchTerms.push(normalizeText(titleMatch[1].trim()))
    } else {
      searchTerms.push(normalizeText(label))
    }
  }

  // Also try extracting from slug
  const slugParts = slugWithoutYear.split('-').filter((p) => p.length > 0)

  // Try different word counts: start from longer (more specific) to shorter
  for (let wordCount = Math.min(5, slugParts.length); wordCount >= 2; wordCount--) {
    const term = normalizeText(slugParts.slice(0, wordCount).join(' '))
    if (term.length >= 5 && !searchTerms.includes(term)) {
      searchTerms.push(term)
    }
  }

  console.log(`  🔍 Trying fuzzy matches: ${searchTerms.join(', ')}`)

  for (const searchTerm of searchTerms) {
    for (const collection of collections) {
      try {
        const result = await payload.find({
          collection,
          where: {
            title: {
              contains: searchTerm,
            },
          },
          limit: 1,
        })

        if (result.docs && result.docs.length > 0) {
          console.log(`  ✓ Found by fuzzy match: "${searchTerm}" in ${collection}`)
          return {
            id: result.docs[0].id,
            collection,
          }
        }
      } catch (error) {
        continue
      }
    }
  }

  console.log(`  ✗ Not found: ${slug}`)
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
        const mediaItem = await findMediaBySlug(payload, item.id, item.label)
        if (!mediaItem || !mediaItem.id) {
          console.log(`\n  ⚠️  Media not found for: ${item.id} (${item.label})`)
          stats.notFound++
          stats.skipped++
          progress.increment()
          continue
        }

        // Debug: log what we found
        console.log(
          `  Found media: ${mediaItem.collection} ID=${mediaItem.id} (type: ${typeof mediaItem.id})`,
        )

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

        // Only add rating labels if they exist in the source data (optional field)
        if (question.properties?.ratingLabels && question.properties.ratingLabels.length > 0) {
          stepData.ratingLabels = question.properties.ratingLabels
        }

        // Debug: verify the book exists
        try {
          const verifyBook = await payload.findByID({
            collection: mediaItem.collection,
            id: mediaItem.id,
          })
          console.log(
            `  ✓ Verified ${mediaItem.collection} exists: "${verifyBook.title}" (ID: ${verifyBook.id})`,
          )
        } catch (verifyError) {
          console.error(`  ❌ Could not verify ${mediaItem.collection} ID ${mediaItem.id}:`, verifyError)
        }

        // Debug: log the full data being sent
        console.log('  📦 Creating step with data:', JSON.stringify(stepData, null, 2))

        // Create step document
        const createdStep = await payload.create({
          collection: 'steps',
          data: stepData,
        })

        // Debug: log what was actually saved
        console.log('  ✅ Created step ID:', createdStep.id)
        console.log('  📊 Saved ratingItem:', JSON.stringify(createdStep.ratingItem, null, 2))
        console.log('  📊 Saved mediaType:', createdStep.mediaType)

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
        const mediaA = await findMediaBySlug(payload, choices[0].id, choices[0].label)
        const mediaB = await findMediaBySlug(payload, choices[1].id, choices[1].label)

        if (!mediaA || !mediaB || !mediaA.id || !mediaB.id) {
          const missing = !mediaA ? choices[0] : choices[1]
          console.log(`\n  ⚠️  Media not found for: ${missing.id} (${missing.label})`)
          stats.notFound++
          stats.skipped++
          progress.increment()
          continue
        }

        // Determine media type (should be same for both)
        const mediaType = mediaA.collection || 'albums'

        // Create step document
        await payload.create({
          collection: 'steps',
          data: {
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
          },
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
          console.log(
            `\n  ⚠️  Skipping "${question.id}" - needs 1-4 items (has ${items.length})`,
          )
          stats.skipped++
          progress.increment()
          continue
        }

        // Find all media items
        const mediaItems = []
        let allFound = true

        for (const item of items) {
          const media = await findMediaBySlug(payload, item.id, item.label)
          if (!media || !media.id) {
            console.log(`\n  ⚠️  Media not found for: ${item.id} (${item.label})`)
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
        await payload.create({
          collection: 'steps',
          data: {
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
          },
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
  console.log('Source: /web/src/data/quiz-templates-json/\n')

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
