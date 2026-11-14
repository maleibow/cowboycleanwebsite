// Jukebox checks: node tools/smokeJukebox.mjs
// 1. no music files: synth music plays, no page errors   2. a file at the path named in data/music.js is streamed instead
// 3. Spotify mode: embed docked, game mix silent, SFX still play, nothing auto-starts   4. settings persist
// 5. the embed follows the stage   6. intro card, pause menu panel and results list show the new UI.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port, failures = [];
const fail = (m) => { failures.push(m); console.error('FAIL: ' + m); };
const ok = (c, m) => { if (!c) fail(m); else console.log('ok: ' + m); };
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

// a 2 s 440 Hz tone as a WAV, served under the .mp3 name (Chromium sniffs the real format)
const wav = (() => { const sr = 8000, n = sr * 2, b = Buffer.alloc(44 + n); b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40); for (let i = 0; i < n; i++) b[44 + i] = 128 + Math.round(90 * Math.sin(i * 2 * Math.PI * 440 / sr)); return b; })();
const open = async (q, { file = false, ctx } = {}) => {
  const pg = await (ctx || browser).newPage({ viewport: { width: 960, height: 540 } });
  pg.on('console', (m) => { const u = m.location().url || ''; if (m.type() === 'error' && u.startsWith(`http://127.0.0.1:${port}`) && !u.includes('/game3d/music/')) fail('console error: ' + m.text()); });
  pg.on('pageerror', (e) => fail('page error: ' + e.message));
  if (file) await pg.route('**/game3d/music/stage01.mp3', (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: wav }));
  await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?${q}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 60000 });
  return pg;
};
const info = (pg) => pg.evaluate(() => window.__game.jukebox.info());
const until = (pg, fn, ms = 15000) => pg.waitForFunction(fn, null, { timeout: ms }).then(() => true, () => false);
const Q = 'stage=1&intro=0&quality=low&seed=1';

