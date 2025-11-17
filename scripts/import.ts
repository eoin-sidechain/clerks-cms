import { config } from 'dotenv'
import { getPayload, slugify, parseYear, uploadImage, ProgressBar } from './utils'
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
console.log(`  S3_BUCKET: ${process.env.S3_BUCKET ? '✅ Set' : '❌ Missing'}`)
console.log('')

// Paths to source data
const WEB_DIR = path.resolve('../web')
const CMS_DATA_DIR = path.join(WEB_DIR, 'src/data/cms_data')
const IMAGES_DIR = path.join(WEB_DIR, 'public/images')

// Types for source data
interface ArtData {
  title: string
  author: string
  year: string
  region: string | null
  description: string | null
  cover_filename: string
  cover_filename_slug: string
}

interface BookData {
  title: string
  author: string
  year: string
  region: string | null
  description: string | null
  cover_filename: string
  cover_filename_slug: string
}

interface FilmData {
  title: string
  director: string
  year: string
  country: string | null
  description: string | null
  poster_filename: string
  poster_filename_slug: string
}

interface AlbumData {
  artist: string
  album: string
  year: string
  album_cover_filename: string
  album_cover_filename_slug: string
  artist_image_filename: string
  artist_image_filename_slug: string
}

// Import statistics
interface ImportStats {
  total: number
  successful: number
  failed: number
  skipped: number
  missingImages: number
}

/**
 * Import Art collection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importArt(payload: any): Promise<ImportStats> {
  console.log('\n🎨 Importing Art Collection...')

  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    missingImages: 0,
  }

  try {
    const artData: ArtData[] = JSON.parse(
      fs.readFileSync(path.join(CMS_DATA_DIR, 'art.json'), 'utf-8'),
    )

    stats.total = artData.length
    console.log(`  Found ${stats.total} art items`)

    const progress = new ProgressBar(stats.total)

    for (const item of artData) {
      try {
        // Upload cover image using cover_filename (original format)
        const imagePath = path.join(IMAGES_DIR, 'art', item.cover_filename)
        const coverImageId = await uploadImage(
          payload,
          imagePath,
          `${item.title} by ${item.author}`,
        )

        if (!coverImageId) {
          stats.missingImages++
          stats.skipped++
          progress.increment()
          continue
        }

        // Create art document
        await payload.create({
          collection: 'art',
          data: {
            title: item.title,
            slug: slugify(item.title),
            artist: item.author,
            coverImage: coverImageId,
            year: parseYear(item.year),
            description: item.description || '',
          },
        })

        stats.successful++
      } catch (error) {
        console.error(`\n  ❌ Failed to import "${item.title}":`, error)
        stats.failed++
      }

      progress.increment()
    }
  } catch (error) {
    console.error('  ❌ Error reading art.json:', error)
  }

  return stats
}

/**
 * Import Books collection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importBooks(payload: any): Promise<ImportStats> {
  console.log('\n📚 Importing Books Collection...')

  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    missingImages: 0,
  }

  try {
    const bookData: BookData[] = JSON.parse(
      fs.readFileSync(path.join(CMS_DATA_DIR, 'literature.json'), 'utf-8'),
    )

    stats.total = bookData.length
    console.log(`  Found ${stats.total} books`)

    const progress = new ProgressBar(stats.total)

    for (const item of bookData) {
      try {
        // Upload cover image
        const imagePath = path.join(IMAGES_DIR, 'books', item.cover_filename_slug)
        const coverImageId = await uploadImage(
          payload,
          imagePath,
          `${item.title} by ${item.author}`,
        )

        if (!coverImageId) {
          stats.missingImages++
          stats.skipped++
          progress.increment()
          continue
        }

        // Create book document
        await payload.create({
          collection: 'books',
          data: {
            title: item.title,
            slug: slugify(item.title),
            author: item.author,
            coverImage: coverImageId,
            year: parseYear(item.year),
            description: item.description || '',
          },
        })

        stats.successful++
      } catch (error) {
        console.error(`\n  ❌ Failed to import "${item.title}":`, error)
        stats.failed++
      }

      progress.increment()
    }
  } catch (error) {
    console.error('  ❌ Error reading literature.json:', error)
  }

  return stats
}

/**
 * Import Films collection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importFilms(payload: any): Promise<ImportStats> {
  console.log('\n🎬 Importing Films Collection...')

  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    missingImages: 0,
  }

  try {
    const filmData: FilmData[] = JSON.parse(
      fs.readFileSync(path.join(CMS_DATA_DIR, 'films.json'), 'utf-8'),
    )

    stats.total = filmData.length
    console.log(`  Found ${stats.total} films`)

    const progress = new ProgressBar(stats.total)

    for (const item of filmData) {
      try {
        // Upload poster image
        const imagePath = path.join(IMAGES_DIR, 'movies', item.poster_filename_slug)
        const coverImageId = await uploadImage(
          payload,
          imagePath,
          `${item.title} directed by ${item.director}`,
        )

        if (!coverImageId) {
          stats.missingImages++
          stats.skipped++
          progress.increment()
          continue
        }

        // Create film document
        await payload.create({
          collection: 'films',
          data: {
            title: item.title,
            slug: slugify(item.title),
            director: item.director,
            coverImage: coverImageId,
            year: parseYear(item.year),
            description: item.description || '',
          },
        })

        stats.successful++
      } catch (error) {
        console.error(`\n  ❌ Failed to import "${item.title}":`, error)
        stats.failed++
      }

      progress.increment()
    }
  } catch (error) {
    console.error('  ❌ Error reading films.json:', error)
  }

  return stats
}

/**
 * Import Albums collection
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importAlbums(payload: any): Promise<ImportStats> {
  console.log('\n🎵 Importing Albums Collection...')

  const stats: ImportStats = {
    total: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    missingImages: 0,
  }

  try {
    const albumData: AlbumData[] = JSON.parse(
      fs.readFileSync(path.join(CMS_DATA_DIR, 'music.json'), 'utf-8'),
    )

    stats.total = albumData.length
    console.log(`  Found ${stats.total} albums`)

    const progress = new ProgressBar(stats.total)

    for (const item of albumData) {
      try {
        // Upload album cover image
        const imagePath = path.join(IMAGES_DIR, 'music', item.album_cover_filename_slug)
        const coverImageId = await uploadImage(
          payload,
          imagePath,
          `${item.album} by ${item.artist}`,
        )

        if (!coverImageId) {
          stats.missingImages++
          stats.skipped++
          progress.increment()
          continue
        }

        // Create album document
        await payload.create({
          collection: 'albums',
          data: {
            title: item.album,
            slug: slugify(item.album),
            artist: item.artist,
            coverImage: coverImageId,
            year: parseYear(item.year),
            description: '',
          },
        })

        stats.successful++
      } catch (error) {
        console.error(`\n  ❌ Failed to import "${item.album}":`, error)
        stats.failed++
      }

      progress.increment()
    }
  } catch (error) {
    console.error('  ❌ Error reading music.json:', error)
  }

  return stats
}

/**
 * Print import summary
 */
