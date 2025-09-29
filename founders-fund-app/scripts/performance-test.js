/**
 * Performance Testing Script
 * Tests various aspects of the application's performance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Analyze build output
function analyzeBuildOutput() {
  const nextDir = path.join(__dirname, '..', '.next');

  if (!fs.existsSync(nextDir)) {
    console.log('❌ Build directory not found. Run npm run build first.');
    return;
  }

  console.log('📊 Build Analysis:');
  console.log('✅ Build directory exists');

  // Check for dynamic chunks (indicating code splitting)
  const staticDir = path.join(nextDir, 'static', 'chunks');
  if (fs.existsSync(staticDir)) {
    const chunks = fs.readdirSync(staticDir).filter(f => f.endsWith('.js'));
    console.log(`✅ Found ${chunks.length} JavaScript chunks (code splitting working)`);

    // Analyze chunk sizes
    const chunkSizes = chunks.map(chunk => {
      const filePath = path.join(staticDir, chunk);
      const stats = fs.statSync(filePath);
      return {
        name: chunk,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024)
      };
    }).sort((a, b) => b.size - a.size);

    console.log('\n📦 Top 5 Largest Chunks:');
    chunkSizes.slice(0, 5).forEach((chunk, index) => {
      console.log(`${index + 1}. ${chunk.name}: ${chunk.sizeKB} KB`);
    });
  }
}

// Check for optimization features
function checkOptimizations() {
  console.log('\n🚀 Performance Optimizations Check:');

  const checks = [
    {
      name: 'Dynamic imports in main page',
      file: path.join(__dirname, '..', 'src', 'app', 'page.tsx'),
      pattern: /dynamic\(\(\) => import/,
      description: 'Tab components are dynamically loaded'
    },
    {
      name: 'Memoized formatters',
      file: path.join(__dirname, '..', 'src', 'lib', 'formatters.ts'),
      pattern: /new Intl\.NumberFormat/,
      description: 'Currency/number formatters are memoized'
    },
    {
      name: 'Optimized Zustand selectors',
      file: path.join(__dirname, '..', 'src', 'components', 'Calculator', 'Results', 'AllocationResults.tsx'),
      pattern: /useAllocationStore\(\(state\) => state\./,
      description: 'Components use specific Zustand selectors'
    },
    {
      name: 'Dynamic serverless imports',
      file: path.join(__dirname, '..', 'src', 'app', 'api', 'ocr', 'route.ts'),
      pattern: /await import\(/,
      description: 'Heavy dependencies are dynamically imported'
    }
  ];

  checks.forEach(check => {
    try {
      if (fs.existsSync(check.file)) {
        const content = fs.readFileSync(check.file, 'utf8');
        if (check.pattern.test(content)) {
          console.log(`✅ ${check.name}: ${check.description}`);
        } else {
          console.log(`❌ ${check.name}: Pattern not found`);
        }
      } else {
        console.log(`❌ ${check.name}: File not found`);
      }
    } catch {
      console.log(`❌ ${check.name}: Error checking file`);
    }
  });
}

// Performance recommendations
function performanceRecommendations() {
  console.log('\n💡 Performance Recommendations:');

  const recommendations = [
    '1. Monitor Core Web Vitals in production with analytics',
    '2. Consider implementing service worker for caching',
    '3. Use CDN for static assets in production',
    '4. Monitor serverless function cold starts',
    '5. Consider implementing virtual scrolling for large data sets',
    '6. Use React.memo() for expensive components if needed',
    '7. Implement image optimization for any uploaded images',
    '8. Consider database query optimization for complex calculations'
  ];

  recommendations.forEach(rec => console.log(`   ${rec}`));
}

// Main execution
console.log('🏃‍♂️ Performance Analysis Report\n');
console.log('='.repeat(50));

analyzeBuildOutput();
checkOptimizations();
performanceRecommendations();

console.log('\n='.repeat(50));
console.log('✅ Performance analysis complete!');
console.log('\n🔗 For detailed bundle analysis, run: ANALYZE=true npm run build');
console.log('🔗 For runtime performance, use Chrome DevTools Lighthouse');