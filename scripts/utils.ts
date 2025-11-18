import { getPayload as getPayloadInstance } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Generate URL-friendly slug from text
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}

/**
 * Parse year from string, extracting first year from ranges
 * Examples: "1949" -> 1949, "1884-1886" -> 1884
 */
export function parseYear(yearString: string | null | undefined): number | undefined {
  if (!yearString) return undefined

  // Extract first number from string (handles ranges like "1884-1886")
  const match = yearString.match(/\d{4}/)
  return match ? parseInt(match[0], 10) : undefined
}

/**
 * Get proper MIME type from file extension
 */
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase().slice(1)
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    ico: 'image/x-icon',
  }
  return mimeTypes[ext] || 'image/jpeg' // Default to jpeg
}

/**
 * Display database connection info and prompt for confirmation
 */
export async function confirmDatabaseConnection(
  operation: string = 'operation',
  skipConfirm: boolean = false,
): Promise<void> {
  const dbUrl = process.env.DATABASE_URL || ''
  const s3Bucket = process.env.S3_BUCKET || 'Not set'
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'Not set'

  // Mask password in database URL for display
  const maskedDbUrl = dbUrl.replace(/:[^@]*@/, ':****@')

  console.log('⚠️  DATABASE CONNECTION CHECK')
  console.log('━'.repeat(60))
  console.log(`Database: ${maskedDbUrl}`)
  console.log(`S3 Bucket: ${s3Bucket}`)
  console.log(`Server URL: ${serverUrl}`)
  console.log('━'.repeat(60))

  if (!skipConfirm) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const confirmed = await new Promise<boolean>((resolve) => {
      rl.question(
        `\n⚠️  Proceed with ${operation} on this database? (y/N): `,
        (answer) => {
          rl.close()
          resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
        },
      )
    })

    if (!confirmed) {
      console.log('❌ Operation cancelled')
      process.exit(0)
    }
  }
  console.log('')
}

/**
 * Upload an image file to Payload Media collection
 */
export async function uploadImage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  imagePath: string,
  alt: string = '',
): Promise<string | null> {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      console.warn(`  ⚠️  Image not found: ${imagePath}`)
      return null
    }

    const filename = path.basename(imagePath)

    // Check if media with this filename already exists
    const existing = await payload.find({
      collection: 'media',
      where: {
        filename: {
          equals: filename,
        },
      },
      limit: 1,
    })

    // If media already exists, return existing ID instead of re-uploading
    if (existing.docs && existing.docs.length > 0) {
      return existing.docs[0].id
    }

    const fileBuffer = fs.readFileSync(imagePath)

    // Create media document
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: alt || filename,
      },
      file: {
        data: fileBuffer,
        mimetype: getMimeType(imagePath),
        name: filename,
        size: fileBuffer.length,
      },
    })

    return media.id
  } catch (error) {
    console.error(`  ❌ Failed to upload image ${imagePath}:`, error)
    return null
  }
}

/**
 * Initialize Payload instance for scripts
 */
export async function getPayload() {
  // Dynamically import config to ensure env vars are loaded first
  const configPath = path.resolve(__dirname, '../src/payload.config.ts')
  const { default: config } = await import(configPath)

  const payload = await getPayloadInstance({
    config,
  })
  return payload
}

/**
 * Progress bar utility
 */
export class ProgressBar {
  private total: number
  private current: number = 0
  private barLength: number = 40

  constructor(total: number) {
    this.total = total
  }

  update(current: number) {
    this.current = current
    const percentage = (current / this.total) * 100
    const filled = Math.floor((current / this.total) * this.barLength)
    const empty = this.barLength - filled

    const bar = '█'.repeat(filled) + '░'.repeat(empty)
    process.stdout.write(`\r  Progress: [${bar}] ${current}/${this.total} (${percentage.toFixed(1)}%)`)

    if (current === this.total) {
      process.stdout.write('\n')
    }
  }

  increment() {
    this.update(this.current + 1)
  }
}
