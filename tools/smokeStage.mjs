// Per-stage checks for stages 2-4: node tools/smokeStage.mjs <stage>   (also run at the end of tools/smoke.mjs)
// Generic: intro card, layout rules over many seeds (incl. the set-piece), every roster enemy has a model and draws within budget,
// checkpoints, the boss reach / invulnerable intro / phase two / defeat / stage-clear tally, retry after dying in the fight, and one scripted
// playthrough from the intro card to the stage-clear screen. Stage-specific checks (the set-piece mechanic, the boss attack telegraphs, the
// stage's hazards and obstacle) live in tools/stageTests/stageN.mjs. Headless Chromium rasterises on the CPU, so these tests step the
// simulation directly (window.__bot.step) and use the real loop only where the real input / state machine matters.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = Number(process.argv[2] || 2);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port, failures = [];
const fail = (m) => { failures.push(m); console.error('FAIL: ' + m); };
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fresh = async (q) => { if (!/quality=/.test(q)) q += '&quality=low';
  const pg = await browser.newPage({ viewport: { width: 960, height: 540 } });
  pg.on('console', (m) => { const u = m.location().url; if (m.type() === 'error' && !(u && (!u.startsWith(`http://127.0.0.1:${port}`) || u.includes('/game3d/music/')))) fail('console error: ' + m.text()); });
  pg.on('pageerror', (e) => fail('page error: ' + e.message));
  await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?stage=${N}&${q}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 30000 });
  await pg.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
  return pg;
};
const gen = await import('../game3d/world/generator.js');
const { getStage } = await import('../game3d/data/stages.js');
const S = getStage(N), BOSS = S.boss.name;
console.log(`== STAGE ${N}: ${S.name} ==`);
if (S.standIn) fail('stage ' + N + ' still uses the stand-in');

{ // 1. the intro card
  const pg = await fresh('seed=1&god=1');
  const a = await pg.evaluate(() => ({ state: window.__game.state, text: document.getElementById('hud').innerText }));
  await pg.waitForTimeout(500); await pg.keyboard.press('KeyW'); await pg.waitForTimeout(700);
  const b = await pg.evaluate(() => window.__game.state);
  console.log(`intro: state ${a.state} -> ${b}`);
  if (a.state !== 'INTRO') fail('first state should be INTRO, was ' + a.state);
  if (!a.text.includes(S.name.toUpperCase()) || !a.text.includes('STAGE ' + N) || !/♪/.test(a.text)) fail('intro card should show the stage name, number and track credit');
  if (b !== 'PLAYING') fail('a key press should close the intro card (state ' + b + ')');
  await pg.close();
}

{ // 2. layout rules hold across seeds, the set-piece is always present, rosters follow PLAN 6
  let bad = 0, sp = 0;
  for (let sd = 0; sd < 200; sd++) { const l = gen.generateStage(S, sd), e = gen.validateStage(l, S); if (e.length) { bad++; fail(`seed ${sd}: ${e.join('; ')}`); } if (l.segments.some((g) => g.name === S.setPiece.template)) sp++; }
  console.log(`layout: 200 seeds validated (${bad} bad), set-piece '${S.setPiece.template}' in ${sp}/200`);
  if (sp < 200) fail('the set-piece is missing from some layouts');
  const types = new Set(gen.generateStage(S, 1).slots.filter((s) => s.kind === 'enemy').map((s) => s.type)), want = new Set(S.roster.flat());
  console.log('enemy types placed: ' + [...types].join(','));
  for (const t of types) if (!want.has(t)) fail('unexpected enemy type ' + t);
}

