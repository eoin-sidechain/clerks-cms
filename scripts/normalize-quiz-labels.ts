import fs from 'fs'
import path from 'path'

/**
 * Script to normalize quiz labels based on actual asset metadata
 * Fixes inconsistent formatting by looking up items in asset JSON files
 */

interface QuizItem {
  id: string
  label: string
  image_url?: string
  cms_slug?: string
  cms_image_url?: string
  description?: string
}

interface QuizQuestion {
  id: string
  type: string
  title: string
  required?: boolean
  questionType?: string
  description?: string
  properties?: {
    items?: QuizItem[]
    choices?: QuizItem[]
    [key: string]: any
  }
}

// Asset interfaces
interface ArtAsset {
  title: string
  author: string // Note: uses "author" not "artist"
  year: string
  cms_slug: string
}

interface FilmAsset {
  title: string
  director: string
  year: string
  cms_slug: string
}

interface BookAsset {
  title: string
  author: string
  year: string
  cms_slug: string
}

interface MusicAsset {
  artist: string
  album: string
  year: string
  cms_slug: string
}

// Load asset data
const assetsDir = path.join(process.cwd(), 'seed_data', 'assets')

const artAssets: ArtAsset[] = JSON.parse(
  fs.readFileSync(path.join(assetsDir, 'art.json'), 'utf-8'),
)
const filmAssets: FilmAsset[] = JSON.parse(
  fs.readFileSync(path.join(assetsDir, 'films.json'), 'utf-8'),
)
const bookAssets: BookAsset[] = JSON.parse(
  fs.readFileSync(path.join(assetsDir, 'literature.json'), 'utf-8'),
)
const musicAssets: MusicAsset[] = JSON.parse(
  fs.readFileSync(path.join(assetsDir, 'music.json'), 'utf-8'),
)

// Create lookup maps
const artMap = new Map(artAssets.map((a) => [a.cms_slug, a]))
const filmMap = new Map(filmAssets.map((f) => [f.cms_slug, f]))
const bookMap = new Map(bookAssets.map((b) => [b.cms_slug, b]))
const musicMap = new Map(musicAssets.map((m) => [m.cms_slug, m]))

/**
 * Determine category from image URL
 */
function getCategoryFromImageUrl(imageUrl?: string): string | null {
  if (!imageUrl) return null
  if (imageUrl.includes('/images/art/')) return 'art'
  if (imageUrl.includes('/images/books/')) return 'books'
  if (imageUrl.includes('/images/movies/')) return 'films'
  if (imageUrl.includes('/images/music/')) return 'music'
  return null
}

/**
 * Generate proper label based on category and asset data
 */
function generateLabel(cmsSlug: string, category: string): string | null {
  switch (category) {
    case 'art': {
      const asset = artMap.get(cmsSlug)
      if (asset) {
        return `${asset.title} (${asset.author})`
      }
      break
    }
    case 'films': {
      const asset = filmMap.get(cmsSlug)
      if (asset) {
        return `${asset.title} (${asset.director})`
      }
      break
    }
    case 'books': {
      const asset = bookMap.get(cmsSlug)
      if (asset) {
        return `${asset.title} (${asset.author})`
      }
      break
    }
    case 'music': {
      const asset = musicMap.get(cmsSlug)
      if (asset) {
        // Format as "Album (Artist)" for consistency
        return `${asset.album} (${asset.artist})`
      }
      break
    }
  }
  return null
}

function normalizeQuizLabels(filePath: string, fileName: string): void {
  console.log(`\nProcessing: ${fileName}`)

  const content = fs.readFileSync(filePath, 'utf-8')
  const quiz: QuizQuestion[] = JSON.parse(content)

  let updatedCount = 0
  let notFoundCount = 0

  quiz.forEach((question) => {
    if (question.type !== 'question') return

    // Process items array (for rating questions)
    if (question.properties?.items) {
      question.properties.items.forEach((item) => {
        if (item.cms_slug && item.image_url) {
          const category = getCategoryFromImageUrl(item.image_url)
          if (category) {
            const newLabel = generateLabel(item.cms_slug, category)
            if (newLabel) {
              if (newLabel !== item.label) {
                console.log(`  [ITEM] "${item.label}" -> "${newLabel}"`)
                item.label = newLabel
                updatedCount++
              }
            } else {
              console.log(`  ⚠️  [ITEM] Not found in ${category}: ${item.cms_slug}`)
              notFoundCount++
            }
          }
        }
      })
    }

    // Process choices array (for this-or-that, ranking questions)
    if (question.properties?.choices) {
      question.properties.choices.forEach((choice) => {
        // Skip "I Don't Know" options
        if (choice.label.toLowerCase().includes("don't know")) {
          return
        }

        if (choice.cms_slug && choice.image_url) {
          const category = getCategoryFromImageUrl(choice.image_url)
          if (category) {
            const newLabel = generateLabel(choice.cms_slug, category)
            if (newLabel) {
              if (newLabel !== choice.label) {
                console.log(`  [CHOICE] "${choice.label}" -> "${newLabel}"`)
                choice.label = newLabel
                updatedCount++
              }
            } else {
              console.log(`  ⚠️  [CHOICE] Not found in ${category}: ${choice.cms_slug}`)
              notFoundCount++
            }
          }
        }
      })
    }
  })

  // Write updated quiz back to file
  if (updatedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(quiz, null, 2) + '\n')
    console.log(`  ✓ Updated ${updatedCount} labels`)
  } else {
    console.log(`  ✓ No changes needed`)
  }

  if (notFoundCount > 0) {
    console.log(`  ⚠️  ${notFoundCount} items not found in asset data`)
  }
}

// Main execution
const quizzesDir = path.join(process.cwd(), 'seed_data', 'quizzes')
const quizFiles = [
  'art-values-quiz-v4.json',
  'book-values-quiz-v4.json',
  'clerks-application-quiz.json',
  'movie-values-quiz-v4.json',
  'music-values-quiz-v4.json',
]

console.log('Normalizing quiz labels based on asset metadata...')
console.log(`Loaded ${artAssets.length} art, ${filmAssets.length} films, ${bookAssets.length} books, ${musicAssets.length} music\n`)

quizFiles.forEach((fileName) => {
  const filePath = path.join(quizzesDir, fileName)
  if (fs.existsSync(filePath)) {
    normalizeQuizLabels(filePath, fileName)
  } else {
    console.log(`\nSkipping: ${fileName} (not found)`)
  }
})

console.log('\n✓ Done!')
