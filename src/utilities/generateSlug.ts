import { toKebabCase } from './toKebabCase'

interface GenerateSlugParams {
  title: string
  creator: string
  year?: number
}

export const generateSlug = ({ title, creator, year }: GenerateSlugParams): string => {
  // Sanitize inputs - remove special characters except spaces and alphanumeric
  const sanitize = (str: string): string =>
    str.replace(/[^\w\s-]/g, '').trim()

  const sanitizedTitle = sanitize(title)
  const sanitizedCreator = sanitize(creator)

  // Build slug parts
  const parts = [sanitizedTitle, sanitizedCreator]
  if (year) {
    parts.push(year.toString())
  }

  // Join with spaces, then convert to kebab-case
  return toKebabCase(parts.join(' '))
}
