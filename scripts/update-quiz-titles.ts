import fs from 'fs'
import path from 'path'

/**
 * Script to update quiz seed data titles to match new conventions:
 * - Rating: "{MediaType}: Rate \"{Item Title}\""
 * - This or That: "{MediaType}: {Artist A} vs {Artist B}"
 * - Ranking: "{MediaType}: {Artist 1}, {Artist 2}, {Artist 3}, {Artist 4}"
 */

interface QuizItem {
  id: string
  label: string
  image_url?: string
  cms_slug?: string
  cms_image_url?: string
  description?: string
}

interface QuizQuestion {
  id: string
  type: string
  title: string
  required?: boolean
  questionType?: string
  description?: string
  properties?: {
    items?: QuizItem[]
    choices?: QuizItem[]
    [key: string]: any
  }
}

// Map file names to media type labels
const fileToMediaType: Record<string, string> = {
  'art-values-quiz-v4.json': 'Art',
  'music-values-quiz-v4.json': 'Albums',
  'movie-values-quiz-v4.json': 'Films',
  'book-values-quiz-v4.json': 'Books',
}

// For the main application quiz, determine media type from question ID
function getMediaTypeFromId(questionId: string): string {
  if (questionId.startsWith('music-') || questionId.includes('-music-')) return 'Albums'
  if (questionId.startsWith('art-') || questionId.includes('-art-')) return 'Art'
  if (questionId.startsWith('movie-') || questionId.includes('-movie-')) return 'Films'
  if (questionId.startsWith('book-') || questionId.includes('-book-')) return 'Books'

  // Fallback: check image_url path
  return 'Unknown'
}

function getMediaTypeFromImageUrl(imageUrl?: string): string {
  if (!imageUrl) return 'Unknown'
  if (imageUrl.includes('/music/')) return 'Albums'
  if (imageUrl.includes('/art/')) return 'Art'
  if (imageUrl.includes('/movies/')) return 'Films'
  if (imageUrl.includes('/books/')) return 'Books'
  return 'Unknown'
}

/**
 * Extract item title from label (for this-or-that and ranking)
 * Same as extractTitleFromLabel but with consistent naming
 */
function extractItemTitle(label: string): string {
  return extractTitleFromLabel(label)
}

/**
 * Extract item title from label
 * Handles formats:
 * - "Title (Artist Name)" -> "Title"
 * - "Title - Artist Name" -> "Title"
 */
function extractTitleFromLabel(label: string): string {
  // Try format: "Title (Artist Name)"
  const parenthesesMatch = label.match(/^(.+?)\s*\([^)]+\)/)
  if (parenthesesMatch) {
    return parenthesesMatch[1].trim()
  }

  // Try format: "Title - Artist Name"
  const dashMatch = label.match(/^(.+?)\s+-\s+/)
  if (dashMatch) {
    return dashMatch[1].trim()
  }

  // Fallback: return the whole label
  return label.trim()
}

function updateQuizTitles(filePath: string, fileName: string): void {
  console.log(`\nProcessing: ${fileName}`)

  const content = fs.readFileSync(filePath, 'utf-8')
  const quiz: QuizQuestion[] = JSON.parse(content)

  let updatedCount = 0

  quiz.forEach((question) => {
    if (question.type !== 'question') return

    // Determine media type
    let mediaType = fileToMediaType[fileName]
    if (!mediaType) {
      // For clerks-application-quiz.json, determine from ID or image URL
      mediaType = getMediaTypeFromId(question.id)
      if (mediaType === 'Unknown' && question.properties?.items?.[0]) {
        mediaType = getMediaTypeFromImageUrl(question.properties.items[0].image_url)
      }
      if (mediaType === 'Unknown' && question.properties?.choices?.[0]) {
        mediaType = getMediaTypeFromImageUrl(question.properties.choices[0].image_url)
      }
    }

    // Handle Rating questions
    if (question.questionType === 'rating' && question.properties?.items?.[0]) {
      const item = question.properties.items[0]
      const itemTitle = extractTitleFromLabel(item.label)
      const newTitle = `${mediaType}: Rate "${itemTitle}"`

      if (question.title !== newTitle) {
        console.log(`  [RATING] ${question.title} -> ${newTitle}`)
        question.title = newTitle
        updatedCount++
      }
    }

    // Handle This or That questions (both types)
    if ((question.questionType === 'this_or_that' || question.questionType === 'this_or_that_with_alternates') && question.properties?.choices) {
      // Filter out "I Don't Know" option
      const validChoices = question.properties.choices.filter(
        (choice) => !choice.label.toLowerCase().includes("don't know")
      )

      if (validChoices.length >= 2) {
        const titleA = extractItemTitle(validChoices[0].label)
        const titleB = extractItemTitle(validChoices[1].label)
        const newTitle = `${mediaType}: ${titleA} vs ${titleB}`

        if (question.title !== newTitle) {
          console.log(`  [THIS OR THAT] ${question.title} -> ${newTitle}`)
          question.title = newTitle
          updatedCount++
        }
      }
    }

    // Handle Ranking questions
    if (question.questionType === 'ranking' && question.properties?.choices) {
      const itemTitles = question.properties.choices.map((choice) =>
        extractItemTitle(choice.label)
      )
      const newTitle = `${mediaType}: ${itemTitles.join(', ')}`

      if (question.title !== newTitle) {
        console.log(`  [RANKING] ${question.title} -> ${newTitle}`)
        question.title = newTitle
        updatedCount++
      }
    }
  })

  // Write updated quiz back to file
  if (updatedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(quiz, null, 2) + '\n')
    console.log(`  ✓ Updated ${updatedCount} question titles`)
  } else {
    console.log(`  ✓ No changes needed`)
  }
}

// Main execution
const quizzesDir = path.join(process.cwd(), 'seed_data', 'quizzes')
const quizFiles = [
  'art-values-quiz-v4.json',
  'book-values-quiz-v4.json',
  'clerks-application-quiz.json',
  'movie-values-quiz-v4.json',
  'music-values-quiz-v4.json',
]

console.log('Updating quiz titles...')

quizFiles.forEach((fileName) => {
  const filePath = path.join(quizzesDir, fileName)
  if (fs.existsSync(filePath)) {
    updateQuizTitles(filePath, fileName)
  } else {
    console.log(`\nSkipping: ${fileName} (not found)`)
  }
})

console.log('\n✓ Done!')
