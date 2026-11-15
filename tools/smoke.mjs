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
const isExternal = (u) => u && (!u.startsWith(`http://127.0.0.1:${port}`) || u.includes('/game3d/music/')); // e.g. Google Fonts; a missing music file is expected (the Jukebox falls back to synth) so its 404 is not a failure

const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  if (isExternal(m.location().url)) return; // offline sandbox may block fonts.googleapis.com
  fail('console error: ' + m.text());
});
page.on('pageerror', (e) => fail('page error: ' + e.message));
page.on('requestfailed', (r) => { if (!isExternal(r.url())) fail('request failed: ' + r.url()); });

await page.goto(`http://127.0.0.1:${port}/cleaningup3d.html?debug=1&seed=1&god=1&title=0`, { waitUntil: 'load' });
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
  await page.waitForFunction(() => Math.abs(window.__game.gfx.width - Math.floor(document.getElementById('game-scale-box').getBoundingClientRect().width)) <= 1, null, { timeout: 5000 }).catch(() => {});   // headless runs at ~5 fps: the resize lands on a later frame
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

const url = (q) => `http://127.0.0.1:${port}/cleaningup3d.html?${q}&intro=0&quality=low`;   // intro=0: the stage intro card has its own test below
const fresh = async (q, init) => {
  const pg = await browser.newPage({ viewport: { width: 960, height: 540 } });
  pg.on('console', (m) => { if (m.type() === 'error' && !isExternal(m.location().url)) fail('console error: ' + m.text()); });
  pg.on('pageerror', (e) => fail('page error: ' + e.message));
  if (init) await pg.addInitScript(init);
  await pg.goto(url(q), { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 60000 });
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
  if (!(s1 > s0 + 10)) fail(`gamepad: player s did not increase (${s0} -> ${s1})`);
  await pg.close();
}

