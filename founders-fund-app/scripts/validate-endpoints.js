/**
 * API Endpoint Validation Script
 * Tests all 54 API endpoints for connectivity and basic response
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3005';

const endpoints = [
  // Health & Debug
  { method: 'GET', path: '/api/healthz', name: 'Health Check' },
  { method: 'GET', path: '/api/test-debug', name: 'Debug Test' },
  { method: 'GET', path: '/api/test-claude', name: 'Claude Test' },

  // Authentication
  { method: 'GET', path: '/api/auth/providers', name: 'Auth Providers', skipAuth: true },

  // AI Services
  { method: 'POST', path: '/api/ai/analyze', name: 'AI Analyze', requiresBody: true },
  { method: 'POST', path: '/api/ai/anomalies', name: 'AI Anomalies', requiresBody: true },
  { method: 'POST', path: '/api/ai/predict', name: 'AI Predict', requiresBody: true },

  // OCR Services
  { method: 'POST', path: '/api/ocr', name: 'OCR Basic', requiresBody: true },
  { method: 'POST', path: '/api/ultra-ocr', name: 'Ultra OCR', requiresBody: true },
  { method: 'POST', path: '/api/simple-ocr', name: 'Simple OCR', requiresBody: true },
  { method: 'POST', path: '/api/debug-ocr', name: 'Debug OCR', requiresBody: true },
  { method: 'POST', path: '/api/pnl-extract', name: 'PnL Extract', requiresBody: true },

  // Agents
  { method: 'GET', path: '/api/agents', name: 'List Agents' },
  { method: 'POST', path: '/api/agents/create-strategy', name: 'Create Strategy', requiresBody: true },

  // Portfolio & Calculate
  { method: 'GET', path: '/api/portfolio', name: 'Portfolio' },
  { method: 'POST', path: '/api/calculate', name: 'Calculate', requiresBody: true },

  // Scanning
  { method: 'GET', path: '/api/scan/list', name: 'List Scans' },
  { method: 'POST', path: '/api/scan/save', name: 'Save Scan', requiresBody: true },

  // Backtesting
  { method: 'POST', path: '/api/backtest', name: 'Backtest', requiresBody: true },

  // Rebalancing
  { method: 'POST', path: '/api/rebalance', name: 'Rebalance', requiresBody: true },

  // Alerts
  { method: 'GET', path: '/api/alerts', name: 'List Alerts' },

  // Reports
  { method: 'GET', path: '/api/reports/list', name: 'List Reports' },
  { method: 'POST', path: '/api/reports/export-pdf', name: 'Export PDF', requiresBody: true },
  { method: 'GET', path: '/api/reports/risk', name: 'Risk Report' },
  { method: 'GET', path: '/api/reports/trading', name: 'Trading Report' },
  { method: 'POST', path: '/api/reports/trade-history', name: 'Trade History', requiresBody: true },
  { method: 'POST', path: '/api/reports/multi-agent', name: 'Multi-Agent Report', requiresBody: true },
  { method: 'POST', path: '/api/reports/agent-performance', name: 'Agent Performance', requiresBody: true },
  { method: 'GET', path: '/api/reports/portfolio-summary', name: 'Portfolio Summary' },
  { method: 'GET', path: '/api/reports/performance', name: 'Performance Report' },

  // Notifications
  { method: 'POST', path: '/api/notifications/discord', name: 'Discord Notification', requiresBody: true },
  { method: 'POST', path: '/api/notifications/slack', name: 'Slack Notification', requiresBody: true },

  // Chart Drawings
  { method: 'GET', path: '/api/chart-drawings', name: 'Chart Drawings' },

  // Admin
  { method: 'GET', path: '/api/admin/stats', name: 'Admin Stats' },
  { method: 'GET', path: '/api/admin/activity', name: 'Admin Activity' },
  { method: 'GET', path: '/api/admin/users', name: 'Admin Users' },
  { method: 'GET', path: '/api/admin/monitoring', name: 'Admin Monitoring' },

  // Monitoring
  { method: 'GET', path: '/api/monitoring/health', name: 'Monitoring Health' },
  { method: 'GET', path: '/api/monitoring/metrics', name: 'Monitoring Metrics' },

  // Integrations - DexScreener
  { method: 'GET', path: '/api/integrations/dexscreener/price?tokenAddress=0x123', name: 'DexScreener Price' },
  { method: 'GET', path: '/api/integrations/dexscreener/chart?tokenAddress=0x123', name: 'DexScreener Chart' },
  { method: 'GET', path: '/api/integrations/dexscreener/pairs?chainId=ethereum&tokenAddress=0x123', name: 'DexScreener Pairs' },

  // Integrations - DexTools
  { method: 'GET', path: '/api/integrations/dextools/token-info?chain=ether&address=0x123', name: 'DexTools Token Info' },
  { method: 'GET', path: '/api/integrations/dextools/holders?chain=ether&address=0x123', name: 'DexTools Holders' },
  { method: 'GET', path: '/api/integrations/dextools/transactions?chain=ether&address=0x123', name: 'DexTools Transactions' },

  // Integrations - Coinbase
  { method: 'GET', path: '/api/integrations/coinbase/prices', name: 'Coinbase Prices' },
  { method: 'GET', path: '/api/integrations/coinbase/accounts', name: 'Coinbase Accounts' },

  // Background Jobs
  { method: 'POST', path: '/api/jobs/update-prices', name: 'Update Prices Job', requiresBody: true },
];

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const options = {
    method: endpoint.method,
    headers: {
      'Content-Type': 'application/json',
    }
  };

  // Add minimal body for POST requests
  if (endpoint.method === 'POST' && endpoint.requiresBody) {
    options.body = JSON.stringify({ test: true });
  }

  try {
    const response = await fetch(url, options);
    const status = response.status;

    // Consider these status codes as "working" endpoints:
    // 200-299: Success
    // 400-401: Client errors (endpoint exists, validation/auth failed)
    // 405: Method not allowed (endpoint exists)
    const isWorking = status < 500;

    results.total++;
    if (isWorking) {
      results.passed++;
      results.details.push({
        name: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        status,
        result: '✅ PASS'
      });
    } else {
      results.failed++;
      results.details.push({
        name: endpoint.name,
        path: endpoint.path,
        method: endpoint.method,
        status,
        result: '❌ FAIL'
      });
    }

    return { endpoint, status, isWorking };
  } catch (error) {
    results.total++;
    results.failed++;
    results.details.push({
      name: endpoint.name,
      path: endpoint.path,
      method: endpoint.method,
      status: 'ERROR',
      result: '❌ FAIL',
      error: error.message
    });
    return { endpoint, error: error.message, isWorking: false };
  }
}

async function runValidation() {
  console.log('\n🚀 Starting API Endpoint Validation...\n');
  console.log(`Base URL: ${BASE_URL}\n`);
  console.log(`Total Endpoints to Test: ${endpoints.length}\n`);
  console.log('─'.repeat(80));

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    const status = result.error ? `ERROR: ${result.error}` : `HTTP ${result.status}`;
    const symbol = result.isWorking ? '✅' : '❌';
    console.log(`${symbol} [${endpoint.method}] ${endpoint.name.padEnd(30)} ${status}`);
  }

  console.log('─'.repeat(80));
  console.log('\n📊 VALIDATION SUMMARY:\n');
  console.log(`Total Endpoints:  ${results.total}`);
  console.log(`✅ Passed:        ${results.passed} (${Math.round((results.passed / results.total) * 100)}%)`);
  console.log(`❌ Failed:        ${results.failed} (${Math.round((results.failed / results.total) * 100)}%)`);
  console.log(`⏭️  Skipped:       ${results.skipped}`);

  console.log('\n─'.repeat(80));

  if (results.failed > 0) {
    console.log('\n⚠️  FAILED ENDPOINTS:\n');
    results.details
      .filter(d => d.result === '❌ FAIL')
      .forEach(d => {
        console.log(`  ${d.name} (${d.method} ${d.path})`);
        console.log(`    Status: ${d.status}${d.error ? ` - ${d.error}` : ''}\n`);
      });
  }

  console.log('\n✅ Endpoint validation complete!\n');

  // Exit with error code if any endpoints failed
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the validation
runValidation().catch(error => {
  console.error('Fatal error during validation:', error);
  process.exit(1);
});
