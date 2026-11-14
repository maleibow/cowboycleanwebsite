// Stage 1 screenshots: node tools/stage1shots.mjs [name,...]   (all by default)
// Loads the real level, puts the player at known points (opening, ghost-town side section, dust-ball chase,
// boss arena...) and saves remake/shots/stage1_<name>.jpg. Prints draw calls / triangles and any console errors.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const want = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const out = path.resolve(root, process.env.SHOT_DIR || 'remake/shots'); fs.mkdirSync(out, { recursive: true });
const errs = [];
const open = async (q) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !m.location().url?.includes('googleapis')) errs.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/cleaningup3d.html?${q}`);
  await page.waitForFunction(() => window.__game?.ready, null, { timeout: 30000 });
  await page.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
  return page;
};
const info = (page) => page.evaluate(() => { const i = window.__game.gfx.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, state: window.__game.state, s: +window.__game.world.player.body.s.toFixed(1) }; });
const shot = async (page, name, wait = 700) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(out, `stage1_${name}.jpg`), type: 'jpeg', quality: 84 }); console.log(name, JSON.stringify(await info(page))); };
const segAt = (name, n = 0) => (page) => page.evaluate(([nm, k]) => window.__game.world.layout.segments.filter((g) => g.name === nm)[k]?.s0 ?? -1, [name, n]);
const jobs = {
  async intro() { const p = await open('seed=1&god=1'); await shot(p, 'intro', 1200); await p.close(); },
  async opening() { const p = await open('seed=1&god=1&intro=0&foes=0'); await shot(p, 'opening', 1500); await p.close(); },
  async action() { const p = await open('seed=1&god=1&intro=0'); await p.evaluate(() => { const g = window.__game, W = g.world; W.player.teleport(80); window.__bot.step(60); W.debug.spawnEnemies(10); for (const e of W.enemies.list) e.s = W.player.body.s + 6 + Math.random() * 14; }); await p.keyboard.down('KeyJ'); await shot(p, 'action', 600); await p.keyboard.up('KeyJ'); await p.close(); },
  async side() { const p = await open('seed=1&god=1&intro=0'); const s0 = await segAt('side')(p); await p.evaluate((s) => { const W = window.__game.world; W.player.teleport(s + 24); window.__bot.step(1); }, s0); await p.keyboard.down('KeyD'); await shot(p, 'side', 1400); await p.keyboard.up('KeyD'); await p.close(); },
  async quicksand() { const p = await open('seed=1&god=1&intro=0'); const s0 = await segAt('quicksand')(p); if (s0 < 0) { console.log('no quicksand in seed 1'); await p.close(); return; } await p.evaluate((s) => { window.__game.world.player.teleport(s + 8); window.__bot.step(1); }, s0); await shot(p, 'quicksand', 1000); await p.close(); },
  async chase() { const p = await open('seed=1&god=1&intro=0&foes=0'); const s0 = await segAt('chase')(p); await p.evaluate((s) => { const W = window.__game.world; W.player.teleport(s + 3); window.__bot.step(1); }, s0); await p.keyboard.down('KeyW'); await shot(p, 'chase', 2200); await p.keyboard.up('KeyW'); await p.close(); },
  async gallery() { // the six stage-1 enemy models side by side, close up, facing the camera
    const p = await open('seed=1&god=1&intro=0&foes=0');
    await p.evaluate(() => {
      const W = window.__game.world, P = W.player; P.teleport(60); window.__bot.step(30);
      const types = ['dirt', 'ice', 'rabbit', 'vulture', 'dirty_ice', 'spider'], es = [];
      types.forEach((t, i) => { const e = W.enemies.spawn(t, 68, (i - 2.5) * 1.55, 0, { active: false, edgeX: t === 'spider' ? 3 : undefined }); if (t === 'spider') { e.state = 'walk'; e.y = 0; e.x = (i - 2.5) * 1.55; } e.speed = 0; e.alt = t === 'vulture' ? 1.2 : 0; es.push(e); });
      W.__gal = es; const cam = W.camera; W.rig.render = () => { cam.position.copy(W.track.toWorld(63.5, 0, 1.6)); cam.lookAt(W.track.toWorld(68, 0, 0.7)); cam.fov = 46; cam.updateProjectionMatrix(); };
      W.spawner.enabled = false; W.spawner.next = 1e9;
    });
    await shot(p, 'gallery', 1200);
    await p.evaluate(() => { for (const e of window.__game.world.__gal) { e.active = true; e.speed = 4; e.vs = 0; } window.__game.world.rig.render = () => { const W = window.__game.world; W.camera.position.copy(W.track.toWorld(64, 4, 2.6)); W.camera.lookAt(W.track.toWorld(68, 0, 0.7)); }; });
    await shot(p, 'gallery_move', 400);
    await p.close();
  },
  async gate() { const p = await open('seed=1&god=1&boss=1'); await shot(p, 'gate', 1500); await p.close(); },
  async boss() {
    const p = await open('seed=1&god=1&boss=1'); await p.keyboard.down('KeyW');
    await p.waitForFunction(() => window.__game.world.arena.boss, null, { timeout: 40000 }); await p.keyboard.up('KeyW');
    await shot(p, 'boss_intro', 350);                                                       // the drop and the title card
    await p.waitForFunction(() => window.__game.world.arena.boss.state === 'walk', null, { timeout: 40000 });
    await p.evaluate(() => { const W = window.__game.world; W.player.teleport(W.arena.center.s - 9, 0); });
    await shot(p, 'boss_fight', 900);
    await p.evaluate(() => { const K = window.__game.world.arena.boss; K.timer = 0; });      // start an attack: the windup shows the marker
    await p.waitForFunction(() => window.__game.world.arena.boss.state === 'windup', null, { timeout: 20000 });
    await shot(p, 'boss_windup', 450);
    await p.waitForFunction(() => window.__game.world.arena.boss.state === 'leap', null, { timeout: 20000 }); await shot(p, 'boss_leap', 450);
    await p.waitForFunction(() => window.__game.world.arena.boss.state === 'stun', null, { timeout: 20000 }); await shot(p, 'boss_ring', 700);
    await p.evaluate(() => { const W = window.__game.world; W.debug.bossHp(W.arena.boss.enemy.maxHp * 0.45); });
    await p.waitForFunction(() => window.__game.world.arena.boss.phase === 2 && window.__game.world.arena.boss.state === 'rage', null, { timeout: 30000 }); await shot(p, 'boss_rage', 500);
    await p.close();
  },
  async clear() {
    const p = await open('seed=1&god=1&boss=1'); await p.keyboard.down('KeyW');
    await p.waitForFunction(() => window.__game.world.arena.boss?.state === 'walk', null, { timeout: 60000 }); await p.keyboard.up('KeyW');
    await p.evaluate(() => { const W = window.__game.world, e = W.arena.boss.enemy; e.hp = 0.5; W.combat.hitEnemy(e, 1, e.s, e.x, 1); });
    await shot(p, 'defeat', 1500); await shot(p, 'victory', 2300); await shot(p, 'clear', 3500);
    await p.close();
  },
};
for (const k of Object.keys(jobs)) if (!want.length || want.includes(k)) await jobs[k]();
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no console errors');
await browser.close(); server.close();
