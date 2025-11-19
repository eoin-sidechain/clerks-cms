import { config } from 'dotenv'
import { getPayload } from './utils'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.resolve(__dirname, '../.env.local') })

async function checkMedia() {
  const payload = await getPayload()

  // Count total media entries
  const allMedia = await payload.find({
    collection: 'media',
    limit: 1,
    pagination: true,
  })

  console.log(`Total media entries: ${allMedia.totalDocs}`)

  // Count albums
  const albums = await payload.find({
    collection: 'albums',
    limit: 1,
    pagination: true,
  })

  console.log(`Total albums: ${albums.totalDocs}`)

  // Check for duplicates by searching for specific album
  const puppetsMedia = await payload.find({
    collection: 'media',
    where: {
      filename: {
        contains: 'master-of-puppets',
      },
    },
    limit: 10,
  })

  console.log(`\nMaster of Puppets media entries:`)
  puppetsMedia.docs.forEach((doc: any) => {
    console.log(`  ID: ${doc.id}, Filename: ${doc.filename}, Created: ${doc.createdAt}`)
  })

  // Find which album entry is using which media
  const albumEntry = await payload.find({
    collection: 'albums',
    where: {
      slug: {
        contains: 'master-of-puppets',
      },
    },
    depth: 1,
  })

  console.log(`\nAlbum entry:`)
  albumEntry.docs.forEach((doc: any) => {
    console.log(`  Slug: ${doc.slug}`)
    console.log(`  Year: ${doc.year}`)
    if (doc.coverImage && typeof doc.coverImage === 'object') {
      console.log(`  Media ID: ${doc.coverImage.id}`)
      console.log(`  Media Filename: ${doc.coverImage.filename}`)
    }
  })

  process.exit(0)
}

checkMedia().catch(console.error)
