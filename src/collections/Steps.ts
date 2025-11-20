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
      async ({ data, req, operation: _operation }) => {
        // Helper function to extract item ID and collection from polymorphic relationship
        const extractItemRef = (
          itemRef: any,
          mediaType?: string,
        ): { itemId?: number; collection?: string } => {
          if (typeof itemRef === 'object' && 'value' in itemRef) {
            // Polymorphic format: { relationTo, value }
            return {
              collection: itemRef.relationTo,
              itemId:
                typeof itemRef.value === 'object' ? itemRef.value?.id : itemRef.value,
            }
          } else if (typeof itemRef === 'number') {
            return {
              itemId: itemRef,
              collection: mediaType,
            }
          }
          return {}
        }

        // Helper function to get item title
        const getItemTitle = (item: any): string => {
          return item.title || item.album || 'Unknown'
        }

        // Helper function to get capitalized media type label
        const getMediaTypeLabel = (mediaType: string): string => {
          const labels: Record<string, string> = {
            art: 'Art',
            films: 'Films',
            albums: 'Albums',
            books: 'Books',
          }
          return labels[mediaType] || mediaType
        }

        // Auto-generate title for rating questions
        if (
          data.stepType === 'question' &&
          data.questionType === 'rating' &&
          data.ratingItem
        ) {
          try {
            const { itemId, collection } = extractItemRef(data.ratingItem, data.mediaType)

            if (itemId && collection) {
              const relatedItem = await req.payload.findByID({
                collection: collection as 'albums' | 'books' | 'films' | 'art',
                id: itemId,
              })

              if (relatedItem?.title && data.mediaType) {
                const mediaTypeLabel = getMediaTypeLabel(data.mediaType)
                data.title = `${mediaTypeLabel}: Rate "${relatedItem.title}"`
              }
            }
          } catch (error) {
            console.error('Error generating title for rating question:', error)
          }
        }

        // Auto-generate title for this_or_that and this_or_that_with_alternates questions
        if (
          data.stepType === 'question' &&
          (data.questionType === 'this_or_that' || data.questionType === 'this_or_that_with_alternates') &&
          data.optionA &&
          data.optionB
        ) {
          try {
            const { itemId: itemIdA, collection: collectionA } = extractItemRef(
              data.optionA,
              data.mediaType,
            )
            const { itemId: itemIdB, collection: collectionB } = extractItemRef(
              data.optionB,
              data.mediaType,
            )

            if (itemIdA && collectionA && itemIdB && collectionB) {
              const [itemA, itemB] = await Promise.all([
                req.payload.findByID({
                  collection: collectionA as 'albums' | 'books' | 'films' | 'art',
                  id: itemIdA,
                }),
                req.payload.findByID({
                  collection: collectionB as 'albums' | 'books' | 'films' | 'art',
                  id: itemIdB,
                }),
              ])

              if (itemA && itemB && data.mediaType) {
                const titleA = getItemTitle(itemA)
                const titleB = getItemTitle(itemB)
                const mediaTypeLabel = getMediaTypeLabel(data.mediaType)
                data.title = `${mediaTypeLabel}: ${titleA} vs ${titleB}`
              }
            }
          } catch (error) {
            console.error('Error generating title for this_or_that question:', error)
          }
        }

        // Auto-generate title for ranking questions
        if (
          data.stepType === 'question' &&
          data.questionType === 'ranking' &&
          data.rankingOptions &&
          Array.isArray(data.rankingOptions) &&
          data.rankingOptions.length > 0
        ) {
          try {
            const itemTitles: string[] = []

            for (const option of data.rankingOptions) {
              if (option.item) {
                const { itemId, collection } = extractItemRef(option.item, data.mediaType)

                if (itemId && collection) {
                  const item = await req.payload.findByID({
                    collection: collection as 'albums' | 'books' | 'films' | 'art',
                    id: itemId,
                  })

                  if (item) {
                    itemTitles.push(getItemTitle(item))
                  }
                }
              }
            }

            if (itemTitles.length > 0 && data.mediaType) {
              const mediaTypeLabel = getMediaTypeLabel(data.mediaType)
              data.title = `${mediaTypeLabel}: ${itemTitles.join(', ')}`
            }
          } catch (error) {
            console.error('Error generating title for ranking question:', error)
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
          'Question text or statement title (auto-generated for rating, this or that, and ranking questions)',
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
        { label: 'This or That (with alternates)', value: 'this_or_that_with_alternates' },
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
            siblingData.questionType === 'this_or_that_with_alternates' ||
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
          siblingData.stepType === 'question' &&
          (siblingData.questionType === 'this_or_that' || siblingData.questionType === 'this_or_that_with_alternates'),
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
          siblingData.stepType === 'question' &&
          (siblingData.questionType === 'this_or_that' || siblingData.questionType === 'this_or_that_with_alternates'),
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
