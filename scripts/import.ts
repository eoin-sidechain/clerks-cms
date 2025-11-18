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
        // Upload cover image using cover_cms_filename (normalized format)
        const imagePath = path.join(IMAGES_DIR, 'art', item.cover_cms_filename)
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

        // Check if art already exists
        const existing = await payload.find({
          collection: 'art',
          where: {
            slug: {
              equals: item.cms_slug,
            },
          },
          limit: 1,
        })

        const artData = {
          title: item.title,
          slug: item.cms_slug,
          artist: item.author,
          coverImage: coverImageId,
          year: parseYear(item.year),
          description: item.description || '',
        }

        // Update or create
        if (existing.docs && existing.docs.length > 0) {
          console.log(`\n  🔄 Updating existing: ${item.title} (slug: ${item.cms_slug})`)
          await payload.update({
            collection: 'art',
            id: existing.docs[0].id,
            data: artData,
          })
        } else {
          try {
            console.log(`\n  ✨ Creating new: ${item.title} (slug: ${item.cms_slug})`)
            await payload.create({
              collection: 'art',
              data: artData,
            })
          } catch (createError: any) {
            console.log(`\n  ⚠️  Create failed for ${item.title}, attempting retry...`)
            console.log(`     Error: ${createError.message}`)
            console.log(`     Error data:`, JSON.stringify(createError.data, null, 2))
            console.log(`     Slug length: ${item.cms_slug.length} characters`)

            // If create fails, try to find and update (likely duplicate slug)
            const retry = await payload.find({
              collection: 'art',
              where: {
                slug: {
                  equals: item.cms_slug,
                },
              },
              limit: 1,
            })

            console.log(`     Retry found ${retry.docs?.length || 0} docs`)

            if (retry.docs && retry.docs.length > 0) {
              console.log(`     Updating via retry: ID ${retry.docs[0].id}`)
              await payload.update({
                collection: 'art',
                id: retry.docs[0].id,
                data: artData,
              })
            } else {
              // If we still can't find it, throw the original error
              console.log(`     Could not find record, re-throwing error`)
              throw createError
            }
          }
        }

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
        // Upload cover image using cover_cms_filename (normalized format)
        const imagePath = path.join(IMAGES_DIR, 'books', item.cover_cms_filename)
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

        // Check if book already exists
        const existing = await payload.find({
          collection: 'books',
          where: {
            slug: {
              equals: item.cms_slug,
            },
          },
          limit: 1,
        })

        const bookData = {
          title: item.title,
          slug: item.cms_slug,
          author: item.author,
          coverImage: coverImageId,
          year: parseYear(item.year),
          description: item.description || '',
        }

        // Update or create
        if (existing.docs && existing.docs.length > 0) {
          await payload.update({
            collection: 'books',
            id: existing.docs[0].id,
            data: bookData,
          })
        } else {
          try {
            await payload.create({
              collection: 'books',
              data: bookData,
            })
          } catch (createError: any) {
            // If create fails, try to find and update (likely duplicate slug)
            const retry = await payload.find({
              collection: 'books',
              where: {
                slug: {
                  equals: item.cms_slug,
                },
              },
              limit: 1,
            })
            if (retry.docs && retry.docs.length > 0) {
              await payload.update({
                collection: 'books',
                id: retry.docs[0].id,
                data: bookData,
              })
            } else {
              // If we still can't find it, throw the original error
              throw createError
            }
          }
        }

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
        // Upload poster image using cover_cms_filename (normalized format)
        const imagePath = path.join(IMAGES_DIR, 'movies', item.cover_cms_filename)
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

        // Check if film already exists
        const existing = await payload.find({
          collection: 'films',
          where: {
            slug: {
              equals: item.cms_slug,
            },
          },
          limit: 1,
        })

        const filmData = {
          title: item.title,
          slug: item.cms_slug,
          director: item.director,
          coverImage: coverImageId,
          year: parseYear(item.year),
          description: item.description || '',
        }

        // Update or create
        if (existing.docs && existing.docs.length > 0) {
          await payload.update({
            collection: 'films',
            id: existing.docs[0].id,
            data: filmData,
          })
        } else {
          try {
            await payload.create({
              collection: 'films',
              data: filmData,
            })
          } catch (createError: any) {
            // If create fails, try to find and update (likely duplicate slug)
            const retry = await payload.find({
              collection: 'films',
              where: {
                slug: {
                  equals: item.cms_slug,
                },
              },
              limit: 1,
            })
            if (retry.docs && retry.docs.length > 0) {
              await payload.update({
                collection: 'films',
                id: retry.docs[0].id,
                data: filmData,
              })
            } else {
              // If we still can't find it, throw the original error
              throw createError
            }
          }
        }

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
        // Upload album cover image using cover_cms_filename (normalized format)
        const imagePath = path.join(IMAGES_DIR, 'music', item.cover_cms_filename)
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

        // Check if album already exists
        const existing = await payload.find({
          collection: 'albums',
          where: {
            slug: {
              equals: item.cms_slug,
            },
          },
          limit: 1,
        })

        const albumData = {
          title: item.album,
          slug: item.cms_slug,
          artist: item.artist,
          coverImage: coverImageId,
          year: parseYear(item.year),
          description: '',
        }

        // Update or create
        if (existing.docs && existing.docs.length > 0) {
          await payload.update({
            collection: 'albums',
            id: existing.docs[0].id,
            data: albumData,
          })
        } else {
          try {
            await payload.create({
              collection: 'albums',
              data: albumData,
            })
          } catch (createError: any) {
            // If create fails, try to find and update (likely duplicate slug)
            const retry = await payload.find({
              collection: 'albums',
              where: {
                slug: {
                  equals: item.cms_slug,
                },
              },
              limit: 1,
            })
            if (retry.docs && retry.docs.length > 0) {
              await payload.update({
                collection: 'albums',
                id: retry.docs[0].id,
                data: albumData,
              })
            } else {
              // If we still can't find it, throw the original error
              throw createError
            }
          }
        }

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
