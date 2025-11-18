import type { CollectionConfig } from 'payload'
import { generateSlug } from '@/utilities/generateSlug'

export const Books: CollectionConfig = {
  slug: 'books',
  admin: {
    useAsTitle: 'title',
    group: 'Assets',
    listSearchableFields: ['title', 'author', 'slug', 'description'],
    components: {
      beforeListTable: ['@/components/BooksGridView'],
    },
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Only generate slug if not already provided (e.g., during import)
        if (data.title && data.author && !data.slug) {
          data.slug = generateSlug({
            title: data.title,
            creator: data.author,
            year: data.year,
          })
        }
        return data
      },
    ],
  },
  access: {
    read: () => true, // Public API access
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          type: 'collapsible',
          label: 'Details',
          admin: {
            initCollapsed: false,
          },
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              index: true,
              admin: {
                disableListColumn: true,
              },
            },
            {
              name: 'author',
              type: 'text',
              required: true,
              index: true,
              admin: {
                disableListColumn: true,
              },
            },
            {
              name: 'year',
              type: 'number',
              admin: {
                description: 'Publication year',
                disableListColumn: true,
              },
            },
            {
              name: 'slug',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: {
                description: 'Auto-generated from title, author, and year',
                disableListColumn: true,
                components: {
                  Field: {
                    path: '@/components/SlugField',
                    clientProps: {
                      creatorField: 'author',
                    },
                  },
                },
              },
            },
          ],
        },
        {
          type: 'collapsible',
          label: 'Media & Description',
          admin: {
            initCollapsed: false,
          },
          fields: [
            {
              name: 'coverImage',
              type: 'upload',
              relationTo: 'media',
              required: true,
              admin: {
                disableListColumn: true,
              },
            },
            {
              name: 'description',
              type: 'textarea',
              index: true,
              admin: {
                description: 'Optional description or synopsis',
                disableListColumn: true,
              },
            },
          ],
        },
      ],
    },
  ],
}
