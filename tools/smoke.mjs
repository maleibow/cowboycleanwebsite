// Headless smoke test: node tools/smoke.mjs
// Serves the repo, loads cleaningup3d.html, plays 10 s with scripted input, fails on any
// console error / page error, checks resize, saves remake/shots/smoke.png.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error("require('playwright') failed: " + e.message); process.exit(2); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const failures = [];
const fail = (m) => { failures.push(m); console.error('FAIL: ' + m); };
const isExternal = (u) => u && !u.startsWith(`http://127.0.0.1:${port}`); // e.g. Google Fonts

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  if (isExternal(m.location().url)) return; // offline sandbox may block fonts.googleapis.com
  fail('console error: ' + m.text());
});
page.on('pageerror', (e) => fail('page error: ' + e.message));
page.on('requestfailed', (r) => { if (!isExternal(r.url())) fail('request failed: ' + r.url()); });

await page.goto(`http://127.0.0.1:${port}/cleaningup3d.html?debug=1&seed=1&god=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 }).catch(() => fail('__game never became ready'));

const f0 = await page.evaluate(() => window.__game.frames);
const t0 = Date.now();
// Scripted input for 10 s: run right, hop, spray, bomb.
for (let i = 0; i < 20; i++) {
  await page.keyboard.down('KeyD'); await page.keyboard.press('Space'); await page.keyboard.down('KeyJ');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyJ'); await page.keyboard.press('KeyK');
  await page.keyboard.up('KeyD'); await page.keyboard.down('KeyA');
  await page.waitForTimeout(250);
  await page.keyboard.up('KeyA');
}
const secs = (Date.now() - t0) / 1000;
const info = await page.evaluate(() => ({ frames: window.__game.frames, steps: window.__game.simSteps, state: window.__game.state,
  calls: window.__game.drawCalls, fps: window.__game.fps, scale: window.__game.quality.scale, tier: window.__game.quality.tier.name }));
const fps = (info.frames - f0) / secs;
console.log(`state=${info.state} tier=${info.tier} frames=${info.frames} avgFPS=${fps.toFixed(1)} panelFPS=${info.fps} calls=${info.calls} resScale=${info.scale}`);
if (info.state !== 'PLAYING') fail('state is ' + info.state);
// Headless Chromium rasterises on the CPU (SwiftShader), so this only catches stalls, not GPU performance.
if (fps < 5) fail(`frame rate too low even for software GL: ${fps.toFixed(1)}`);
if (info.steps < info.frames) fail('simulation barely stepped: ' + info.steps);
if (!(info.calls > 0 && info.calls <= 200)) fail('draw calls out of budget: ' + info.calls);

// Resize: canvas must stay 16:9 and fill its box.
for (const [w, h] of [[800, 800], [1000, 400], [1920, 1080]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const c = document.getElementById('game').getBoundingClientRect(); const b = document.getElementById('game-scale-box').getBoundingClientRect();
    const g = window.__game.gfx; return { cw: c.width, ch: c.height, bw: b.width, bh: b.height, gw: g.width, gh: g.height, bufW: document.getElementById('game').width };
  });
  const ratio = r.cw / r.ch;
  if (Math.abs(ratio - 16 / 9) > 0.02) fail(`${w}x${h}: canvas ratio ${ratio.toFixed(3)}`);
  if (r.cw > w + 1 || r.ch > h + 1) fail(`${w}x${h}: canvas overflows viewport`);
  if (Math.abs(r.gw - Math.floor(r.bw)) > 1) fail(`${w}x${h}: renderer width ${r.gw} != box ${r.bw}`);
  if (r.bufW < r.gw * 0.6) fail(`${w}x${h}: drawing buffer too small (${r.bufW})`);
  console.log(`resize ${w}x${h}: canvas ${r.cw.toFixed(0)}x${r.ch.toFixed(0)} buffer ${r.bufW}`);
}
await page.setViewportSize({ width: 960, height: 540 });
await page.waitForTimeout(500);
fs.mkdirSync(path.join(root, 'remake/shots'), { recursive: true });
const shot = path.join(root, 'remake/shots/smoke.png');
await page.screenshot({ path: shot });
console.log('screenshot: ' + shot);

await browser.close(); server.close();
if (failures.length) { console.error(`\nSMOKE FAILED (${failures.length})`); process.exit(1); }
console.log('SMOKE PASSED');
