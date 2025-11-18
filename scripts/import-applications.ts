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

// Main section (first quiz file)
const MAIN_SECTION_FILE = 'clerks-application-quiz.json'

// Follow-up sections (remaining quiz files)
const FOLLOWUP_SECTION_FILES = [
  'book-values-quiz-v4.json',
  'music-values-quiz-v4.json',
  'movie-values-quiz-v4.json',
  'art-values-quiz-v4.json',
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
 * Import a single section from a quiz JSON file
 */
async function importSection(
  payload: any,
  filename: string,
  sectionType: 'main' | 'follow-up',
  order: number,
): Promise<{ success: boolean; stats: ImportStats; sectionId?: number }> {
  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
  }

  try {
    console.log(`\n📋 Importing ${sectionType} section from ${filename}...`)

    const filePath = path.join(QUIZ_DATA_DIR, filename)
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️  File not found: ${filename}`)
      return { success: false, stats }
    }

    // Load quiz questions
    const quizData: QuizQuestion[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    stats.total = quizData.length

    console.log(`  Found ${stats.total} questions in ${filename}`)

    // Generate section metadata from filename
    const sectionSlug = filename.replace('.json', '')
    const sectionTitle = sectionSlug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

    console.log(`  Section: ${sectionTitle} (${sectionType}, order: ${order})`)

    // Find all imported steps by their original question IDs
    const stepReferences: Array<{ step: number; order: number }> = []
    let notFound = 0

    for (let i = 0; i < quizData.length; i++) {
      const question = quizData[i]

      try {
        let result

        // For rating questions, match by the item being rated (not question title)
        if (question.questionType === 'rating' && question.properties?.items?.[0]) {
          const ratingItem = question.properties.items[0]
          const itemCmsSlug = ratingItem.cms_slug

          if (itemCmsSlug) {
            // Find media item by cms_slug
            const categoryMap: { [key: string]: string } = {
              art: 'art',
              books: 'books',
              movies: 'films',
              music: 'albums',
            }

            // Determine category from image_url
            const urlMatch = ratingItem.image_url?.match(
              /^\/images\/(art|books|movies|music)\//,
            )
            const category = urlMatch ? categoryMap[urlMatch[1]] : null

            if (category) {
              // Find the media item
              const mediaResult = await payload.find({
                collection: category,
                where: {
                  slug: {
                    equals: itemCmsSlug,
                  },
                },
                limit: 1,
              })

              if (mediaResult.docs && mediaResult.docs.length > 0) {
                const mediaId = mediaResult.docs[0].id
                const mediaTitle = mediaResult.docs[0].title

                // Find rating step by ratingItem relationship
                const stepResult = await payload.find({
                  collection: 'steps',
                  where: {
                    and: [
                      {
                        questionType: {
                          equals: 'rating',
                        },
                      },
                      {
                        title: {
                          equals: `Rate "${mediaTitle}"`,
                        },
                      },
                    ],
                  },
                  limit: 1,
                })

                result = stepResult
              }
            }
          }
        } else {
          // For non-rating questions, find by title
          result = await payload.find({
            collection: 'steps',
            where: {
              title: {
                equals: question.title,
              },
            },
            limit: 1,
          })
        }

        if (result && result.docs && result.docs.length > 0) {
          stepReferences.push({
            step: result.docs[0].id,
            order: i + 1,
          })
          stats.successful++
        } else {
          console.log(
            `  ⚠️  Step not found: "${question.title}" (${question.id})`,
          )
          notFound++
          stats.skipped++
        }
      } catch (error) {
        console.error(`  ❌ Error finding step: ${question.id}`, error)
        stats.failed++
      }
    }

    if (stepReferences.length === 0) {
      console.log(`  ⚠️  No steps found for ${filename} - skipping section creation`)
      return { success: false, stats }
    }

    console.log(`  Found ${stepReferences.length}/${stats.total} steps (${notFound} not found)`)

    // Create the section
    console.log(`  Creating section...`)
    const section = await payload.create({
      collection: 'sections',
      data: {
        title: sectionTitle,
        order: order,
        steps: stepReferences,
      },
    })

    console.log(`  ✅ Section created: ${section.id}`)
    console.log(`\n  📊 Section Summary:`)
    console.log(`     Steps found:    ${stepReferences.length}/${stats.total}`)
    console.log(`     Not found:      ${notFound}`)
    console.log(`     Section ID:     ${section.id}`)

    return { success: true, stats, sectionId: section.id }
  } catch (error) {
    console.error(`\n❌ Error importing ${filename}:`, error)
    return { success: false, stats }
  }
}

/**
 * Main import function
 */
async function run() {
  console.log('📦 Payload CMS - Import Clerks Application\n')

  try {
    // Initialize Payload
    console.log('Initializing Payload...')
    const payload = await getPayload()
    console.log('✅ Payload initialized\n')

    const mainSectionIds: number[] = []
    const followUpSectionIds: number[] = []
    const overallStats = {
      totalSections: 1 + FOLLOWUP_SECTION_FILES.length,
      successfulSections: 0,
      failedSections: 0,
      totalSteps: 0,
      stepsLinked: 0,
      stepsNotFound: 0,
    }

    // Import main section
    console.log('📋 MAIN SECTION')
    console.log('='.repeat(60))
    const mainResult = await importSection(payload, MAIN_SECTION_FILE, 'main', 1)

    if (mainResult.success && mainResult.sectionId) {
      mainSectionIds.push(mainResult.sectionId)
      overallStats.successfulSections++
      overallStats.totalSteps += mainResult.stats.total
      overallStats.stepsLinked += mainResult.stats.successful
      overallStats.stepsNotFound += mainResult.stats.skipped
    } else {
      overallStats.failedSections++
    }

    // Import follow-up sections
    console.log('\n📋 FOLLOW-UP SECTIONS')
    console.log('='.repeat(60))

    for (let i = 0; i < FOLLOWUP_SECTION_FILES.length; i++) {
      const file = FOLLOWUP_SECTION_FILES[i]
      const order = i + 2 // Main is 1, follow-ups start at 2

      const result = await importSection(payload, file, 'follow-up', order)

      if (result.success && result.sectionId) {
        followUpSectionIds.push(result.sectionId)
        overallStats.successfulSections++
      } else {
        overallStats.failedSections++
      }

      overallStats.totalSteps += result.stats.total
      overallStats.stepsLinked += result.stats.successful
      overallStats.stepsNotFound += result.stats.skipped
    }

    // Create the application with all sections
    const totalSections = mainSectionIds.length + followUpSectionIds.length
    if (totalSections > 0) {
      console.log('\n📋 CREATING APPLICATION')
      console.log('='.repeat(60))

      const appSlug = 'clerks-application'
      const appTitle = 'Clerks Application'

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
        console.log(`⚠️  Application already exists, updating...`)
        application = await payload.update({
          collection: 'applications',
          id: existing.docs[0].id,
          data: {
            title: appTitle,
            description: `Clerks Application with ${mainSectionIds.length} main section(s) and ${followUpSectionIds.length} follow-up section(s)`,
            mainSections: mainSectionIds,
            followUpSections: followUpSectionIds,
          },
        })
        console.log(`✅ Application updated: ${application.id}`)
      } else {
        console.log(`Creating application...`)
        application = await payload.create({
          collection: 'applications',
          data: {
            title: appTitle,
            slug: appSlug,
            description: `Clerks Application with ${mainSectionIds.length} main section(s) and ${followUpSectionIds.length} follow-up section(s)`,
            published: false,
            mainSections: mainSectionIds,
            followUpSections: followUpSectionIds,
          },
        })
        console.log(`✅ Application created: ${application.id}`)
      }

      // Print overall summary
      console.log('\n' + '='.repeat(60))
      console.log('📊 OVERALL SUMMARY')
      console.log('='.repeat(60))
      console.log(`Application:              ${appTitle}`)
      console.log(`Application ID:           ${application.id}`)
      console.log(`Main sections:            ${mainSectionIds.length}`)
      console.log(`Follow-up sections:       ${followUpSectionIds.length}`)
      console.log(`Total sections:           ${overallStats.totalSections}`)
      console.log(`✅ Sections created:      ${overallStats.successfulSections}`)
      console.log(`❌ Sections failed:       ${overallStats.failedSections}`)
      console.log(`📝 Total steps:           ${overallStats.totalSteps}`)
      console.log(`✅ Steps linked:          ${overallStats.stepsLinked}`)
      console.log(`⚠️  Steps not found:      ${overallStats.stepsNotFound}`)
      console.log('='.repeat(60))

      console.log('\n✅ Import complete!')
      console.log('\n💡 Next steps:')
      console.log('   1. Review application: /admin/collections/applications/' + application.id)
      console.log('   2. Update application description if needed')
      console.log('   3. Set application to published when ready')
    } else {
      console.log('\n⚠️  No sections were created - application not created')
      console.log('   Make sure steps have been imported first using: pnpm import:steps:advanced')
    }

    process.exit(0)
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

run()
