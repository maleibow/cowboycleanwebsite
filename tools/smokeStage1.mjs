// Stage 1 vertical-slice checks: node tools/smokeStage1.mjs   (also run at the end of tools/smoke.mjs)
// The intro card, the boss encounter (telegraphs, shockwave, phase two, defeat), the stage-clear tally, quicksand,
// every stage-1 enemy model, checkpoints, and one scripted playthrough from the intro card to the stage-clear screen.
// Headless Chromium rasterises on the CPU, so these tests step the simulation directly (window.__bot.step) and use
// the real loop only where the real input / state machine matters.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port, failures = [];
const fail = (m) => { failures.push(m); console.error('FAIL: ' + m); };
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fresh = async (q) => { if (!/quality=/.test(q)) q += '&quality=low';   // headless is CPU-rendered: keep the test frame cheap
  const pg = await browser.newPage({ viewport: { width: 960, height: 540 } });
  pg.on('console', (m) => { const u = m.location().url; if (m.type() === 'error' && !(u && (!u.startsWith(`http://127.0.0.1:${port}`) || u.includes('/game3d/music/')))) fail('console error: ' + m.text()); });
  pg.on('pageerror', (e) => fail('page error: ' + e.message));
  await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?${q}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 30000 });
  await pg.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
  return pg;
};

{ // 1. the intro card: stage name, track credit, any key starts the stage
  const pg = await fresh('stage=1&seed=1&god=1');
  const a = await pg.evaluate(() => ({ state: window.__game.state, text: document.getElementById('hud').innerText }));
  await pg.waitForTimeout(500);   // the card only listens for keys after 350 ms (so a stray tap cannot skip it): wait that out
  await pg.keyboard.press('KeyW'); await pg.waitForTimeout(700);
  const b = await pg.evaluate(() => window.__game.state);
  console.log(`intro: state ${a.state} -> ${b}`);
  if (a.state !== 'INTRO') fail('first state should be INTRO, was ' + a.state);
  if (!/DESERT SCRUB/.test(a.text) || !/STAGE 1/.test(a.text) || !/♪/.test(a.text)) fail('intro card should show the stage name, number and track credit');
  if (b !== 'PLAYING') fail('a key press should close the intro card (state ' + b + ')');
  await pg.close();
}

{ // 2. ?god=1&boss=1 jumps to the gate; walking on opens it, enters the disc and the boss drops in
  const pg = await fresh('stage=1&seed=1&god=1&boss=1');
  await pg.keyboard.down('KeyW');
  const ok = await pg.waitForFunction(() => window.__game.world.arena.boss, null, { timeout: 90000 }).then(() => true, () => false);
  await pg.keyboard.up('KeyW');
  const r = await pg.evaluate(() => { const W = window.__game.world, a = W.arena; return { state: a.state, boss: a.boss?.state, hp: a.boss?.enemy.hp, bar: [...document.querySelectorAll('#hud div')].some((d) => d.textContent === 'BIG DIRT'), gateWall: W.track.dyn.some((b) => b.kind === 'wall') }; });
  console.log('boss reached: ' + JSON.stringify(r));
  if (!ok) fail('?god=1&boss=1 never reached the boss'); else {
    if (r.state !== 'fight') fail('arena state should be fight, is ' + r.state);
    if (!r.bar) fail('boss health bar not shown');
    if (!r.gateWall) fail('the arena entrance should be sealed behind the player');
  }
  await pg.close();
}

