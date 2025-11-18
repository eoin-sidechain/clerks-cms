import fs from 'fs';
import path from 'path';

// Color codes
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

// Extract expected title from item label
function extractTitleFromLabel(label) {
  // Labels are typically "Title (Author/Artist/Director)" or "Title - Author"
  // Extract the full label without parentheses content
  const match = label.match(/^(.+?)\s*\(.*\)$/);
  return match ? match[1].trim() : label.trim();
}

// Fix rating question titles
function fixRatingTitles() {
  console.log('🔧 Fixing Rating Question Titles\n');
  console.log('Updating question titles to match the items being rated...\n');
  console.log('='.repeat(60));

  const quizDir = './seed_data/quizzes';
  const quizFiles = fs.readdirSync(quizDir)
    .filter(f => f.endsWith('.json'))
    .filter(f => f.includes('values-quiz')); // Only fix values quizzes

  let totalFixed = 0;
  const fixes = {};

  quizFiles.forEach(file => {
    const quizPath = path.join(quizDir, file);
    const quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
    let fileFixed = 0;

    console.log(`\n📝 Processing ${file}...`);

    quizData.forEach((question, index) => {
      if (question.type === 'question' && question.questionType === 'rating') {
        const item = question.properties?.items?.[0];

        if (!item) {
          return;
        }

        // Extract expected title from item label
        const itemTitle = extractTitleFromLabel(item.label);
        const expectedTitle = `Rate "${itemTitle}"`;

        // Check if they match
        if (question.title !== expectedTitle) {
          console.log(`  ✏️  Fixing ${question.id}:`);
          console.log(`      Old: "${question.title}"`);
          console.log(`      New: "${expectedTitle}"`);

          question.title = expectedTitle;
          fileFixed++;
          totalFixed++;
        }
      }
    });

    if (fileFixed > 0) {
      // Write back to file
      fs.writeFileSync(quizPath, JSON.stringify(quizData, null, 2) + '\n', 'utf8');
      console.log(`  ✅ Fixed ${fileFixed} questions in ${file}`);
      fixes[file] = fileFixed;
    } else {
      console.log(`  ✅ No fixes needed for ${file}`);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  log(colors.blue, '\n📊 SUMMARY\n');

  if (totalFixed === 0) {
    log(colors.green, '✅ All rating question titles were already correct!');
  } else {
    log(colors.green, `✅ Fixed ${totalFixed} rating question titles across ${Object.keys(fixes).length} files:`);
    Object.entries(fixes).forEach(([file, count]) => {
      console.log(`  - ${file}: ${count} fixes`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✨ Quiz files have been updated!\n');

  return 0;
}

fixRatingTitles();
