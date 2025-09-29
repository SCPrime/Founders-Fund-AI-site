#!/usr/bin/env node
// Simple bundle size budget checker
// Run after `npm run build` to validate bundle sizes

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BUILD_DIR = join(__dirname, '../.next');
const BUDGET_LIMITS = {
  firstLoadJS: 160 * 1024, // 160 KB
  totalJS: 500 * 1024,     // 500 KB
};

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function checkBudget() {
  const manifestPath = join(BUILD_DIR, '.next-build-manifest.json');

  if (!existsSync(manifestPath)) {
    console.log('⚠️  Build manifest not found. Run `npm run build` first.');
    return false;
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

    // Estimate first-load JS size (simplified)
    const chunks = manifest.chunks || {};

    let maxFirstLoad = 0;
    let totalJS = 0;

    // Check main chunks
    Object.values(chunks).forEach(chunk => {
      if (Array.isArray(chunk)) {
        chunk.forEach(file => {
          if (file.endsWith('.js')) {
            const filePath = join(BUILD_DIR, 'static', file);
            if (existsSync(filePath)) {
              const size = statSync(filePath).size;
              totalJS += size;
              maxFirstLoad = Math.max(maxFirstLoad, size);
            }
          }
        });
      }
    });

    console.log('\n📊 Bundle Size Analysis:');
    console.log(`   First Load JS: ${formatBytes(maxFirstLoad)} (limit: ${formatBytes(BUDGET_LIMITS.firstLoadJS)})`);
    console.log(`   Total JS: ${formatBytes(totalJS)} (limit: ${formatBytes(BUDGET_LIMITS.totalJS)})`);

    const firstLoadOk = maxFirstLoad <= BUDGET_LIMITS.firstLoadJS;
    const totalOk = totalJS <= BUDGET_LIMITS.totalJS;

    if (firstLoadOk && totalOk) {
      console.log('✅ Bundle sizes are within budget limits');
      return true;
    } else {
      console.log('\n❌ Bundle size budget exceeded:');
      if (!firstLoadOk) {
        console.log(`   First Load JS exceeds budget by ${formatBytes(maxFirstLoad - BUDGET_LIMITS.firstLoadJS)}`);
      }
      if (!totalOk) {
        console.log(`   Total JS exceeds budget by ${formatBytes(totalJS - BUDGET_LIMITS.totalJS)}`);
      }
      return false;
    }
  } catch (error) {
    console.error('Error analyzing bundle:', error.message);
    return false;
  }
}

// Run budget check
const success = checkBudget();
process.exit(success ? 0 : 1);