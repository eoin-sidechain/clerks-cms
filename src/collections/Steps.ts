import type { CollectionConfig } from 'payload'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'

export const Steps: CollectionConfig = {
  slug: 'steps',
  admin: {
    useAsTitle: 'title',
    group: 'Applications',
    defaultColumns: ['title', 'stepType', 'questionType', 'updatedAt'],
    description:
      'Steps are always kept as drafts. Publish from the Application level to publish all content.',
  },
  access: {
    read: authenticatedOrPublished,
  },
  versions: {
    drafts: {
      autosave: false,
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Auto-generate title for rating questions
        if (
          data.stepType === 'question' &&
          data.questionType === 'rating' &&
          data.ratingItem
        ) {
          try {
            // Extract the item ID and collection from polymorphic relationship
            let itemId: number | undefined
            let collection: string | undefined

            if (typeof data.ratingItem === 'object' && 'value' in data.ratingItem) {
              // Polymorphic format: { relationTo, value }
              collection = data.ratingItem.relationTo
              itemId =
                typeof data.ratingItem.value === 'object'
                  ? data.ratingItem.value?.id
                  : data.ratingItem.value
            } else if (typeof data.ratingItem === 'number') {
              // Simple number format
              itemId = data.ratingItem
              collection = data.mediaType
            }

            // Fetch the related item to get its title
            if (itemId && collection) {
              const relatedItem = await req.payload.findByID({
                collection: collection as 'albums' | 'books' | 'films' | 'art',
                id: itemId,
              })

              if (relatedItem?.title) {
                data.title = `Rate "${relatedItem.title}"`
              }
            }
          } catch (error) {
            console.error('Error generating title for rating question:', error)
          }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description:
          'Question text or statement title (auto-generated for rating questions)',
        components: {
          Field: {
            path: '@/fields/TitleField',
          },
        },
      },
    },
    {
      name: 'subtitle',
      type: 'text',
      admin: {
        description: 'Optional subtitle text that appears below the title',
      },
    },
    {
      name: 'placeholder',
      type: 'text',
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'question' &&
          (siblingData.questionType === 'short_text' || siblingData.questionType === 'long_text'),
        description: 'Placeholder text for text input fields',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Helper text or description that provides context for this step',
      },
    },
    {
      name: 'stepType',
      type: 'select',
      required: true,
      options: [
        { label: 'Question', value: 'question' },
        { label: 'Statement', value: 'statement' },
      ],
      admin: {
        description: 'Type of step: Question or Statement',
      },
    },

    // ===== QUESTION FIELDS =====
    {
      name: 'questionType',
      type: 'select',
      admin: {
        condition: (_, siblingData) => siblingData.stepType === 'question',
        description: 'Type of question',
      },
      options: [
        { label: 'Short Text', value: 'short_text' },
        { label: 'Long Text', value: 'long_text' },
        { label: 'Multiple Choice', value: 'multiple_choice' },
        { label: 'This or That', value: 'this_or_that' },
        { label: 'Rating', value: 'rating' },
        { label: 'Ranking', value: 'ranking' },
      ],
    },
    // Multiple Choice Options
    {
      name: 'options',
      type: 'array',
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'question' && siblingData.questionType === 'multiple_choice',
        description: 'Options for multiple choice questions',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'value',
          type: 'text',
          required: true,
        },
      ],
    },

    // Media Type selector for This or That, Rating, and Ranking
    {
      name: 'mediaType',
      type: 'select',
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'question' &&
          (siblingData.questionType === 'this_or_that' ||
            siblingData.questionType === 'rating' ||
            siblingData.questionType === 'ranking'),
        description: 'Select which type of media to use for this question',
      },
      options: [
        { label: 'Art', value: 'art' },
        { label: 'Films', value: 'films' },
        { label: 'Albums', value: 'albums' },
        { label: 'Books', value: 'books' },
      ],
    },

    // This or That Options
    {
      name: 'optionA',
      type: 'relationship',
      relationTo: ['art', 'films', 'albums', 'books'],
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'question' && siblingData.questionType === 'this_or_that',
        description: 'First option (A)',
        components: {
          Field: {
            path: '@/fields/RelationshipGridField',
          },
        },
      },
    },
    {
      name: 'optionB',
      type: 'relationship',
      relationTo: ['art', 'films', 'albums', 'books'],
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'question' && siblingData.questionType === 'this_or_that',
        description: 'Second option (B)',
        components: {
          Field: {
            path: '@/fields/RelationshipGridField',
          },
        },
      },
    },
    // Rating - Item to be rated
    {
      name: 'ratingItem',
      type: 'relationship',
      relationTo: ['art', 'films', 'albums', 'books'],
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'question' && siblingData.questionType === 'rating',
        description: 'The item to be rated',
        components: {
          Field: {
            path: '@/fields/RelationshipGridField',
          },
        },
      },
    },
    // Rating Labels
    {
      name: 'ratingLabels',
      type: 'array',
      required: false,
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'question' && siblingData.questionType === 'rating',
        description: 'Rating labels (optional - e.g., "Like it", "Love it", "Obsessed")',
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          name: 'value',
          type: 'number',
          required: true,
          admin: {
            description: 'Numeric value for this rating',
          },
        },
      ],
    },
    // Ranking Options (4 items)
    {
      name: 'rankingOptions',
      type: 'array',
      maxRows: 4,
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'question' && siblingData.questionType === 'ranking',
        description: 'Items to rank (maximum 4)',
      },
      fields: [
        {
          name: 'item',
          type: 'relationship',
          relationTo: ['art', 'films', 'albums', 'books'],
          required: true,
          admin: {
            components: {
              Field: {
                path: '@/fields/RelationshipGridField',
              },
            },
          },
        },
      ],
    },

    // ===== STATEMENT FIELDS =====
    {
      name: 'statementType',
      type: 'select',
      admin: {
        condition: (_, siblingData) => siblingData.stepType === 'statement',
        description: 'Type of statement content',
      },
      options: [
        { label: 'Text Block', value: 'text' },
        { label: 'Video Thumbnail', value: 'video' },
        { label: 'Audio Thumbnail', value: 'audio' },
      ],
    },
    // Text block content
    {
      name: 'textContent',
      type: 'richText',
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'statement' && siblingData.statementType === 'text',
        description: 'Rich text content for text blocks',
      },
    },
    // Video/Audio thumbnail
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'statement' &&
          (siblingData.statementType === 'video' || siblingData.statementType === 'audio'),
        description: 'Thumbnail image for video/audio',
      },
    },
    {
      name: 'mediaFile',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_, siblingData) =>
          siblingData.stepType === 'statement' &&
          (siblingData.statementType === 'video' || siblingData.statementType === 'audio'),
        description: 'Video or audio file',
      },
    },
    // Call to Action
    {
      name: 'cta',
      type: 'group',
      admin: {
        condition: (_, siblingData) => siblingData.stepType === 'statement',
        description: 'Optional call-to-action button',
      },
      fields: [
        {
          name: 'text',
          type: 'text',
          admin: {
            description: 'CTA button text',
          },
        },
        {
          name: 'url',
          type: 'text',
          admin: {
            description: 'CTA button URL',
          },
        },
      ],
    },
  ],
}
