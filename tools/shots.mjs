// Art-kit screenshots: node tools/shots.mjs [url-query]
// Teleports the look-dev hero to three points on stage 1 and saves remake/shots/stage1_*.png,
// printing draw-call / triangle counts for the PLAN 4.1 budget check.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const query = process.argv[2] || 'debug=1&seed=1&god=1&autorun=0';
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { if (!m.location().url?.includes('googleapis')) errs.push(m.type() + ': ' + m.text()); } }); page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/cleaningup3d.html?lookdev=1&${query}`);
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 20000 });
const out = path.join(root, 'remake/shots'); fs.mkdirSync(out, { recursive: true });
const shots = JSON.parse(process.env.SHOTS || '[{"name":"a","s":6,"wait":1200},{"name":"b","s":38,"act":"jump","wait":260},{"name":"c","s":150,"hold":["KeyJ"],"run":1,"wait":900}]');
for (const sh of shots) {
  await page.evaluate((s) => window.__game.world.teleport(s.s, s.x || 0), sh);
  for (const k of sh.hold || []) await page.keyboard.down(k);
  if (sh.run) await page.keyboard.down('KeyW');
  if (sh.inspect) await page.evaluate((i) => { window.__game.world.inspect = i; }, sh.inspect); else await page.evaluate(() => { window.__game.world.inspect = null; });
  await page.evaluate((f) => { const w = window.__game.world; w.force = f || null; }, sh.force);
  if (sh.act) await page.evaluate((a) => { const w = window.__game.world; if (a === 'jump') w.jump(); if (a === 'hurt') w.hero.anim.hurt(); if (a === 'victory') w.hero.anim.victory(true); if (a === 'shoot') w.hero.anim.shoot(); }, sh.act);
  if (sh.horse !== undefined) await page.evaluate((h) => window.__game.world.hero.setVehicle(h), sh.horse);
  for (const k of sh.keys || []) { await page.keyboard.down(k); await page.waitForTimeout(sh.keyMs || 120); await page.keyboard.up(k); }
  await page.waitForTimeout(sh.wait || 800);
  const info = await page.evaluate(() => { const i = window.__game.gfx.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, fps: window.__game.fps, parts: window.__game.world.particles.live }; });
  await page.screenshot({ path: path.join(out, `stage1_${sh.name}.png`) });
  console.log(sh.name, JSON.stringify(info));
  for (const k of sh.hold || []) await page.keyboard.up(k);
  if (sh.run) await page.keyboard.up('KeyW');
}
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no console errors');
await browser.close(); server.close();
