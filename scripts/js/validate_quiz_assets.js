import fs from 'fs';
import path from 'path';

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

// Load all asset data
function loadAssets() {
  const assetDir = './seed_data/assets';

  const assets = {
    art: JSON.parse(fs.readFileSync(path.join(assetDir, 'art.json'), 'utf8')),
    books: JSON.parse(fs.readFileSync(path.join(assetDir, 'literature.json'), 'utf8')),
    films: JSON.parse(fs.readFileSync(path.join(assetDir, 'films.json'), 'utf8')),
    music: JSON.parse(fs.readFileSync(path.join(assetDir, 'music.json'), 'utf8'))
  };

  // Create lookup maps by cms_slug
  const assetMap = {
    art: new Map(),
    books: new Map(),
    films: new Map(),
    music: new Map()
  };

  assets.art.forEach(item => {
    if (item.cms_slug) assetMap.art.set(item.cms_slug, item);
  });
  assets.books.forEach(item => {
    if (item.cms_slug) assetMap.books.set(item.cms_slug, item);
  });
  assets.films.forEach(item => {
    if (item.cms_slug) assetMap.films.set(item.cms_slug, item);
  });
  assets.music.forEach(item => {
    if (item.cms_slug) assetMap.music.set(item.cms_slug, item);
  });

  return { assets, assetMap };
}

// Extract all asset references from quiz data
function extractQuizAssets(quizData, quizFile) {
  const references = [];

  function traverse(obj, path = '') {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => traverse(item, `${path}[${i}]`));
    } else if (obj && typeof obj === 'object') {
      // Check if this object has cms_slug (indicates an asset reference)
      if (obj.cms_slug && obj.image_url) {
        // Determine category from image_url
        const match = obj.image_url.match(/^\/images\/(art|books|movies|music)\//);
        let category = null;
        if (match) {
          const urlCategory = match[1];
          // Map URL categories to asset categories
          const categoryMap = {
            'art': 'art',
            'books': 'books',
            'movies': 'films',
            'music': 'music'
          };
          category = categoryMap[urlCategory];
        }

        references.push({
          cms_slug: obj.cms_slug,
          label: obj.label || obj.title || 'Unknown',
          image_url: obj.image_url,
          category: category,
          quiz: quizFile,
          path: path
        });
      }

      // Recursively check nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          traverse(obj[key], path ? `${path}.${key}` : key);
        }
      }
    }
  }

  traverse(quizData);
  return references;
}

// Main validation function
function validateQuizAssets() {
  console.log('🔍 Quiz Asset Validation\n');
  console.log('This script validates that all assets referenced in quizzes');
  console.log('exist in the asset data files (art.json, literature.json, etc.).\n');
  console.log('='.repeat(60));

  // Load assets
  log(colors.blue, '\n📚 Loading asset data...\n');
  const { assets, assetMap } = loadAssets();

  const assetCounts = {
    art: assetMap.art.size,
    books: assetMap.books.size,
    films: assetMap.films.size,
    music: assetMap.music.size
  };

  console.log(`  Art:    ${assetCounts.art} items`);
  console.log(`  Books:  ${assetCounts.books} items`);
  console.log(`  Films:  ${assetCounts.films} items`);
  console.log(`  Music:  ${assetCounts.music} items`);
  console.log(`  Total:  ${Object.values(assetCounts).reduce((a, b) => a + b, 0)} items`);

  // Load quizzes
  log(colors.blue, '\n📝 Loading quiz data...\n');
  const quizDir = './seed_data/quizzes';
  const quizFiles = fs.readdirSync(quizDir)
    .filter(f => f.endsWith('.json'));

  const allReferences = [];
  const quizStats = {};

  quizFiles.forEach(file => {
    const quizPath = path.join(quizDir, file);
    const quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
    const references = extractQuizAssets(quizData, file);

    allReferences.push(...references);
    quizStats[file] = references.length;

    console.log(`  ${file}: ${references.length} asset references`);
  });

  console.log(`\n  Total asset references: ${allReferences.length}`);

  // Validate references
  log(colors.blue, '\n🔎 Validating references...\n');

  const results = {
    total: allReferences.length,
    found: 0,
    missing: [],
    noCategoryFound: []
  };

  allReferences.forEach(ref => {
    if (!ref.category) {
      results.noCategoryFound.push(ref);
      return;
    }

    const found = assetMap[ref.category].has(ref.cms_slug);

    if (found) {
      results.found++;
    } else {
      results.missing.push(ref);
    }
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  log(colors.blue, '\n📊 VALIDATION SUMMARY\n');

  console.log(`Total references: ${results.total}`);

  if (results.found === results.total) {
    log(colors.green, `✓ All ${results.found} asset references are valid!`);
  } else {
    log(colors.yellow, `✓ Found: ${results.found}`);
    log(colors.red, `✗ Missing: ${results.missing.length}`);
    if (results.noCategoryFound.length > 0) {
      log(colors.yellow, `⚠ No category: ${results.noCategoryFound.length}`);
    }
  }

  // Report missing assets
  if (results.missing.length > 0) {
    console.log('\n' + '='.repeat(60));
    log(colors.red, '\n❌ MISSING ASSETS:\n');

    // Group by category
    const byCategory = {};
    results.missing.forEach(ref => {
      const cat = ref.category || 'unknown';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(ref);
    });

    Object.keys(byCategory).sort().forEach(category => {
      console.log(`\n  ${category.toUpperCase()}:`);
      byCategory[category].forEach(ref => {
        console.log(`    ✗ ${ref.cms_slug}`);
        console.log(`      Label: ${ref.label}`);
        console.log(`      Quiz: ${ref.quiz}`);
        console.log(`      Image URL: ${ref.image_url}`);
      });
    });
  }

  // Report references with no category
  if (results.noCategoryFound.length > 0) {
    console.log('\n' + '='.repeat(60));
    log(colors.yellow, '\n⚠️  REFERENCES WITH NO CATEGORY:\n');

    results.noCategoryFound.forEach(ref => {
      console.log(`  ${ref.cms_slug || 'No slug'}`);
      console.log(`    Label: ${ref.label}`);
      console.log(`    Quiz: ${ref.quiz}`);
      console.log(`    Image URL: ${ref.image_url || 'No image_url'}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (results.missing.length === 0 && results.noCategoryFound.length === 0) {
    log(colors.green, '\n✅ All quiz asset references are valid!\n');
    return 0;
  } else {
    log(colors.yellow, `\n⚠️  Validation complete with ${results.missing.length + results.noCategoryFound.length} issue(s).\n`);
    return 1;
  }
}

const exitCode = validateQuizAssets();
process.exit(exitCode);
