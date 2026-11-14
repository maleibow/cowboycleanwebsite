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


// ---------------------------------------------------------------------------------------------
// Track / platformer checks (prompt 1)
// ---------------------------------------------------------------------------------------------
const gen = await import('../game3d/world/generator.js');
const { getStage } = await import('../game3d/data/stages.js');
{ // 1. layout rules hold across many seeds; different seeds give different layouts
  let bad = 0;
  for (let sd = 0; sd < 300; sd++) { const l = gen.generateStage(getStage(1), sd), e = gen.validateStage(l, getStage(1)); if (e.length) { bad++; fail(`seed ${sd}: ${e.join('; ')}`); } }
  const sig = (sd) => gen.generateStage(getStage(1), sd).segments.map((g) => g.name + g.len).join();
  if (sig(1) === sig(2) || sig(1) !== sig(1)) fail('seed does not change / fix the layout');
  console.log(`layout: 300 seeds validated (${bad} bad), seed 1 vs 2 differ: ${sig(1) !== sig(2)}`);
}

const url = (q) => `http://127.0.0.1:${port}/cleaningup3d.html?${q}`;
const fresh = async (q, init) => {
  const pg = await browser.newPage({ viewport: { width: 960, height: 540 } });
  pg.on('console', (m) => { if (m.type() === 'error' && !isExternal(m.location().url)) fail('console error: ' + m.text()); });
  pg.on('pageerror', (e) => fail('page error: ' + e.message));
  if (init) await pg.addInitScript(init);
  await pg.goto(url(q), { waitUntil: 'load' });
  await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  await pg.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
  return pg;
};
const S = (pg) => pg.evaluate(() => window.__game.world.player.body.s);

{ // 2. real keyboard through the real loop: hold forward, hop periodically, s must increase
  const pg = await fresh('stage=1&seed=1&god=1');
  const s0 = await S(pg);
  for (let i = 0; i < 12; i++) { await pg.keyboard.down('KeyW'); await pg.keyboard.press('Space'); await pg.waitForTimeout(700); }
  await pg.keyboard.up('KeyW');
  const s1 = await S(pg);
  console.log(`keyboard: hold W + hop, s ${s0.toFixed(1)} -> ${s1.toFixed(1)}`);
  if (!(s1 > s0 + 15)) fail(`player s did not increase with forward held (${s0} -> ${s1})`);
  await pg.close();
}

{ // 3. real gamepad path: stick forward + A periodically (fake Gamepad API)
  const pg = await fresh('stage=1&seed=1&god=1', () => {
    window.__pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [window.__pad];
  });
  const s0 = await S(pg);
  for (let i = 0; i < 12; i++) {
    await pg.evaluate(() => { window.__pad.axes[1] = -1; window.__pad.buttons[0].pressed = true; });
    await pg.waitForTimeout(150);
    await pg.evaluate(() => { window.__pad.buttons[0].pressed = false; });
    await pg.waitForTimeout(550);
  }
  const s1 = await S(pg);
  console.log(`gamepad: stick forward + A, s ${s0.toFixed(1)} -> ${s1.toFixed(1)}`);
  if (!(s1 > s0 + 15)) fail(`gamepad: player s did not increase (${s0} -> ${s1})`);
  await pg.close();
}

