#!/usr/bin/env tsx

/**
 * Endpoint Validation Script
 * Validates all API endpoints exist and have proper structure
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Endpoint {
  path: string;
  methods: string[];
  file: string;
  hasExport: boolean;
  hasError: boolean;
  error?: string;
}

const results: {
  endpoints: Endpoint[];
  errors: string[];
  warnings: string[];
} = {
  endpoints: [],
  errors: [],
  warnings: [],
};

function findRouteFiles(dir: string, basePath: string = ''): void {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = join(basePath, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and other non-route directories
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        findRouteFiles(fullPath, relativePath);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        // Determine the API path from directory structure
        const apiPath = relativePath
          .replace(/route\.ts?$/, '')
          .replace(/\\/g, '/')
          .replace(/\/$/, '');

        const endpointPath = `/api/${apiPath}`;

        // Read file to check for exports
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const methods: string[] = [];

          // Check for HTTP method exports
          // Standard exports
          if (
            content.includes('export async function GET') ||
            content.includes('export function GET')
          ) {
            methods.push('GET');
          }
          if (
            content.includes('export async function POST') ||
            content.includes('export function POST')
          ) {
            methods.push('POST');
          }
          if (
            content.includes('export async function PUT') ||
            content.includes('export function PUT')
          ) {
            methods.push('PUT');
          }
          if (
            content.includes('export async function PATCH') ||
            content.includes('export function PATCH')
          ) {
            methods.push('PATCH');
          }
          if (
            content.includes('export async function DELETE') ||
            content.includes('export function DELETE')
          ) {
            methods.push('DELETE');
          }

          // Check for NextAuth handler pattern: export { handler as GET, handler as POST }
          if (content.includes('export {') && content.includes('handler')) {
            if (content.match(/handler\s+as\s+GET/i)) methods.push('GET');
            if (content.match(/handler\s+as\s+POST/i)) methods.push('POST');
            if (content.match(/handler\s+as\s+PUT/i)) methods.push('PUT');
            if (content.match(/handler\s+as\s+PATCH/i)) methods.push('PATCH');
            if (content.match(/handler\s+as\s+DELETE/i)) methods.push('DELETE');
          }

          if (methods.length === 0) {
            results.warnings.push(`⚠️  ${endpointPath} - No HTTP methods found`);
          }

          results.endpoints.push({
            path: endpointPath,
            methods,
            file: relativePath,
            hasExport: true,
            hasError: false,
          });
        } catch (error) {
          results.errors.push(
            `❌ Error reading ${fullPath}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          results.endpoints.push({
            path: endpointPath,
            methods: [],
            file: relativePath,
            hasExport: false,
            hasError: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  } catch (error) {
    results.errors.push(
      `❌ Error reading directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// Find all route files
const apiDir = join(process.cwd(), 'src', 'app', 'api');
console.log('🔍 Scanning API directory:', apiDir);

findRouteFiles(apiDir);

// Sort endpoints by path
results.endpoints.sort((a, b) => a.path.localeCompare(b.path));

// Print results
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         FOUNDERS FUND API - ENDPOINT VALIDATION REPORT         ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

console.log(`📊 Total Endpoints Found: ${results.endpoints.length}\n`);

// Group by category
const categories: Record<string, Endpoint[]> = {};

results.endpoints.forEach((endpoint) => {
  const parts = endpoint.path.split('/');
  const category = parts.length > 2 ? parts[2] : 'root';

  if (!categories[category]) {
    categories[category] = [];
  }
  categories[category].push(endpoint);
});

// Print by category
Object.keys(categories)
  .sort()
  .forEach((category) => {
    console.log(`\n━━━ ${category.toUpperCase()} ━━━`);
    categories[category].forEach((endpoint) => {
      const methodStr = endpoint.methods.length > 0 ? endpoint.methods.join(', ') : '❌ NO METHODS';
      const status = endpoint.hasError ? '❌' : endpoint.methods.length === 0 ? '⚠️' : '✅';
      console.log(`  ${status} ${methodStr.padEnd(20)} ${endpoint.path}`);
    });
  });

// Print summary
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                        SUMMARY                                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

const validEndpoints = results.endpoints.filter((e) => !e.hasError && e.methods.length > 0);
const invalidEndpoints = results.endpoints.filter((e) => e.hasError);
const noMethodsEndpoints = results.endpoints.filter((e) => !e.hasError && e.methods.length === 0);

console.log(`\n✅ Valid Endpoints: ${validEndpoints.length}`);
console.log(`❌ Invalid Endpoints: ${invalidEndpoints.length}`);
console.log(`⚠️  Endpoints Without Methods: ${noMethodsEndpoints.length}`);
console.log(`📊 Total Endpoints: ${results.endpoints.length}`);

if (results.errors.length > 0) {
  console.log(`\n❌ Errors (${results.errors.length}):`);
  results.errors.forEach((error) => console.log(`  ${error}`));
}

if (results.warnings.length > 0) {
  console.log(`\n⚠️  Warnings (${results.warnings.length}):`);
  results.warnings.forEach((warning) => console.log(`  ${warning}`));
}

if (noMethodsEndpoints.length > 0) {
  console.log(`\n⚠️  Endpoints Without HTTP Methods:`);
  noMethodsEndpoints.forEach((endpoint) => {
    console.log(`  ${endpoint.path} (${endpoint.file})`);
  });
}

// Generate JSON report
const report = {
  timestamp: new Date().toISOString(),
  totalEndpoints: results.endpoints.length,
  validEndpoints: validEndpoints.length,
  invalidEndpoints: invalidEndpoints.length,
  noMethodsEndpoints: noMethodsEndpoints.length,
  endpoints: results.endpoints.map((e) => ({
    path: e.path,
    methods: e.methods,
    file: e.file,
    valid: !e.hasError && e.methods.length > 0,
  })),
  categories: Object.keys(categories).reduce(
    (acc, cat) => {
      acc[cat] = categories[cat].length;
      return acc;
    },
    {} as Record<string, number>,
  ),
};

console.log(`\n📄 JSON report saved to endpoint-report.json`);
writeFileSync('endpoint-report.json', JSON.stringify(report, null, 2));

// Exit with appropriate code
process.exit(invalidEndpoints.length > 0 ? 1 : 0);
