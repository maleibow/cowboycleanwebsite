// Robustness + settings + accessibility checks: node tools/smokeRobust.mjs
//  - WebGL context loss and restore (the game pauses, shows a notice, draws again), tab hide / show, resize and orientation flips
//  - audio unlock on a tap / touchend, and again after the context is interrupted
//  - settings saved in localStorage and applied after a reload: master volume, quality override, reduced motion, pickup shapes,
//    remapped keys (through the real Settings screen), corrupt storage ignored
//  - reduced motion really removes shake / hit-stop / flash; every power-up has a distinct silhouette
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
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=user-gesture-required'] });
const open = async (q, ctxOpts = {}, init) => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 }, ...ctxOpts }), pg = await ctx.newPage();
  pg.on('console', (m) => { if (m.type() === 'error' && !isExt(m.location().url)) fail('console error: ' + m.text()); });
  pg.on('pageerror', (e) => fail('page error: ' + e.message));
  if (init) await pg.addInitScript(init);
  await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?${q}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 90000 });
  return { ctx, pg };
};
const Q = 'stage=1&seed=1&intro=0&quality=low&dynres=0';

// ---------------------------------------------------------------- 1. WebGL context loss
{
  const { ctx, pg } = await open(Q);
  await pg.waitForTimeout(300);
  const before = await pg.evaluate(() => ({ state: window.__game.state, frames: window.__game.frames }));
  await pg.evaluate(() => { const c = document.getElementById('game'), gl = c.getContext('webgl2') || c.getContext('webgl'); window.__lose = gl.getExtension('WEBGL_lose_context'); window.__lose.loseContext(); });
  await pg.waitForFunction(() => window.__game.gfx.lost === true, null, { timeout: 5000 }).catch(() => fail('context loss was not noticed'));
  const mid = await pg.evaluate(() => ({ state: window.__game.state, overlay: getComputedStyle(document.getElementById('gl-lost')).display, text: document.getElementById('gl-lost').innerText }));
  console.log('context lost: ' + JSON.stringify(mid));
  ok(mid.state === 'PAUSED', 'losing the context while playing should pause (state ' + mid.state + ')');
  ok(mid.overlay === 'flex' && /GRAPHICS/i.test(mid.text), 'a "graphics reset" notice should be shown');
  await pg.evaluate(() => window.__lose.restoreContext());
  await pg.waitForFunction(() => window.__game.gfx.lost === false, null, { timeout: 8000 }).catch(() => fail('context never restored'));
  await pg.evaluate(() => window.__game.flow.go('PLAYING'));
  await pg.waitForTimeout(1500);
  const after = await pg.evaluate(() => { const g = window.__game; g.gfx.render(g.world.scene, g.world.camera); const c = document.getElementById('game'), t = document.createElement('canvas'); t.width = 64; t.height = 36; const x = t.getContext('2d'); x.drawImage(c, 0, 0, 64, 36); const d = x.getImageData(0, 0, 64, 36).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) lit++; return { overlay: getComputedStyle(document.getElementById('gl-lost')).display, calls: g.gfx.renderer.info.render.calls, lit, state: g.state, frames: g.frames }; });
  console.log('context restored: ' + JSON.stringify(after));
  ok(after.overlay === 'none', 'the notice should go away once the context is back');
  ok(after.calls > 10 && after.lit > 200, `the scene should draw again after a restore (calls ${after.calls}, lit pixels ${after.lit})`);
  await pg.screenshot({ path: path.join(root, 'remake/shots/robust_after_context_restore.png') });
  await ctx.close();
}

