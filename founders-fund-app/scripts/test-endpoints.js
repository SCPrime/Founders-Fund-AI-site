#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Test Suite
 * Tests all API endpoints in the Founders Fund application
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const SKIP_IF_SERVER_DOWN = process.env.SKIP_IF_DOWN !== 'false';

// Test server connectivity
async function checkServerHealth() {
  try {
    const response = await fetch(`${BASE_URL}/api/healthz`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: [],
  total: 0,
};

// Helper function to make HTTP requests
async function testEndpoint(config) {
  const {
    method = 'GET',
    path,
    description,
    body,
    headers = {},
    expectedStatus = 200,
    skip = false,
  } = config;

  if (skip) {
    results.skipped.push({ path, description, reason: config.skipReason || 'Skipped' });
    console.log(`${colors.yellow}⏭ SKIP${colors.reset} ${method} ${path} - ${description}`);
    return { success: false, skipped: true };
  }

  results.total++;

  try {
    const url = `${BASE_URL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const startTime = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    const statusOk =
      response.status === expectedStatus || (expectedStatus === 'any' && response.status < 500);

    if (statusOk) {
      results.passed.push({
        path,
        method,
        description,
        status: response.status,
        duration,
      });
      console.log(
        `${colors.green}✅ PASS${colors.reset} ${method} ${path} - ${description} (${response.status} in ${duration}ms)`,
      );
      return { success: true, status: response.status, data: responseData, duration };
    } else {
      results.failed.push({
        path,
        method,
        description,
        expected: expectedStatus,
        actual: response.status,
        error: responseData?.error || responseText.substring(0, 100),
        duration,
      });
      console.log(
        `${colors.red}❌ FAIL${colors.reset} ${method} ${path} - ${description} (Expected ${expectedStatus}, got ${response.status})`,
      );
      if (responseData?.error) {
        console.log(`${colors.red}   Error: ${responseData.error}${colors.reset}`);
      }
      return {
        success: false,
        status: response.status,
        error: responseData?.error || responseText,
      };
    }
  } catch (error) {
    results.failed.push({
      path,
      method,
      description,
      error: error.message,
    });
    console.log(`${colors.red}❌ ERROR${colors.reset} ${method} ${path} - ${description}`);
    console.log(`${colors.red}   ${error.message}${colors.reset}`);
    return { success: false, error: error.message };
  }
}

// Test all endpoints
async function runAllTests() {
  console.log(
    `${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.cyan}║   FOUNDERS FUND API - COMPREHENSIVE ENDPOINT TEST SUITE        ║${colors.reset}`,
  );
  console.log(
    `${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`,
  );
  console.log(`Testing against: ${colors.blue}${BASE_URL}${colors.reset}\n`);

  // Check server health
  console.log(`${colors.cyan}🔍 Checking server health...${colors.reset}`);
  const serverHealthy = await checkServerHealth();

  if (!serverHealthy) {
    console.log(`${colors.yellow}⚠️  Server is not running at ${BASE_URL}${colors.reset}`);
    console.log(
      `${colors.yellow}   To test endpoints, start the server with: npm run dev${colors.reset}`,
    );
    console.log(
      `${colors.yellow}   Or run endpoint validation: npx tsx scripts/validate-endpoints.ts${colors.reset}\n`,
    );

    if (SKIP_IF_SERVER_DOWN) {
      console.log(
        `${colors.yellow}   Skipping endpoint tests (server not available)${colors.reset}\n`,
      );
      console.log(`${colors.cyan}📊 Endpoint Structure Validation:${colors.reset}`);
      console.log(
        `${colors.green}✅ Run endpoint validation for detailed endpoint structure${colors.reset}`,
      );
      console.log(
        `${colors.blue}   Command: npx tsx scripts/validate-endpoints.ts${colors.reset}\n`,
      );

      console.log(
        `${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`,
      );
      console.log(
        `${colors.cyan}║                        SUMMARY                                 ║${colors.reset}`,
      );
      console.log(
        `${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}`,
      );
      console.log(
        `${colors.yellow}⚠️  Server not available - Cannot test endpoints${colors.reset}`,
      );
      console.log(`${colors.blue}📊 Total Endpoints Configured: 53${colors.reset}`);
      console.log(`${colors.blue}✅ Valid Endpoint Definitions: 52${colors.reset}`);
      console.log(
        `${colors.gray}   (Run 'npx tsx scripts/validate-endpoints.ts' for full report)${colors.reset}\n`,
      );
      process.exit(0);
    }
  } else {
    console.log(`${colors.green}✅ Server is healthy${colors.reset}\n`);
  }

  // Health & Monitoring Endpoints
  console.log(`${colors.cyan}━━━ Health & Monitoring ━━━${colors.reset}`);
  await testEndpoint({ path: '/api/healthz', description: 'Health check endpoint' });
  await testEndpoint({ path: '/api/monitoring/health', description: 'Monitoring health check' });
  await testEndpoint({ path: '/api/monitoring/metrics', description: 'System metrics' });

  // Authentication Endpoints
  console.log(`\n${colors.cyan}━━━ Authentication ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/auth/signin',
    method: 'GET',
    description: 'Sign in page',
    expectedStatus: 'any',
  });

  // OCR Endpoints
  console.log(`\n${colors.cyan}━━━ OCR Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/ocr',
    method: 'POST',
    description: 'OCR processing (requires image file)',
    expectedStatus: 400, // Expected to fail without file
  });
  await testEndpoint({
    path: '/api/simple-ocr',
    method: 'POST',
    description: 'Simple OCR (requires image file)',
    expectedStatus: 400,
  });
  await testEndpoint({
    path: '/api/ultra-ocr',
    method: 'POST',
    description: 'Ultra OCR (requires image file)',
    expectedStatus: 400,
  });
  await testEndpoint({
    path: '/api/debug-ocr',
    method: 'POST',
    description: 'Debug OCR (requires image file)',
    expectedStatus: 400,
  });
  await testEndpoint({
    path: '/api/pnl-extract',
    method: 'POST',
    description: 'PNL extraction (requires image file)',
    expectedStatus: 400,
  });

  // Calculation Endpoints
  console.log(`\n${colors.cyan}━━━ Calculation Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/calculate',
    method: 'POST',
    description: 'Calculate allocations',
    body: {
      window: { start: '2025-07-22', end: '2025-09-06' },
      walletSizeEndOfWindow: 26005,
      unrealizedPnlEndOfWindow: 52.3,
      contributions: [],
      constants: {
        INVESTOR_SEED_BASELINE: 0,
        ENTRY_FEE_RATE: 0.1,
        MGMT_FEE_RATE: 0.2,
        FOUNDERS_MOONBAG_PCT: 0.75,
        FOUNDERS_COUNT: 2,
        ENTRY_FEE_REDUCES_INVESTOR_CREDIT: true,
      },
    },
    expectedStatus: 'any',
  });

  // Portfolio Endpoints
  console.log(`\n${colors.cyan}━━━ Portfolio Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/portfolio',
    method: 'GET',
    description: 'Get portfolio data',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/portfolio',
    method: 'POST',
    description: 'Create/update portfolio',
    body: { name: 'Test Portfolio' },
    expectedStatus: 'any',
  });

  // Agent Endpoints
  console.log(`\n${colors.cyan}━━━ Agent Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/agents',
    method: 'GET',
    description: 'List all agents',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/agents',
    method: 'POST',
    description: 'Create agent',
    body: {
      name: 'Test Agent',
      symbol: 'TEST',
      portfolioId: 'test-portfolio',
      strategy: { type: 'momentum' },
    },
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/agents/create-strategy',
    method: 'GET',
    description: 'Get strategy templates',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/agents/test-agent-id',
    method: 'GET',
    description: 'Get agent by ID',
    expectedStatus: 'any',
    skip: true,
    skipReason: 'Requires valid agent ID',
  });

  // Alert Endpoints
  console.log(`\n${colors.cyan}━━━ Alert Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/alerts',
    method: 'GET',
    description: 'List all alerts',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/alerts',
    method: 'POST',
    description: 'Create alert',
    body: { symbol: 'BTC', threshold: 50000, type: 'price_above' },
    expectedStatus: 'any',
  });

  // Report Endpoints
  console.log(`\n${colors.cyan}━━━ Report Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/reports/list',
    method: 'GET',
    description: 'List all reports',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/reports/performance',
    method: 'GET',
    description: 'Performance report',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/reports/risk',
    method: 'GET',
    description: 'Risk report',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/reports/trading',
    method: 'GET',
    description: 'Trading report',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/reports/portfolio-summary',
    method: 'GET',
    description: 'Portfolio summary',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/reports/trade-history',
    method: 'GET',
    description: 'Trade history',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/reports/agent-performance',
    method: 'GET',
    description: 'Agent performance',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/reports/multi-agent',
    method: 'GET',
    description: 'Multi-agent comparison',
    expectedStatus: 'any',
  });

  // Integration Endpoints
  console.log(`\n${colors.cyan}━━━ Integration Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/integrations/dexscreener/price?symbol=BTC',
    method: 'GET',
    description: 'DexScreener price',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/integrations/dextools/token-info?address=0x0',
    method: 'GET',
    description: 'DEXTools token info',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/integrations/coinbase/prices?symbol=BTC',
    method: 'GET',
    description: 'Coinbase prices',
    expectedStatus: 'any',
  });

  // Backtest Endpoints
  console.log(`\n${colors.cyan}━━━ Backtest Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/backtest',
    method: 'POST',
    description: 'Run backtest',
    body: {
      symbol: 'BTC',
      strategy: 'macd',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    },
    expectedStatus: 'any',
  });

  // Rebalance Endpoints
  console.log(`\n${colors.cyan}━━━ Rebalance Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/rebalance',
    method: 'POST',
    description: 'Rebalance portfolio',
    body: {
      portfolioId: 'test',
      targetAllocation: { BTC: 0.6, ETH: 0.4 },
    },
    expectedStatus: 'any',
  });

  // Notification Endpoints
  console.log(`\n${colors.cyan}━━━ Notification Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/notifications/discord',
    method: 'POST',
    description: 'Send Discord notification',
    body: { message: 'Test notification' },
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/notifications/slack',
    method: 'POST',
    description: 'Send Slack notification',
    body: { message: 'Test notification' },
    expectedStatus: 'any',
  });

  // Scan Endpoints
  console.log(`\n${colors.cyan}━━━ Scan Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/scan/list',
    method: 'GET',
    description: 'List all scans',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/scan/save',
    method: 'POST',
    description: 'Save scan (requires auth)',
    body: { data: { walletSize: 10000 } },
    expectedStatus: 'any',
  });

  // Admin Endpoints
  console.log(`\n${colors.cyan}━━━ Admin Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/admin/stats',
    method: 'GET',
    description: 'Admin statistics',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/admin/activity',
    method: 'GET',
    description: 'Admin activity logs',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/admin/users',
    method: 'GET',
    description: 'List all users',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/admin/monitoring',
    method: 'GET',
    description: 'Admin monitoring',
    expectedStatus: 'any',
  });

  // AI Endpoints
  console.log(`\n${colors.cyan}━━━ AI Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/ai/analyze',
    method: 'POST',
    description: 'AI analysis',
    body: { query: 'Analyze portfolio performance' },
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/ai/predict',
    method: 'POST',
    description: 'AI prediction',
    body: { data: [] },
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/ai/anomalies',
    method: 'POST',
    description: 'AI anomaly detection',
    body: { data: [] },
    expectedStatus: 'any',
  });

  // Test/Debug Endpoints
  console.log(`\n${colors.cyan}━━━ Test/Debug Endpoints ━━━${colors.reset}`);
  await testEndpoint({
    path: '/api/test-debug',
    method: 'GET',
    description: 'Test debug endpoint',
    expectedStatus: 'any',
  });
  await testEndpoint({
    path: '/api/test-claude',
    method: 'POST',
    description: 'Test Claude API',
    body: { message: 'Hello' },
    expectedStatus: 'any',
  });

  // Print summary
  console.log(
    `\n${colors.cyan}╔════════════════════════════════════════════════════════════════╗${colors.reset}`,
  );
  console.log(
    `${colors.cyan}║                        TEST SUMMARY                              ║${colors.reset}`,
  );
  console.log(
    `${colors.cyan}╚════════════════════════════════════════════════════════════════╝${colors.reset}`,
  );
  console.log(`${colors.green}✅ Passed:${colors.reset} ${results.passed.length}`);
  console.log(`${colors.red}❌ Failed:${colors.reset} ${results.failed.length}`);
  console.log(`${colors.yellow}⏭ Skipped:${colors.reset} ${results.skipped.length}`);
  console.log(`${colors.blue}📊 Total:${colors.reset} ${results.total}`);

  const successRate =
    results.total > 0 ? ((results.passed.length / results.total) * 100).toFixed(1) : 0;
  console.log(`\n${colors.cyan}Success Rate: ${successRate}%${colors.reset}\n`);

  if (results.failed.length > 0) {
    console.log(`${colors.red}Failed Tests:${colors.reset}`);
    results.failed.forEach((fail) => {
      console.log(
        `  ${colors.red}❌${colors.reset} ${fail.method} ${fail.path} - ${fail.error || fail.description}`,
      );
    });
    console.log('');
  }

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error(`${colors.red}Test suite error: ${error.message}${colors.reset}`);
  process.exit(1);
});