{ // 3. every roster enemy has a model and draws within budget; checkpoints; the stage's budgets
  const pg = await fresh('seed=1&foes=0&intro=0');
  const r = await pg.evaluate(async () => {
    const g = window.__game, W = g.world, P = W.player, B = P.body, K = g.input.keys, run = g.run, out = { models: {} }, step = (n) => window.__bot.step(n);
    const types = [...new Set(W.stageData.roster.flat())];
    P.teleport(60); step(60); W.spawner.enabled = false;
    for (const t of types) { out.models[t] = W.enemies.models.has(t); for (let i = 0; i < 4; i++) W.enemies.spawn(t, B.s + 8 + i, (i - 1.5) * 1.2, 0, { active: true, edgeX: W.enemies.list.length && t === 'spider' ? 2 : undefined }); }
    run.cheats.god = true; step(90); W.render(0.5); g.gfx.render(W.scene, W.camera);
    out.parts = [...W.enemies.models.kits.values()].map((k) => k.parts.length).reduce((a, b) => a + b, 0); out.modelCalls = W.enemies.models.drawCalls; out.n = types.length;
    out.finite = W.enemies.list.every((e) => [e.s, e.x, e.y, e.face].every(Number.isFinite));
    W.enemies.clear(); run.cheats.god = false; const cps = []; const off = g.events.on('checkpoint', (i) => cps.push(i)); out.flags = [];
    for (const cp of W.track.checkpoints) { P.teleport(cp.s - 3); step(120); K.add('KeyW'); step(90); K.clear(); out.flags.push([...W.scenery.dressed.values()].find((d) => d.seg?.checkpoint === cp.s)?.active); }
    off(); out.checkpoints = cps;
    return out;
  });
  console.log('models/checkpoints: ' + JSON.stringify(r));
  for (const [t, ok] of Object.entries(r.models)) if (!ok) fail('no procedural model for ' + t);
  if (!(r.parts >= r.n * 3)) fail('expected a multi-part model per type, got ' + r.parts + ' parts');
  if (!(r.modelCalls <= 70)) fail('enemy models use too many draw calls: ' + r.modelCalls);
  if (!r.finite) fail('enemy transforms went non-finite');
  if (r.checkpoints.length !== 2 || r.flags.some((f) => !f)) fail('both checkpoint flags should light up: ' + JSON.stringify(r));
  await pg.close();
}

// 4. stage-specific: the set-piece mechanic, hazards, boss attacks and their telegraphs
try { const mod = await import(`./stageTests/stage${N}.mjs`); await mod.default({ fresh, fail, N, S, root }); } catch (e) { fail('stage-specific tests crashed: ' + (e.stack || e)); }

{ // 5. boss: reached through the gate, invulnerable intro, phase two, defeat, the tally
  const pg = await fresh('seed=1&god=1&boss=1&intro=0');
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, K = g.input.keys, A = W.arena, run = g.run, step = (n) => window.__bot.step(n), out = {};
    K.add('KeyW'); let n = 0; while (!A.boss && n++ < 1200) step(1); K.delete('KeyW'); const boss = A.boss, e = boss?.enemy; out.reached = !!boss; out.state = A.state;
    out.sealed = W.track.dyn.some((b) => b.kind === 'wall');
    out.introInvuln = e.invulnerable; K.add('KeyJ'); step(20); K.delete('KeyJ'); out.introHp = e.hp === e.maxHp; out.bar = [...document.querySelectorAll('#hud div')].some((d) => d.textContent === W.stageData.boss.name);
    let guard = 0; while (boss.passive && guard++ < 900) step(1); out.vulnerable = !e.invulnerable; out.maxHp = e.maxHp;
    // phase two below half health
    e.hp = e.maxHp * 0.45; let sawRage = false; for (let i = 0; i < 600 && boss.phase === 1; i++) { step(1); if (boss.state === 'rage') sawRage = true; } out.rage = { sawRage, phase: boss.phase };
    guard = 0; while (boss.state === 'rage' && guard++ < 300) step(1); out.afterRage = !e.invulnerable;
    for (const q of [...W.enemies.list]) if (!q.ctrl) W.enemies.remove(q);
    run.health = 40; let cleared = null; const off = g.events.on('stageCleared', (st) => { cleared = st; });
    e.invulnerable = false; W.combat.hitEnemy(e, 9999, e.s, e.x, 1); out.dying = boss.dying;
    let steps = 0; while (!cleared && steps++ < 60 * 14) step(1); off();
    out.defeat = { done: boss.done, gone: !W.enemies.list.some((q) => q.ctrl), wash: A.wash, health: run.health, cleared: !!cleared, gained: cleared?.gained };
    return out;
  });
  console.log('boss: ' + JSON.stringify(r));
  if (!r.reached || r.state !== 'fight') fail('boss never appeared: ' + JSON.stringify(r));
  if (!r.bar) fail('boss health bar not shown'); if (!r.sealed) fail('the arena entrance should be sealed behind the player');
  if (!r.introInvuln || !r.introHp) fail('boss must be invulnerable during its intro');
  if (!r.vulnerable) fail('boss should be hittable after its intro');
  if (r.maxHp !== (getStage(N) && ({ 2: 80, 3: 100, 4: 120 })[N])) fail('boss hp ' + r.maxHp + ' does not match PLAN 6');
  if (!(r.rage.sawRage && r.rage.phase === 2 && r.afterRage)) fail('phase two: ' + JSON.stringify(r.rage));
  const D = r.defeat;
  if (!(r.dying && D.done && D.gone && D.cleared)) fail('defeat sequence incomplete: ' + JSON.stringify(D));
  if (!(D.wash > 0.99 && D.health === 65)) fail(`victory: wash ${D.wash}, health ${D.health} (want 1 and 65)`);
  await pg.waitForTimeout(600);
  const tally = await pg.evaluate(() => ({ state: window.__game.state, text: document.getElementById('hud').innerText }));
  if (tally.state !== 'STAGECLEAR' || !/STAGE CLEAN/.test(tally.text)) fail('stage-clear tally not shown: ' + tally.state);
  await pg.close();
}

