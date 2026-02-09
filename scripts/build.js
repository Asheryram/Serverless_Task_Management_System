#!/usr/bin/env node

// Build script for Lambda layer
// Creates build/layer/nodejs/ with node_modules and shared backend code

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT, 'build');
const LAYER_DIR = path.join(BUILD_DIR, 'layer', 'nodejs');
const BACKEND_DIR = path.join(ROOT, 'backend');

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('=== Building Lambda Layer ===\n');

// Step 1: Clean build directory
console.log('1. Cleaning build directory...');
cleanDir(LAYER_DIR);

// Step 2: Copy package.json and install production dependencies
console.log('2. Installing production dependencies...');
const packageJson = path.join(BACKEND_DIR, 'package.json');
fs.copyFileSync(packageJson, path.join(LAYER_DIR, 'package.json'));

execSync('npm install --omit=dev --no-optional', {
  cwd: LAYER_DIR,
  stdio: 'inherit'
});

// Remove package.json and package-lock.json from layer (not needed at runtime)
const filesToClean = ['package.json', 'package-lock.json'];
for (const file of filesToClean) {
  const filePath = path.join(LAYER_DIR, file);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// Step 3: Copy shared backend code
console.log('\n3. Copying shared backend code...');
const sharedDest = path.join(LAYER_DIR, 'shared');
copyDirRecursive(path.join(BACKEND_DIR, 'src'), sharedDest);

console.log('\n=== Layer build complete ===');
console.log(`Output: ${path.join(BUILD_DIR, 'layer')}`);
console.log('\nLayer structure:');

function printTree(dir, prefix) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry, i) => {
    const isLast = i === entries.length - 1;
    const connector = isLast ? '\\-- ' : '|-- ';
    if (entry.name === 'node_modules') {
      console.log(`${prefix}${connector}node_modules/ (${fs.readdirSync(path.join(dir, entry.name)).length} packages)`);
    } else if (entry.isDirectory()) {
      console.log(`${prefix}${connector}${entry.name}/`);
      printTree(path.join(dir, entry.name), prefix + (isLast ? '    ' : '|   '));
    } else {
      console.log(`${prefix}${connector}${entry.name}`);
    }
  });
}

printTree(path.join(BUILD_DIR, 'layer'), '  ');
