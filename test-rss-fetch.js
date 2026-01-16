// Test script to debug RSS fetching and advisory generation
const { spawn } = require('child_process');
const path = require('path');

console.log('=== TESTING RSS FETCH AND ADVISORY GENERATION ===\n');

const backendPath = path.join(__dirname, 'backend');
const scriptPath = path.join(backendPath, 'generate_advisories.py');

console.log('Backend path:', backendPath);
console.log('Script path:', scriptPath);
console.log('');

// First, let's clear the cache manually
const fs = require('fs');
const seenIdsPath = path.join(backendPath, 'workspace', 'seen_ids.json');
const seenItemsPath = path.join(backendPath, 'workspace', 'seen_items.json');

console.log('Clearing cache files...');
if (fs.existsSync(seenIdsPath)) {
  fs.writeFileSync(seenIdsPath, '[]', 'utf8');
  console.log('✓ Cleared seen_ids.json');
}
if (fs.existsSync(seenItemsPath)) {
  fs.writeFileSync(seenItemsPath, '[]', 'utf8');
  console.log('✓ Cleared seen_items.json');
}

console.log('\nRunning backend script...\n');
console.log('---OUTPUT START---\n');

const python = spawn('python', [scriptPath, '3'], {
  cwd: backendPath,
  stdio: 'inherit'
});

python.on('close', (code) => {
  console.log('\n---OUTPUT END---');
  console.log(`\nProcess exited with code ${code}`);
});

python.on('error', (err) => {
  console.error('Failed to start process:', err);
});
