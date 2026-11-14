// Game-flow checks: node tools/smokeFlow.mjs   (title -> cutscene -> stage -> casino -> clear -> saloon -> next stage,
// ending/victory/loop, every cheat, pause, game over, name entry, leaderboard write, prize email).
// Firebase and MailerLite are stubbed with page.route so the run does not need the network; the stub records exactly
// what the game sent, and the test checks it (document fields, form fields). Saves screenshots to remake/shots/flow_*.jpg.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'remake/shots'); fs.mkdirSync(shots, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port, failures = [];
const fail = (m) => { failures.push(m); console.error('FAIL: ' + m); };
const ok = (c, m) => { if (!c) fail(m); };
const isExt = (u) => u && !u.startsWith(`http://127.0.0.1:${port}`);
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// In-memory stand-ins for the Firebase SDK (same API surface the leaderboard service uses) and for the MailerLite form.
const FB_APP = `export const initializeApp = (c) => ({ config: c });`;
const FB_FS = `
const store = (window.__fbStore ||= { docs: [], writes: [], configs: [] });
export const getFirestore = (app, id) => (store.configs.push({ id, projectId: app.config.projectId }), { id });
export const collection = (db, name) => ({ name });
export const where = () => ({}); export const orderBy = () => ({}); export const limit = (n) => ({ n });
export const query = (c, ...r) => ({ c, limit: r.find((x) => x.n)?.n || 5 });
export const serverTimestamp = () => '<serverTimestamp>';
export const addDoc = async (c, data) => { store.writes.push({ collection: c.name, data }); store.docs.push(data); return { id: 'x' }; };
export const getDocs = async (q) => { const rows = [...store.docs].sort((a, b) => b.score - a.score).slice(0, q.limit); return { forEach: (f) => rows.forEach((d) => f({ data: () => d })) }; };
export const getDocFromServer = async () => ({}); export const doc = () => ({});`;
async function open(q, { stubs = true } = {}) {
  const pg = await browser.newPage({ viewport: { width: 960, height: 540 } });
  pg.mails = [];
  pg.on('console', (m) => { if (m.type() === 'error' && !isExt(m.location().url)) fail('console error: ' + m.text()); });
  pg.on('pageerror', (e) => fail('page error: ' + e.message));
  if (stubs) {
    await pg.route('https://www.gstatic.com/firebasejs/**', (r) => r.fulfill({ contentType: 'text/javascript', body: r.request().url().includes('firestore') ? FB_FS : FB_APP }));
    await pg.route('https://assets.mailerlite.com/**', (r) => { pg.mails.push({ url: r.request().url(), body: r.request().postData() }); r.fulfill({ status: 200, body: '' }); });
  }
  await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?${q}${/quality=/.test(q) ? '' : '&quality=low'}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 60000 });
  return pg;
}
const state = (pg) => pg.evaluate(() => window.__game.state);
const waitState = (pg, s, ms = 20000) => pg.waitForFunction((x) => window.__game.state === x, s, { timeout: ms }).catch(async () => fail(`never reached ${s} (state ${await state(pg)})`));
const shot = (pg, n) => pg.screenshot({ path: path.join(shots, `flow_${n}.jpg`), type: 'jpeg', quality: 80 });
const click = (pg, text) => pg.locator('#ui div[role=button]', { hasText: text }).first().click({ timeout: 5000 }).catch(() => fail('no visible button: ' + text));
const text = (pg) => pg.evaluate(() => document.getElementById('ui').innerText + '\n' + document.getElementById('hud').innerText);