// ---------------------------------------------------------------- 2. tab hide / show, resize, orientation
{
  const { ctx, pg } = await open(Q, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  await pg.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hidden === true }); });
  await pg.evaluate(() => { window.__hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
  await pg.waitForTimeout(200);
  const hid = await pg.evaluate(() => ({ state: window.__game.state, running: window.__game.loop.running }));
  ok(hid.state === 'PAUSED' && !hid.running, 'hiding the tab should pause the game and stop the loop: ' + JSON.stringify(hid));
  await pg.evaluate(() => { window.__hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  await pg.waitForTimeout(300);
  const sh = await pg.evaluate(() => ({ state: window.__game.state, running: window.__game.loop.running, f: window.__game.frames }));
  await pg.waitForTimeout(600);
  const f2 = await pg.evaluate(() => window.__game.frames);
  ok(sh.running && f2 > sh.f, 'the loop should resume when the tab is shown again');
  ok(sh.state === 'PAUSED', 'the game stays paused until the player resumes (state ' + sh.state + ')');
  console.log(`tab hide/show: ${JSON.stringify(hid)} -> ${JSON.stringify(sh)}`);
  await pg.evaluate(() => window.__game.flow.go('PLAYING'));
  const sizes = [[390, 844], [844, 390], [667, 375], [1280, 720], [320, 568], [844, 390]];
  for (const [w, h] of sizes) {
    await pg.setViewportSize({ width: w, height: h }); await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => { const g = window.__game, b = document.getElementById('game-scale-box').getBoundingClientRect(), c = document.getElementById('game'); return { gw: g.gfx.width, gh: g.gfx.height, bw: Math.floor(b.width), bh: Math.floor(b.height), buf: c.width, rot: getComputedStyle(document.getElementById('rotate-prompt')).display, state: g.state, ar: g.world.camera.aspect }; });
    const portrait = h > w * 1.15;
    ok(Math.abs(r.gw - r.bw) <= 1 && Math.abs(r.gh - r.bh) <= 1, `${w}x${h}: renderer ${r.gw}x${r.gh} does not match the box ${r.bw}x${r.bh}`);
    ok(Math.abs(r.ar - r.gw / r.gh) < 0.02, `${w}x${h}: camera aspect ${r.ar.toFixed(2)} stale`);
    ok((r.rot !== 'none') === portrait, `${w}x${h}: rotate prompt ${r.rot} (portrait ${portrait})`);
    if (portrait) ok(r.state === 'PAUSED', `${w}x${h}: turning the phone upright should pause (state ${r.state})`);
    if (portrait) await pg.evaluate(() => window.__game.flow.name === 'PAUSED' && window.__game.flow.go('PLAYING'));
  }
  console.log('resize / orientation: ok');
  await ctx.close();
}

// ---------------------------------------------------------------- 3. audio unlock
{
  const { ctx, pg } = await open(Q, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  const a0 = await pg.evaluate(() => ({ ready: window.__game.sfx.synth.ready, state: window.__game.sfx.synth.ctx?.state ?? 'none' }));
  await pg.touchscreen.tap(400, 150); await pg.waitForTimeout(500);
  const a1 = await pg.evaluate(() => ({ ready: window.__game.sfx.synth.ready, state: window.__game.sfx.synth.ctx?.state ?? 'none' }));
  console.log(`audio: before tap ${JSON.stringify(a0)}, after tap ${JSON.stringify(a1)}`);
  ok(!a0.ready, 'audio must not start before a user gesture');
  ok(a1.ready, 'a tap should unlock audio: ' + JSON.stringify(a1));
  await pg.evaluate(() => window.__game.sfx.synth.ctx.suspend()); await pg.waitForTimeout(200);
  await pg.touchscreen.tap(400, 150); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => window.__game.sfx.synth.ready), 'audio should come back after the context was suspended (a call, the lock screen)');
  await ctx.close();
}

// ---------------------------------------------------------------- 4. settings: saved, applied after reload, remapped through the real screen
{
  const { ctx, pg } = await open('stage=1&seed=1&intro=0&god=1&dynres=0');           // no ?quality: the saved choice must apply
  // open the Settings screen from the pause menu, change things through the UI
  await pg.evaluate(() => window.__game.flow.go('PAUSED'));
  await pg.evaluate(() => [...document.querySelectorAll('#ui div')].find((d) => d.textContent === 'SETTINGS' && d.getAttribute('role') === 'button').click());
  await pg.waitForTimeout(200);
  ok(await pg.evaluate(() => window.__game.flow.settingsPanel.open), 'the SETTINGS button in the pause menu should open the settings screen');
  const click = (label, nth = 0) => pg.evaluate(([label, nth]) => { const els = [...document.querySelectorAll('#ui div[role=button]')].filter((d) => d.textContent === label); els[nth].click(); }, [label, nth]);
  await click('MEDIUM'); await click('ON');                                              // quality override, reduced motion ON
  await pg.evaluate(() => { const r = [...document.querySelectorAll('#ui input[type=range]')].find((i) => i.getAttribute('aria-label') === 'Master volume'); r.value = 35; r.dispatchEvent(new Event('input')); });
  await click('COLOUR ONLY');                                                           // shapes off
  // remap JUMP to H: click the JUMP row's first key chip, press H
  await pg.evaluate(() => { const row = [...document.querySelectorAll('#ui div')].find((d) => d.textContent === 'JUMP' && d.parentElement.children.length >= 2); [...row.parentElement.querySelectorAll('div[role=button]')][0].click(); });
  await pg.keyboard.press('KeyH'); await pg.waitForTimeout(100);
  const saved = await pg.evaluate(() => JSON.parse(localStorage.getItem('cc3d_settings')));
  console.log('saved: ' + JSON.stringify(saved));
  ok(saved.quality === 'medium' && saved.reducedMotion === true && Math.abs(saved.master - 0.35) < 0.01 && saved.shapes === false, 'settings were not saved: ' + JSON.stringify(saved));
  ok(saved.keys?.jump?.[0] === 'KeyH', 'remapped JUMP key not saved: ' + JSON.stringify(saved.keys));
  const live = await pg.evaluate(() => ({ tier: window.__game.quality.tier.name, rm: window.__game.input.keys.size }));
  ok(live.tier === 'medium', 'quality override should apply at once (tier ' + live.tier + ')');
  // the remap works through the real input path: hold H -> input.jump; Space no longer jumps
  await pg.evaluate(() => window.__game.flow.go('PLAYING'));
  const j = await pg.evaluate(() => { const g = window.__game, K = g.input.keys; K.add('KeyH'); g.input.update(); const a = g.input.jump; K.delete('KeyH'); K.add('Space'); g.input.update(); const b = g.input.jump; K.clear(); return { h: a, space: b }; });
  ok(j.h && !j.space, 'after remapping, H should jump and Space should not: ' + JSON.stringify(j));
  // reload: everything comes back from localStorage
  await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 90000 });
  const re = await pg.evaluate(() => { const g = window.__game, K = g.input.keys; K.add('KeyH'); g.input.update(); const jump = g.input.jump; K.clear(); return { tier: g.quality.tier.name, jump }; });
  console.log('after reload: ' + JSON.stringify(re));
  ok(re.tier === 'medium' && re.jump, 'settings should survive a reload: ' + JSON.stringify(re));
  // ?quality= beats the saved choice; corrupt storage is ignored
  await pg.evaluate(() => localStorage.setItem('cc3d_settings', '{not json'));
  await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?stage=1&seed=1&intro=0&dynres=0`, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 90000 });
  ok(await pg.evaluate(() => window.__game.input.keys.size === 0 && window.__game.state === 'PLAYING'), 'corrupt saved settings must not break the game');
  await pg.screenshot({ path: path.join(root, 'remake/shots/robust_settings_reload.png') });
  await ctx.close();
}

// ---------------------------------------------------------------- 5. reduced motion removes shake, hit-stop and flash; shapes are distinct
{
  const { ctx, pg } = await open(Q + '&god=1');
  const r = await pg.evaluate(async () => {
    const g = window.__game, W = g.world, out = {}, S = await import('/game3d/core/settings.js'), H = await import('/game3d/core/hitstop.js'), P = await import('/game3d/actors/pickupShapes.js');
    S.setSetting('reducedMotion', false); W.rig.trauma = 0; W.rig.addTrauma(0.5); out.shakeOn = W.rig.trauma;
    H.clearHitStop(); H.addHitStop(0.1); out.stopOn = H.hitStopActive();
    S.setSetting('reducedMotion', true); W.rig.trauma = 0; W.rig.addTrauma(0.9); out.shakeOff = W.rig.trauma;
    H.clearHitStop(); H.addHitStop(0.2); out.stopOff = H.hitStopActive(); W.rig.fovKick = 0; W.rig.kickFov(3); out.kickOff = W.rig.fovKick;
    g.world.rig.camera.updateProjectionMatrix(); S.setSetting('reducedMotion', 'auto');
    const sig = {}, shapes = P.powerShapes(); for (const [k, geo] of Object.entries(shapes)) { geo.computeBoundingBox(); const b = geo.boundingBox, n = geo.attributes.position.count; sig[k] = [n, +(b.max.x - b.min.x).toFixed(2), +(b.max.y - b.min.y).toFixed(2), +(b.max.z - b.min.z).toFixed(2)].join('/'); out.tris = Math.max(out.tris || 0, n / 3); }
    out.sig = sig; out.distinct = new Set(Object.values(sig)).size; out.count = Object.keys(sig).length; return out;
  });
  console.log('reduced motion / shapes: ' + JSON.stringify(r));
  ok(r.shakeOn > 0.3 && r.stopOn, 'shake and hit-stop should work with reduced motion off');
  ok(r.shakeOff === 0 && !r.stopOff && r.kickOff === 0, 'reduced motion must remove shake, hit-stop and FOV kick: ' + JSON.stringify(r));
  ok(r.count === 9 && r.distinct === 9, 'every power-up needs its own silhouette (' + r.distinct + ' distinct of ' + r.count + ')');
  ok(r.tris <= 120, 'pickup shapes should stay cheap (' + r.tris + ' triangles)');
  await ctx.close();
}

await browser.close(); server.close();
if (failures.length) { console.error(`\nROBUSTNESS SMOKE FAILED (${failures.length})`); process.exit(1); }
console.log('ROBUSTNESS SMOKE PASSED');
