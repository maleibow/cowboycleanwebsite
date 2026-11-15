// Ten-stage run: node tools/smokeTen.mjs [--from=1] [--to=10]
// ?god=1, one continuous run through the real state machine: intro card -> stage (the scripted bot, spraying) -> boss -> stage-clear
// tally -> saloon -> next stage's cutscene -> its sliced load behind the intro card ... through stage 10, the ending, the victory
// screen and into loop 2. Fails on ANY console error or page error and on a stage that does not finish. The simulation is stepped
// by this script (the loop is stopped: software GL renders ~5 fps) through flow.update / flow.render, i.e. the real game path.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const FROM = Number(arg('from', 1)), TO = Number(arg('to', 10));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port, failures = [], consoleErrors = [];
const fail = (m) => { failures.push(m); console.error('FAIL: ' + m); };
const isExt = (u) => u && (!u.startsWith(`http://127.0.0.1:${port}`) || u.includes('/game3d/music/'));
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await browser.newPage({ viewport: { width: 480, height: 270 } });
pg.on('console', (m) => { if (m.type() === 'error' && !isExt(m.location().url)) { consoleErrors.push(m.text()); fail('console error: ' + m.text()); } });
pg.on('pageerror', (e) => { consoleErrors.push(e.message); fail('page error: ' + e.message); });
pg.on('requestfailed', (r) => { if (!isExt(r.url())) fail('request failed: ' + r.url()); });
await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?stage=${FROM}&god=1&quality=low&dynres=0`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 90000 });
await pg.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
await pg.evaluate(() => { const g = window.__game; g.loop.stop(); window.__ten = { cleared: [], stageOf: [], loads: [], bot: null, botFor: 0, steps: 0, secs: {}, lastState: '', visited: new Set() };
  g.events.on('stageCleared', () => { window.__ten.cleared.push(g.run.stage); }); });

// One slice of driving: returns the state it ended in. Everything that needs real time (card timers, the tally) is waited out by the caller.
const drive = (n) => pg.evaluate((n) => {
  const g = window.__game, F = g.flow, T = window.__ten, K = g.input.keys;
  const tick = (k) => { F.update(1 / 60); if (k % 20 === 0) F.render(0.5); T.steps++; };
  let st = F.name; T.visited.add(st);
  if (st === 'PLAYING') {
    const W = g.world, A = W.arena, B = W.player.body;
    if (T.botFor !== W) { T.bot = window.__bot.make(); T.botFor = W; }
    for (let i = 0; i < n && F.name === 'PLAYING'; i++) {
      if (A.state !== 'fight' && A.state !== 'victory') T.bot();
      else { const e = A.boss?.enemy; K.clear(); K.add('KeyJ'); if (e) { if (e.s > B.s + 3) K.add('KeyW'); else if (e.s < B.s - 3) K.add('KeyS'); if (e.x > B.x + 2) K.add('KeyD'); else if (e.x < B.x - 2) K.add('KeyA'); } }
      if (A.state === 'fight' || A.state === 'sealed') K.add('KeyJ');
      tick(i); T.secs[g.run.stage] = (T.secs[g.run.stage] || 0) + 1 / 60;
    }
    K.clear();
  } else if (st === 'CUTSCENE') { F.cutscene.skip(); tick(1); }
  else if (st === 'STORE') { for (let i = 0; i < 5; i++) tick(i); F.store.leave(); tick(1); }
  else if (st === 'VICTORY') { for (let i = 0; i < 5; i++) tick(i); F.go('STORE'); }
  else { for (let i = 0; i < 10; i++) tick(i); }
  const L = F.G.loader;
  return { state: F.name, stage: g.run.stage, loop: g.run.stageLoop, loading: !!L, hud: F.name === 'INTRO' ? document.getElementById('hud').innerText.slice(0, 60) : '' };
}, n);

let r = { state: '' }, guard = 0, lastStage = 0, t0 = Date.now(), introKeys = 0;
const stageLog = [];
while (guard++ < 4000) {
  r = await drive(240);
  if (r.stage !== lastStage) { lastStage = r.stage; console.log(`-- stage ${r.stage} (loop ${r.loop}) reached after ${((Date.now() - t0) / 1000).toFixed(0)} s wall`); }
  if (r.state === 'INTRO') { await pg.waitForTimeout(450); if (!(await pg.evaluate(() => !!window.__game.flow.G.loader))) await pg.keyboard.press('KeyW'); else await pg.waitForTimeout(100); introKeys++; }
  else if (r.state === 'STAGECLEAR') { await pg.waitForTimeout(3600); await pg.keyboard.press('Enter'); await pg.waitForTimeout(100); }
  else if (r.state === 'CUTSCENE' || r.state === 'STORE' || r.state === 'VICTORY') await pg.waitForTimeout(30);
  const cleared = await pg.evaluate(() => window.__ten.cleared.slice());
  if (r.loop >= 2 && r.state === 'INTRO' && cleared.length >= TO - FROM + 1) break;
  if (TO < 10 && cleared.length >= TO - FROM + 1 && (r.state === 'STORE' || r.state === 'CUTSCENE')) break;   // a partial run stops after its last stage; the full run goes on into loop 2
}
const T = await pg.evaluate(() => ({ cleared: window.__ten.cleared, secs: window.__ten.secs, visited: [...window.__ten.visited], steps: window.__ten.steps, loadMs: window.__game.flow.G.loadMs, worst: window.__game.flow.G.loadWorst, state: window.__game.state, stage: window.__game.run.stage, loop: window.__game.run.stageLoop }));
console.log(JSON.stringify(T));
const want = []; for (let s = FROM; s <= TO; s++) want.push(s);
if (JSON.stringify(T.cleared) !== JSON.stringify(want)) fail(`stages cleared ${JSON.stringify(T.cleared)}, wanted ${JSON.stringify(want)}`);
if (TO === 10) { for (const st of ['CUTSCENE', 'VICTORY', 'STORE', 'INTRO', 'PLAYING', 'STAGECLEAR']) if (!T.visited.includes(st)) fail('never visited ' + st); if (T.loop < 2) fail('did not roll over into loop 2 (loop ' + T.loop + ')'); }
await pg.screenshot({ path: path.join(root, 'remake/shots/ten_stage_end.png') });
await browser.close(); server.close();
console.log(`console errors: ${consoleErrors.length}`);
if (failures.length) { console.error(`\nTEN-STAGE RUN FAILED (${failures.length})`); process.exit(1); }
console.log('TEN-STAGE RUN PASSED');