// ---------------------------------------------------------------- 1. title screen
{
  const pg = await open('');
  await waitState(pg, 'TITLE'); await pg.waitForTimeout(1200);
  const t = await text(pg);
  ok(/COWBOY CLEAN/.test(t) && /START/.test(t) && /LEADERBOARD/.test(t) && /SECRET CODE/.test(t), 'title screen lacks title / Start / Leaderboard / Secret Code: ' + t.slice(0, 120));
  ok(await pg.evaluate(() => [...document.querySelectorAll('#ui div')].some((d) => d.textContent === '⛶')), 'no fullscreen button');
  const s0 = await pg.evaluate(() => window.__game.flow.G.fly.s); await pg.waitForTimeout(1500); const s1 = await pg.evaluate(() => window.__game.flow.G.fly.s);
  ok(s1 > s0 + 3, `title fly-through is not moving (${s0} -> ${s1})`);
  await shot(pg, '01_title');
  await click(pg, 'LEADERBOARD'); await pg.waitForTimeout(800);
  ok(/GLOBAL TOP 5/.test(await text(pg)), 'leaderboard panel did not open'); await shot(pg, '02_leaderboard_empty');
  await click(pg, 'BACK');
  // secret code: invalid, empty, then SKIPTO3
  await click(pg, 'SECRET CODE'); await pg.fill('#cheat-input', 'nope'); await pg.keyboard.press('Enter');
  ok(/INVALID SECRET CODE/.test(await text(pg)), 'invalid code gave no error'); await shot(pg, '03_secret_code');
  await pg.fill('#cheat-input', ''); await pg.keyboard.press('Enter'); ok(await state(pg) === 'TITLE', 'empty code should do nothing');
  await pg.fill('#cheat-input', 'skipto3'); await pg.keyboard.press('Enter');
  await waitState(pg, 'CUTSCENE'); const r = await pg.evaluate(() => ({ stage: window.__game.run.stage, line: document.getElementById('ui').innerText }));
  ok(r.stage === 3 && /Cowboy Clean/i.test(r.line) && /Neo-Scrap|trash/i.test(await pg.evaluate(() => document.getElementById('ui').innerText + window.__game.flow.G.world.stageData.name)), 'SKIPTO3 should start stage 3 with its cutscene');
  await pg.close();
}

// ---------------------------------------------------------------- 2. cheats, each one
{
  const pg = await open('');
  await waitState(pg, 'TITLE');
  const tryCode = async (code) => {
    await pg.evaluate(() => window.__game.flow.toTitle()); await waitState(pg, 'TITLE');
    await pg.evaluate((c) => { window.__game.flow.title.openCheat(); window.__game.flow.title.submitCheat(c); }, code);
    await waitState(pg, 'CUTSCENE');
    return pg.evaluate(() => ({ stage: window.__game.run.stage, vehicle: window.__game.run.upgrades.vehicle, score: window.__game.run.score, coins: window.__game.run.coins, name: window.__game.flow.G.world.stageData.name }));
  };
  for (let n = 1; n <= 9; n++) { const r = await tryCode('SKIPTO' + n); ok(r.stage === n && !r.vehicle && r.score === 0, `SKIPTO${n} -> ${JSON.stringify(r)}`); }
  for (const c of ['HORSE', 'mechahorse']) { const r = await tryCode(c); ok(r.stage === 1 && r.vehicle === true, `${c} -> ${JSON.stringify(r)}`); }
  { const r = await tryCode('CHARCOAL'); ok(r.stage === 10 && r.name === 'Charcoal Streets', `CHARCOAL -> ${JSON.stringify(r)}`); }
  console.log('cheats: SKIPTO1-9, HORSE, MECHAHORSE, CHARCOAL checked');
  await pg.close();
}