function printSummary(collectionName: string, stats: ImportStats) {
  console.log(`\n  📊 ${collectionName} Import Summary:`)
  console.log(`     Total:          ${stats.total}`)
  console.log(`     ✅ Successful:  ${stats.successful}`)
  console.log(`     ❌ Failed:      ${stats.failed}`)
  console.log(`     ⏭️  Skipped:     ${stats.skipped}`)
  console.log(`     🖼️  Missing:     ${stats.missingImages} images`)
}

/**
 * Main import function
 */
async function runImport() {
  console.log('📦 Payload CMS Import Script\n')
  console.log('Source: /web/src/data/cms_data/')
  console.log('Images: /web/public/images/\n')

  // Parse command line arguments
  const args = process.argv.slice(2)
  const importAll = args.length === 0 || args.includes('--all')
  const importArtFlag = importAll || args.includes('--art')
  const importBooksFlag = importAll || args.includes('--books')
  const importFilmsFlag = importAll || args.includes('--films')
  const importAlbumsFlag = importAll || args.includes('--albums')

  try {
    // Initialize Payload
    console.log('Initializing Payload...')
    const payload = await getPayload()
    console.log('✅ Payload initialized')

    const allStats: Record<string, ImportStats> = {}

    // Import collections based on flags
    if (importArtFlag) {
      allStats.art = await importArt(payload)
      printSummary('Art', allStats.art)
    }

    if (importBooksFlag) {
      allStats.books = await importBooks(payload)
      printSummary('Books', allStats.books)
    }

    if (importFilmsFlag) {
      allStats.films = await importFilms(payload)
      printSummary('Films', allStats.films)
    }

    if (importAlbumsFlag) {
      allStats.albums = await importAlbums(payload)
      printSummary('Albums', allStats.albums)
    }

    // Print overall summary
    const totalStats = Object.values(allStats).reduce(
      (acc, stats) => ({
        total: acc.total + stats.total,
        successful: acc.successful + stats.successful,
        failed: acc.failed + stats.failed,
        skipped: acc.skipped + stats.skipped,
        missingImages: acc.missingImages + stats.missingImages,
      }),
      { total: 0, successful: 0, failed: 0, skipped: 0, missingImages: 0 },
    )

    console.log('\n' + '='.repeat(50))
    console.log('📊 OVERALL SUMMARY')
    console.log('='.repeat(50))
    console.log(`Total items processed:    ${totalStats.total}`)
    console.log(`✅ Successfully imported: ${totalStats.successful}`)
    console.log(`❌ Failed:                ${totalStats.failed}`)
    console.log(`⏭️  Skipped:               ${totalStats.skipped}`)
    console.log(`🖼️  Missing images:        ${totalStats.missingImages}`)
    console.log('='.repeat(50))

    console.log('\n✅ Import complete!')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  }
}

runImport()