{ // 4. gaps kill and respawn; the low barrier needs a slide
  const pg = await fresh('stage=1&seed=1&foes=0'); // no god: pit damage must apply; no foes: a pure platformer check
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
  const pg = await fresh('stage=1&god=1&foes=0' + (sd ? `&seed=${sd}` : '')); // pure platformer: combat has its own runs below
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


// ---------------------------------------------------------------------------------------------
// Combat checks (prompt 2): weapons, heat, bombs, shield, enemies, pickups, game over, load
// ---------------------------------------------------------------------------------------------
{ // 6. every powerup changes the weapon; heat / overheat; bomb; shield; aim-assist; crates; lasso; grenade
  const pg = await fresh('stage=1&seed=1&debug=1');
  const r = await pg.evaluate(async () => {
    const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, run = g.run, out = {};
    const step = (n) => window.__bot.step(n);
    const clear = () => { W.enemies.clear(); W.projectiles.clear(); W.pickups.clear(); W.obstacles.clear(); W.spawner.next = 1e9; W.spawner.enabled = false; W.weapon.reset(); P.invuln = 0; run.health = 100; };
    const kinds = () => { const m = {}; for (const p of W.projectiles.player) if (p.on) m[p.kind] = (m[p.kind] || 0) + 1; return m; };
    const fireOnce = () => { W.projectiles.clear(); W.weapon.cd = 0; W.weapon.overheated = false; W.weapon.heat = 0; K.add('KeyJ'); step(1); K.delete('KeyJ'); return kinds(); };
    P.teleport(60); step(240); clear(); // let any knock-back settle
    out.normal = fireOnce();
    for (const t of ['super', 'spread', 'fourway', 'homing', 'grenade', 'spin']) { clear(); W.weapon.give(t); out[t] = fireOnce(); }
    clear(); run.upgrades.laser = true; out.laser = fireOnce(); run.upgrades.laser = false;
    clear(); run.upgrades.size = 2; W.weapon.cd = 0; K.add('KeyJ'); step(1); K.delete('KeyJ'); out.sizeHit = W.projectiles.player.find((p) => p.on).hit; run.upgrades.size = 0;
    clear(); W.weapon.cd = 0; K.add('KeyJ'); step(1); K.delete('KeyJ'); out.baseHit = W.projectiles.player.find((p) => p.on).hit;
    // heat: normal gun barely heats (+15 per shot, cools 1.5/frame between shots)
    clear(); K.add('KeyJ'); step(60 * 3); K.delete('KeyJ'); out.heat3s = W.weapon.heat; out.overNormal = W.weapon.overheated;
    // laser upgrade (rate 6 frames) overheats; spray is locked until heat reaches 0 at 0.6/frame
    clear(); run.upgrades.laser = true; K.add('KeyJ'); let at = -1; for (let i = 0; i < 300 && at < 0; i++) { step(1); if (W.weapon.overheated) at = i; }
    out.overheatAt = at / 60; const sh = W.weapon.shots; let lockSteps = 0, shotsLocked = 0; while (W.weapon.overheated && lockSteps < 1000) { step(1); lockSteps++; } shotsLocked = W.weapon.shots - sh;
    K.delete('KeyJ'); run.upgrades.laser = false; out.lockSecs = lockSteps / 60; out.shotsLocked = shotsLocked;
    // aim-assist: a flyer 3.5 m up, 12 m ahead, is hit by a flat spray
    clear(); P.invuln = 99; const v = W.enemies.spawn('vulture', B.s + 12, 0, B.y); v.y = B.y + 3.5; v.speed = 0; v.def = { ...v.def, dive: false }; K.add('KeyJ'); step(120); K.delete('KeyJ'); out.flyerDead = !v.on;
    // kill gives original score (50) and coins; combo counts
    clear(); P.invuln = 99; const sc0 = run.score, d = W.enemies.spawn('dirt', B.s + 8, 0, B.y, { active: true }); d.speed = 0; K.add('KeyJ'); step(60); K.delete('KeyJ'); out.dirtScore = run.score - sc0; out.dirtDead = !d.on;
    // bomb: clears nearby enemies and enemy shots, costs one bomb, edge-triggered
    clear(); run.bombs = 3; for (let i = 0; i < 6; i++) W.enemies.spawn('dirt', B.s + 5 + i, (i - 3) * 0.6, B.y, { active: true });
    W.enemies.spawn('vulture', B.s + 10, 0, B.y, { active: true }); W.projectiles.fireEnemy('bomb', B.s + 6, 0, B.y + 1, 0, 0, 0);
    K.add('KeyK'); step(30); K.delete('KeyK'); out.bomb = { left: W.enemies.count, bombs: run.bombs, shots: W.projectiles.countEnemy() };
    // shield eats a hit, then invulnerability frames protect for 1 s, then 25 damage
    clear(); W.weapon.give('shield'); const c1 = W.enemies.spawn('dirt', B.s, B.x, B.y, { active: true }); c1.speed = 0; step(2);
    out.shield = { hp: run.health, left: W.weapon.shield, inv: P.invuln > 0.9 }; step(30); out.heldInv = run.health; P.invuln = 0; step(2); out.afterShield = run.health;
    // crate holds a powerup and a pickup applies it
    clear(); P.invuln = 99; P.teleport(60); step(240); W.pickups.spawnCrate(B.s + 5, 0, B.y, 'super'); K.add('KeyJ'); K.add('KeyW'); step(100); K.delete('KeyJ'); K.delete('KeyW'); out.superFromCrate = W.weapon.timers.super > 0;
    // lasso upgrade auto-fires at the nearest enemy
    clear(); P.invuln = 99; P.teleport(60); step(240); run.upgrades.lasso = true; const t = W.enemies.spawn('dirt', B.s + 9, 0, B.y, { active: true }); t.speed = 0; step(90); out.lasso = !t.on || t.hp < t.maxHp; run.upgrades.lasso = false;
    // grenade pops into 8 shards
    clear(); P.invuln = 99; W.weapon.give('grenade'); W.weapon.cd = 0; K.add('KeyJ'); step(1); K.delete('KeyJ'); let mx = 0; for (let i = 0; i < 80; i++) { step(1); mx = Math.max(mx, W.projectiles.count()); } out.grenadeShards = mx;
    // shooters: a drone fires enemy shots that hurt for 15
    clear(); P.teleport(60); step(240); P.invuln = 0; run.health = 100; W.projectiles.fireEnemy('laser', B.s + 0.1, B.x, B.y + 1, 0, 0, 0); step(2); out.enemyShotDmg = 100 - run.health;
    return out;
  });
  console.log('combat: ' + JSON.stringify(r));
  const only = (o, k, n) => o && Object.keys(o).length === 1 && o[k] === n;
  if (!only(r.normal, 'normal', 1)) fail('plain spray should be one normal shot: ' + JSON.stringify(r.normal));
  if (!only(r.super, 'super', 1)) fail('super should fire a super shot');
  if (!only(r.spread, 'normal', 3)) fail('spread should fire 3 shots: ' + JSON.stringify(r.spread));
  if (!only(r.fourway, 'normal', 4)) fail('fourway should fire 4 shots: ' + JSON.stringify(r.fourway));
  for (const k of ['homing', 'grenade', 'spin', 'laser']) if (!only(r[k], k, 1)) fail(`${k} powerup/upgrade did not change the shot: ` + JSON.stringify(r[k]));
  if (!(r.sizeHit > r.baseHit * 1.5)) fail('bullet-size upgrade did not enlarge shots');
  if (!(r.heat3s > 10 && r.heat3s < 60 && !r.overNormal)) fail(`normal spray heat after 3 s = ${r.heat3s} (original: slow build, no lock)`);
  if (!(r.overheatAt > 0.8 && r.overheatAt < 2)) fail('laser spray should overheat in ~1.2 s, got ' + r.overheatAt);
  if (r.shotsLocked !== 0) fail('overheated gun still fired ' + r.shotsLocked);
  if (!(r.lockSecs > 2.6 && r.lockSecs < 3.0)) fail('overheat lock should last 100 / 0.6 per frame = 2.8 s, got ' + r.lockSecs);
  if (!r.flyerDead) fail('aim-assisted spray did not hit a flyer 3.5 m up');
  if (!(r.dirtDead && r.dirtScore === 50)) fail(`dirt kill: dead=${r.dirtDead} score=${r.dirtScore} (want 50)`);
  if (!(r.bomb.left === 0 && r.bomb.bombs === 2 && r.bomb.shots === 0)) fail('bomb should clear enemies+shots for one bomb: ' + JSON.stringify(r.bomb));
  if (!(r.shield.hp === 100 && r.shield.left === false && r.shield.inv)) fail('shield should absorb one hit and grant i-frames: ' + JSON.stringify(r.shield));
  if (r.heldInv !== 100) fail('invulnerability frames did not protect for 1 s');
  if (r.afterShield !== 75) fail('contact damage should be 25, hp is ' + r.afterShield);
  if (!r.superFromCrate) fail('soap crate did not release a collectable powerup');
  if (!r.lasso) fail('lasso upgrade did not hit an enemy');
  if (r.grenadeShards < 8) fail('grenade did not burst into shards');
  if (r.enemyShotDmg !== 15) fail('enemy shot damage should be 15, was ' + r.enemyShotDmg);
  await pg.close();
}

{ // 7. all 32 enemy types run every archetype; dying shows the placeholder game over; Enter retries the stage
  const pg = await fresh('stage=1&seed=1&debug=1');
  const r = await pg.evaluate(async () => {
    const g = window.__game, W = g.world, P = W.player, B = P.body, run = g.run, out = {};
    const { ENEMIES } = await import('/game3d/data/enemies.js');
    W.spawner.enabled = false; W.spawner.next = 1e9; W.enemies.clear(); run.cheats.god = true; P.teleport(60); window.__bot.step(240);
    const bad = []; for (const t of Object.keys(ENEMIES)) if (!W.enemies.spawn(t, B.s + 10, 0.5, B.y, { active: true, edgeX: t === 'spider' ? 2 : undefined })) bad.push(t);
    window.__bot.step(60 * 8); for (const e of W.enemies.list) if (![e.s, e.x, e.y].every(Number.isFinite)) bad.push('NaN ' + e.type);
    out.types = Object.keys(ENEMIES).length; out.bad = bad; out.alive = W.enemies.count; out.shooters = W.projectiles.countEnemy() + W.enemies.list.filter((e) => e.def.fire).length;
    W.enemies.clear(); run.cheats.god = false; run.score = 300; run.stageStartScore = 100; run.health = 10; P.invuln = 0; W.combat.damagePlayer(25);
    out.over = { state: g.state, dead: P.dead, hp: run.health };
    return out;
  });
  { const n0 = await pg.evaluate(() => window.__game.simSteps); await pg.waitForFunction((n) => window.__game.simSteps > n + 20, n0, { timeout: 30000 }); }   // Enter is only accepted 0.15 s of simulation time after the card shows; headless runs at ~5 fps
  const overlay = await pg.evaluate(() => [...document.querySelectorAll('#hud div')].some((d) => d.textContent === 'GAME OVER' && getComputedStyle(d.parentElement).display !== 'none'));
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(400);
  const after = await pg.evaluate(() => ({ state: window.__game.state, dead: window.__game.world.player.dead, hp: window.__game.run.health, score: window.__game.run.score, bombs: window.__game.run.bombs, s: window.__game.world.player.body.s }));
  console.log('enemies/gameover: ' + JSON.stringify({ r, overlay, after }));
  if (r.bad.length) fail('enemy types failed: ' + r.bad.join(','));
  if (r.alive !== r.types) fail(`expected all ${r.types} types alive after 8 s, have ${r.alive}`);
  if (!(r.over.state === 'GAMEOVER' && r.over.dead && r.over.hp === 0 && overlay)) fail('dying did not show the game-over screen: ' + JSON.stringify(r.over));
  if (!(after.state === 'PLAYING' && !after.dead && after.hp === 100 && after.score === 100 && after.bombs === 3 && after.s < 10)) fail('Enter did not retry the stage with stageStartScore: ' + JSON.stringify(after));
  await pg.close();
}

{ // 8. load: 30 enemies + 200 projectiles on screen. Headless is CPU-rendered, so assert on simulation cost and draw calls.
  const pg = await fresh('stage=1&seed=1&debug=1&god=1');
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world; W.spawner.enabled = false; W.enemies.clear(); W.projectiles.clear();
    const enemies = W.debug.spawnEnemies(30); let peakShots = 0, peakEnemies = 0; const t = [];
    for (let i = 0; i < 180; i++) {
      if (i % 10 === 0) { W.debug.spawnEnemies(Math.max(0, 30 - W.enemies.count)); W.debug.shoot(100); }
      const a = performance.now(); g.input.update(); W.update(1 / 60, g.input); W.render(0.5); t.push(performance.now() - a);
      peakShots = Math.max(peakShots, W.projectiles.count()); peakEnemies = Math.max(peakEnemies, W.enemies.count);
    }
    t.sort((a, b) => a - b); return { enemies, peakShots, peakEnemies, p50: t[90], p95: t[170], max: t[179] };
  });
  await pg.keyboard.press('Digit5'); await pg.waitForTimeout(800);
  const calls = await pg.evaluate(() => ({ calls: window.__game.drawCalls, n: window.__game.world.enemies.count, shots: window.__game.world.projectiles.count() }));
  console.log('load: ' + JSON.stringify({ ...r, ...calls }));
  if (r.peakEnemies < 30 || r.peakShots < 200) fail(`load test did not reach 30 enemies + 200 shots (${r.peakEnemies}, ${r.peakShots})`);
  if (r.p95 > 8) fail(`simulation + scene update too slow under load: p95 ${r.p95.toFixed(1)} ms`);
  if (calls.calls > 120) fail('draw calls under load: ' + calls.calls);
  await pg.screenshot({ path: path.join(root, 'remake/shots/combat-load.png') });
  await pg.close();
}

