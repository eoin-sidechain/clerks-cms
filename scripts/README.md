# Payload CMS Import Scripts

Scripts for importing data from the web directory into Payload CMS.

## Available Scripts

### Import Data

Import all collections:
```bash
npm run import:all
```

Import individual collections:
```bash
npm run import:art      # Import art collection only
npm run import:books    # Import books collection only
npm run import:films    # Import films collection only
npm run import:albums   # Import albums collection only
```

Import steps/quiz questions (basic types):
```bash
npm run import:steps             # Import all basic question types (short_text, long_text, multiple_choice)
npm run import:steps:short       # Import short_text questions only
npm run import:steps:long        # Import long_text questions only
npm run import:steps:multiple    # Import multiple_choice questions only
```

Import steps/quiz questions (advanced types):
```bash
npm run import:steps:advanced    # Import all advanced types (rating, this_or_that, ranking)
npm run import:steps:rating      # Import rating questions only
npm run import:steps:this-or-that # Import this-or-that questions only
npm run import:steps:ranking     # Import ranking questions only
```

Import statement steps (welcome screens, completion screens, etc):
```bash
npm run import:statements        # Import all statement types (text, video, audio)
```

Import applications (creates Application and Section records):
```bash
npm run import:applications      # Create applications from all quiz JSON files
```

**Important:** Run `import:applications` AFTER importing steps, as it links to existing step records.

### Clear Data

Clear all collections (with confirmation):
```bash
npm run clear
```

Force clear without confirmation:
```bash
npm run clear:force
```

## What Gets Imported

### Data Sources

**JSON Files** (from `/web/src/data/cms_data/`):
- `art.json` → Art collection (121 items)
- `literature.json` → Books collection (487 items)
- `films.json` → Films collection (792 items)
- `music.json` → Albums collection (647 items)

**Image Files** (from `/web/public/images/`):
- `/art/` → Art cover images
- `/books/` → Book cover images
- `/movies/` → Film poster images
- `/music/` → Album cover images

### Field Mapping

**Art Collection:**
- `title` → title
- `author` → artist
- `year` → year (first year from ranges like "1884-1886")
- `description` → description
- `cover_filename` → coverImage (uploaded to Media)
- Generated slug from title

**Books Collection:**
- `title` → title
- `author` → author
- `year` → year
- `description` → description
- `cover_filename_slug` → coverImage (uploaded to Media)
- Generated slug from title

**Films Collection:**
- `title` → title
- `director` → director
- `year` → year
- `description` → description
- `poster_filename_slug` → coverImage (uploaded to Media)
- Generated slug from title

**Albums Collection:**
- `album` → title
- `artist` → artist
- `year` → year
- `album_cover_filename_slug` → coverImage (uploaded to Media)
- Generated slug from album title

**Steps Collection (Quiz Questions - Basic):**
- Source: `quiz-templates-json/*.json` files
- `id` → Used for logging (not stored)
- `title` → title
- `type: "question"` → stepType: 'question'
- `questionType` → questionType (short_text, long_text, multiple_choice)
- `properties.choices` → options (for multiple_choice)
  - `choice.id` → option.value
  - `choice.label` → option.label

**Steps Collection (Quiz Questions - Advanced):**
- **Rating Questions:**
  - `properties.items[0].id` → Look up media by slug → ratingItem (relationship)
  - Detects `mediaType` from found media collection
  - `properties.ratingLabels` → ratingLabels (optional - only added if present in source data)

- **This or That Questions:**
  - `properties.choices[0].id` → Look up media → optionA (relationship)
  - `properties.choices[1].id` → Look up media → optionB (relationship)
  - Filters out "dont-know" choices
  - Sets `mediaType` based on found media

- **Ranking Questions:**
  - `properties.choices[]` → Look up all media items → rankingOptions (array of relationships)
  - Each item becomes `{ item: mediaId }`
  - Supports 1-4 items per question
  - Sets `mediaType` based on first item

**Applications Collection:**
- Source: Quiz JSON files in `quiz-templates-json/` directory
- Creates one Application per JSON file
- Structure:
  - `title`: Generated from filename (e.g., "Clerks Application Quiz")
  - `slug`: Filename without .json extension (e.g., "clerks-application-quiz")
  - `published`: false (default)
  - `sections`: Array containing one Section
- Each Application has one Section containing all steps in order
- Steps are linked by matching imported step titles to original question titles
- Steps that weren't imported are logged as "not found" and skipped

**Sections Collection:**
- One section per application (named "{App Title} - Main")
- Contains ordered array of step relationships
- Each step has:
  - `step`: Relationship to Steps collection
  - `order`: Sequential order (1, 2, 3, etc.)

## Import Process

1. **Initialize Payload**: Connect to database and storage
2. **Upload Images**: Each image is uploaded to the Media collection first
3. **Create Documents**: Documents are created with relationships to uploaded media
4. **Progress Tracking**: Shows progress bar for each collection
5. **Error Handling**: Skips missing images, logs errors, continues import
6. **Summary Report**: Shows success/failure counts at the end

## Clear Process

1. **Count Documents**: Shows current document counts for all collections
2. **Confirmation**: Asks for confirmation before deletion (unless --force)
3. **Delete Documents**: Removes all documents from:
   - Art collection
   - Books collection
   - Films collection
   - Albums collection
   - Media collection
4. **Storage Cleanup**: Uploaded files are also deleted from Supabase storage

## Notes

- **Year Ranges**: For Art, years like "1884-1886" use the first year (1884)
- **Missing Images**: Items with missing images are skipped and logged
- **Slug Generation**: Slugs are auto-generated from titles
- **Duplicates**: Import does not check for duplicates - run clear first
- **Performance**: Full import takes ~2-5 minutes for all 2000+ items
- **Database**: Requires Supabase to be running (networked at 100.72.139.22)

## Troubleshooting

**Images not found:**
- Check that `/web/public/images/` directories exist
- Verify image filenames match JSON data

**Connection errors:**
- Ensure Supabase is running at 100.72.139.22
- Check DATABASE_URL in `.env.local`
- Verify S3 storage configuration

**TypeScript errors:**
- Run `npm run generate:types` to update Payload types
- Check that all dependencies are installed

## Example Output

```
📦 Payload CMS Import Script

Source: /web/src/data/cms_data/
Images: /web/public/images/

Initializing Payload...
✅ Payload initialized

🎨 Importing Art Collection...
  Found 121 art items
  Progress: [████████████████████████████████████████] 121/121 (100.0%)

  📊 Art Import Summary:
     Total:          121
     ✅ Successful:  119
     ❌ Failed:      0
     ⏭️  Skipped:     2
     🖼️  Missing:     2 images

==================================================
📊 OVERALL SUMMARY
==================================================
Total items processed:    2047
✅ Successfully imported: 2032
❌ Failed:                0
⏭️  Skipped:               15
🖼️  Missing images:        15
==================================================

✅ Import complete!
```