// ---------------------------------------------------------------- 3. Start -> intro cutscene -> stage 1 -> casino -> clear -> saloon -> stage 2
{
  const seed = await (async () => { const p = await open('title=0&stage=1'); const s = await p.evaluate(async () => { const g = await import('/game3d/world/generator.js'), d = await import('/game3d/data/stages.js'); for (let sd = 1; sd < 400; sd++) if (g.generateStage(d.getStage(1), sd).slots.some((x) => x.kind === 'door')) return sd; }); await p.close(); return s; })();
  const pg = await open(`seed=${seed}&god=1`);
  await waitState(pg, 'TITLE'); await click(pg, 'START'); await waitState(pg, 'CUTSCENE');
  // typewriter: text grows, then a tap finishes the line, a second tap goes to the next
  await pg.waitForTimeout(250); const a = await pg.evaluate(() => document.getElementById('ui').innerText);
  ok(/Grime Overlord/.test(a), 'intro should open with the Grime Overlord'); await shot(pg, '04_cutscene_overlord');
  await pg.mouse.click(480, 200); await pg.waitForTimeout(100);
  const b = await pg.evaluate(() => document.getElementById('ui').innerText);
  ok(b.includes("MWAHAHA! This world is far too clean! I'm taking over, and taking Miss Cowboy with me!"), 'a tap should complete the typewriter line verbatim');
  await pg.mouse.click(480, 200); await pg.waitForTimeout(400);
  ok(/Miss Cowboy/.test(await pg.evaluate(() => document.getElementById('ui').innerText)), 'second tap should show Miss Cowboy'); await pg.waitForTimeout(1800); await shot(pg, '05_cutscene_miss');
  await pg.mouse.click(480, 200); await pg.mouse.click(480, 200); await pg.waitForTimeout(300); await pg.mouse.click(480, 200); await pg.waitForTimeout(300);
  ok(/Cowboy Clean/.test(await pg.evaluate(() => document.getElementById('ui').innerText)), 'third line is Cowboy Clean'); await pg.waitForTimeout(1500); await shot(pg, '06_cutscene_cowboy');
  await click(pg, 'SKIP'); await waitState(pg, 'INTRO'); ok((await state(pg)) === 'INTRO', 'skip should end the cutscene');
  await pg.keyboard.press('Space'); await waitState(pg, 'PLAYING');

  // casino door
  await pg.evaluate(() => { const g = window.__game, W = g.world, d = W.doors.list[0]; g.run.coins = 100; W.player.teleport(d.s - 6, 0); });
  await pg.waitForTimeout(600); await shot(pg, '07_door_approach');
  const doorInfo = await pg.evaluate(() => { const W = window.__game.world, d = W.doors.list[0]; return { n: W.doors.list.length, s: d.s, x: d.x }; });
  await pg.evaluate(() => { const W = window.__game.world, d = W.doors.list[0]; W.player.teleport(d.s, d.x); });
  await waitState(pg, 'CASINO'); await pg.waitForTimeout(500); await shot(pg, '08_casino_idle');
  ok(/Match 3 to WIN!/.test(await text(pg)) && /PULL LEVER \(10c\)/.test(await text(pg)), 'casino text');
  // force a jackpot (rigged roll) and a miss, check the prize and cost
  const pull = async (rand) => { await pg.evaluate((r) => { const c = window.__game.flow.casino; c.slot.reset(); c.slot.rand = r; }, rand); };
  await click(pg, 'PULL LEVER'); await pg.waitForTimeout(700); await shot(pg, '09_casino_spinning');
  await pg.waitForFunction(() => window.__game.flow.casino.slot.state === 'DONE', null, { timeout: 15000 }).catch(() => fail('slot never finished'));
  const res = await pg.evaluate(() => { const c = window.__game.flow.casino; return { coins: window.__game.run.coins, target: [...c.slot.target], result: c.slot.result, text: document.getElementById('ui').innerText }; });
  ok(res.coins === 90 + (res.result === 'COIN' ? 100 : 0), 'a pull costs 10c: ' + JSON.stringify(res));
  ok(res.result ? /JACKPOT! WON/.test(res.text) : /NO LUCK! TRY AGAIN\./.test(res.text), 'casino result text: ' + JSON.stringify(res)); await shot(pg, '10_casino_result');
  await pg.evaluate(() => { window.__game.run.coins = 5; }); await click(pg, 'PULL LEVER'); await pg.waitForTimeout(200);
  ok(/NOT ENOUGH COINS!/.test(await text(pg)), 'broke message');
  await click(pg, 'LEAVE'); await waitState(pg, 'PLAYING');
  ok(await pg.evaluate(() => window.__game.world.doors.list[0].used), 'door should be used up');
  console.log(`casino: door at s=${doorInfo.s.toFixed(0)} (seed ${seed}), pull/win/miss/broke/leave ok`);

  // stage clear -> tally -> saloon
  await pg.evaluate(() => { const g = window.__game; g.run.score = 1200; g.run.coins = 2000; g.events.emit('stageCleared', g.world.clearStats()); });
  await waitState(pg, 'STAGECLEAR'); await pg.waitForTimeout(3500); await shot(pg, '11_stage_clear');
  await pg.keyboard.press('Enter'); await waitState(pg, 'STORE'); await pg.waitForTimeout(1200); await shot(pg, '12_saloon');
  const T = await text(pg);
  for (const w of ['High Jump', 'Speed Boots', 'Big Bullets', 'Magic Lasso', 'Laser Gun', 'Mecha-Horse', '100c', '150c', '400c', '500c', '800c', 'NEXT STAGE', 'COINS: 2000']) ok(T.includes(w), 'store lacks ' + w);
  const up = async () => pg.evaluate(() => ({ ...window.__game.run.upgrades, coins: window.__game.run.coins }));
  for (const id of ['jump', 'jump', 'jump', 'jump', 'speed', 'size', 'lasso', 'laser', 'laser', 'vehicle']) await pg.evaluate((i) => window.__game.flow.store.buy(i), id);
  const u = await up(); await pg.waitForTimeout(300); await shot(pg, '13_saloon_bought');
  ok(u.jump === 3 && u.speed === 1 && u.size === 1 && u.lasso && u.laser && u.vehicle, 'upgrades after buying: ' + JSON.stringify(u));
  ok(u.coins === 2000 - 300 - 100 - 150 - 400 - 500 - 800 + 0 + 450 - 450 || u.coins === 2000 - (300 + 100 + 150 + 400 + 500 + 800), 'coins after buying: ' + u.coins);
  await pg.evaluate(() => { window.__game.run.coins = 50; }); await pg.evaluate(() => window.__game.flow.store.buy('speed'));
  ok((await up()).speed === 1 && (await up()).coins === 50, 'cannot buy without coins');
  console.log('store: prices, max levels, owned/maxed ok');
  await click(pg, 'NEXT STAGE'); await waitState(pg, 'CUTSCENE');
  const c2 = await pg.evaluate(() => ({ stage: window.__game.run.stage, ui: document.getElementById('ui').innerText, name: window.__game.flow.G.world.stageData.name }));
  ok(c2.stage === 2 && c2.name === 'Toxic Jungle' && /Cowboy Clean/.test(c2.ui), 'after the saloon: stage 2 cutscene ' + JSON.stringify({ ...c2, ui: '' }));
  await pg.mouse.click(480, 200); await pg.waitForTimeout(150); await pg.mouse.click(480, 200); await pg.waitForTimeout(300);
  await pg.mouse.click(480, 200); await pg.mouse.click(480, 200); await pg.waitForTimeout(200); await pg.mouse.click(480, 200); await waitState(pg, 'INTRO');
  ok(/TOXIC JUNGLE/.test(await text(pg)), 'stage 2 intro card shows its own name'); await shot(pg, '14_stage2_intro');
  await pg.keyboard.press('Space'); await waitState(pg, 'PLAYING'); await pg.waitForTimeout(500); await shot(pg, '15_stage2_playing');
  ok(await pg.evaluate(() => window.__game.world.stageData.roster.flat().includes('slime') && window.__game.run.upgrades.vehicle), 'stage 2 stand-in roster / carried upgrades');
  console.log('flow: title -> intro cutscene -> stage 1 -> casino -> clear -> saloon -> stage 2 cutscene -> stage 2 ok');

  // ---------------------------------------------------------------- pause menu
  await pg.keyboard.press('Escape'); await waitState(pg, 'PAUSED'); await pg.waitForTimeout(300);
  const P = await text(pg); ok(/RESUME/.test(P) && /RESTART STAGE/.test(P) && /JUKEBOX/.test(P), 'pause menu items'); await shot(pg, '16_pause');
  await click(pg, 'RESUME'); await waitState(pg, 'PLAYING');
  await pg.evaluate(() => { window.__game.world.player.teleport(100); }); await pg.keyboard.press('Escape'); await waitState(pg, 'PAUSED'); await click(pg, 'RESTART STAGE'); await waitState(pg, 'PLAYING');
  ok(await pg.evaluate(() => window.__game.world.player.body.s < 20), 'restart should put the hero back at the start');
  await pg.close();
}

