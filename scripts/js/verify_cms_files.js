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

// Check if a file exists
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// Verify assets
function verifyAssets() {
  log(colors.blue, '\n📚 Verifying Asset Files...\n');

  const assetCategories = [
    { name: 'art', file: './seed_data/assets/art.json', imageDir: './seed_data/images/art' },
    { name: 'films', file: './seed_data/assets/films.json', imageDir: './seed_data/images/movies' },
    { name: 'literature', file: './seed_data/assets/literature.json', imageDir: './seed_data/images/books' },
    { name: 'music', file: './seed_data/assets/music.json', imageDir: './seed_data/images/music' }
  ];

  const results = {
    total: 0,
    found: 0,
    missing: []
  };

  assetCategories.forEach(category => {
    console.log(`\n  ${category.name.toUpperCase()}:`);
    const data = JSON.parse(fs.readFileSync(category.file, 'utf8'));

    let categoryFound = 0;
    let categoryMissing = 0;

    data.forEach(item => {
      if (item.cover_cms_filename) {
        results.total++;
        const filePath = path.join(category.imageDir, item.cover_cms_filename);

        if (fileExists(filePath)) {
          categoryFound++;
          results.found++;
        } else {
          categoryMissing++;
          results.missing.push({
            category: category.name,
            filename: item.cover_cms_filename,
            expectedPath: filePath,
            context: item.title || item.album || 'Unknown'
          });
        }
      }
    });

    if (categoryMissing === 0) {
      log(colors.green, `    ✓ ${categoryFound}/${categoryFound} files found`);
    } else {
      log(colors.yellow, `    ⚠️  ${categoryFound}/${categoryFound + categoryMissing} files found, ${categoryMissing} missing`);
    }
  });

  return results;
}

// Verify quiz files
function verifyQuizFiles() {
  log(colors.blue, '\n\n📝 Verifying Quiz Image References...\n');

  const quizDir = './seed_data/quizzes';
  const quizFiles = fs.readdirSync(quizDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(quizDir, f));

  const results = {
    total: 0,
    found: 0,
    missing: []
  };

  // Category mapping
  const categoryMap = {
    'art': './seed_data/images/art',
    'books': './seed_data/images/books',
    'movies': './seed_data/images/movies',
    'music': './seed_data/images/music'
  };

  function checkQuizItem(obj, quizFile, objPath = '') {
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => checkQuizItem(item, quizFile, `${objPath}[${i}]`));
    } else if (obj && typeof obj === 'object') {
      // Check if this object has cms_image_url
      if (obj.cms_image_url && obj.cms_image_url !== '') {
        results.total++;

        // Try to determine category from image_url
        let category = null;
        let imageDir = null;

        if (obj.image_url) {
          const match = obj.image_url.match(/^\/images\/(art|books|movies|music)\//);
          if (match) {
            category = match[1];
            imageDir = categoryMap[category];
          }
        }

        if (imageDir) {
          const filePath = path.join(imageDir, obj.cms_image_url);

          if (fileExists(filePath)) {
            results.found++;
          } else {
            results.missing.push({
              quiz: path.basename(quizFile),
              category: category,
              filename: obj.cms_image_url,
              expectedPath: filePath,
              context: obj.label || 'Unknown',
              originalUrl: obj.image_url
            });
          }
        } else {
          // Can't determine category
          results.missing.push({
            quiz: path.basename(quizFile),
            category: 'unknown',
            filename: obj.cms_image_url,
            expectedPath: 'unknown',
            context: obj.label || 'Unknown',
            originalUrl: obj.image_url || 'No image_url'
          });
        }
      }

      // Recursively check nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
          checkQuizItem(obj[key], quizFile, `${objPath}.${key}`);
        }
      }
    }
  }

  quizFiles.forEach(quizFile => {
    const quizName = path.basename(quizFile);
    console.log(`\n  ${quizName}:`);

    const data = JSON.parse(fs.readFileSync(quizFile, 'utf8'));
    const beforeTotal = results.total;
    const beforeFound = results.found;

    checkQuizItem(data, quizFile);

    const quizTotal = results.total - beforeTotal;
    const quizFound = results.found - beforeFound;
    const quizMissing = quizTotal - quizFound;

    if (quizMissing === 0) {
      if (quizTotal > 0) {
        log(colors.green, `    ✓ ${quizFound}/${quizTotal} files found`);
      } else {
        console.log('    (no cms_image_url references)');
      }
    } else {
      log(colors.yellow, `    ⚠️  ${quizFound}/${quizTotal} files found, ${quizMissing} missing`);
    }
  });

  return results;
}

// Main execution
function main() {
  console.log('🔍 CMS File Verification\n');
  console.log('This script verifies that all files referenced with cms_ prefixes');
  console.log('in assets and quizzes actually exist in the repository.\n');
  console.log('='.repeat(60));

  const assetResults = verifyAssets();
  const quizResults = verifyQuizFiles();

  // Summary
  console.log('\n\n' + '='.repeat(60));
  log(colors.blue, '\n📊 SUMMARY\n');

  console.log('Assets:');
  console.log(`  Total CMS filenames: ${assetResults.total}`);
  if (assetResults.missing.length === 0) {
    log(colors.green, `  ✓ All ${assetResults.found} files exist`);
  } else {
    log(colors.yellow, `  ✓ Found: ${assetResults.found}`);
    log(colors.red, `  ✗ Missing: ${assetResults.missing.length}`);
  }

  console.log('\nQuizzes:');
  console.log(`  Total CMS image URLs: ${quizResults.total}`);
  if (quizResults.missing.length === 0) {
    log(colors.green, `  ✓ All ${quizResults.found} files exist`);
  } else {
    log(colors.yellow, `  ✓ Found: ${quizResults.found}`);
    log(colors.red, `  ✗ Missing: ${quizResults.missing.length}`);
  }

  // Report missing files
  const allMissing = [...assetResults.missing, ...quizResults.missing];

  if (allMissing.length > 0) {
    console.log('\n' + '='.repeat(60));
    log(colors.red, '\n❌ MISSING FILES:\n');

    // Group by category
    const byCategory = {};
    allMissing.forEach(item => {
      const cat = item.category || 'unknown';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    });

    Object.keys(byCategory).sort().forEach(category => {
      console.log(`\n  ${category.toUpperCase()}:`);
      byCategory[category].forEach(item => {
        console.log(`    ✗ ${item.filename}`);
        console.log(`      Context: ${item.context}`);
        if (item.quiz) {
          console.log(`      Quiz: ${item.quiz}`);
        }
        if (item.originalUrl) {
          console.log(`      Original URL: ${item.originalUrl}`);
        }
      });
    });
  }

  console.log('\n' + '='.repeat(60));

  if (allMissing.length === 0) {
    log(colors.green, '\n✅ All CMS files verified successfully!\n');
  } else {
    log(colors.yellow, `\n⚠️  Verification complete with ${allMissing.length} missing file(s).\n`);
  }

  return allMissing.length === 0 ? 0 : 1;
}

const exitCode = main();
process.exit(exitCode);
