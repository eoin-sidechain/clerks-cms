# Clerks CMS - Development Guide for Claude

This document provides context and guidelines for Claude when working with the Clerks CMS codebase.

## Project Overview

Clerks CMS is a cultural content management system built with:
- **Next.js 15.4** - React framework for the frontend
- **PayloadCMS 3.59** - Headless CMS for content management
- **TypeScript** - Primary development language
- **PostgreSQL** - Database (via Neon in production)
- **Vercel** - Hosting platform
- **pnpm** - Package manager (v10.18.1)

**Purpose:** A sacred membership society dedicated to the preservation of culture, managing collections of Art, Films, Literature, and Music.

## System Requirements

- Node.js: `^18.20.2 || >=20.9.0`
- pnpm: `10.18.1`
- PostgreSQL database

## Project Structure

```
clerks-cms/
├── src/
│   ├── app/               # Next.js 15 app directory
│   ├── collections/       # PayloadCMS collection configs
│   ├── components/        # React components
│   ├── fields/           # Custom PayloadCMS fields
│   ├── hooks/            # React hooks
│   ├── endpoints/        # Custom API endpoints
│   ├── access/           # Access control logic
│   ├── utilities/        # Shared utility functions
│   └── migrations/       # Database migrations
├── scripts/
│   ├── *.ts              # Reusable TypeScript scripts
│   ├── single-use/       # One-off TypeScript utility scripts
│   └── js/               # JavaScript utility scripts (legacy/quick)
├── seed_data/
│   ├── assets/           # JSON data for cultural assets
│   │   ├── art.json
│   │   ├── films.json
│   │   ├── literature.json
│   │   └── music.json
│   ├── quizzes/          # Quiz/assessment JSON data
│   └── images/           # Image assets organized by category
│       ├── art/
│       ├── movies/
│       ├── books/
│       └── music/
├── public/               # Static assets
├── migrations/           # Database migration files
└── tests/               # Test files (Playwright E2E, Vitest integration)
```

## Development Guidelines

### Scripts Organization

**Location Rules:**
- **Reusable scripts** → `scripts/*.ts` (TypeScript)
- **One-off utilities** → `scripts/single-use/*.ts` (TypeScript)
- **JavaScript scripts** → `scripts/js/*.js` (for legacy or quick utilities)

**Running Scripts:**
- TypeScript: `tsx scripts/script-name.ts` or via npm script
- JavaScript: `node scripts/js/script-name.js`

**Existing Scripts:**
- `scripts/import.ts` - Import cultural assets (art, films, books, albums)
- `scripts/clear.ts` - Clear database data
- `scripts/import-steps.ts` - Import quiz steps
- `scripts/import-applications.ts` - Import application workflows
- `scripts/js/normalize_assets.js` - Normalize asset filenames
- `scripts/js/update_quiz_cms_fields.js` - Update quiz CMS field references
- `scripts/js/verify_cms_files.js` - Verify all referenced files exist

### TypeScript Conventions

- Use strict TypeScript configuration (see `tsconfig.json`)
- Prefer type inference where clear, explicit types where complex
- Use PayloadCMS types from `payload` package
- Export types from files for reuse

### Code Style

- Use ESLint configuration (see `eslint.config.mjs`)
- Run `pnpm lint:fix` to auto-fix issues
- Follow Next.js and PayloadCMS conventions
- Use Tailwind CSS for styling

## Data Management

### Asset Data Structure

Assets (art, films, literature, music) are stored in JSON files with the following key fields:

**Common Fields:**
- `cms_slug` - Normalized slug (without extension)
- `cover_cms_filename` - Normalized filename with extension
- Old slug fields (for backward compatibility):
  - Art/Literature: `cover_filename_slug`
  - Films: `poster_filename_slug`
  - Music: `album_cover_filename_slug`

**Category-Specific Fields:**

**Art:**
```typescript
{
  title: string
  author: string  // Note: uses "author" not "artist"
  year: string
  region: string | null
  description: string
  cover_filename: string  // Original filename
  cover_filename_slug: string
  cover_cms_filename: string
  cms_slug: string
}
```

**Films:**
```typescript
{
  title: string
  director: string
  year: string
  country: string | null
  description: string | null
  poster_filename: string
  poster_filename_slug: string
  cover_cms_filename: string
  cms_slug: string
}
```

**Literature:**
```typescript
{
  title: string
  author: string
  year: string
  region: string | null
  description: string | null
  cover_filename: string
  cover_filename_slug: string
  cover_cms_filename: string
  cms_slug: string
}
```

**Music:**
```typescript
{
  artist: string
  album: string
  year: string
  album_cover_filename: string
  album_cover_filename_slug: string
  artist_image_filename: string
  artist_image_filename_slug: string
  cover_cms_filename: string
  cms_slug: string
}
```

### Image Asset Conventions

**Normalized Filename Format:** `{title}-{creator}-{year}.{ext}`

