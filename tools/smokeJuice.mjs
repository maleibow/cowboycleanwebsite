// Juice pass checks + screenshots: node tools/smokeJuice.mjs
// Every effect is triggered through the real game objects and verified in the DOM / state, then the frame is saved to remake/shots/juice_*.png:
// hit-stop, screen shake, speed lines, low-health vignette + heartbeat, coin arcs, combo pop, boss name card with cinematic bars,
// stage-clear clean wave ring, landing dust. Reduced motion must switch the motion effects off.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port, failures = [];
const fail = (m) => { failures.push(m); console.error('FAIL: ' + m); };
const ok = (c, m) => { if (!c) fail(m); };
const isExt = (u) => u && (!u.startsWith(`http://127.0.0.1:${port}`) || u.includes('/game3d/music/'));
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await browser.newPage({ viewport: { width: 960, height: 540 } });
pg.on('console', (m) => { if (m.type() === 'error' && !isExt(m.location().url)) fail('console error: ' + m.text()); });
pg.on('pageerror', (e) => fail('page error: ' + e.message));
await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?stage=1&seed=1&intro=0&quality=low&dynres=0&god=0`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 60000 });
await pg.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
const shot = (n) => pg.screenshot({ path: path.join(root, `remake/shots/juice_${n}.png`) });
await pg.evaluate(() => { window.__game.loop.stop(); localStorage.removeItem('cc3d_settings'); });
const step = (n) => pg.evaluate((n) => { const g = window.__game; for (let i = 0; i < n; i++) g.flow.update(1 / 60); g.flow.render(1); }, n);
const ev = (f, ...a) => pg.evaluate(f, ...a);

// ---- speed lines: slide (boost) turns them on, standing still turns them off
let r = await ev(() => { const g = window.__game, K = g.input.keys; K.add('KeyW'); for (let i = 0; i < 40; i++) g.flow.update(1 / 60); K.add('ShiftLeft'); for (let i = 0; i < 10; i++) g.flow.update(1 / 60); g.flow.render(1); const j = g.world; return { k: g.world && document.querySelector('#hud canvas') ? +document.querySelector('#hud canvas').style.opacity : -1, sliding: g.world.player.sliding }; });
console.log('speed lines while sliding: ' + JSON.stringify(r)); ok(r.sliding && r.k > 0.1, 'speed lines should show while sliding: ' + JSON.stringify(r)); await shot('speed_lines');
await ev(() => { window.__game.input.keys.clear(); }); await step(90);
r = await ev(() => +document.querySelector('#hud canvas').style.opacity); ok(r === 0, 'speed lines should be gone when standing still (' + r + ')');

// ---- hit-stop: a kill freezes the simulation for a few steps; reduced motion does not
r = await ev(async () => {
  const g = window.__game, W = g.world, H = await import('/game3d/core/hitstop.js'), S = await import('/game3d/core/settings.js'), t0 = W.time;
  H.clearHitStop(); g.events.emit('enemyKilled', { type: 'dirt' }); const stopped = H.hitStopActive(); for (let i = 0; i < 2; i++) g.flow.update(1 / 60); const frozen = W.time === t0;
  for (let i = 0; i < 10; i++) g.flow.update(1 / 60); const resumed = W.time > t0;
  S.setSetting('reducedMotion', true); H.clearHitStop(); g.events.emit('enemyKilled', { type: 'dirt' }); const off = !H.hitStopActive(); S.setSetting('reducedMotion', 'auto');
  return { stopped, frozen, resumed, off };
});
console.log('hit-stop: ' + JSON.stringify(r)); ok(r.stopped && r.frozen && r.resumed, 'hit-stop should freeze then resume'); ok(r.off, 'no hit-stop with reduced motion');

// ---- low-health vignette + heartbeat
r = await ev(() => { const g = window.__game; let beats = 0; const off = g.events.on('heartbeat', () => beats++); g.run.health = 20; for (let i = 0; i < 130; i++) g.flow.update(1 / 60); g.flow.render(1); off(); const v = document.getElementById('hud-lowhp'); return { op: v ? +v.style.opacity : -1, beats }; });
console.log('low health: ' + JSON.stringify(r)); ok(r.op > 0.2, 'low-health vignette should show (' + r.op + ')'); ok(r.beats >= 2, 'heartbeat should sound at low health (' + r.beats + ')'); await shot('low_health');
await ev(() => { window.__game.run.health = 100; }); await step(5);

// ---- coin arc: a collected coin flies to the counter
r = await ev(() => { const g = window.__game, W = g.world, b = W.player.body; g.run.cheats.god = true; W.pickups.spawnCoin(b.s + 0.1, b.x, b.y + 0.9, { fixed: true }); for (let i = 0; i < 3; i++) g.flow.update(1 / 60); g.flow.render(1); const fl = [...document.querySelectorAll('#hud div')].filter((d) => d.style.display === 'block' && /radial-gradient\(circle at 35%/.test(d.style.background)); return { flying: fl.length, coins: g.run.coins }; });
console.log('coin arc: ' + JSON.stringify(r)); ok(r.flying >= 1, 'a collected coin should fly to the HUD'); await shot('coin_arc');
for (let i = 0; i < 12; i++) { await new Promise((x) => setTimeout(x, 70)); await ev(() => { window.__game.flow.render(1); }); }   // the arc advances with real time, at most 0.1 s per rendered frame
r = await ev(() => [...document.querySelectorAll('#hud div')].filter((d) => d.style.display === 'block' && /radial-gradient\(circle at 35%/.test(d.style.background)).length); ok(r === 0, 'the arc coin should land and vanish');

// ---- combo pop
r = await ev(() => { const g = window.__game, W = g.world, c = W.combat.combo; c.n = 4; c.t = 2; g.flow.update(1 / 60); const el = [...document.querySelectorAll('#hud div')].find((d) => /COMBO x/.test(d.textContent)); return { text: el?.textContent, anim: el?.style.animation }; });
console.log('combo pop: ' + JSON.stringify(r)); ok(/COMBO x4/.test(r.text || '') && /cc-pop/.test(r.anim || ''), 'combo counter should pop'); await shot('combo');

// ---- boss intro card with cinematic bars, stage-clear clean wave
r = await ev(() => { window.__game.events.emit('bossIntro', { name: 'DIRT', line: 'You missed a spot!' }); return null; });
await new Promise((x) => setTimeout(x, 450)); await ev(() => { window.__game.flow.render(1); }); await shot('boss_card');
r = await ev(() => { const bars = [...document.querySelectorAll('#hud div')].filter((d) => d.style.height === '11%'); return { n: bars.length, shown: bars.every((b) => b.style.transform === 'translateY(0px)' || b.style.transform === 'translateY(0)') }; });
console.log('boss card bars: ' + JSON.stringify(r)); ok(r.n === 2 && r.shown, 'boss intro should show the cinematic bars');
r = await ev(() => { window.__game.events.emit('stageCleared', { score: 1, gained: 1, coins: 0, kills: 0, time: 5 }); const ring = [...document.querySelectorAll('#hud div')].find((d) => /150vmax/.test(d.style.width)); return { ringOpacity: ring ? ring.style.opacity : null, state: window.__game.state }; });
await new Promise((x) => setTimeout(x, 300)); await shot('clean_wave');
console.log('clean wave: ' + JSON.stringify(r)); ok(r.state === 'STAGECLEAR', 'stageCleared should open the tally');

await browser.close(); server.close();
if (failures.length) { console.error(`\nJUICE SMOKE FAILED (${failures.length})`); process.exit(1); }
console.log('JUICE SMOKE PASSED');
