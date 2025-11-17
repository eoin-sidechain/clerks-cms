import { getPayload as getPayloadInstance } from 'payload'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
    // Ensure environment variables are available
    secret: process.env.PAYLOAD_SECRET,
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