{ // 1. no files: synth plays
  const pg = await open(Q); await pg.keyboard.press('KeyD');
  ok(await until(pg, () => window.__game.jukebox.info().voice === 'synth' && window.__game.jukebox.info().playing), 'no music files: the synth loop plays');
  const i = await info(pg); ok(i.failed.length >= 0 && i.key === 'stage1', 'slot is stage1 (' + JSON.stringify(i) + ')');
  const pulses = await pg.evaluate(async () => { let hi = 0, n = 0; const t0 = performance.now(); while (performance.now() - t0 < 4000) { const e = window.__game.jukebox.energy; hi = Math.max(hi, e.pulse); n += e.bass > 0.01 ? 1 : 0; await new Promise((r) => setTimeout(r, 50)); } return { hi, n }; });
  console.log('analyser over 4 s:', JSON.stringify(pulses)); ok(pulses.n > 0, 'analyser sees the synth music (bass energy > 0)');
  await pg.close();
}
{ // 2. a file at the named path is used
  const pg = await open(Q, { file: true }); await pg.keyboard.press('KeyD');
  ok(await until(pg, () => { const i = window.__game.jukebox.info(); return i.voice === 'file' && i.playing; }), 'a file at the data/music.js path is streamed');
  const i = await info(pg); ok(/music\/stage01\.mp3$/.test(i.src || ''), 'it is stage01.mp3 (' + i.src + ')');
  await pg.close();
}
{ // 3-5. Spotify mode
  const pg = await open(Q); await pg.keyboard.press('KeyD');
  await until(pg, () => window.__game.jukebox.info().playing);
  await pg.evaluate(async () => { const m = await import('/game3d/data/music.js'); m.MUSIC.stage1.spotifyUrl = 'https://open.spotify.com/track/AAAAAAAAAAAAAAAAAAAAAA'; m.MUSIC.stage2.spotifyUrl = 'https://open.spotify.com/track/BBBBBBBBBBBBBBBBBBBBBB'; window.__game.jukebox.set({ source: 'spotify' }); });
  ok(await until(pg, () => document.querySelector('iframe[src*="open.spotify.com/embed/track/AAAA"]'), 12000), 'Spotify mode docks the embed iframe for the stage track');
  await until(pg, () => window.__game.sfx.synth.musicBus.gain.value < 0.01, 5000);   // the gain glides down (setTargetAtTime)
  const st = await pg.evaluate(() => { const i = window.__game.jukebox.info(), f = document.querySelector('iframe[src*="open.spotify.com"]'), r = f.getBoundingClientRect(), b = document.getElementById('game-scale-box').getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { i, inside: r.left >= b.left && r.right <= b.right + 1 && r.bottom <= b.bottom + 1 && r.width > 100, onTop: top === f || f.parentElement.parentElement.contains(top), text: document.body.innerText.includes('Press play to listen on Spotify'), gain: window.__game.sfx.synth.musicBus.gain.value }; });
  ok(st.i.voice === 'none' && !st.i.playing, 'game mix is stopped in Spotify mode'); ok(st.gain < 0.05, 'music bus is silent (' + st.gain.toFixed(3) + ')');
  ok(st.inside && st.onTop, 'embed is visible, inside the game box and not covered'); ok(st.text, '"Press play to listen on Spotify" is shown');
  const v = await pg.evaluate(() => { window.__game.sfx.play('bomb'); return window.__game.sfx.synth.voices; }); ok(v > 0, 'SFX still play in Spotify mode (voices ' + v + ')');
  await pg.evaluate(() => { window.__game.run.stage = 2; window.__game.events.emit('state', 'INTRO'); });
  ok(await until(pg, () => document.querySelector('iframe[src*="embed/track/BBBB"]'), 8000), 'the embed reloads the next stage track');
  await pg.evaluate(() => window.__game.jukebox.set({ source: 'mix' }));
  ok(await until(pg, () => !document.querySelector('iframe[src*="open.spotify.com"]') && window.__game.jukebox.info().voice === 'synth'), 'switching back removes the embed and the game mix returns');
  await pg.evaluate(() => window.__game.jukebox.set({ music: 0.33, sfx: 0.5 })); await pg.close();
}
{ // 4. settings persisted across a reload (same browser context = same localStorage)
  const ctx = await browser.newContext(); const a = await open(Q, { ctx }); await a.evaluate(() => window.__game.jukebox.set({ source: 'synth', music: 0.33, sfx: 0.5 })); await a.close();
  const b = await open(Q, { ctx }); const c = await b.evaluate(() => window.__game.jukebox.cfg);
  ok(c.source === 'synth' && Math.abs(c.music - 0.33) < 1e-6 && Math.abs(c.sfx - 0.5) < 1e-6, 'settings remembered in localStorage ' + JSON.stringify(c)); await ctx.close();
}
{ // 6. UI: stage intro card, pause panel, results list
  const pg = await open('stage=1&quality=low&seed=1&god=1'); await pg.keyboard.press('KeyD');
  await until(pg, () => window.__game.state === 'INTRO', 8000);
  const card = await pg.evaluate(() => [...document.querySelectorAll('#hud a')].map((a) => a.textContent + ' -> ' + a.href));
  ok(card.some((t) => /Listen on Spotify/.test(t)) && card.some((t) => /Follow .*6uiAnXipuNymu9Bd9ZYLN0/.test(t)), 'intro card has Listen + Follow links ' + JSON.stringify(card));
  const txt = await pg.evaluate(() => document.getElementById('hud').innerText); ok(/♪\s+Track title to be announced\s+—\s+Cowboy Clean/.test(txt), 'intro card shows "♪ Track — Cowboy Clean"');
  await pg.screenshot({ path: path.join(root, 'remake/shots/jukebox_intro.png') });
  await until(pg, () => window.__game.state === 'PLAYING', 12000);
  const chip = await pg.evaluate(() => document.getElementById('hud').innerText.includes('♪')); ok(chip, 'HUD now-playing chip is shown');
  await pg.keyboard.down('Escape'); await pg.waitForTimeout(600); await pg.keyboard.up('Escape'); await until(pg, () => window.__game.state === 'PAUSED', 8000);
  await pg.screenshot({ path: path.join(root, 'remake/shots/jukebox_pause.png') });
  const panel = await pg.evaluate(() => { const u = document.getElementById('ui').innerText; return /JUKEBOX/.test(u) && /GAME MIX/.test(u) && /SPOTIFY/.test(u) && /SYNTH/.test(u) && document.querySelectorAll('#ui input[type=range]').length >= 2; }); ok(panel, 'pause menu has the jukebox panel');
  await pg.keyboard.down('Escape'); await pg.waitForTimeout(600); await pg.keyboard.up('Escape'); await until(pg, () => window.__game.state === 'PLAYING', 8000);
  await pg.evaluate(() => { window.__game.flow.go('GAMEOVER'); }); await pg.waitForTimeout(300);
  const heard = await pg.evaluate(() => document.getElementById('ui').innerText.includes('TRACKS YOU HEARD')); ok(heard, 'game-over screen lists tracks heard');
  await pg.screenshot({ path: path.join(root, 'remake/shots/jukebox_gameover.png') });
  await pg.close();
}
await browser.close(); server.close();
if (failures.length) { console.error(`\n${failures.length} FAILURE(S)`); process.exit(1); }
console.log('\njukebox checks passed');
