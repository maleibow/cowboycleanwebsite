// Per-stage screenshots: node tools/stageShots.mjs <stage> [job,...]   (jobs: opening, mid, action, side, setpiece, hazard, gallery, gate, boss, clear)
// Loads the real level on ?stage=N, puts the player at known points and saves remake/shots/stage<N>_<job>.jpg. Prints draw calls / triangles
// and any console errors. SHOT_DIR overrides the output folder. (Generalised from tools/stage1shots.mjs.)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const N = Number(process.argv[2] || 2), want = process.argv.slice(3);
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = path.resolve(root, process.env.SHOT_DIR || 'remake/shots'); fs.mkdirSync(out, { recursive: true });
const errs = [];
const open = async (q) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.location().url?.includes('googleapis') && !m.location().url?.includes('/music/')) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/cleaningup3d.html?stage=${N}&${q}`);
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 60000 });
  await page.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
  return page;
};
const info = (page) => page.evaluate(() => { const i = window.__game.gfx.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, state: window.__game.state, s: +window.__game.world.player.body.s.toFixed(1) }; });
const shot = async (page, name, wait = 700) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(out, `stage${N}_${name}.jpg`), type: 'jpeg', quality: 84 }); console.log(name, JSON.stringify(await info(page))); };
const segAt = (name, n = 0) => (page) => page.evaluate(([nm, k]) => window.__game.world.layout.segments.filter((g) => g.name === nm)[k]?.s0 ?? -1, [name, n]);
const tp = (page, s) => page.evaluate((v) => { const W = window.__game.world; W.player.teleport(v); window.__bot.step(2); }, s);
const jobs = {
  async intro() { const p = await open('seed=1&god=1'); await shot(p, 'intro', 1200); await p.close(); },
  async opening() { const p = await open('seed=1&god=1&intro=0&foes=0'); await shot(p, 'opening', 1500); await p.close(); },
  async mid() { const p = await open('seed=1&god=1&intro=0'); await tp(p, 520); await p.evaluate(() => window.__game.world.debug.spawnEnemies(8)); await p.keyboard.down('KeyW'); await shot(p, 'mid', 900); await p.keyboard.up('KeyW'); await p.close(); },
  async action() { const p = await open('seed=1&god=1&intro=0'); await tp(p, 80); await p.evaluate(() => { const W = window.__game.world; W.debug.spawnEnemies(10); for (const e of W.enemies.list) e.s = W.player.body.s + 6 + Math.random() * 14; }); await p.keyboard.down('KeyJ'); await shot(p, 'action', 600); await p.keyboard.up('KeyJ'); await p.close(); },
  async side() { const p = await open('seed=1&god=1&intro=0'); const s0 = await segAt('side')(p); await tp(p, s0 + 24); await p.keyboard.down('KeyD'); await shot(p, 'side', 1400); await p.keyboard.up('KeyD'); await p.close(); },
  async setpiece() { // the stage's set-piece segment (data/stages.js setPiece.template), a little way in
    const p = await open('seed=1&god=1&intro=0&foes=0'); const t = await p.evaluate(() => window.__game.world.stageData.setPiece?.template || 'chase'); const s0 = await segAt(t)(p);
    await tp(p, s0 + Number(process.env.SP_OFFSET || 6)); await p.keyboard.down('KeyW'); await shot(p, 'setpiece', Number(process.env.SP_WAIT || 1500)); await p.keyboard.up('KeyW'); await p.close(); },
  async hazard() { const p = await open('seed=1&god=1&intro=0'); const t = process.env.HZ || 'quicksand'; const s0 = await segAt(t)(p); if (s0 < 0) { console.log('no ' + t + ' in seed 1'); await p.close(); return; } await tp(p, s0 + 6); await shot(p, 'hazard_' + t, 1000); await p.close(); },
  async gap() { const p = await open('seed=1&god=1&intro=0&foes=0'); const s0 = await segAt(process.env.GAPSEG || 'gap')(p); await tp(p, s0 + 3); await shot(p, 'gap', 1000); await p.close(); },
  async barrier() { const p = await open('seed=1&god=1&intro=0&foes=0'); const s0 = await segAt('barrier')(p); await tp(p, s0 + 5); await shot(p, 'barrier', 900); await p.close(); },
  async gallery() { // this stage's enemy models side by side, close up
    const p = await open('seed=1&god=1&intro=0&foes=0');
    await p.evaluate(() => {
      const W = window.__game.world, P = W.player; P.teleport(60); window.__bot.step(30);
      const types = [...new Set(W.stageData.roster.flat())], es = [];
      types.forEach((t, i) => { const e = W.enemies.spawn(t, 68, (i - (types.length - 1) / 2) * 1.7, 0, { active: false, edgeX: undefined }); e.speed = 0; e.alt = e.def.alt ? 1.2 : 0; if (e.def.alt) e.y = 1.2; es.push(e); });
      W.__gal = es; const cam = W.camera; W.rig.render = () => { cam.position.copy(W.track.toWorld(63.2, 0, 1.7)); cam.lookAt(W.track.toWorld(68, 0, 0.8)); cam.fov = 50; cam.updateProjectionMatrix(); };
      W.spawner.enabled = false; W.spawner.next = 1e9;
    });
    await shot(p, 'gallery', 1200); await p.close();
  },
  async gate() { const p = await open('seed=1&god=1&boss=1'); await shot(p, 'gate', 1500); await p.close(); },
  async boss() {
    const p = await open('seed=1&god=1&boss=1'); await p.keyboard.down('KeyW');
    await p.waitForFunction(() => window.__game.world.arena.boss, null, { timeout: 60000 }); await p.keyboard.up('KeyW');
    await shot(p, 'boss_intro', 500);
    await p.waitForFunction(() => { const b = window.__game.world.arena.boss; return b && b.passive === false; }, null, { timeout: 40000 });
    await p.evaluate(() => { const W = window.__game.world; W.player.teleport(W.arena.center.s - 9, 0); });
    await shot(p, 'boss_fight', 900);
    const states = (process.env.BOSS_STATES || 'windup,leap').split(',');
    for (const st of states) { await p.evaluate(() => { const K = window.__game.world.arena.boss; K.timer = 0; K.hopsLeft = 0; }); await p.waitForFunction((x) => window.__game.world.arena.boss.state === x, st, { timeout: 25000 }).catch(() => console.log('never reached state ' + st)); await shot(p, 'boss_' + st, 300); }
    await p.evaluate(() => { const W = window.__game.world; W.debug.bossHp(W.arena.boss.enemy.maxHp * 0.45); });
    await p.waitForFunction(() => window.__game.world.arena.boss.phase === 2, null, { timeout: 40000 }).catch(() => {}); await shot(p, 'boss_rage', 500);
    await p.close();
  },
  async clear() {
    const p = await open('seed=1&god=1&boss=1'); await p.keyboard.down('KeyW');
    await p.waitForFunction(() => window.__game.world.arena.boss && window.__game.world.arena.boss.passive === false, null, { timeout: 60000 }); await p.keyboard.up('KeyW');
    await p.evaluate(() => { const W = window.__game.world, e = W.arena.boss.enemy; e.hp = 0.5; W.combat.hitEnemy(e, 1, e.s, e.x, 1); });
    await shot(p, 'defeat', 1500); await shot(p, 'clear', 5500);
    await p.close();
  },
};
for (const k of Object.keys(jobs)) if (!want.length || want.includes(k)) await jobs[k]();
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no console errors');
await browser.close(); server.close();