{ // 10. sound: unlocks on the first key, every event has a recipe, rapid fire stays under the voice cap, M and the HUD button mute (remembered)
  const pg = await fresh('stage=1&seed=1&debug=1&god=1');
  const before = await pg.evaluate(() => window.__game.sfx.synth.ready);
  await pg.keyboard.press('KeyW'); await pg.waitForTimeout(300);
  const r = await pg.evaluate(async () => {
    const g = window.__game, S = g.sfx.synth, out = { ready: S.ready };
    const names = ['shoot', 'jump', 'hit', 'enemyHit', 'enemyDie', 'bombDrop', 'powerupBlip', 'shieldHit', 'bossSpawn', 'warp', 'coinBlip', 'buy', 'error', 'footstep', 'land', 'slide', 'crateBreak', 'coin', 'powerup', 'overheat', 'gateWhoosh', 'pitFall', 'checkpoint', 'bossSlam', 'shockwave', 'bomb', 'stageClear', 'playerDied', 'shootSuper', 'shootLaser', 'shootHoming', 'shootGrenade', 'shootSpin'];   // the 13 original sounds + the new ones
    let peak = 0, played = 0; const take = S.take; S.take = (d, p) => { const ok = take(d, p); if (ok) played++; return ok; };
    for (let i = 0; i < 400; i++) { g.events.emit('shoot', 'normal'); g.events.emit('coin'); g.events.emit('enemyHit'); g.events.emit('footstep'); peak = Math.max(peak, S.voices); if (i % 50 === 0) await new Promise((r) => setTimeout(r, 30)); }
    out.peakVoices = peak; out.played = played;
    await new Promise((r) => setTimeout(r, 300));
    for (const n of names) { const b = played; g.sfx.play(n, 8); await new Promise((r) => setTimeout(r, 70)); if (played === b) (out.silent ||= []).push(n); }
    S.take = take; return out;
  });
  const m1 = await pg.evaluate(() => window.__game.sfx.muted); await pg.keyboard.press('KeyM'); await pg.waitForTimeout(100);
  const m2 = await pg.evaluate(() => ({ muted: window.__game.sfx.muted, stored: localStorage.getItem('cc3d_muted'), icon: [...document.querySelectorAll('#hud div')].some((d) => d.textContent === '🔇') }));
  await pg.click('#hud div[aria-label="Toggle sound"]'); await pg.waitForTimeout(100);
  const m3 = await pg.evaluate(() => ({ muted: window.__game.sfx.muted, stored: localStorage.getItem('cc3d_muted') }));
  console.log('sound: ' + JSON.stringify({ before, ...r, m1, m2, m3 }));
  if (before) fail('audio should stay locked until the first key press');
  if (!r.ready) fail('audio did not unlock on a key press');
  if (r.peakVoices > 18) fail('voice cap broken under rapid fire: ' + r.peakVoices);
  if (r.silent?.length) fail('sound recipes that did not play: ' + r.silent.join(','));
  if (m1 || !(m2.muted && m2.stored === '1' && m2.icon) || m3.muted || m3.stored !== '0') fail('mute toggle (M key / HUD button / localStorage) failed');
  await pg.close();
}

