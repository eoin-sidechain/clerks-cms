import type { CollectionConfig } from 'payload'

export const Applications: CollectionConfig = {
  slug: 'applications',
  admin: {
    useAsTitle: 'title',
    group: 'Applications',
    defaultColumns: ['title', 'published', 'updatedAt'],
  },
  access: {
    read: () => true, // Public API access
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'URL-friendly identifier for this application',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional description of this application/quiz',
      },
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Whether this application is published and available',
      },
    },
    // Main sections (typically the application quiz itself)
    {
      name: 'mainSections',
      type: 'relationship',
      relationTo: 'sections',
      hasMany: true,
      required: true,
      admin: {
        description: 'Main application sections (e.g., Clerks Application Quiz)',
      },
    },
    // Follow-up sections (domain-specific value quizzes)
    {
      name: 'followUpSections',
      type: 'relationship',
      relationTo: 'sections',
      hasMany: true,
      admin: {
        description: 'Follow-up sections (e.g., Book, Music, Movie, Art values quizzes)',
      },
    },
  ],
}