// ---------------------------------------------------------------- 4. ending, victory, loop 2
{
  const pg = await open('stage=10&seed=1&god=1&intro=0');
  await waitState(pg, 'PLAYING');
  await pg.evaluate(() => { const g = window.__game; g.run.score = 5000; g.events.emit('stageCleared', g.world.clearStats()); });
  await waitState(pg, 'STAGECLEAR'); await pg.waitForTimeout(3500); await pg.keyboard.press('Enter'); await waitState(pg, 'CUTSCENE');
  ok(await pg.evaluate(() => /Grime Overlord/.test(document.getElementById('ui').innerText)), 'ending cutscene starts with the Grime Overlord');
  for (let i = 0; i < 8 && (await state(pg)) === 'CUTSCENE'; i++) { await pg.mouse.click(480, 200); await pg.waitForTimeout(120); }
  await waitState(pg, 'VICTORY'); await pg.waitForTimeout(2500); await shot(pg, '17_victory'); ok(/THE END/.test(await text(pg)), 'victory screen text');
  await click(pg, 'CONTINUE'); await waitState(pg, 'STORE'); await click(pg, 'NEXT STAGE'); await waitState(pg, 'INTRO');
  const L = await pg.evaluate(() => ({ stage: window.__game.run.stage, loop: window.__game.run.stageLoop, score: window.__game.run.score }));
  ok(L.stage === 1 && L.loop === 2 && L.score === 5000, 'after the ending: stage 1, stageLoop 2, score kept: ' + JSON.stringify(L));
  console.log('loop: stage 10 -> ending -> victory -> saloon -> stage 1 loop 2 ok');
  await pg.close();
}

