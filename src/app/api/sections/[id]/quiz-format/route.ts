import { getPayload } from 'payload'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/sections/:id/quiz-format
 * Returns a section in quiz file format
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params
  const payload = await getPayload({ config })

  try {
    // Fetch the section with all steps populated
    const section = await payload.findByID({
      collection: 'sections',
      id: parseInt(id),
      depth: 3, // Deep populate to get all relationship data
    })

    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    // Transform section to quiz format
    const quizSteps = await transformSectionToQuizFormat(section, payload)

    return NextResponse.json(quizSteps)
  } catch (error) {
    console.error('Error fetching section quiz format:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Transform a PayloadCMS Section to quiz file format
 */
async function transformSectionToQuizFormat(section: any, payload: any): Promise<any[]> {
  const quizSteps: any[] = []

  if (!section.steps || !Array.isArray(section.steps)) {
    return quizSteps
  }

  // Sort steps by order
  const sortedSteps = [...section.steps].sort((a, b) => a.order - b.order)

  for (const stepEntry of sortedSteps) {
    const step = typeof stepEntry.step === 'object' ? stepEntry.step : null

    if (!step) continue

    const quizStep = await transformStepToQuizFormat(step, payload)
    if (quizStep) {
      quizSteps.push(quizStep)
    }
  }

  return quizSteps
}

/**
 * Transform a single Step to quiz format
 */
async function transformStepToQuizFormat(step: any, payload: any): Promise<any | null> {
  const baseStep: any = {
    id: `step-${step.id}`,
    type: step.stepType,
    title: step.title,
  }

  // Add subtitle if present
  if (step.subtitle) {
    baseStep.subtitle = step.subtitle
  }

  // Add description if present
  if (step.description) {
    baseStep.description = step.description
  }

  // Handle Questions
  if (step.stepType === 'question') {
    baseStep.questionType = step.questionType
    baseStep.required = true

    switch (step.questionType) {
      case 'short_text':
      case 'long_text':
        baseStep.properties = {
          placeholder: step.placeholder || '',
        }
        break

      case 'multiple_choice':
        baseStep.properties = {
          choices:
            step.options?.map((opt: any) => ({
              id: opt.value,
              label: opt.label,
            })) || [],
        }
        break

      case 'rating':
        if (step.ratingItem) {
          const item = await getMediaItem(step.ratingItem, step.mediaType, payload)
          if (item) {
            baseStep.properties = {
              items: [item],
            }
            // Use step.description if not already set, otherwise use default
            if (!baseStep.description) {
              const mediaTypeMap: Record<string, string> = {
                albums: 'album',
                films: 'film',
                books: 'book',
                art: 'artwork',
              }
              const singularType = mediaTypeMap[step.mediaType] || 'item'
              baseStep.description = `Rate this ${singularType}`
            }
          }
        }
        break

      case 'this_or_that':
        const optionA = await getMediaItem(step.optionA, step.mediaType, payload)
        const optionB = await getMediaItem(step.optionB, step.mediaType, payload)

        baseStep.properties = {
          choices: [optionA, optionB].filter(Boolean),
        }
        // Use step.description if not already set, otherwise use default
        if (!baseStep.description) {
          baseStep.description = 'Choose your preference'
        }
        break

      case 'ranking':
        const rankingItems: any[] = []
        if (step.rankingOptions && Array.isArray(step.rankingOptions)) {
          for (const option of step.rankingOptions) {
            const item = await getMediaItem(option.item, step.mediaType, payload)
            if (item) {
              rankingItems.push(item)
            }
          }
        }
        baseStep.properties = {
          choices: rankingItems,
        }
        // Use step.description if not already set, otherwise use default
        if (!baseStep.description) {
          baseStep.description = 'Order from favorite to least favorite.'
        }
        break

      default:
        baseStep.properties = {}
    }
  }

  // Handle Statements
  if (step.stepType === 'statement') {
    baseStep.type = `${step.statementType}_statement`

    switch (step.statementType) {
      case 'text':
        baseStep.properties = {
          content: step.textContent || '',
        }
        break

      case 'video':
      case 'audio':
        baseStep.properties = {
          button_text: step.cta?.text || "Let's Begin",
          content: [],
        }

        // Add media file reference if available
        if (step.mediaFile && typeof step.mediaFile === 'object') {
          baseStep.properties.content.push({
            link: step.mediaFile.url || `/media/${step.mediaFile.filename}`,
            name: step.mediaFile.alt || step.title,
          })
        }
        break
    }
  }

  return baseStep
}

/**
 * Get media item (album, book, film, art) and format for quiz
 */
async function getMediaItem(
  itemRef: any,
  mediaType: string,
  payload: any,
): Promise<any | null> {
  if (!itemRef) return null

  try {
    let collection = mediaType
    let itemId: number | undefined

    // Handle polymorphic relationship format
    if (typeof itemRef === 'object' && 'relationTo' in itemRef) {
      collection = itemRef.relationTo
      itemId = typeof itemRef.value === 'object' ? itemRef.value?.id : itemRef.value
    } else if (typeof itemRef === 'object' && 'id' in itemRef) {
      // Already populated
      return formatMediaItem(itemRef, collection)
    } else if (typeof itemRef === 'number') {
      itemId = itemRef
    }

    if (!itemId || !collection) return null

    // Fetch the item
    const item = await payload.findByID({
      collection,
      id: itemId,
      depth: 1,
    })

    return formatMediaItem(item, collection)
  } catch (error) {
    console.error('Error fetching media item:', error)
    return null
  }
}

/**
 * Format a media item (album, book, film, art) to quiz format
 */
function formatMediaItem(item: any, collection: string): any {
  if (!item) return null

  const formatted: any = {
    id: item.slug || `${collection}-${item.id}`,
    label: item.title || item.name || 'Unknown',
  }

  // Add artist/author/creator if available
  if (item.artist) {
    formatted.label = `${item.title} - ${item.artist}`
  } else if (item.author) {
    formatted.label = `${item.title} - ${item.author}`
  } else if (item.director) {
    formatted.label = `${item.title} - ${item.director}`
  }

  // Add image
  if (item.coverImage && typeof item.coverImage === 'object') {
    formatted.image_url = item.coverImage.url || `/media/${item.coverImage.filename}`
    formatted.cms_image_url = item.coverImage.filename
  } else if (item.image && typeof item.image === 'object') {
    formatted.image_url = item.image.url || `/media/${item.image.filename}`
    formatted.cms_image_url = item.image.filename
  }

  // Add year/description
  if (item.year) {
    formatted.description = item.year.toString()
  }

  formatted.cms_slug = item.slug

  return formatted
}