{ // 4. gaps kill and respawn; the low barrier needs a slide
  const pg = await fresh('stage=1&seed=1'); // no god: pit damage must apply
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, out = {};
    const segs = W.layout.segments, gapSeg = segs.find((x) => x.name === 'gap'), barSeg = segs.find((x) => x.name === 'barrier');
    const run = (n, keys) => { K.clear(); keys.forEach((k) => K.add(k)); window.__bot.step(n); K.clear(); };
    // gap: run straight in without jumping
    P.teleport(gapSeg.gaps[0].s0 - 6); const f0 = P.pitFalls, hp0 = window.__game.run.health;
    const off = g.events.on('respawn', () => { if (out.gapRespawnS === undefined) { out.gapRespawnS = B.s; out.hpAfterPit = window.__game.run.health - hp0; } }); run(180, ['KeyW']); off();
    out.gapFell = P.pitFalls - f0; out.gapS0 = gapSeg.gaps[0].s0; window.__game.run.health = 100; P.invuln = 0;
    // barrier without sliding: blocked
    const bar = barSeg.boxes.find((x) => x.kind === 'barrier');
    P.teleport(bar.s0 - 8); run(240, ['KeyW']); out.blockedS = B.s; out.barS0 = bar.s0;
    // barrier with a slide
    P.teleport(bar.s0 - 8); K.add('KeyW');
    for (let i = 0; i < 240; i++) { if (B.s > bar.s0 - 3 && B.s < bar.s0 - 2.5) K.add('ShiftLeft'); else K.delete('ShiftLeft'); window.__bot.step(1); }
    K.clear(); out.slidS = B.s; out.barS1 = bar.s1;
    // duck (stand still, hold slide) is lower than standing
    P.teleport(4); K.add('ShiftLeft'); window.__bot.step(10); out.duckH = B.h; K.clear(); window.__bot.step(10); out.standH = B.h;
    return out;
  });
  console.log('events: ' + JSON.stringify(r));
  if (r.gapFell < 1) fail('running into a gap did not trigger a pit fall');
  if (!(r.gapRespawnS < r.gapS0 && r.gapRespawnS > r.gapS0 - 8)) fail('respawn after a pit is not before the gap');
  if (r.hpAfterPit !== -20) fail(`pit fall should cost 20 health, cost ${-r.hpAfterPit}`);
  if (!(r.blockedS < r.barS0)) fail('low barrier did not block a standing player');
  if (!(r.slidS > r.barS1)) fail('sliding did not get the player under the low barrier');
  if (!(r.duckH < 1.2 && r.standH > 1.7)) fail(`duck/stand hitbox heights wrong (${r.duckH}, ${r.standH})`);
  await pg.close();
}

for (const sd of [1, 2, 3, null]) { // 5. a scripted player can finish the whole stage; camera modes change without clipping
  const pg = await fresh('stage=1&god=1' + (sd ? `&seed=${sd}` : ''));
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, bot = window.__bot.make(), modes = new Set(), cam = W.rig;
    let steps = 0, maxSide = 0, maxToward = 0, maxLive = 0;
    while (!W.finished && steps < 60 * 300) {
      window.__bot.step(1, bot); steps++;
      modes.add(cam.mode); maxSide = Math.max(maxSide, cam.weights.sideW); maxToward = Math.max(maxToward, cam.weights.towardW);
      maxLive = Math.max(maxLive, W.builder.live.size);
    }
    return { finished: W.finished, secs: steps / 60, s: W.player.body.s, len: W.layout.length, modes: [...modes], maxSide, maxToward,
      minClear: cam.minClearance, pit: W.player.pitFalls, built: W.builder.built, disposed: W.builder.disposed, maxLive, segs: W.layout.segments.length, seed: W.seed };
  });
  console.log(`run seed=${r.seed}: ` + JSON.stringify(r));
  if (!r.finished) fail(`seed ${r.seed}: scripted run never reached the boss gate (s=${r.s.toFixed(0)})`);
  if (r.secs < 100 || r.secs > 170) fail(`seed ${r.seed}: run took ${r.secs.toFixed(0)} s, expected ~2 minutes`);
  if (!(r.maxSide > 0.9 && r.maxToward > 0.9)) fail(`seed ${r.seed}: camera did not reach side/toward modes`);
  if (r.minClear < 0.9) fail(`seed ${r.seed}: camera clipped the ground (clearance ${r.minClear})`);
  if (r.disposed < r.built - r.maxLive - 1 || r.maxLive > 8) fail(`seed ${r.seed}: windowed builder not disposing (built ${r.built}, disposed ${r.disposed}, live<=${r.maxLive})`);
  await pg.close();
}

await browser.close(); server.close();
if (failures.length) { console.error(`\nSMOKE FAILED (${failures.length})`); process.exit(1); }
console.log('SMOKE PASSED');
