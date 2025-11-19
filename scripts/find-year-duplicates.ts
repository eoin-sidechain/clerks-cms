import { config } from 'dotenv'
import { getPayload } from './utils'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local')
config({ path: envPath })

interface MediaItem {
  id: number
  slug: string
  title: string
  artist?: string
  author?: string
  director?: string
  year: number
  collection: string
}

interface DuplicateGroup {
  baseKey: string
  items: MediaItem[]
}

/**
 * Remove year from slug to create a comparison key
 */
function getBaseKey(slug: string): string {
  // Remove 4-digit years from the slug
  return slug.replace(/-\d{4}(-|$)/g, '-').replace(/-+$/, '')
}

/**
 * Scan a collection for year-based duplicates
 */
async function scanCollection(payload: any, collection: string): Promise<DuplicateGroup[]> {
  console.log(`\n📊 Scanning ${collection}...`)

  const items = await payload.find({
    collection,
    limit: 10000,
    depth: 0,
  })

  // Group items by base key (slug without year)
  const grouped = new Map<string, MediaItem[]>()

  for (const item of items.docs) {
    const baseKey = getBaseKey(item.slug)
    const mediaItem: MediaItem = {
      id: item.id,
      slug: item.slug,
      title: item.title || item.name,
      year: item.year,
      collection,
    }

    if (collection === 'albums') mediaItem.artist = item.artist
    if (collection === 'books') mediaItem.author = item.author
    if (collection === 'films') mediaItem.director = item.director

    if (!grouped.has(baseKey)) {
      grouped.set(baseKey, [])
    }
    grouped.get(baseKey)!.push(mediaItem)
  }

  // Filter to only groups with multiple items (potential duplicates)
  const duplicates: DuplicateGroup[] = []
  for (const [baseKey, items] of grouped) {
    if (items.length > 1) {
      duplicates.push({ baseKey, items })
    }
  }

  return duplicates
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Scanning Media Collections for Year-Based Duplicates\n')

  const payload = await getPayload()

  const collections = ['albums', 'films', 'books', 'art']
  let totalDuplicates = 0
  const allDuplicates: Map<string, DuplicateGroup[]> = new Map()

  for (const collection of collections) {
    const duplicates = await scanCollection(payload, collection)
    allDuplicates.set(collection, duplicates)
    totalDuplicates += duplicates.length

    console.log(`  Found ${duplicates.length} potential duplicate groups`)
  }

  // Print detailed report
  console.log('\n' + '='.repeat(80))
  console.log('📋 DETAILED DUPLICATE REPORT')
  console.log('='.repeat(80))

  for (const [collection, duplicates] of allDuplicates) {
    if (duplicates.length === 0) continue

    console.log(`\n${'='.repeat(80)}`)
    console.log(`${collection.toUpperCase()} - ${duplicates.length} duplicate groups`)
    console.log('='.repeat(80))

    for (const group of duplicates) {
      console.log(`\n🔸 Base: ${group.baseKey}`)
      console.log(`   Count: ${group.items.length} items\n`)

      for (const item of group.items) {
        const creator =
          item.artist || item.author || item.director ? ` - ${item.artist || item.author || item.director}` : ''
        console.log(`   • ${item.slug}`)
        console.log(`     ID: ${item.id}`)
        console.log(`     Title: ${item.title}${creator}`)
        console.log(`     Year: ${item.year}`)
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log('📊 SUMMARY')
  console.log('='.repeat(80))

  for (const [collection, duplicates] of allDuplicates) {
    const totalItems = duplicates.reduce((sum, group) => sum + group.items.length, 0)
    console.log(`${collection.padEnd(10)}: ${duplicates.length} groups, ${totalItems} total items`)
  }

  console.log('\n' + '='.repeat(80))
  console.log(`Total duplicate groups found: ${totalDuplicates}`)
  console.log('='.repeat(80))

  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
