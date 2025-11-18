import type { CollectionConfig } from 'payload'
import { authenticatedOrPublished } from '../access/authenticatedOrPublished'

export const Sections: CollectionConfig = {
  slug: 'sections',
  admin: {
    useAsTitle: 'title',
    group: 'Applications',
    defaultColumns: ['title', 'order', 'updatedAt'],
    description:
      'Sections are always kept as drafts. Publish from the Application level to publish all content.',
  },
  access: {
    read: authenticatedOrPublished,
  },
  versions: {
    drafts: {
      autosave: false,
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'order',
      type: 'number',
      required: true,
      admin: {
        description: 'Display order of this section',
      },
    },
    // Steps in this section (questions and statements)
    {
      name: 'steps',
      type: 'array',
      labels: {
        singular: 'Step',
        plural: 'Steps',
      },
      admin: {
        description: 'Steps (questions and statements) in this section',
      },
      fields: [
        {
          name: 'step',
          type: 'relationship',
          relationTo: 'steps',
          required: true,
        },
        {
          name: 'order',
          type: 'number',
          required: true,
          admin: {
            description: 'Order within this section',
          },
        },
      ],
    },
  ],
}