{ // 3. the fight: invulnerable intro, every attack telegraphed, a ring that jumping clears, phase two, defeat
  const pg = await fresh('stage=1&seed=1&boss=1&intro=0');   // no god: damage must be real
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, K = g.input.keys, P = W.player, B = P.body, run = g.run, out = { log: [] }, A = W.arena, step = (n) => window.__bot.step(n);
    K.add('KeyW'); let n = 0; while (!A.boss && n++ < 900) step(1); K.delete('KeyW');
    const boss = A.boss, e = boss.enemy, fx = A.bossFx; out.reached = !!boss;
    while (boss.state === 'drop') step(1);
    out.dropInvuln = e.invulnerable; K.add('KeyJ'); step(20); K.delete('KeyJ'); out.hpAfterRoarShots = e.hp === e.maxHp;   // roar: shots do nothing
    let guard = 0; while (boss.state !== 'walk' && guard++ < 400) step(1); out.vulnerableAfterIntro = !e.invulnerable;
    const clearMinions = () => { for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q); };
    // one attack cycle; `jump` = press Space as the ring arrives. Returns what the player lost and how much warning there was.
    const attack = (jump) => {
      clearMinions(); boss.state = 'walk'; boss.st = 0; e.hp = e.maxHp; e.s = A.center.s + 4; e.x = 0; e.y = 0; run.health = 100; P.invuln = 0; P.teleport(A.center.s - 8, 0); step(10); K.clear();
      boss.timer = 0; let t = 0, windupAt = -1, leapAt = -1, slamAt = -1, g2 = 0, marker = null, lost = {};
      while (g2++ < 900) {
        step(1); t++;
        if (boss.state === 'windup' && windupAt < 0) { windupAt = t; marker = fx.markers.find((m) => m.on) && { ...fx.markers.find((m) => m.on) }; K.add('KeyA'); }
        if (boss.state === 'leap' && leapAt < 0) leapAt = t;
        if (boss.state === 'stun' && slamAt < 0) { slamAt = t; K.delete('KeyA'); lost.stomp = 100 - run.health; lost.landDist = Math.hypot(e.s - (marker?.s ?? 1e9), e.x - (marker?.x ?? 1e9)); lost.playerDist = Math.hypot(B.s - e.s, B.x - e.x); clearMinions(); }
        if (slamAt > 0) {
          const w = fx.waves.find((q) => q.on && !q.harmless);
          if (w && jump) { const d = Math.hypot(B.s - w.s, B.x - w.x); if (w.r < d && d - w.r < 2.6) K.add('Space'); else if (w.r > d + 1) K.delete('Space'); }   // press as the ring nears and hold the jump, like a player
          if (w && Math.hypot(B.s - w.s, B.x - w.x) + 3 < w.r) break; if (!w && t - slamAt > 10) break;
        }
      }
      K.clear(); lost.total = 100 - run.health; lost.warnSecs = (slamAt - windupAt) / 60; lost.hadMarker = !!marker; lost.markerR = marker?.r; lost.waves = fx.waves.filter((q) => q.on).length; lost.phase = boss.phase;
      return lost;
    };
    out.grounded = attack(false); out.jumped = attack(true);
    // phase two below half health: a roar (invulnerable), then a faster double ring
    clearMinions(); boss.state = 'walk'; boss.timer = 5; e.hp = e.maxHp * 0.45; run.health = 100; P.invuln = 99; P.teleport(A.center.s - 9, 0); let sawRage = false, rageInvuln = false; g.__t = 0;
    for (let i = 0; i < 400 && boss.phase === 1; i++) { step(1); if (boss.state === 'rage') { sawRage = true; rageInvuln = e.invulnerable; } }
    out.rage = { sawRage, rageInvuln, phase: boss.phase };
    while (boss.state === 'rage') step(1);
    clearMinions(); boss.timer = 0; let maxWaves = 0; for (let i = 0; i < 600; i++) { step(1); maxWaves = Math.max(maxWaves, fx.waves.filter((q) => q.on).length); if (boss.state === 'stun') break; } out.p2Waves = maxWaves;
    // defeat: dying animation, minions cleared, health restored, the stage washes clean, the tally event fires
    clearMinions(); run.health = 40; let cleared = null; const off = g.events.on('stageCleared', (s) => { cleared = s; });
    e.invulnerable = false; W.combat.hitEnemy(e, 999, e.s, e.x, 1); out.dying = boss.dying;
    let steps = 0; while (!cleared && steps++ < 60 * 12) step(1); off();
    out.defeat = { done: boss.done, gone: !W.enemies.list.some((q) => q.ctrl), state: A.state, wash: A.wash, health: run.health, cleared: !!cleared, stats: cleared, secs: steps / 60, fsm: g.state };
    return out;
  });
  console.log('boss fight: ' + JSON.stringify(r));
  const G = r.grounded, J = r.jumped;
  if (!r.reached) fail('boss never appeared');
  if (!r.dropInvuln || !r.hpAfterRoarShots) fail('boss must be invulnerable while it drops in and roars');
  if (!r.vulnerableAfterIntro) fail('boss should be hittable after its intro');
  for (const [name, x] of [['grounded', G], ['jumped', J]]) {
    if (!x.hadMarker) fail(`${name}: no floor marker during the windup`);
    if (!(x.warnSecs >= 1.8)) fail(`${name}: only ${x.warnSecs?.toFixed(2)} s from windup to slam, want >= 1.8`);
    if (!(x.landDist < 0.6)) fail(`${name}: boss landed ${x.landDist?.toFixed(2)} m from its marker`);
    if (x.stomp !== 0) fail(`${name}: player who left the marker was stomped for ${x.stomp}`);
    if (!(x.waves >= 1)) fail(`${name}: slam sent no ring`);
  }
  if (G.total !== 20) fail(`standing in the ring should cost 20 health, cost ${G.total}`);
  if (J.total !== 0) fail(`jumping the ring should cost nothing, cost ${J.total}`);
  if (!(r.rage.sawRage && r.rage.rageInvuln && r.rage.phase === 2)) fail('phase two roar: ' + JSON.stringify(r.rage));
  if (r.p2Waves < 2) fail('phase two slam should send two rings, saw ' + r.p2Waves);
  const D = r.defeat;
  if (!(r.dying && D.done && D.gone && D.cleared)) fail('defeat sequence incomplete: ' + JSON.stringify(D));
  if (!(D.wash > 0.99 && D.health === 65)) fail(`victory: wash ${D.wash}, health ${D.health} (want 1 and 65 = 40 + 25)`);
  if (D.stats && !(D.stats.gained >= 2500 && D.stats.time > 0)) fail('stage-clear stats look wrong: ' + JSON.stringify(D.stats));
  await pg.waitForTimeout(600);
  const tally = await pg.evaluate(() => ({ state: window.__game.state, text: document.getElementById('hud').innerText }));
  console.log('tally: ' + tally.state);
  if (tally.state !== 'STAGECLEAR' || !/STAGE CLEAN/.test(tally.text) || !/SCORE/.test(tally.text) || !/COINS/.test(tally.text) || !/TIME/.test(tally.text)) fail('stage-clear tally not shown: ' + tally.state);
  await pg.waitForFunction(() => [...document.querySelectorAll('#hud div')].some((d) => d.textContent.startsWith('CONTINUE') && d.style.opacity === '1'), null, { timeout: 40000 }).catch(() => fail('tally never finished counting'));
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(500);
  const after = await pg.evaluate(() => ({ state: window.__game.state, loop: window.__game.run.stageLoop, stage: window.__game.run.stage, boss: window.__game.world.arena.boss }));
  if (!(after.state === 'INTRO' && after.loop === 2 && after.stage === 1 && !after.boss)) fail('Enter on the tally should start the next stage (loop 2): ' + JSON.stringify(after));
  await pg.close();
}

