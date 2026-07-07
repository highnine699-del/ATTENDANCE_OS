#!/usr/bin/env node

/**
 * Attendance OS — Extension Store Build Script
 * Copyright © 2025 Josiah. All rights reserved.
 * Licensed under the MIT License.
 *
 * This script builds the Chrome Web Store version of the extension
 * by copying the dev version and removing localhost permissions.
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, '..', 'extension');
const OUTPUT_DIR = path.join(__dirname, '..', 'extension-chrome-store');

console.log('Building Chrome Web Store extension...');

// Ensure output directory exists
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Copy all files from source to output
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(SOURCE_DIR, OUTPUT_DIR);

// Modify manifest.json for Chrome Web Store (remove localhost permissions)
const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Remove localhost from content_scripts matches
manifest.content_scripts = manifest.content_scripts.map(script => ({
  ...script,
  matches: script.matches.filter(match => 
    !match.includes('localhost') && !match.includes('127.0.0.1')
  )
}));

// Remove localhost from externally_connectable
manifest.externally_connectable = {
  matches: manifest.externally_connectable.matches.filter(match =>
    !match.includes('localhost') && !match.includes('127.0.0.1')
  )
};

// Write the modified manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 4));

// Also create manifest.store.json as a backup
fs.writeFileSync(
  path.join(OUTPUT_DIR, 'manifest.store.json'),
  JSON.stringify(manifest, null, 4)
);

console.log('✓ Chrome Web Store extension built successfully!');
console.log(`  Output: ${OUTPUT_DIR}`);
console.log('  Localhost permissions removed for Chrome Web Store compliance.');
