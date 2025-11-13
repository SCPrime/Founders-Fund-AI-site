#!/usr/bin/env node
// Simple secret detection script
// Lightweight alternative to gitleaks for basic patterns

import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PATTERNS = {
  'OpenAI API Key': /sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}/g,
  'Anthropic API Key': /sk-ant-api[0-9]{2}-[A-Za-z0-9_-]{93}/g,
  'Generic API Key': /(api[_-]?key|apikey)\s*[:=]\s*['"]?[a-f0-9]{32,}['"]?/gi,
  'Database URL':
    /(database_url|db_url)\s*[:=]\s*['"]?(postgres|postgresql|mysql):\/\/[^@\s]+:[^@\s]+@[^\/\s]+\/[^\s'"]+['"]?/gi,
  'JWT Secret': /(jwt[_-]?secret|nextauth[_-]?secret)\s*[:=]\s*['"]?[a-z0-9_-]{32,}['"]?/gi,
  'Private Key': /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----/g,
};

const IGNORED_DIRS = ['node_modules', '.next', '.git', 'dist', 'build', '.vercel'];

const IGNORED_FILES = ['.env.example', 'README.md', 'DEPLOYMENT.md'];

const CHECK_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.env', '.yml', '.yaml'];

function shouldCheckFile(filePath) {
  const fileName = filePath.split('/').pop() || '';

  if (IGNORED_FILES.includes(fileName)) {
    return false;
  }

  const ext = extname(filePath);
  return CHECK_EXTENSIONS.includes(ext) || fileName.startsWith('.env');
}

function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const findings = [];

    for (const [patternName, regex] of Object.entries(PATTERNS)) {
      const matches = content.match(regex);
      if (matches) {
        findings.push({
          file: filePath,
          pattern: patternName,
          matches: matches.length,
          lines: content
            .split('\n')
            .map((line, index) => (regex.test(line) ? index + 1 : null))
            .filter(Boolean),
        });
      }
      // Reset regex
      regex.lastIndex = 0;
    }

    return findings;
  } catch {
    // Ignore files that can't be read
    return [];
  }
}

function scanDirectory(dirPath, findings = []) {
  try {
    const items = readdirSync(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const stat = statSync(itemPath);

      if (stat.isDirectory()) {
        if (!IGNORED_DIRS.includes(item)) {
          scanDirectory(itemPath, findings);
        }
      } else if (stat.isFile() && shouldCheckFile(itemPath)) {
        findings.push(...scanFile(itemPath));
      }
    }
  } catch {
    // Ignore directories that can't be read
  }

  return findings;
}

function main() {
  const rootDir = join(__dirname, '../');
  console.log('🔍 Scanning for potential secrets...\n');

  const findings = scanDirectory(rootDir);

  if (findings.length === 0) {
    console.log('✅ No potential secrets detected!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${findings.length} potential secret(s):\n`);

    findings.forEach((finding) => {
      console.log(`File: ${finding.file}`);
      console.log(`Pattern: ${finding.pattern}`);
      console.log(`Lines: ${finding.lines.join(', ')}`);
      console.log('---');
    });

    console.log('\n⚠️  Please review these findings and remove any actual secrets.');
    console.log('   Consider using environment variables for sensitive data.');
    process.exit(1);
  }
}

main();
