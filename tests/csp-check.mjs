// Loads a built copy of the game under the Content-Security-Policy Deployer's edge sends on /deployer-api/, which is the
// address an on-demand game is reached on after its wake. Nothing listens: the files are served by page.route and every
// other request is aborted, so a script or asset from a CDN fails the check instead of loading.
//
//   node tests/csp-check.mjs [dir]     dir = a built copy of dist (default: dist)
//
// Passes when the page has a canvas, asked for assets/player.json, had no page error and no CSP violation.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(process.argv[2] ?? path.join(root, 'dist'));
const ORIGIN = 'http://deployer.test';
const BASE = '/deployer-api/service/game-ski/';

// The "deployer" policy of ops/edge/nginx-csp-report-only.sh in Deployer, with the report-uri sec1-headers.sh appends.
const CSP = "default-src 'self'; script-src 'self'; "
  + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://netdna.bootstrapcdn.com; "
  + "font-src 'self' https://fonts.gstatic.com https://netdna.bootstrapcdn.com; img-src 'self' data:; connect-src 'self'; "
  + "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; "
  + 'report-uri https://nyviken.se/deployer-api/csp-report';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.map': 'application/json' };

if (!fs.existsSync(path.join(dir, 'index.html'))) {
  console.error(`FAIL: no index.html in ${dir}; build first (NODE_ENV=production yarn build)`);
  process.exit(2);
}

const problems = [];
const requested = [];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      (window).reportCspViolation(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`));
  });
  await page.exposeFunction('reportCspViolation', (v) => problems.push(`CSP violation: ${v}`));
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('console', (m) => { if (/Content Security Policy/i.test(m.text())) problems.push(`CSP console: ${m.text()}`); });

  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN || !url.pathname.startsWith(BASE)) {
      requested.push(`aborted ${url.origin}${url.pathname}`);
      return route.abort();
    }
    const rel = url.pathname.slice(BASE.length) || 'index.html';
    requested.push(rel);
    const file = path.resolve(dir, rel);
    if (!file.startsWith(dir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      problems.push(`not found in dist: ${rel}`);
      return route.fulfill({ status: 404, body: '' });
    }
    return route.fulfill({
      status: 200,
      headers: { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Content-Security-Policy': CSP },
      body: fs.readFileSync(file),
    });
  });

  await page.goto(ORIGIN + BASE);
  try {
    await page.waitForSelector('canvas', { timeout: 10000 });
  } catch {
    problems.push('no canvas');
  }
  // The game fetches its atlases right after setup; give it a moment.
  await page.waitForTimeout(1500);
  if (!requested.includes('assets/player.json')) problems.push('assets/player.json was not requested');
} finally {
  await browser.close();
}

const aborted = requested.filter((r) => r.startsWith('aborted '));
console.log(`requests: ${requested.length - aborted.length} served, ${aborted.length} aborted`);
aborted.forEach((r) => console.log(`  ${r}`));
if (problems.length) {
  problems.forEach((p) => console.error(`FAIL: ${p}`));
  process.exit(1);
}
console.log('PASS: canvas, assets/player.json requested, no page error, no CSP violation');