{ // 4. quicksand drags to half speed; the firm lane at its side does not
  const pg = await fresh('stage=1&seed=1&god=1&foes=0&intro=0');
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, out = {}, step = (n) => window.__bot.step(n);
    const seg = W.layout.segments.find((s) => s.name === 'quicksand'); if (!seg) return { none: true };
    const patch = seg.patches[0], lane = patch.x0 > -3.9 + 0.1 && patch.x1 > 3 ? -1 : 1;
    const speedAt = (x) => { P.teleport(patch.s0 - 4, x); step(30); K.add('KeyW'); step(50); const v = B.vs, sand = P.inSand; step(20); K.clear(); return { v, sand: P.inSand || sand }; };
    out.sand = speedAt((patch.x0 + patch.x1) / 2); out.lane = speedAt(lane * 3.3 > 0 ? 3.3 : -3.3);
    if (out.lane.sand) out.lane = speedAt(-Math.sign((patch.x0 + patch.x1) / 2) * 3.3);
    out.max = P.maxSpeed(); out.patch = patch;
    return out;
  });
  console.log('quicksand: ' + JSON.stringify(r));
  if (r.none) fail('seed 1 has no quicksand segment'); else {
    if (!r.sand.sand || !(r.sand.v < r.max * 0.6)) fail(`quicksand should slow to ~half speed (v ${r.sand.v}, max ${r.max})`);
    if (r.lane.sand || !(r.lane.v > r.max * 0.9)) fail(`the lane beside the quicksand should be firm (v ${r.lane.v})`);
  }
  await pg.close();
}