for (const sd of [1, 2]) { // 9. a spraying scripted player clears stage 1: all three tiers show up, powerups drop, no errors
  const pg = await fresh(`stage=1&seed=${sd}&god=1`);
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, K = g.input.keys, bot = window.__bot.make(), run = g.run, kills = {}, tiers = {}, given = {};
    g.events.on('enemyKilled', (e) => { kills[e.type] = (kills[e.type] || 0) + 1; tiers[e.tier] = (tiers[e.tier] || 0) + 1; });
    const give = W.weapon.give; W.weapon.give = (t) => { given[t] = (given[t] || 0) + 1; give(t); };
    let steps = 0; while (!W.finished && steps < 60 * 300) { K.add('KeyJ'); window.__bot.step(1, bot); steps++; }
    K.clear(); return { finished: W.finished, secs: steps / 60, kills, tiers, given, score: run.score, coins: run.coins, ambush: W.spawner.ambushes };
  });
  console.log(`combat run seed=${sd}: ` + JSON.stringify(r));
  if (!r.finished) fail(`seed ${sd}: spraying run never reached the gate`);
  for (const t of ['1', '2', '3']) if (!r.tiers[t]) fail(`seed ${sd}: no tier-${t} enemy was killed`);
  if (r.coins < 50 || r.score < 500) fail(`seed ${sd}: too little loot (score ${r.score}, coins ${r.coins})`);
  if (!r.ambush) fail(`seed ${sd}: no ambushes happened`);
  await pg.close();
}

