import fs from 'fs';

const data = JSON.parse(fs.readFileSync('seed_data/quizzes/music-values-quiz-v4.json', 'utf8'));

function findMissing(obj, path = '') {
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => findMissing(item, `${path}[${i}]`));
  } else if (obj && typeof obj === 'object') {
    if (obj.image_url && obj.image_url !== '' && (!obj.label || !obj.label.includes("Don't Know"))) {
      if (!obj.cms_slug || !obj.cms_image_url) {
        console.log('Missing CMS fields:');
        console.log('  Path:', path);
        console.log('  Label:', obj.label);
        console.log('  Image URL:', obj.image_url);
        console.log('  Has cms_slug:', !!obj.cms_slug);
        console.log('  Has cms_image_url:', !!obj.cms_image_url);
        console.log('');
      }
    }
    for (const key in obj) {
      findMissing(obj[key], `${path}.${key}`);
    }
  }
}

findMissing(data);
