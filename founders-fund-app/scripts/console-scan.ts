// Console & network error scanner for production readiness
import { chromium, ConsoleMessage, Request } from 'playwright';

const BASE = process.argv.find((a) => a.startsWith('--base='))?.split('=')[1] ?? 'http://localhost:3000';
const routes = [
  '/',               // homepage
  '/api/healthz',    // health + db probe
  '/debug',          // debug page
  // Add your key app routes when they exist:
  // '/calculator',
  // '/portfolio',
];

const noisyPatterns = [
  /favicon\.ico.*404/i,
  /DevTools failed to load source map/i,
  /React DevTools backend.*downloaded/i,
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const errors: string[] = [];
  const warnings: string[] = [];
  const failed: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    if (noisyPatterns.some((p) => p.test(text))) return;
    if (msg.type() === 'error') errors.push(text);
    else if (msg.type() === 'warning') warnings.push(text);
  });

  page.on('requestfailed', (req: Request) => {
    const u = req.url();
    if (noisyPatterns.some((p) => p.test(u))) return;
    failed.push(`[requestfailed] ${req.method()} ${u} – ${req.failure()?.errorText}`);
  });

  for (const r of routes) {
    const url = `${BASE}${r}`;
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => {
      errors.push(`[navigation] ${url} – ${e.message}`);
      return null;
    });
    if (!res) continue;
    const code = res.status();
    if (code >= 400 && !/\/healthz$/.test(url)) {
      failed.push(`[status ${code}] ${url}`);
    }
    // special case: /healthz should be 200 and ok:true
    if (/\/healthz$/.test(url)) {
      try {
        const json = await res.json();
        if (!json?.ok) errors.push(`[healthz] ok:false payload: ${JSON.stringify(json)}`);
      } catch {
        errors.push(`[healthz] non-JSON response`);
      }
    }
  }

  await browser.close();

  // Report
  const out = (label: string, arr: string[]) => arr.length ? `\n${label}\n${arr.map(s => ` - ${s}`).join('\n')}` : '';
  const report = `${out('Console Errors', errors)}${out('Console Warnings', warnings)}${out('Network Failures', failed)}`;
  if (report.trim()) {
    console.error(report);
    process.exit(errors.length > 0 || failed.length > 0 ? 1 : 0);
  } else {
    console.log('✅ No console errors or network failures detected');
  }
})();