import fs from 'fs';
import path from 'path';

// Slugify function to normalize strings
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '-')      // Replace non-word chars with -
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

// Check if year should be skipped (ranges, Unknown, Various)
function shouldSkipYear(year) {
  if (!year) return true;
  const yearStr = year.toString();
  // Check for ranges (contains dash or "to") or special values
  if (yearStr.includes('-') || yearStr.toLowerCase().includes('unknown') ||
      yearStr.toLowerCase().includes('various') || yearStr.includes('to')) {
    return true;
  }
  return false;
}

// Generate normalized filename
function generateFilename(title, creator, year, ext = 'jpg') {
  const parts = [slugify(title), slugify(creator)];

  if (!shouldSkipYear(year)) {
    parts.push(slugify(year.toString()));
  }

  return `${parts.join('-')}.${ext}`;
}

// Process art.json
function processArt() {
  console.log('\n📚 Processing art.json...');
  const filePath = './seed_data/assets/art.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let updated = 0;
  data.forEach(item => {
    const filename = generateFilename(item.title, item.author, item.year);
    item.cover_cms_filename = filename;
    item.cms_slug = filename.replace(/\.jpg$/, '');
    updated++;
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ Updated ${updated} art entries`);
  return data;
}

// Process films.json
function processFilms() {
  console.log('\n🎬 Processing films.json...');
  const filePath = './seed_data/assets/films.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let updated = 0;
  data.forEach(item => {
    const filename = generateFilename(item.title, item.director, item.year);
    item.cover_cms_filename = filename;
    item.cms_slug = filename.replace(/\.jpg$/, '');
    updated++;
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ Updated ${updated} film entries`);
  return data;
}

// Process literature.json
function processLiterature() {
  console.log('\n📖 Processing literature.json...');
  const filePath = './seed_data/assets/literature.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let updated = 0;
  data.forEach(item => {
    const filename = generateFilename(item.title, item.author, item.year);
    item.cover_cms_filename = filename;
    item.cms_slug = filename.replace(/\.jpg$/, '');
    updated++;
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ Updated ${updated} literature entries`);
  return data;
}

// Process music.json (album covers only)
function processMusic() {
  console.log('\n🎵 Processing music.json...');
  const filePath = './seed_data/assets/music.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let updated = 0;
  data.forEach(item => {
    const filename = generateFilename(item.album, item.artist, item.year);
    item.cover_cms_filename = filename;
    item.cms_slug = filename.replace(/\.jpg$/, '');
    updated++;
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ Updated ${updated} music entries`);
  return data;
}

// Rename actual image files
function renameFiles() {
  console.log('\n🔄 Renaming image files...');

  const categories = [
    { name: 'art', jsonFile: './seed_data/assets/art.json', imageDir: './seed_data/images/art', oldField: 'cover_filename' },
    { name: 'films', jsonFile: './seed_data/assets/films.json', imageDir: './seed_data/images/movies', oldField: 'poster_filename_slug' },
    { name: 'literature', jsonFile: './seed_data/assets/literature.json', imageDir: './seed_data/images/books', oldField: 'cover_filename_slug' },
    { name: 'music', jsonFile: './seed_data/assets/music.json', imageDir: './seed_data/images/music', oldField: 'album_cover_filename_slug' }
  ];

  categories.forEach(category => {
    console.log(`\n  Processing ${category.name}...`);
    const data = JSON.parse(fs.readFileSync(category.jsonFile, 'utf8'));

    let renamed = 0;
    let skipped = 0;
    let errors = 0;

    data.forEach(item => {
      const oldFilename = item[category.oldField];
      const newFilename = item.cover_cms_filename;

      if (!oldFilename || !newFilename) {
        skipped++;
        return;
      }

      // Handle .jpeg extension
      let oldPath = path.join(category.imageDir, oldFilename);
      if (!fs.existsSync(oldPath)) {
        // Try with .jpeg extension
        const oldPathJpeg = oldPath.replace(/\.jpg$/, '.jpeg');
        if (fs.existsSync(oldPathJpeg)) {
          oldPath = oldPathJpeg;
        } else {
          console.log(`    ⚠️  File not found: ${oldFilename}`);
          errors++;
          return;
        }
      }

      const newPath = path.join(category.imageDir, newFilename);

      // Skip if already renamed
      if (oldPath === newPath) {
        skipped++;
        return;
      }

      // Check if target already exists
      if (fs.existsSync(newPath) && oldPath !== newPath) {
        console.log(`    ⚠️  Target exists: ${newFilename} (keeping old: ${oldFilename})`);
        errors++;
        return;
      }

      try {
        fs.renameSync(oldPath, newPath);
        renamed++;
      } catch (err) {
        console.log(`    ❌ Error renaming ${oldFilename}: ${err.message}`);
        errors++;
      }
    });

    console.log(`    ✓ Renamed: ${renamed}, Skipped: ${skipped}, Errors: ${errors}`);
  });
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  const shouldRenameFiles = args.includes('--rename-files');

  console.log('🚀 Starting asset normalization...\n');
  console.log('This script will:');
  console.log('1. Add cover_cms_filename and cms_slug fields to all JSON files');
  console.log('2. Use format: {title}-{creator}-{year}.jpg');
  console.log('3. Skip year for ranges, "Unknown", and "Various"');
  if (shouldRenameFiles) {
    console.log('4. Rename actual image files to match new format\n');
  } else {
    console.log('\n⚠️  Running in dry-run mode (JSON only). Use --rename-files to actually rename files.\n');
  }

  // Process all JSON files
  processArt();
  processFilms();
  processLiterature();
  processMusic();

  console.log('\n✅ JSON files updated successfully!');

  // Optionally rename files
  if (shouldRenameFiles) {
    renameFiles();
    console.log('\n✅ File renaming complete!');
  } else {
    console.log('\n💡 To rename the actual image files, run: node normalize_assets.js --rename-files');
  }
}

main();