{ // 5. every stage-1 enemy has a model, draws within budget, faces the player; checkpoint flags light up; the chase hazard bites
  const pg = await fresh('stage=1&seed=1&foes=0&intro=0');
  const r = await pg.evaluate(async () => {
    const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, run = g.run, out = { models: {} }, step = (n) => window.__bot.step(n);
    const types = ['dirt', 'ice', 'vulture', 'rabbit', 'dirty_ice', 'spider'];
    P.teleport(60); step(60); W.spawner.enabled = false;
    for (const t of types) { out.models[t] = W.enemies.models.has(t); for (let i = 0; i < 4; i++) W.enemies.spawn(t, B.s + 8 + i, (i - 1.5) * 1.2, 0, { active: true, edgeX: t === 'spider' ? 2 : undefined }); }
    run.cheats.god = true; step(90); W.render(0.5); g.gfx.render(W.scene, W.camera);
    out.parts = [...W.enemies.models.kits.values()].map((k) => k.parts.length).reduce((a, b) => a + b, 0); out.modelCalls = W.enemies.models.drawCalls;
    out.finite = W.enemies.list.every((e) => [e.s, e.x, e.y, e.face].every(Number.isFinite));
    // checkpoints
    W.enemies.clear(); run.cheats.god = false; const cps = []; const off = g.events.on('checkpoint', (i) => cps.push(i));
    out.flags = [];
    for (const cp of W.track.checkpoints) { P.teleport(cp.s - 3); step(120); K.add('KeyW'); step(90); K.clear(); out.flags.push([...W.scenery.dressed.values()].find((d) => d.seg?.checkpoint === cp.s)?.active); }
    off(); out.checkpoints = cps;
    P.teleport(W.track.checkpoints[0].s - 3); step(60); W.scenery.update(W.track.checkpoints[0].s - 3, 0, W.camera.position, 0);   // rebuilt chunks keep the flag lit
    out.rebuiltLit = [...W.scenery.dressed.values()].find((d) => d.seg?.checkpoint === W.track.checkpoints[0].s)?.active;
    // chase: stand still in front of the ball and it should hit for 15
    const ch = W.layout.segments.find((s) => s.name === 'chase'); P.teleport(ch.s0 + 6); step(30); run.health = 100; P.invuln = 0; K.clear();
    let hit = 0; for (let i = 0; i < 60 * 8; i++) { step(1); if (run.health < 100) { hit = 100 - run.health; break; } }
    out.chase = { active: W.hazard.active, hit };
    return out;
  });
  console.log('models/checkpoints/chase: ' + JSON.stringify(r));
  for (const [t, ok] of Object.entries(r.models)) if (!ok) fail('no procedural model for ' + t);
  if (!(r.parts >= 18)) fail('expected a multi-part model per type, got ' + r.parts + ' parts');
  if (!(r.modelCalls <= 60)) fail('enemy models use too many draw calls: ' + r.modelCalls);
  if (!r.finite) fail('enemy transforms went non-finite');
  if (r.checkpoints.length !== 2 || r.flags.length < 2 || r.flags.some((f) => !f) || !r.rebuiltLit) fail('both checkpoint flags should light up: ' + JSON.stringify({ c: r.checkpoints, f: r.flags }));
  if (!(r.chase.active && r.chase.hit === 15)) fail('chase hazard should be active and hit for 15: ' + JSON.stringify(r.chase));
  await pg.close();
}

