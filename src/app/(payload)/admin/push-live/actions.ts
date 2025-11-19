'use server'

import { getPayload } from 'payload'
import configPromise from '@payload-config'
import postgres from 'postgres'

interface PushResult {
  success: boolean
  error?: string
  applicationTitle?: string
  deactivatedCount?: number
  createdCount?: number
  mainSections?: number
  followUpSections?: number
  templates?: any[]
}

export async function pushApplicationLive(): Promise<PushResult> {
  try {
    const payload = await getPayload({ config: await configPromise })

    // 1. Find the published Clerks Application
    const applications = await payload.find({
      collection: 'applications',
      where: {
        published: {
          equals: true,
        },
      },
      limit: 1,
      depth: 2, // Populate sections
    })

    if (!applications.docs || applications.docs.length === 0) {
      return {
        success: false,
        error: 'No published application found. Please publish an application first.',
      }
    }

    const application = applications.docs[0]
    const mainSections = application.mainSections || []
    const followUpSections = application.followUpSections || []

    const allSections = [
      ...mainSections.map((s: any) => ({ ...s, isRequired: true })),
      ...followUpSections.map((s: any) => ({ ...s, isRequired: false })),
    ]

    if (allSections.length === 0) {
      return {
        success: false,
        error: 'Application has no sections. Please add sections to the application.',
      }
    }

    // 2. Connect to public schema (NOT payload_cms)
    const sql = postgres(process.env.DATABASE_URL || '', {
      max: 1,
    })

    // 3. Deactivate all existing quiz templates
    const deactivatedResult = await sql`
      UPDATE public.cms_quiz_templates
      SET is_active = false, active = false, updated_at = NOW()
      WHERE is_active = true
    `
    const deactivatedCount = deactivatedResult.count

    // 4. Create new quiz templates from sections
    const createdTemplates: any[] = []
    let order = 0

    for (const section of allSections) {
      try {
        // Ensure only 1 section per template
        const sectionSteps = Array.isArray(section.steps) ? section.steps : []

        if (sectionSteps.length === 0) {
          console.warn(`Section "${section.title}" has no steps, skipping...`)
          continue
        }

        // Get quiz format JSON from endpoint
        const quizFormatUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/quiz-format?sectionId=${section.id}`
        const quizFormatResponse = await fetch(quizFormatUrl)

        if (!quizFormatResponse.ok) {
          console.error(`Failed to fetch quiz format for section ${section.id}`)
          continue
        }

        const quizData = await quizFormatResponse.json()

        // Generate quiz_id from section title
        const quizId = section.title
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')

        // Insert new template
        const [newTemplate] = await sql`
          INSERT INTO public.cms_quiz_templates (
            quiz_id,
            title,
            description,
            icon,
            category,
            estimated_time,
            quiz_data,
            version,
            is_active,
            active,
            "order",
            is_required,
            display_order,
            section_id,
            application_id,
            created_at,
            updated_at
          ) VALUES (
            ${quizId},
            ${section.title},
            ${`Quiz based on ${section.title} section`},
            ${'📝'},
            ${'Application'},
            ${'15 minutes'},
            ${sql.json(quizData)},
            ${'1'},
            ${true},
            ${true},
            ${order},
            ${section.isRequired},
            ${order},
            ${section.id},
            ${application.id},
            NOW(),
            NOW()
          )
          ON CONFLICT (quiz_id)
          DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            quiz_data = EXCLUDED.quiz_data,
            is_active = EXCLUDED.is_active,
            active = EXCLUDED.active,
            "order" = EXCLUDED."order",
            is_required = EXCLUDED.is_required,
            display_order = EXCLUDED.display_order,
            section_id = EXCLUDED.section_id,
            application_id = EXCLUDED.application_id,
            updated_at = NOW()
          RETURNING *
        `

        createdTemplates.push(newTemplate)
        order++
      } catch (error) {
        console.error(`Error creating template for section ${section.id}:`, error)
      }
    }

    await sql.end()

    return {
      success: true,
      applicationTitle: application.title,
      deactivatedCount,
      createdCount: createdTemplates.length,
      mainSections: mainSections.length,
      followUpSections: followUpSections.length,
      templates: createdTemplates,
    }
  } catch (error) {
    console.error('Error pushing application live:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}