{ // 6. dying in the boss fight: game over, Retry restarts the stage cleanly and the fight can be started again
  const pg = await fresh('seed=1&boss=1&intro=0');
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, K = g.input.keys, A = W.arena, run = g.run, step = (n) => window.__bot.step(n), out = {};
    K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 2000) step(1); K.clear();
    run.health = 10; W.player.invuln = 0; W.combat.damagePlayer(25); step(3); out.dead = W.player.dead; out.state = g.state; return out;
  });
  await pg.waitForTimeout(1500); await pg.evaluate(() => window.__game.flow.retry());   // the RETRY STAGE button's handler (the Enter key listener competes with the focused name box in headless runs)
  await pg.waitForTimeout(500);
  const a = await pg.evaluate(() => {
    const g = window.__game, W = g.world, A = W.arena, K = g.input.keys, step = (n) => window.__bot.step(n), out = { state: g.state, arena: A.state, boss: !!A.boss, bossEnemy: W.enemies.list.some((e) => e.ctrl), s: W.player.body.s, hp: g.run.health, gateOpen: W.scenery.gateOpen, sealed: W.track.dyn.some((b) => b.kind === 'wall') };
    W.jumpToGate(); K.add('KeyW'); let n = 0; while (!A.boss && n++ < 900) step(1); K.clear(); out.again = !!A.boss && A.boss.enemy.hp === A.boss.enemy.maxHp; return out;
  });
  console.log('retry in boss fight: ' + JSON.stringify({ r, a }));
  if (!(r.dead && r.state === 'GAMEOVER')) fail('dying in the boss fight should show game over: ' + JSON.stringify(r));
  if (!(a.state === 'PLAYING' && a.arena === 'sealed' && !a.boss && !a.bossEnemy && a.s < 10 && a.hp === 100 && a.gateOpen === 0 && a.sealed)) fail('retry did not reset the encounter: ' + JSON.stringify(a));
  if (!a.again) fail('the boss fight did not start again after a retry');
  await pg.close();
}

{ // 7. a scripted playthrough: intro card -> whole stage (spraying) -> gate -> boss -> stage-clear screen
  const pg = await fresh('seed=2&god=1');
  await pg.keyboard.press('KeyW'); await pg.waitForFunction(() => window.__game.state === 'PLAYING', null, { timeout: 10000 });
  const r = await pg.evaluate(() => {
    const g = window.__game, W = g.world, K = g.input.keys, bot = window.__bot.make(), A = W.arena, B = W.player.body, out = { phases: [] };
    let steps = 0, last = ''; K.delete('KeyW');
    while (g.state !== 'STAGECLEAR' && steps < 60 * 480) {
      if (A.state !== 'fight' && A.state !== 'victory') bot();
      else { const e = A.boss?.enemy; K.clear(); K.add('KeyJ'); if (e) { if (e.s > B.s + 3) K.add('KeyW'); else if (e.s < B.s - 3) K.add('KeyS'); if (e.x > B.x + 2) K.add('KeyD'); else if (e.x < B.x - 2) K.add('KeyA'); } }
      if (A.state === 'fight' || A.state === 'sealed') K.add('KeyJ');
      window.__bot.step(1); steps++; if (A.state !== last) { out.phases.push(A.state + '@' + Math.round(steps / 60)); last = A.state; }
    }
    return { ...out, state: g.state, secs: steps / 60, score: g.run.score, bossPhase: A.boss?.phase, won: A.won, kills: W.combat.kills, pit: W.player.pitFalls, s: B.s };
  });
  console.log('playthrough: ' + JSON.stringify(r));
  if (r.state !== 'STAGECLEAR' || !r.won) fail('scripted playthrough never reached the stage-clear screen: ' + JSON.stringify(r));
  fs.mkdirSync(path.join(root, 'remake/shots'), { recursive: true });
  await pg.screenshot({ path: path.join(root, `remake/shots/stage${N}_playthrough_end.png`) });
  await pg.close();
}

await browser.close(); server.close();
if (failures.length) { console.error(`\nSTAGE ${N} SMOKE FAILED (${failures.length})`); process.exit(1); }
console.log(`STAGE ${N} SMOKE PASSED`);
