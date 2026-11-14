// Load benchmark: 30 enemies + 200+ projectiles, several runs.  node tools/stress.mjs [serveRoot] [runs]
// Reports the median per-frame cost (ms) of simulation + scene update (headless is CPU-rendered, so GL time is not measured)
// plus draw calls and triangles with everything on screen. Run it on two checkouts to compare before/after.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..')), RUNS = +process.argv[3] || 5;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const res = [];
for (let run = 0; run < RUNS; run++) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await pg.goto(`http://127.0.0.1:${server.address().port}/cleaningup3d.html?stage=1&seed=1&debug=1&god=1`);
  await pg.waitForFunction(() => window.__game?.ready, null, { timeout: 30000 });
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world; W.spawner.enabled = false; W.enemies.clear(); W.projectiles.clear(); W.debug.spawnEnemies(30);
    const t = []; let peakShots = 0;
    for (let i = 0; i < 600; i++) {
      if (i % 10 === 0) { W.debug.spawnEnemies(Math.max(0, 30 - W.enemies.count)); W.debug.shoot(100); }
      const a = performance.now(); g.input.update(); W.update(1 / 60, g.input); W.render(0.5); t.push(performance.now() - a); peakShots = Math.max(peakShots, W.projectiles.count());
    }
    const s = t.slice(60).sort((a, b) => a - b), mean = s.reduce((x, y) => x + y, 0) / s.length;
    return { mean, p50: s[s.length >> 1], p95: s[Math.floor(s.length * 0.95)], peakShots };
  });
  await pg.keyboard.press('Digit5'); await pg.waitForTimeout(600);
  const gl = await pg.evaluate(() => { const i = window.__game.gfx.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, shots: window.__game.world.projectiles.count() }; });
  res.push({ ...r, ...gl }); await pg.close();
}
const med = (k) => res.map((r) => r[k]).sort((a, b) => a - b)[res.length >> 1];
console.log(JSON.stringify({ root: path.basename(root), runs: RUNS, mean_ms: +med('mean').toFixed(3), p50_ms: +med('p50').toFixed(3), p95_ms: +med('p95').toFixed(3), peakShots: med('peakShots'), calls: med('calls'), tris: med('tris'), all_mean: res.map((r) => +r.mean.toFixed(2)) }));
await browser.close(); server.close();
