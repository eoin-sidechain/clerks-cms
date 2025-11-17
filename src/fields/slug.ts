import type { TextField } from 'payload'
import { generateSlug } from '@/utilities/generateSlug'

interface SlugFieldConfig {
  fieldToUse?: string[]
  creatorField: string
}

export const createSlugField = ({ creatorField }: SlugFieldConfig): TextField => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    description: 'Auto-generated from title, creator, and year',
  },
  hooks: {
    beforeValidate: [
      ({ value, data, originalDoc, operation }) => {
        // Only auto-generate if creating new or if slug is empty
        if (operation === 'create' || !value) {
          if (data?.title && data?.[creatorField]) {
            return generateSlug({
              title: data.title,
              creator: data[creatorField],
              year: data?.year,
            })
          }
        }
        return value
      },
    ],
  },
})
