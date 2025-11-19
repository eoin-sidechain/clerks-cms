import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { getServerSideURL } from '@/utilities/getURL'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sectionId = searchParams.get('sectionId')

    if (!sectionId) {
      return NextResponse.json(
        { error: 'sectionId parameter is required' },
        { status: 400 }
      )
    }

    const payload = await getPayload({ config: await configPromise })
    const serverUrl = getServerSideURL()

    // Fetch section with all steps populated
    const section = await payload.findByID({
      collection: 'sections',
      id: parseInt(sectionId),
      depth: 3, // Deep populate steps and their relationships
    })

    if (!section) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      )
    }

    // Transform section steps into quiz format
    const quizSteps = []

    for (const stepRef of section.steps || []) {
      const step = typeof stepRef.step === 'object' ? stepRef.step : null

      if (!step) continue

      // Determine the type based on stepType and statementType
      let stepTypeValue = 'question'
      if (step.stepType === 'statement') {
        if (step.statementType === 'video') {
          stepTypeValue = 'video_statement'
        } else if (step.statementType === 'audio') {
          stepTypeValue = 'audio_statement'
        } else {
          stepTypeValue = 'statement'
        }
      }

      // Map PayloadCMS step to quiz format
      const quizStep: any = {
        id: step.slug || `step-${step.id}`,
        type: stepTypeValue,
        title: step.title,
        required: true,
        properties: {},
      }

      // Add questionType only for questions
      if (step.stepType === 'question') {
        quizStep.questionType = step.questionType
      }

      // Add subtitle if present
      if (step.subtitle) {
        quizStep.subtitle = step.subtitle
      }

      // Add type-specific properties
      // Multiple Choice - uses 'options' array
      if (step.questionType === 'multiple_choice' && step.options) {
        quizStep.properties.choices = step.options.map((option: any) => ({
          id: option.value,
          label: option.label,
        }))
      }

      // This or That - uses optionA and optionB relationships
      if (step.questionType === 'this_or_that') {
        const choices: any[] = []

        // Fetch and format optionA
        const optionA = await fetchMediaItem(step.optionA, step.mediaType, payload, serverUrl)
        if (optionA) {
          choices.push(optionA)
        }

        // Fetch and format optionB
        const optionB = await fetchMediaItem(step.optionB, step.mediaType, payload, serverUrl)
        if (optionB) {
          choices.push(optionB)
        }

        if (choices.length > 0) {
          quizStep.properties.choices = choices
        }
      }

      // Rating - uses ratingItem relationship and ratingLabels array
      if (step.questionType === 'rating' && step.ratingItem) {
        const item = await fetchMediaItem(step.ratingItem, step.mediaType, payload, serverUrl)
        if (item) {
          quizStep.properties.items = [item]
        }

        // Add rating labels if present
        if (step.ratingLabels && Array.isArray(step.ratingLabels)) {
          quizStep.properties.rating_labels = step.ratingLabels.map((labelObj: any) => ({
            label: labelObj.label,
            value: labelObj.value,
          }))
        }
      }

      // Ranking - uses rankingOptions array with item relationships
      if (step.questionType === 'ranking' && step.rankingOptions) {
        const rankingChoices: any[] = []
        for (const option of step.rankingOptions) {
          const item = await fetchMediaItem(option.item, step.mediaType, payload, serverUrl)
          if (item) {
            rankingChoices.push(item)
          }
        }
        quizStep.properties.choices = rankingChoices
      }

      if (['short_text', 'long_text'].includes(step.questionType) && step.placeholder) {
        quizStep.properties.placeholder = step.placeholder
      }

      // Handle statement types (text, video, audio)
      if (step.stepType === 'statement') {
        // Build content array for video/audio statements
        if (step.statementType === 'video' || step.statementType === 'audio') {
          quizStep.properties.content = []

          // Add media file if present
          if (step.mediaFile && typeof step.mediaFile === 'object') {
            quizStep.properties.content.push({
              link: step.mediaFile.url,
              name: step.mediaFile.filename || step.title,
            })
          }

          // Add thumbnail if present
          if (step.thumbnail && typeof step.thumbnail === 'object') {
            quizStep.properties.thumbnail_url = step.thumbnail.url || ''
          }

          // Add description text if present
          if (step.description) {
            quizStep.properties.content.push(step.description)
          }
        } else if (step.statementType === 'text') {
          // For regular text statements, description goes at the top level
          if (step.description) {
            quizStep.description = step.description
          }

          // If there's rich text content, convert it to plain text for description
          // Note: textContent is a Lexical JSON structure, would need parsing
          // For now, prioritize the simple description field
        }

        // Add CTA button properties if present (for all statement types)
        if (step.cta?.text) {
          quizStep.properties.button_text = step.cta.text
        }
        if (step.cta?.url) {
          quizStep.properties.button_url = step.cta.url
        }
      }

      // Add description for questions (at the top level)
      if (step.stepType === 'question' && step.description) {
        quizStep.description = step.description
      }

      quizSteps.push(quizStep)
    }

    return NextResponse.json(quizSteps)
  } catch (error) {
    console.error('Error generating quiz format:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz format' },
      { status: 500 }
    )
  }
}

/**
 * Fetch and format a media item (album, book, film, art) for quiz
 */
async function fetchMediaItem(
  itemRef: any,
  mediaType: string,
  payload: any,
  serverUrl: string,
): Promise<any | null> {
  if (!itemRef) return null

  try {
    let collection = mediaType
    let itemId: number | undefined
    let item: any = null

    // Handle polymorphic relationship format
    if (typeof itemRef === 'object' && 'relationTo' in itemRef) {
      collection = itemRef.relationTo
      itemId = typeof itemRef.value === 'object' ? itemRef.value?.id : itemRef.value
    } else if (typeof itemRef === 'object' && 'id' in itemRef && itemRef.title) {
      // Already populated with full data
      return formatMediaItem(itemRef, collection, serverUrl)
    } else if (typeof itemRef === 'object' && 'id' in itemRef) {
      // Populated but incomplete - need to fetch
      itemId = itemRef.id
    } else if (typeof itemRef === 'number') {
      itemId = itemRef
    }

    if (!itemId || !collection) return null

    // Fetch the full item
    item = await payload.findByID({
      collection,
      id: itemId,
      depth: 1,
    })

    return formatMediaItem(item, collection, serverUrl)
  } catch (error) {
    console.error('Error fetching media item:', error)
    return null
  }
}

/**
 * Format a media item to quiz format
 */
function formatMediaItem(item: any, collection: string, serverUrl: string): any {
  if (!item) return null

  const formatted: any = {
    id: item.slug || `${collection}-${item.id}`,
    label: item.title || item.name || 'Unknown',
  }

  // Add artist/author/creator to label
  if (item.artist) {
    formatted.label = `${item.title} - ${item.artist}`
  } else if (item.author) {
    formatted.label = `${item.title} - ${item.author}`
  } else if (item.director) {
    formatted.label = `${item.title} - ${item.director}`
  }

  // Add image as fully qualified URL
  if (item.coverImage && typeof item.coverImage === 'object') {
    formatted.image_url = item.coverImage.filename
      ? `${serverUrl}/api/media/file/${item.coverImage.filename}`
      : ''
  } else if (item.image && typeof item.image === 'object') {
    formatted.image_url = item.image.filename
      ? `${serverUrl}/api/media/file/${item.image.filename}`
      : ''
  }

  // Add description (year)
  if (item.year) {
    formatted.description = item.year.toString()
  }

  return formatted
}