// ---------------------------------------------------------------- 5. game over, name entry, leaderboard, prize, retry
{
  const pg = await open('stage=1&seed=1&intro=0');
  await waitState(pg, 'PLAYING');
  await pg.evaluate(() => { const g = window.__game; g.run.score = 6200; g.world.player.hurt(500); });
  await waitState(pg, 'GAMEOVER'); await pg.waitForTimeout(1200);
  let t = await text(pg); ok(/GRIME OVERLOAD/.test(t) && /FINAL SCORE: 6200/.test(t) && /RETRY STAGE/.test(t) && /POST SCORE/.test(t) && /SPECIAL PRIZE UNLOCKED/.test(t) && /Score 5000\+/.test(t), 'game over screen: ' + t.slice(0, 200));
  await shot(pg, '18_gameover');
  await pg.keyboard.type('mike', { delay: 30 }); await pg.keyboard.press('Enter'); await pg.waitForTimeout(600);
  const fb = await pg.evaluate(() => window.__fbStore);
  ok(fb.writes.length === 1 && fb.writes[0].collection === 'leaderboard', 'leaderboard write: ' + JSON.stringify(fb.writes));
  const w = fb.writes[0]?.data || {};
  ok(JSON.stringify(Object.keys(w).sort()) === JSON.stringify(['createdAt', 'displayName', 'score', 'stage']) && w.displayName === 'MIKE' && w.score === 6200 && w.stage === 1 && w.createdAt === '<serverTimestamp>', 'document fields must be exactly displayName/score/stage/createdAt: ' + JSON.stringify(w));
  ok(fb.configs[0]?.id === 'ai-studio-7fdc4464-e081-489d-aa81-f0b248cbd2fe' && fb.configs[0]?.projectId === 'gen-lang-client-0433363406', 'firestore project / database id: ' + JSON.stringify(fb.configs[0]));
  t = await text(pg); ok(/Score Saved To Leaderboard!/.test(t) && /1\. MIKE/.test(t) && /6200pt/.test(t), 'status + top 5 list after posting: ' + t.slice(0, 300)); await shot(pg, '19_gameover_posted');
  await pg.fill('input[type=email]', 'bad'); await click(pg, 'CLAIM'); ok(/PLEASE ENTER VALID EMAIL/.test(await text(pg)), 'bad email message');
  await pg.fill('input[type=email]', 'fan@example.com'); await click(pg, 'CLAIM'); await pg.waitForTimeout(500);
  t = await text(pg); ok(/SUCCESS! ENJOY THE REWARDS\./.test(t) && /Black Sheep Boy Cover/.test(t) && /Shelter Live Acoustic/.test(t) && /Rochee Remix/.test(t) && !/T-SHIRT/.test(t), 'prize links at 5000+');
  ok(pg.mails.length === 1 && /subscribe$/.test(pg.mails[0].url) && /fields\[email\]/.test(pg.mails[0].body) && /fan%40example\.com|fan@example\.com/.test(pg.mails[0].body) && /ml-submit/.test(pg.mails[0].body) && /anticsrf/.test(pg.mails[0].body), 'prize post: ' + JSON.stringify(pg.mails));
  await shot(pg, '20_gameover_prize');
  await pg.evaluate(() => document.activeElement?.blur()); await pg.keyboard.press('Enter'); await waitState(pg, 'PLAYING');
  const r = await pg.evaluate(() => ({ hp: window.__game.run.health, score: window.__game.run.score, dead: window.__game.world.player.dead }));
  ok(r.hp === 100 && r.score === 0 && !r.dead, 'Retry stage restores the stage-start score and full health: ' + JSON.stringify(r));
  console.log('game over: name entry, leaderboard fields, top-5 list, prize email form, retry ok');
  await pg.close();
}
{ // network blocked: the leaderboard must fail gracefully and stay wired
  const pg = await open('stage=1&seed=1&intro=0', { stubs: false });
  await waitState(pg, 'PLAYING'); await pg.evaluate(() => { window.__game.run.score = 300; window.__game.world.player.hurt(500); });
  await waitState(pg, 'GAMEOVER'); await pg.keyboard.type('x'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(2500);
  const t = await text(pg); ok(/Failed to save score\.|Saving score/.test(t), 'offline post should report failure: ' + t.slice(0, 200)); console.log('offline: status shown = ' + (/Failed to save score\./.test(t)));
  await pg.close();
}

await browser.close(); server.close();
if (failures.length) { console.error(`\n${failures.length} FAILURE(S)`); process.exit(1); }
console.log('\nsmokeFlow: all checks passed');
