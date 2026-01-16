// Test script to verify cache clearing functionality
const fs = require('fs');
const path = require('path');

const WORKSPACE_PATH = path.resolve(__dirname, 'backend', 'workspace');
const SEEN_IDS = path.join(WORKSPACE_PATH, 'seen_ids.json');
const SEEN_ITEMS = path.join(WORKSPACE_PATH, 'seen_items.json');

console.log('=== CACHE FILE STATUS ===\n');

// Check seen_ids.json
if (fs.existsSync(SEEN_IDS)) {
  const content = fs.readFileSync(SEEN_IDS, 'utf8');
  const data = JSON.parse(content);
  console.log(`✓ seen_ids.json exists`);
  console.log(`  Items: ${data.length}`);
  if (data.length > 0) {
    console.log(`  Sample: ${data[0]}`);
  }
} else {
  console.log(`✗ seen_ids.json does not exist`);
}

console.log('');

// Check seen_items.json
if (fs.existsSync(SEEN_ITEMS)) {
  const content = fs.readFileSync(SEEN_ITEMS, 'utf8');
  const data = JSON.parse(content);
  console.log(`✓ seen_items.json exists`);
  console.log(`  Items: ${data.length}`);
  if (data.length > 0) {
    console.log(`  Sample: ${data[0]}`);
  }
} else {
  console.log(`✗ seen_items.json does not exist`);
}

console.log('\n=== RECOMMENDATION ===');
console.log('The "Clear Cache" button should clear both files.');
console.log('Backend uses: seen_ids.json');
console.log('Legacy file: seen_items.json');
