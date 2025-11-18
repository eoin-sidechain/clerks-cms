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
  // Labels are typically "Title (Author/Artist/Director)"
  // Extract just the title part
  const match = label.match(/^(.+?)\s*\(.*\)$/);
  return match ? match[1].trim() : label.trim();
}

// Find mismatches in rating questions
function findRatingMismatches() {
  console.log('🔍 Finding Rating Question Title Mismatches\n');
  console.log('Checking if rating question titles match the items being rated...\n');
  console.log('='.repeat(60));

  const quizDir = './seed_data/quizzes';
  const quizFiles = fs.readdirSync(quizDir)
    .filter(f => f.endsWith('.json'))
    .filter(f => f.includes('values-quiz')); // Only check values quizzes

  const mismatches = [];
  let totalRatingQuestions = 0;

  quizFiles.forEach(file => {
    const quizPath = path.join(quizDir, file);
    const quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));

    console.log(`\n📝 Checking ${file}...`);

    quizData.forEach((question, index) => {
      if (question.type === 'question' && question.questionType === 'rating') {
        totalRatingQuestions++;

        const questionTitle = question.title;
        const item = question.properties?.items?.[0];

        if (!item) {
          console.log(`  ⚠️  No item found for question: ${question.id}`);
          return;
        }

        // Extract expected title from item label
        const itemTitle = extractTitleFromLabel(item.label);
        const expectedTitle = `Rate "${itemTitle}"`;

        // Check if they match
        if (questionTitle !== expectedTitle) {
          mismatches.push({
            file,
            questionId: question.id,
            questionIndex: index,
            questionTitle,
            expectedTitle,
            itemLabel: item.label,
            itemCmsSlug: item.cms_slug,
          });
        }
      }
    });
  });

  // Report results
  console.log('\n' + '='.repeat(60));
  log(colors.blue, '\n📊 RESULTS\n');

  console.log(`Total rating questions checked: ${totalRatingQuestions}`);

  if (mismatches.length === 0) {
    log(colors.green, '✅ All rating question titles match their items!');
  } else {
    log(colors.yellow, `⚠️  Found ${mismatches.length} mismatches:`);

    // Group by file
    const byFile = {};
    mismatches.forEach(m => {
      if (!byFile[m.file]) byFile[m.file] = [];
      byFile[m.file].push(m);
    });

    console.log('\n' + '='.repeat(60));
    log(colors.red, '\n❌ MISMATCHES:\n');

    Object.keys(byFile).sort().forEach(file => {
      console.log(`\n  ${file}:`);
      byFile[file].forEach(m => {
        console.log(`\n    Question ID: ${m.questionId}`);
        console.log(`    Index: ${m.questionIndex}`);
        console.log(`    Current title:  "${m.questionTitle}"`);
        console.log(`    Expected title: "${m.expectedTitle}"`);
        console.log(`    Item label: ${m.itemLabel}`);
        console.log(`    Item cms_slug: ${m.itemCmsSlug}`);
      });
    });

    // Export to JSON for easy fixing
    const outputPath = './rating_mismatches.json';
    fs.writeFileSync(outputPath, JSON.stringify(mismatches, null, 2));
    console.log(`\n\n💾 Full report saved to: ${outputPath}`);
  }

  console.log('\n' + '='.repeat(60));
  return mismatches.length === 0 ? 0 : 1;
}

const exitCode = findRatingMismatches();
process.exit(exitCode);
