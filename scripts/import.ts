import { config } from 'dotenv'
import {
  getPayload,
  slugify,
  parseYear,
  uploadImage,
  ProgressBar,
  confirmDatabaseConnection,
  preloadExistingMedia,
  preloadExistingSlugs,
} from './utils'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pLimit from 'p-limit'

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
const SEED_DATA_DIR = path.resolve(__dirname, '../seed_data')
const CMS_DATA_DIR = path.join(SEED_DATA_DIR, 'assets')
const IMAGES_DIR = path.join(SEED_DATA_DIR, 'images')

// Types for source data
interface ArtData {
  title: string
  author: string
  year: string
  region: string | null
  description: string | null
  cover_cms_filename: string
  cms_slug: string
}

interface BookData {
  title: string
  author: string
  year: string
  region: string | null
  description: string | null
  cover_cms_filename: string
  cms_slug: string
}

interface FilmData {
  title: string
  director: string
  year: string
  country: string | null
  description: string | null
  cover_cms_filename: string
  cms_slug: string
}

interface AlbumData {
  artist: string
  album: string
  year: string
  cover_cms_filename: string
  cms_slug: string
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
 * Upload image using pre-loaded media map for fast lookups
 * Falls back to regular upload if not in map
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function uploadImageOptimized(
  payload: any,
  mediaMap: Map<string, string>,
  imagePath: string,
  alt: string = '',
): Promise<string | null> {
  const filename = path.basename(imagePath)

  // Check in-memory map first (fast)
  if (mediaMap.has(filename)) {
    return mediaMap.get(filename)!
  }

  // Not in map, upload new image
  const mediaId = await uploadImage(payload, imagePath, alt)

  // Add to map for future lookups
  if (mediaId) {
    mediaMap.set(filename, mediaId)
  }

  return mediaId
}

/**
 * Import Art collection (Optimized with parallel processing)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importArt(payload: any): Promise<ImportStats> {
  console.log('\n🎨 Importing Art Collection (Optimized)...')

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
    console.log(`  Pre-loading existing records...`)

    // Pre-load existing data (single query each)
    const mediaMap = await preloadExistingMedia(payload)
    const slugMap = await preloadExistingSlugs(payload, 'art')

    console.log(`  Found ${mediaMap.size} existing media, ${slugMap.size} existing art items`)
    console.log(`  Processing with 5x concurrency...\n`)

    const progress = new ProgressBar(stats.total)
    const limit = pLimit(5) // Process 5 items concurrently

    // Process all items in parallel with controlled concurrency
    const promises = artData.map((item) =>
      limit(async () => {
        try {
          // Upload cover image using optimized function
          const imagePath = path.join(IMAGES_DIR, 'art', item.cover_cms_filename)
          const coverImageId = await uploadImageOptimized(
            payload,
            mediaMap,
            imagePath,
            `${item.title} by ${item.author}`,
          )

          if (!coverImageId) {
            stats.missingImages++
            stats.skipped++
            progress.increment()
            return
          }

          const artDataToSave = {
            title: item.title,
            slug: item.cms_slug,
            artist: item.author,
            coverImage: coverImageId,
            year: parseYear(item.year),
            description: item.description || '',
          }

          // Check slug map (in-memory, fast)
          const existingId = slugMap.get(item.cms_slug)

          if (existingId) {
            // Direct update without find query
            await payload.update({
              collection: 'art',
              id: existingId,
              data: artDataToSave,
            })
          } else {
            // Create new
            try {
              const created = await payload.create({
                collection: 'art',
                data: artDataToSave,
              })
              // Add to map for future lookups
              slugMap.set(item.cms_slug, created.id)
            } catch (createError: any) {
              // Retry logic - check if it was created by parallel process
              const retry = await payload.find({
                collection: 'art',
                where: { slug: { equals: item.cms_slug } },
                limit: 1,
              })

              if (retry.docs && retry.docs.length > 0) {
                await payload.update({
                  collection: 'art',
                  id: retry.docs[0].id,
                  data: artDataToSave,
                })
                slugMap.set(item.cms_slug, retry.docs[0].id)
              } else {
                throw createError
              }
            }
          }

          stats.successful++
        } catch (error) {
          console.error(`\n  ❌ Failed to import "${item.title}":`, error)
          stats.failed++
        } finally {
          progress.increment()
        }
      }),
    )

    // Wait for all items to complete
    await Promise.allSettled(promises)
  } catch (error) {
    console.error('  ❌ Error reading art.json:', error)
  }

  return stats
}

/**
 * Import Books collection (Optimized with parallel processing)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importBooks(payload: any): Promise<ImportStats> {
  console.log('\n📚 Importing Books Collection (Optimized)...')

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
    console.log(`  Pre-loading existing records...`)

    // Pre-load existing data (single query each)
    const mediaMap = await preloadExistingMedia(payload)
    const slugMap = await preloadExistingSlugs(payload, 'books')

    console.log(`  Found ${mediaMap.size} existing media, ${slugMap.size} existing books`)
    console.log(`  Processing with 5x concurrency...\n`)

    const progress = new ProgressBar(stats.total)
    const limit = pLimit(5)

    const promises = bookData.map((item) =>
      limit(async () => {
        try {
          const imagePath = path.join(IMAGES_DIR, 'books', item.cover_cms_filename)
          const coverImageId = await uploadImageOptimized(
            payload,
            mediaMap,
            imagePath,
            `${item.title} by ${item.author}`,
          )

          if (!coverImageId) {
            stats.missingImages++
            stats.skipped++
            progress.increment()
            return
          }

          const bookDataToSave = {
            title: item.title,
            slug: item.cms_slug,
            author: item.author,
            coverImage: coverImageId,
            year: parseYear(item.year),
            description: item.description || '',
          }

          const existingId = slugMap.get(item.cms_slug)

          if (existingId) {
            await payload.update({
              collection: 'books',
              id: existingId,
              data: bookDataToSave,
            })
          } else {
            try {
              const created = await payload.create({
                collection: 'books',
                data: bookDataToSave,
              })
              slugMap.set(item.cms_slug, created.id)
            } catch (createError: any) {
              const retry = await payload.find({
                collection: 'books',
                where: { slug: { equals: item.cms_slug } },
                limit: 1,
              })
              if (retry.docs && retry.docs.length > 0) {
                await payload.update({
                  collection: 'books',
                  id: retry.docs[0].id,
                  data: bookDataToSave,
                })
                slugMap.set(item.cms_slug, retry.docs[0].id)
              } else {
                throw createError
              }
            }
          }

          stats.successful++
        } catch (error) {
          console.error(`\n  ❌ Failed to import "${item.title}":`, error)
          stats.failed++
        } finally {
          progress.increment()
        }
      }),
    )

    await Promise.allSettled(promises)
  } catch (error) {
    console.error('  ❌ Error reading literature.json:', error)
  }

  return stats
}

/**
 * Import Films collection (Optimized with parallel processing)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importFilms(payload: any): Promise<ImportStats> {
  console.log('\n🎬 Importing Films Collection (Optimized)...')

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
    console.log(`  Pre-loading existing records...`)

    const mediaMap = await preloadExistingMedia(payload)
    const slugMap = await preloadExistingSlugs(payload, 'films')

    console.log(`  Found ${mediaMap.size} existing media, ${slugMap.size} existing films`)
    console.log(`  Processing with 5x concurrency...\n`)

    const progress = new ProgressBar(stats.total)
    const limit = pLimit(5)

    const promises = filmData.map((item) =>
      limit(async () => {
        try {
          const imagePath = path.join(IMAGES_DIR, 'movies', item.cover_cms_filename)
          const coverImageId = await uploadImageOptimized(
            payload,
            mediaMap,
            imagePath,
            `${item.title} directed by ${item.director}`,
          )

          if (!coverImageId) {
            stats.missingImages++
            stats.skipped++
            progress.increment()
            return
          }

          const filmDataToSave = {
            title: item.title,
            slug: item.cms_slug,
            director: item.director,
            coverImage: coverImageId,
            year: parseYear(item.year),
            description: item.description || '',
          }

          const existingId = slugMap.get(item.cms_slug)

          if (existingId) {
            await payload.update({
              collection: 'films',
              id: existingId,
              data: filmDataToSave,
            })
          } else {
            try {
              const created = await payload.create({
                collection: 'films',
                data: filmDataToSave,
              })
              slugMap.set(item.cms_slug, created.id)
            } catch (createError: any) {
              const retry = await payload.find({
                collection: 'films',
                where: { slug: { equals: item.cms_slug } },
                limit: 1,
              })
              if (retry.docs && retry.docs.length > 0) {
                await payload.update({
                  collection: 'films',
                  id: retry.docs[0].id,
                  data: filmDataToSave,
                })
                slugMap.set(item.cms_slug, retry.docs[0].id)
              } else {
                throw createError
              }
            }
          }

          stats.successful++
        } catch (error) {
          console.error(`\n  ❌ Failed to import "${item.title}":`, error)
          stats.failed++
        } finally {
          progress.increment()
        }
      }),
    )

    await Promise.allSettled(promises)
  } catch (error) {
    console.error('  ❌ Error reading films.json:', error)
  }

  return stats
}

/**
 * Import Albums collection (Optimized with parallel processing)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importAlbums(payload: any): Promise<ImportStats> {
  console.log('\n🎵 Importing Albums Collection (Optimized)...')

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
    console.log(`  Pre-loading existing records...`)

    const mediaMap = await preloadExistingMedia(payload)
    const slugMap = await preloadExistingSlugs(payload, 'albums')

    console.log(`  Found ${mediaMap.size} existing media, ${slugMap.size} existing albums`)
    console.log(`  Processing with 5x concurrency...\n`)

    const progress = new ProgressBar(stats.total)
    const limit = pLimit(5)

    const promises = albumData.map((item) =>
      limit(async () => {
        try {
          const imagePath = path.join(IMAGES_DIR, 'music', item.cover_cms_filename)
          const coverImageId = await uploadImageOptimized(
            payload,
            mediaMap,
            imagePath,
            `${item.album} by ${item.artist}`,
          )

          if (!coverImageId) {
            stats.missingImages++
            stats.skipped++
            progress.increment()
            return
          }

          const albumDataToSave = {
            title: item.album,
            slug: item.cms_slug,
            artist: item.artist,
            coverImage: coverImageId,
            year: parseYear(item.year),
            description: '',
          }

          const existingId = slugMap.get(item.cms_slug)

          if (existingId) {
            await payload.update({
              collection: 'albums',
              id: existingId,
              data: albumDataToSave,
            })
          } else {
            try {
              const created = await payload.create({
                collection: 'albums',
                data: albumDataToSave,
              })
              slugMap.set(item.cms_slug, created.id)
            } catch (createError: any) {
              const retry = await payload.find({
                collection: 'albums',
                where: { slug: { equals: item.cms_slug } },
                limit: 1,
              })
              if (retry.docs && retry.docs.length > 0) {
                await payload.update({
                  collection: 'albums',
                  id: retry.docs[0].id,
                  data: albumDataToSave,
                })
                slugMap.set(item.cms_slug, retry.docs[0].id)
              } else {
                throw createError
              }
            }
          }

          stats.successful++
        } catch (error) {
          console.error(`\n  ❌ Failed to import "${item.album}":`, error)
          stats.failed++
        } finally {
          progress.increment()
        }
      }),
    )

    await Promise.allSettled(promises)
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
  console.log('Source: seed_data/assets/')
  console.log('Images: seed_data/images/\n')

  // Parse command line arguments
  const args = process.argv.slice(2)
  const importAll = args.length === 0 || args.includes('--all')
  const importArtFlag = importAll || args.includes('--art')
  const importBooksFlag = importAll || args.includes('--books')
  const importFilmsFlag = importAll || args.includes('--films')
  const importAlbumsFlag = importAll || args.includes('--albums')

  try {
    // Database connection safety check
    const skipConfirm = args.includes('--yes') || args.includes('-y')
    await confirmDatabaseConnection('IMPORT', skipConfirm)

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
