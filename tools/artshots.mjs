// Art review shots: node tools/artshots.mjs gates|hero|ammo|solids   -> remake/shots/art_<name>.jpg
// Loads the real level (intro off, foes off, god on), poses things in front of the default camera and saves jpgs.
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
const shot = async (page, name, wait = 600) => { await page.waitForTimeout(wait); await page.screenshot({ path: path.join(out, `art_${name}.jpg`), type: 'jpeg', quality: 86 }); console.log('shot', name); };
const jobs = {
  async gates() {
    const p = await open(`seed=${process.env.SEED || 1}&god=1&intro=0&foes=0`);
    const list = await p.evaluate(() => { const r = []; for (const g of window.__game.world.track.segments) for (const b of g.boxes) if (b.kind === 'barrier') r.push({ s0: b.s0, s1: b.s1 }); return r; });
    console.log('barriers', JSON.stringify(list));
    for (const [i, b] of list.entries()) {
      for (const [tag, back, wait] of [['far', 9, 900], ['near', 3.2, 500]]) {
        await p.evaluate(([s]) => { const W = window.__game.world; W.player.teleport(s); window.__bot.step(40); }, [b.s0 - back]);
        await shot(p, `gate${i}_${tag}`, wait);
      }
    }
    await p.close();
  },
  async hero() { // front and back, in the real level: camera swung round the hero; also the turn-around (hold S) in the default camera
    const p = await open('seed=1&god=1&intro=0&foes=0');
    await p.evaluate(() => { const W = window.__game.world; W.player.teleport(62); window.__bot.step(30); for (const c of W.pickups.list || []) if (c.s > 55 && c.s < 75) c.s = 500; });
    const cam = (az, el = 0.9, dist = 3.2, fov = 40) => p.evaluate(([a, e, d, f]) => {
      const W = window.__game.world, P = W.player.mesh.position; W.rig.render = () => { const c = W.camera; c.position.set(P.x + Math.sin(a) * d, P.y + e + 0.4, P.z + Math.cos(a) * d); c.lookAt(P.x, P.y + 0.95, P.z); c.fov = f; c.updateProjectionMatrix(); };
    }, [az, el, dist, fov]);
    for (const [name, az] of [['back', 0], ['front', Math.PI], ['side', Math.PI / 2], ['threeq', Math.PI * 0.8]]) { await cam(az); await shot(p, `hero_${name}`, 500); }
    await p.evaluate(() => { const W = window.__game.world; W.rig.render = W.rig.constructor ? undefined : undefined; });
    await p.close();
    const q = await open('seed=1&god=1&intro=0&foes=0'); await q.evaluate(() => { window.__game.world.player.teleport(30); window.__bot.step(30); });
    await q.keyboard.down('KeyS'); await shot(q, 'hero_turn_mid', 90); await shot(q, 'hero_turn_done', 700); await q.keyboard.up('KeyS'); await q.close();
  },
  async ammo() { // every round shape and the enemy globs, close up (side-on) and from the default camera, then a live burst
    const p = await open('seed=1&god=1&intro=0&foes=0');
    await p.evaluate(() => { const W = window.__game.world; W.player.teleport(62); window.__bot.step(30); for (const c of W.pickups.list || []) if (c.s > 55 && c.s < 85) c.s = 500; W.projectiles.clear(); });
    const place = (cam) => p.evaluate((cam) => {
      const W = window.__game.world, P = W.projectiles, b = W.player.body; P.clear(); const s0 = b.s + 9;
      const kinds = [['normal', ''], ['normal', 'spread'], ['super', ''], ['homing', ''], ['grenade', ''], ['spin', ''], ['laser', '']];
      kinds.forEach(([k, v], i) => { const q = P.fire(k, s0, (i - 3) * 0.62, 1.15, 0, k === 'spin' ? 0 : 0.01, 0.0); q.life = 99; q.variant = v; q.vx = k === 'spin' ? 0 : 0.01; q.vs = 0; if (k === 'spin') q.ang = 0.3; });
      ['bomb', 'acid', 'lightning', 'laser', 'homing'].forEach((st, i) => { const q = P.fireEnemy(st, s0, (i - 2) * 0.62, 2.0, 0, 0.01, 0); q.life = 99; });
      W.projectiles.update = () => {}; // freeze so the pose is stable
      if (cam === 'close') W.rig.render = () => { const c = W.camera; c.position.copy(W.track.toWorld(s0 - 3.6, 0, 1.7)); c.lookAt(W.track.toWorld(s0, 0, 1.65)); c.fov = 46; c.updateProjectionMatrix(); };
    }, cam);
    await place('close'); await shot(p, 'ammo_close', 700);
    await p.evaluate(() => { const W = window.__game.world; W.projectiles.clear(); });
    await p.close();
    const q = await open('seed=1&god=1&intro=0&foes=0');
    await q.evaluate(() => { const W = window.__game.world; W.player.teleport(62); window.__bot.step(30); for (const c of W.pickups.list || []) if (c.s > 55 && c.s < 85) c.s = 500; W.debug.spawnEnemies(3); for (const e of W.enemies.list) e.s = W.player.body.s + 14; });
    for (const [name, give] of [['normal', null], ['super', 'super'], ['spread', 'spread'], ['homing', 'homing'], ['grenade', 'grenade'], ['spin', 'spin']]) {
      await q.evaluate((g) => { const W = window.__game.world; W.weapon.reset(); if (g) W.weapon.give(g); }, give);
      await q.keyboard.down('KeyJ'); await q.waitForTimeout(520); await shot(q, `ammo_live_${name}`, 120); await q.keyboard.up('KeyJ');
    }
    await q.close();
  },
  async solids() {
    const p = await open(`seed=${process.env.SEED || 1}&god=1&intro=0&foes=0`);
    const find = (kind) => p.evaluate((k) => { for (const g of window.__game.world.track.segments) for (const b of g.boxes) if (b.kind === k) return b.s0; return -1; }, kind);
    for (const [kind, back, wait] of [['beam', 6, 800], ['platform', 8, 800], ['ledge', 6, 800]]) {
      const s = await find(kind); if (s < 0) { console.log('no', kind); continue; }
      await p.evaluate(([x]) => { window.__game.world.player.teleport(x); window.__bot.step(40); }, [s - back]);
      await shot(p, `solid_${kind}`, wait);
    }
    await p.close();
  },
};
for (const k of Object.keys(jobs)) if (!want.length || want.includes(k)) await jobs[k]();
console.log(errs.length ? 'ERRORS:\n' + [...new Set(errs)].join('\n') : 'no console errors');
await browser.close(); server.close();
