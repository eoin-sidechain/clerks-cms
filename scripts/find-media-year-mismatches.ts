import { config } from 'dotenv'
import { getPayload } from './utils'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.resolve(__dirname, '../.env.local') })

interface Mismatch {
  collection: string
  itemId: number
  itemSlug: string
  itemTitle: string
  itemYear: number
  mediaId: number
  mediaFilename: string
  expectedFilename: string
}

/**
 * Extract year from filename
 */
function extractYearFromFilename(filename: string): number | null {
  const match = filename.match(/-(\d{4})\./)
  return match ? parseInt(match[1]) : null
}

/**
 * Scan a collection for year mismatches between item and media filename
 */
async function scanCollection(payload: any, collection: string, imageField: string): Promise<Mismatch[]> {
  console.log(`\n📊 Scanning ${collection}...`)

  const items = await payload.find({
    collection,
    limit: 10000,
    depth: 1,
  })

  const mismatches: Mismatch[] = []

  for (const item of items.docs) {
    if (!item[imageField] || !item.year) continue

    const media = item[imageField]
    const mediaYear = extractYearFromFilename(media.filename)

    if (mediaYear && mediaYear !== item.year) {
      const expectedFilename = media.filename.replace(`-${mediaYear}.`, `-${item.year}.`)

      mismatches.push({
        collection,
        itemId: item.id,
        itemSlug: item.slug,
        itemTitle: item.title || item.name,
        itemYear: item.year,
        mediaId: media.id,
        mediaFilename: media.filename,
        expectedFilename,
      })
    }
  }

  console.log(`  Found ${mismatches.length} mismatches`)
  return mismatches
}

async function main() {
  console.log('🔍 Scanning for Year Mismatches Between Items and Media Files\n')

  const payload = await getPayload()

  const scans = [
    { collection: 'albums', imageField: 'coverImage' },
    { collection: 'films', imageField: 'image' },
    { collection: 'books', imageField: 'image' },
    { collection: 'art', imageField: 'image' },
  ]

  const allMismatches: Mismatch[] = []

  for (const scan of scans) {
    const mismatches = await scanCollection(payload, scan.collection, scan.imageField)
    allMismatches.push(...mismatches)
  }

  // Print detailed report
  console.log('\n' + '='.repeat(100))
  console.log('📋 YEAR MISMATCH REPORT')
  console.log('='.repeat(100))

  if (allMismatches.length === 0) {
    console.log('\n✅ No mismatches found! All items have correctly named media files.')
  } else {
    for (const mismatch of allMismatches) {
      console.log(`\n🔸 ${mismatch.collection.toUpperCase()} - ${mismatch.itemTitle}`)
      console.log(`   Item ID: ${mismatch.itemId}`)
      console.log(`   Slug: ${mismatch.itemSlug}`)
      console.log(`   Item Year: ${mismatch.itemYear}`)
      console.log(`   Media ID: ${mismatch.mediaId}`)
      console.log(`   Current Filename: ${mismatch.mediaFilename}`)
      console.log(`   Expected Filename: ${mismatch.expectedFilename}`)
      console.log(`   Admin URL: http://localhost:3001/admin/collections/${mismatch.collection}/${mismatch.itemId}`)
      console.log(`   Media URL: http://localhost:3001/admin/collections/media/${mismatch.mediaId}`)
    }
  }

  console.log('\n' + '='.repeat(100))
  console.log('📊 SUMMARY')
  console.log('='.repeat(100))

  const byCollection = allMismatches.reduce(
    (acc, m) => {
      acc[m.collection] = (acc[m.collection] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  for (const [collection, count] of Object.entries(byCollection)) {
    console.log(`${collection.padEnd(10)}: ${count} mismatches`)
  }

  console.log(`\nTotal mismatches: ${allMismatches.length}`)
  console.log('='.repeat(100))

  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