{ // 6. dying in the boss fight: game over, Retry restarts the stage cleanly and the fight can be started again
  const pg = await fresh('stage=1&seed=1&boss=1&intro=0');
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, K = g.input.keys, A = W.arena, run = g.run, step = (n) => window.__bot.step(n), out = {};
    K.add('KeyW'); let n = 0; while (!(A.boss && A.boss.state === 'walk') && n++ < 1500) step(1); K.clear();
    run.health = 10; W.player.invuln = 0; W.combat.damagePlayer(25); step(3); out.dead = W.player.dead; out.state = g.state;
    return out;
  });
  await pg.waitForTimeout(500);
  await pg.keyboard.press('Enter'); await pg.waitForTimeout(600);
  const a = await pg.evaluate(() => {
    const g = window.__game, W = g.world, A = W.arena, K = g.input.keys, step = (n) => window.__bot.step(n), out = { state: g.state, arena: A.state, boss: !!A.boss, bossEnemy: W.enemies.list.some((e) => e.ctrl),  s: W.player.body.s, hp: g.run.health, gateOpen: W.scenery.gateOpen,
      bar: [...document.querySelectorAll('#hud div')].some((d) => d.textContent === 'BIG DIRT' && d.parentElement.style.display === 'block'), sealed: W.track.dyn.some((b) => b.kind === 'wall') };
    W.jumpToGate(); K.add('KeyW'); let n = 0; while (!A.boss && n++ < 900) step(1); K.clear(); out.again = !!A.boss && A.boss.enemy.hp === 60;
    return out;
  });
  console.log('retry in boss fight: ' + JSON.stringify({ r, a }));
  if (!(r.dead && r.state === 'GAMEOVER')) fail('dying in the boss fight should show game over: ' + JSON.stringify(r));
  if (!(a.state === 'PLAYING' && a.arena === 'sealed' && !a.boss && !a.bossEnemy && a.s < 10 && a.hp === 100 && a.gateOpen === 0 && !a.bar && a.sealed)) fail('retry did not reset the encounter: ' + JSON.stringify(a));
  if (!a.again) fail('the boss fight did not start again after a retry');
  await pg.close();
}

{ // 7. a scripted playthrough: intro card -> whole stage (spraying) -> gate -> boss -> stage-clear screen
  const pg = await fresh('stage=1&seed=2&god=1');
  await pg.keyboard.press('KeyW');
  await pg.waitForFunction(() => window.__game.state === 'PLAYING', null, { timeout: 10000 });
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, K = g.input.keys, bot = window.__bot.make(), A = W.arena, B = W.player.body, out = { phases: [] };
    let steps = 0, last = ''; K.delete('KeyW');
    while (g.state !== 'STAGECLEAR' && steps < 60 * 420) {
      if (A.state !== 'fight' && A.state !== 'victory') bot(); // the stage: platforming bot
      else { // the arena: face the boss and keep spraying
        const e = A.boss?.enemy; K.clear(); K.add('KeyJ');
        if (e) { if (e.s > B.s + 3) K.add('KeyW'); else if (e.s < B.s - 3) K.add('KeyS'); if (e.x > B.x + 2) K.add('KeyD'); else if (e.x < B.x - 2) K.add('KeyA'); }
      }
      if (A.state === 'fight' || A.state === 'sealed') K.add('KeyJ');
      window.__bot.step(1); steps++;
      const tag = A.state + ':' + (A.boss?.state || ''); if (A.state !== last) { out.phases.push(A.state + '@' + Math.round(steps / 60)); last = A.state; }
    }
    return { ...out, state: g.state, secs: steps / 60, score: g.run.score, bossPhase: A.boss?.phase, won: A.won, kills: W.combat.kills, hp: g.run.health };
  });
  console.log('playthrough: ' + JSON.stringify(r));
  if (r.state !== 'STAGECLEAR' || !r.won) fail('scripted playthrough never reached the stage-clear screen: ' + JSON.stringify(r));
  if (r.score < 2500) fail('playthrough score too low: ' + r.score);
  await pg.screenshot({ path: path.join(root, 'remake/shots/stage1_playthrough_end.png') });
  await pg.close();
}

await browser.close(); server.close();
if (failures.length) { console.error(`\nSTAGE 1 SMOKE FAILED (${failures.length})`); process.exit(1); }
console.log('STAGE 1 SMOKE PASSED');