Examples:
- Art: `starry-night-vincent-van-gogh-1889.jpg`
- Films: `12-angry-men-sidney-lumet-1957.jpg`
- Books: `1984-george-orwell-1949.jpg`
- Music: `voodoo-d-angelo-2000.jpg`

**Special Cases:**
- Year ranges (e.g., "1884-1886") → skip year in filename
- "Unknown" or "Various" years → skip year in filename
- All images use `.jpg` extension (normalize `.jpeg` → `.jpg`)

**Image Directory Structure:**
```
seed_data/images/
├── art/          # Art images
├── movies/       # Film posters
├── books/        # Book covers
└── music/        # Album covers and artist photos
```

### Quiz Data Structure

Quizzes reference assets via `cms_slug` and `cms_image_url` fields:

```typescript
{
  id: string
  type: "question" | "statement" | "video_statement"
  title: string
  properties: {
    choices: Array<{
      id: string
      label: string
      image_url: string  // Original path: /images/{category}/{filename}
      cms_slug: string   // From asset
      cms_image_url: string  // Normalized filename only
    }>
  }
}
```

**Category Path Mapping:**
- `/images/art/` → `seed_data/assets/art.json`
- `/images/books/` → `seed_data/assets/literature.json`
- `/images/movies/` → `seed_data/assets/films.json`
- `/images/music/` → `seed_data/assets/music.json`

## Common Tasks

### Running the Development Server

```bash
pnpm dev          # Start on port 3001
pnpm dev:prod     # Build and run production mode
```

### Database Operations

```bash
pnpm payload migrate        # Run migrations
pnpm clear                 # Clear database (with prompts)
pnpm clear:force           # Clear without prompts
```

### Importing Data

```bash
pnpm import:all            # Import all categories
pnpm import:art            # Import art only
pnpm import:books          # Import books only
pnpm import:films          # Import films only
pnpm import:albums         # Import music only
pnpm import:steps          # Import quiz steps
pnpm import:applications   # Import applications
```

### Data Verification

```bash
# Verify all CMS file references exist
node scripts/js/verify_cms_files.js

# Find missing CMS fields in quizzes
node scripts/js/find_missing_cms_fields.js

# Normalize asset filenames
node scripts/js/normalize_assets.js --rename-files
```

### Testing

```bash
pnpm test          # Run all tests
pnpm test:int      # Run integration tests (Vitest)
pnpm test:e2e      # Run E2E tests (Playwright)
```

### Building and Deployment

```bash
pnpm build         # Build for production
pnpm start         # Start production server
pnpm ci            # Run migrations + build (for CI/CD)
```

## Important Conventions

### Field Naming Inconsistencies (Historical)

Be aware of these naming differences across categories:
- **Art** uses `author` (not `artist`)
- **Music** uses `artist`
- **Films** uses `director`
- **Literature** uses `author`

### Year Edge Cases

- Year ranges: "1884-1886", "1969-70" → skip year in filename
- Special values: "Unknown", "Various" → skip year in filename
- Some assets have year discrepancies between JSON and actual files (historical data)

### Path References

When working with image paths:
- **Full path in quizzes:** `/images/art/starry-night-vincent-van-gogh-1889.jpg`
- **Filename only in CMS:** `starry-night-vincent-van-gogh-1889.jpg`
- Always verify files exist in the corresponding `seed_data/images/{category}/` directory

## Environment Variables

Required environment variables (see `.env.example` if it exists):
- `PAYLOAD_SECRET` - Secret key for PayloadCMS
- `DATABASE_URI` - PostgreSQL connection string
- `NEXT_PUBLIC_SERVER_URL` - Public URL of the application
- `S3_*` - AWS S3 credentials for file storage (production)

## PayloadCMS Collections

Key collections in the CMS:
- **Art** - Artwork pieces
- **Films** - Movie entries
- **Literature** - Book entries
- **Music** - Album entries
- **Users** - Admin users
- **Media** - Uploaded media files

Access the admin panel at `/admin` when running the dev server.

## Tips for Working with This Codebase

1. **Always verify file references** - Run `verify_cms_files.js` after data changes
2. **Use existing scripts as templates** - Reference `scripts/import.ts` for patterns
3. **Check PayloadCMS docs** - For collection config and field types
4. **Test data imports locally** - Use `pnpm clear` then `pnpm import:all` to reset
5. **Watch for path inconsistencies** - Some data has legacy formats, use CMS fields
6. **Database changes need migrations** - Don't modify DB schema directly

## Troubleshooting

**Import fails:**
- Check database connection
- Verify JSON data format in `seed_data/assets/`
- Ensure image files exist in `seed_data/images/`

**Missing files:**
- Run `node scripts/js/verify_cms_files.js`
- Check if filenames match between JSON and actual files

**Type errors:**
- Run `pnpm generate:types` to regenerate PayloadCMS types
- Check `payload-types.ts` for current schema

## Additional Resources

- [PayloadCMS Docs](https://payloadcms.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- Project README: `README.md`
- Scripts README: `scripts/README.md`
