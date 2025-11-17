import fs from 'fs';
import path from 'path';

// Load all asset files and create lookup maps
function loadAssets() {
  const assetFiles = {
    art: './seed_data/assets/art.json',
    literature: './seed_data/assets/literature.json',
    films: './seed_data/assets/films.json',
    music: './seed_data/assets/music.json'
  };

  const assets = {};

  for (const [category, filePath] of Object.entries(assetFiles)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Create lookup maps by different slug fields
    assets[category] = {
      byCmsFilename: new Map(),
      byOldSlug: new Map(),
      all: data
    };

    data.forEach(item => {
      // Map by new cms filename
      if (item.cover_cms_filename) {
        assets[category].byCmsFilename.set(item.cover_cms_filename, item);
      }

      // Map by old slug fields (different field names per category)
      let oldSlugField;
      switch (category) {
        case 'art':
        case 'literature':
          oldSlugField = item.cover_filename_slug;
          break;
        case 'films':
          oldSlugField = item.poster_filename_slug;
          break;
        case 'music':
          oldSlugField = item.album_cover_filename_slug;
          break;
      }

      if (oldSlugField) {
        assets[category].byOldSlug.set(oldSlugField, item);
      }
    });
  }

  return assets;
}

// Extract category and filename from image URL
function parseImageUrl(imageUrl) {
  if (!imageUrl || imageUrl === '') return null;

  const match = imageUrl.match(/^\/images\/(art|books|movies|music)\/(.+)$/);
  if (!match) return null;

  const pathCategory = match[1];
  const filename = match[2];

  // Map path category to asset category
  const categoryMap = {
    'art': 'art',
    'books': 'literature',
    'movies': 'films',
    'music': 'music'
  };

  return {
    category: categoryMap[pathCategory],
    filename: filename
  };
}

// Normalize filename to slug format
function normalizeToSlug(filename) {
  return filename
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-');
}

// Find matching asset
function findAsset(assets, category, filename) {
  if (!assets[category]) return null;

  const normalized = normalizeToSlug(filename);

  // Try 1: Direct match on new cms filename
  let asset = assets[category].byCmsFilename.get(filename);
  if (asset) return asset;

  // Try 2: Match on normalized new cms filename
  asset = assets[category].byCmsFilename.get(normalized);
  if (asset) return asset;

  // Try 3: Match on old slug field
  asset = assets[category].byOldSlug.get(filename);
  if (asset) return asset;

  // Try 4: Match on normalized old slug field
  asset = assets[category].byOldSlug.get(normalized);
  if (asset) return asset;

  return null;
}

// Recursively process object to add CMS fields
function processObject(obj, assets, stats) {
  if (Array.isArray(obj)) {
    obj.forEach(item => processObject(item, assets, stats));
    return;
  }

  if (obj && typeof obj === 'object') {
    // Check if this object has an image_url field
    if (obj.hasOwnProperty('image_url') && obj.image_url) {
      const parsed = parseImageUrl(obj.image_url);

      if (parsed) {
        const asset = findAsset(assets, parsed.category, parsed.filename);

        if (asset) {
          // Add CMS fields
          obj.cms_slug = asset.cms_slug;
          obj.cms_image_url = asset.cover_cms_filename;
          stats.matched++;

          console.log(`  ✓ Matched: ${obj.image_url}`);
          console.log(`    → cms_slug: ${obj.cms_slug}`);
          console.log(`    → cms_image_url: ${obj.cms_image_url}`);
        } else {
          stats.unmatched++;
          console.log(`  ⚠️  No match found: ${obj.image_url}`);
        }
      }
    }

    // Recursively process nested objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
        processObject(obj[key], assets, stats);
      }
    }
  }
}

// Process a single quiz file
function processQuizFile(filePath, assets) {
  console.log(`\n📝 Processing ${path.basename(filePath)}...`);

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const stats = { matched: 0, unmatched: 0 };

  processObject(data, assets, stats);

  // Write updated file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  console.log(`   Matched: ${stats.matched}, Unmatched: ${stats.unmatched}`);

  return stats;
}

// Main execution
function main() {
  console.log('🚀 Updating quiz files with CMS fields...\n');

  // Load all assets
  console.log('📚 Loading asset data...');
  const assets = loadAssets();
  console.log('✓ Assets loaded');

  // Get all quiz files
  const quizDir = './seed_data/quizzes';
  const quizFiles = fs.readdirSync(quizDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(quizDir, f));

  console.log(`\n📋 Found ${quizFiles.length} quiz files\n`);

  // Process each quiz file
  const totalStats = { matched: 0, unmatched: 0 };

  quizFiles.forEach(filePath => {
    const stats = processQuizFile(filePath, assets);
    totalStats.matched += stats.matched;
    totalStats.unmatched += stats.unmatched;
  });

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Quiz update complete!');
  console.log(`   Total matched: ${totalStats.matched}`);
  console.log(`   Total unmatched: ${totalStats.unmatched}`);
  console.log('='.repeat(50));

  if (totalStats.unmatched > 0) {
    console.log('\n⚠️  Some images could not be matched. Please review the output above.');
  }
}

main();