await browser.close(); server.close();
if (process.argv.includes('--main')) { if (failures.length) { console.error(`\nSMOKE (main body) FAILED (${failures.length})`); process.exit(1); } console.log('SMOKE (main body) PASSED'); process.exit(0); }   // --main: skip the per-stage suites below (they run in parallel in CI)
// Stage 1 vertical slice (intro card, boss fight, stage clear, quicksand, enemy models...): its own script.
{ const { spawnSync } = await import('node:child_process'); const r = spawnSync(process.execPath, [path.join(root, 'tools/smokeStage1.mjs')], { stdio: 'inherit' }); if (r.status) fail('tools/smokeStage1.mjs failed'); }
for (const n of [2, 3, 4, 5, 6, 7, 8, 9, 10]) { const { spawnSync } = await import('node:child_process'); const r = spawnSync(process.execPath, [path.join(root, 'tools/smokeStage.mjs'), String(n)], { stdio: 'inherit' }); if (r.status) fail(`tools/smokeStage.mjs ${n} failed`); }   // stages 2-10
// Mobile / performance / polish prompt (PLAN 10, prompt 10): touch controls complete stage 1 with emulated fingers, robustness and
// settings, the dynamic-resolution controller, the module preload list. The full ten-stage ?god=1 run is slow: add --full.
{
  const { spawnSync } = await import('node:child_process');
  const sub = [['tools/preload.mjs', ['--check']], ['tools/qualityTest.mjs', []], ['tools/smokeTouch.mjs', []], ['tools/smokeRobust.mjs', []], ...(process.argv.includes('--full') ? [['tools/smokeTen.mjs', []]] : [])];
  for (const [f, a] of sub) { const r = spawnSync(process.execPath, [path.join(root, f), ...a], { stdio: 'inherit' }); if (r.status) fail(`${f} failed`); }
}
if (failures.length) { console.error(`\nSMOKE FAILED (${failures.length})`); process.exit(1); }
console.log('SMOKE PASSED');
