import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Cascade publish hook for Applications
 * When an Application is published, automatically publish all related draft Sections and Steps
 */
export const cascadePublishApplication: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  context,
}) => {
  // Skip if this is a cascade publish to prevent infinite loops
  if (context?.skipCascadePublish) {
    return data
  }

  // Only cascade when publishing (status changes to 'published')
  const isPublishing = data._status === 'published'

  if (!isPublishing || operation !== 'update') {
    return data
  }

  try {
    req.payload.logger.info(`Starting cascade publish for Application`)

    // Collect all section IDs from mainSections and followUpSections
    const sectionIds: number[] = []

    if (data.mainSections) {
      const mainIds = Array.isArray(data.mainSections)
        ? data.mainSections.map((s) => (typeof s === 'object' ? s.id : s))
        : []
      sectionIds.push(...mainIds)
    }

    if (data.followUpSections) {
      const followUpIds = Array.isArray(data.followUpSections)
        ? data.followUpSections.map((s) => (typeof s === 'object' ? s.id : s))
        : []
      sectionIds.push(...followUpIds)
    }

    // Publish all related Sections (and their Steps)
    for (const sectionId of sectionIds) {
      await cascadePublishSection(req, sectionId)
    }

    req.payload.logger.info(`Cascade publish complete for Application`)
  } catch (error) {
    req.payload.logger.error(`Error in cascade publish: ${error}`)
    throw error
  }

  return data
}

/**
 * Helper function to publish a Section and all its Steps
 */
async function cascadePublishSection(req: any, sectionId: number): Promise<void> {
  try {
    // Fetch the section with its steps
    const section = await req.payload.findByID({
      collection: 'sections',
      id: sectionId,
      depth: 1,
    })

    // If section is already published, skip
    if (section._status === 'published') {
      req.payload.logger.info(`Section ${sectionId} already published, skipping`)
      return
    }

    req.payload.logger.info(`Publishing Section ${sectionId}`)

    // Publish all Steps in this Section first
    if (section.steps && Array.isArray(section.steps)) {
      for (const stepEntry of section.steps) {
        const stepId = typeof stepEntry.step === 'object' ? stepEntry.step.id : stepEntry.step

        if (stepId) {
          await cascadePublishStep(req, stepId)
        }
      }
    }

    // Now publish the Section itself
    await req.payload.update({
      collection: 'sections',
      id: sectionId,
      data: {
        _status: 'published',
      },
      context: {
        skipCascadePublish: true,
        skipPropagation: true, // Don't trigger the propagation hooks
      },
      depth: 0,
    })

    req.payload.logger.info(`Section ${sectionId} published successfully`)
  } catch (error) {
    req.payload.logger.error(`Error publishing Section ${sectionId}: ${error}`)
    throw error
  }
}

/**
 * Helper function to publish a Step
 */
async function cascadePublishStep(req: any, stepId: number): Promise<void> {
  try {
    // Fetch the step to check its status
    const step = await req.payload.findByID({
      collection: 'steps',
      id: stepId,
      depth: 0,
    })

    // If step is already published, skip
    if (step._status === 'published') {
      req.payload.logger.info(`Step ${stepId} already published, skipping`)
      return
    }

    req.payload.logger.info(`Publishing Step ${stepId}`)

    // Publish the Step
    await req.payload.update({
      collection: 'steps',
      id: stepId,
      data: {
        _status: 'published',
      },
      context: {
        skipCascadePublish: true,
        skipPropagation: true, // Don't trigger the propagation hooks
      },
      depth: 0,
    })

    req.payload.logger.info(`Step ${stepId} published successfully`)
  } catch (error) {
    req.payload.logger.error(`Error publishing Step ${stepId}: ${error}`)
    throw error
  }
}
