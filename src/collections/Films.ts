import type { CollectionConfig } from 'payload'
import { generateSlug } from '@/utilities/generateSlug'

export const Films: CollectionConfig = {
  slug: 'films',
  admin: {
    useAsTitle: 'title',
    group: 'Assets',
    listSearchableFields: ['title', 'director', 'slug', 'description'],
    components: {
      beforeListTable: ['@/components/FilmsGridView'],
    },
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.title && data.director) {
          data.slug = generateSlug({
            title: data.title,
            creator: data.director,
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
              name: 'director',
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
                description: 'Release year',
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
                description: 'Auto-generated from title, director, and year',
                disableListColumn: true,
                components: {
                  Field: {
                    path: '@/components/SlugField',
                    clientProps: {
                      creatorField: 'director',
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
