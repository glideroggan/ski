// Plays a built copy of the game under the Content-Security-Policy Deployer's edge sends on /deployer-api/, which is the
// address an on-demand game is reached on after its wake. Nothing listens: the files are served by page.route and every
// other request is aborted, so a script or asset from a CDN fails the check instead of loading.
//
//   node tests/csp-check.mjs [dir]     dir = a built copy of dist (default: dist)
//
// Passes when the bundle is strict, the page has a canvas, asked for assets/player.json, the skier turns on an arrow key,
// and a restart after a crash draws the skier and obstacles while the pod sleeps (Deployer spins it down after 2 minutes
// even with the page open, and then answers every request with its loading page: status 200, HTML). No page error, no
// console.error and no CSP violation at any point.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(process.argv[2] ?? path.join(root, 'dist'));
const ORIGIN = 'http://deployer.test';
const BASE = '/deployer-api/service/game-ski/';

// The "deployer" policy and the report suffix of ops/edge/nginx-csp-report-only.sh in Deployer.
const CSP = "default-src 'self'; script-src 'self'; "
  + "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://netdna.bootstrapcdn.com; "
  + "font-src 'self' https://fonts.gstatic.com https://netdna.bootstrapcdn.com; img-src 'self' data:; connect-src 'self'; "
  + "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; "
  + 'report-uri https://nyviken.se/deployer-api/csp-report; report-to csp-endpoint';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.map': 'application/json' };
const LOADING_PAGE = '<!doctype html><html><body>Starting the app</body></html>';
const GAME_OVER_TIMEOUT_MS = 180000;

if (!fs.existsSync(path.join(dir, 'index.html'))) {
  console.error(`FAIL: no index.html in ${dir}; build first (NODE_ENV=production yarn build)`);
  process.exit(2);
}

// How a sprite shows up in a drawImage call: the sheet's size and the frame's place on it.
const atlas = (name) => JSON.parse(fs.readFileSync(path.join(dir, 'assets', `${name}.json`), 'utf8'));
const sheetOf = (a) => `${a.meta.size.w}x${a.meta.size.h}:`;
const spriteOf = (a, name) => {
  const { x, y, w, h } = a.frames.find((f) => f.filename === name).frame;
  return `${sheetOf(a)}${x},${y},${w},${h}`;
};
const playerAtlas = atlas('player');
const SKIER_DOWN = spriteOf(playerAtlas, 'skiier down.png');
const SKIER_RIGHT = [spriteOf(playerAtlas, 'skiier right down.png'), spriteOf(playerAtlas, 'skiier right.png')];
const OBSTACLE_SHEET = sheetOf(atlas('obstacles'));

const problems = [];
const requested = [];
const logged = [];
let podAsleep = false;
let asleepAnswers = 0;

// A directive only counts at the very start of a file, so a banner in front of it would switch strict mode off.
if (!fs.readFileSync(path.join(dir, 'sketch.js'), 'utf8').startsWith('"use strict";')) {
  problems.push('sketch.js does not start with "use strict";');
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) =>
      (window).reportCspViolation(`${e.violatedDirective} ${e.blockedURI} ${e.sourceFile}:${e.lineNumber}`));
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    window.spritesDrawn = new Set();
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...rest) {
      if (rest.length === 8) window.spritesDrawn.add(`${source.width}x${source.height}:${rest.slice(0, 4).join(',')}`);
      return draw.call(this, source, ...rest);
    };
  });
  await page.exposeFunction('reportCspViolation', (v) => problems.push(`CSP violation: ${v}`));
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('console', (m) => {
    logged.push(m.text());
    if (/Content Security Policy/i.test(m.text())) problems.push(`CSP console: ${m.text()}`);
    else if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });

  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN || !url.pathname.startsWith(BASE)) {
      requested.push(`aborted ${url.origin}${url.pathname}`);
      return route.abort();
    }
    const rel = url.pathname.slice(BASE.length) || 'index.html';
    requested.push(rel);
    if (podAsleep) {
      asleepAnswers++;
      return route.fulfill({ status: 200, headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': CSP }, body: LOADING_PAGE });
    }
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

  const drawn = (test) => page.evaluate((t) => [...window.spritesDrawn].some((s) => t.some((p) => s.startsWith(p))), test);
  const waitUntil = async (check, timeoutMs) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      if (await check()) return true;
      await page.waitForTimeout(100);
    }
    return false;
  };

  await page.goto(ORIGIN + BASE);
  try {
    await page.waitForSelector('canvas', { timeout: 10000 });
    // The game fetches its atlases right after setup.
    if (!await waitUntil(() => drawn([SKIER_DOWN]), 10000)) problems.push('the skier was not drawn after load');
    if (!requested.includes('assets/player.json')) problems.push('assets/player.json was not requested');

    await page.keyboard.down('ArrowRight');
    if (!await waitUntil(() => drawn(SKIER_RIGHT), 5000)) problems.push('the skier did not turn on the right arrow');
    await page.keyboard.up('ArrowRight');

    // Straight down at full speed until a crash; R only restarts from the game over screen.
    await page.keyboard.down('ArrowDown');
    if (await waitUntil(async () => logged.includes('Game over!'), GAME_OVER_TIMEOUT_MS)) {
      await page.keyboard.up('ArrowDown');
      podAsleep = true;
      await page.evaluate(() => window.spritesDrawn.clear());
      await page.keyboard.press('r');
      if (!await waitUntil(async () => logged.includes('Game reset'), 5000)) problems.push('R did not restart the game');
      if (!await waitUntil(() => drawn([SKIER_DOWN]), 5000)) problems.push('no skier after the restart while the pod sleeps');
      if (!await waitUntil(() => drawn([OBSTACLE_SHEET]), 15000)) problems.push('no obstacles after the restart while the pod sleeps');
    } else {
      problems.push(`no game over within ${GAME_OVER_TIMEOUT_MS / 1000} s`);
    }
  } catch (e) {
    problems.push(`no canvas: ${e.message.split('\n')[0]}`);
  }
} finally {
  await browser.close();
}

const aborted = requested.filter((r) => r.startsWith('aborted '));
console.log(`requests: ${requested.length - aborted.length} served, ${aborted.length} aborted; answered asleep: ${asleepAnswers}`);
aborted.forEach((r) => console.log(`  ${r}`));
if (problems.length) {
  problems.forEach((p) => console.error(`FAIL: ${p}`));
  process.exit(1);
}
console.log('PASS: strict bundle, skier turns, restart draws skier and obstacles while the pod sleeps, no page error, no console.error, no CSP violation');
