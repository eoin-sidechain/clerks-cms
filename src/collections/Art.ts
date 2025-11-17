import type { CollectionConfig } from 'payload'
import { generateSlug } from '@/utilities/generateSlug'

export const Art: CollectionConfig = {
  slug: 'art',
  admin: {
    useAsTitle: 'title',
    group: 'Assets',
    listSearchableFields: ['title', 'artist', 'slug', 'description'],
    components: {
      beforeListTable: ['@/components/ArtGridView'],
    },
  },
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (data.title && data.artist) {
          data.slug = generateSlug({
            title: data.title,
            creator: data.artist,
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
              name: 'artist',
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
                description: 'Year created',
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
                description: 'Auto-generated from title, artist, and year',
                disableListColumn: true,
                components: {
                  Field: {
                    path: '@/components/SlugField',
                    clientProps: {
                      creatorField: 'artist',
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
                description: 'Optional description or context about the artwork',
                disableListColumn: true,
              },
            },
          ],
        },
      ],
    },
  ],
}
