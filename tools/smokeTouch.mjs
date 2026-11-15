// Touch-controls smoke test: node tools/smokeTouch.mjs
// Emulated touch (Chromium CDP Input.dispatchTouchEvent, several fingers at once) drives the on-screen joystick and
// JUMP / SPRAY / BOMB / SLIDE buttons through a whole of stage 1: intro card tap -> run -> gate -> boss -> stage-clear screen.
// No keyboard is used (input.keys must stay empty). Also checks layout (thumb sizes, no overlap, inside the screen), that the
// controls are hidden on desktop, the portrait rotate prompt, multi-touch (>= 3 fingers down at once), and no console errors.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port, failures = [];
const fail = (m) => { failures.push(m); console.error('FAIL: ' + m); };
const isExt = (u) => u && (!u.startsWith(`http://127.0.0.1:${port}`) || u.includes('/game3d/music/'));
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const url = (q) => `http://127.0.0.1:${port}/cleaningup3d.html?${q}`;
async function open(ctxOpts, q, wait = true) {
  const ctx = await browser.newContext(ctxOpts), pg = await ctx.newPage();
  pg.on('console', (m) => { if (m.type() === 'error' && !isExt(m.location().url)) fail('console error: ' + m.text()); });
  pg.on('pageerror', (e) => fail('page error: ' + e.message));
  await pg.goto(url(q), { waitUntil: 'domcontentloaded', timeout: 90000 });
  if (wait) await pg.waitForFunction(() => window.__game && window.__game.ready && window.__game.world, null, { timeout: 90000 });
  return { ctx, pg };
}
const PHONE = { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
const Q = 'stage=1&seed=2&god=1&quality=low&dynres=0';

// ---- 1. desktop: no touch controls
{
  const { ctx, pg } = await open({ viewport: { width: 1280, height: 720 } }, Q + '&intro=0');
  const d = await pg.evaluate(() => ({ disp: getComputedStyle(document.getElementById('touch-ui')).display, enabled: window.__game.touch.enabled }));
  console.log('desktop: ' + JSON.stringify(d));
  if (d.disp !== 'none' || d.enabled) fail('touch controls must be hidden on desktop');
  await ctx.close();
}

// ---- 2. portrait phone: rotate prompt, no controls; landscape: controls
{
  const { ctx, pg } = await open({ ...PHONE, viewport: { width: 390, height: 844 } }, Q + '&intro=0');
  const p = await pg.evaluate(() => ({ prompt: getComputedStyle(document.getElementById('rotate-prompt')).display, ui: getComputedStyle(document.getElementById('touch-ui')).display, text: document.getElementById('rotate-prompt').innerText }));
  console.log('portrait 390x844: ' + JSON.stringify(p));
  if (p.prompt === 'none' || !/ROTATE/i.test(p.text)) fail('portrait phone must show the rotate prompt');
  if (p.ui !== 'none') fail('touch controls must be hidden behind the rotate prompt');
  await pg.screenshot({ path: path.join(root, 'remake/shots/touch_portrait.png') });
  await pg.setViewportSize({ width: 844, height: 390 }); await pg.waitForTimeout(500);
  const l = await pg.evaluate(() => { const g = window.__game, was = g.state; g.flow.go('PLAYING'); return { prompt: getComputedStyle(document.getElementById('rotate-prompt')).display, ui: getComputedStyle(document.getElementById('touch-ui')).display, wasState: was, state: g.state }; });
  console.log('landscape 844x390: ' + JSON.stringify(l));
  if (l.wasState !== 'PAUSED') fail('turning the phone upright mid-game should have paused it (state ' + l.wasState + ')');
  if (l.prompt !== 'none' || l.ui === 'none') fail('rotating to landscape must hide the prompt and show the controls once playing: ' + JSON.stringify(l));
  await ctx.close();
}

// ---- 3. the full stage-1 run with fingers
const { ctx, pg } = await open(PHONE, Q);
const cdp = await ctx.newCDPSession(pg);
await pg.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
await pg.evaluate(() => window.__game.loop.stop());     // the test drives the simulation itself (software GL renders ~5 fps)
const flowState = () => pg.evaluate(() => window.__game.state);
fs.mkdirSync(path.join(root, 'remake/shots'), { recursive: true });

// finger bookkeeping: CDP wants the full list of active points; start/move/end is derived from how the list changed
const fingers = new Map(); let maxFingers = 0;
async function sync(type) { maxFingers = Math.max(maxFingers, fingers.size); await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...fingers.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id })) }); }
const down = async (id, x, y) => { fingers.set(id, { x, y }); await sync('touchStart'); };
const move = async (id, x, y) => { fingers.set(id, { x, y }); await sync('touchMove'); };
const up = async (id) => { const p = fingers.get(id); if (!p) return; await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: p.x, y: p.y, id }] }); fingers.delete(id); };   // CDP: touchEnd releases exactly the points it lists
const center = (r) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
// intro card: a tap on the screen starts the stage
const st0 = await flowState();
await down(1, 420, 200); await up(1); await pg.waitForFunction(() => window.__game.state === 'PLAYING', null, { timeout: 15000 }).catch(() => {});
await pg.evaluate(() => window.__game.loop.stop());
const st1 = await flowState();
console.log(`intro card: ${st0} -> ${st1}`);
if (st1 !== 'PLAYING') fail('tapping the intro card should start the stage (state ' + st1 + ')');
await pg.screenshot({ path: path.join(root, 'remake/shots/touch_playing.png') });
const vis = await pg.evaluate(() => getComputedStyle(document.getElementById('touch-ui')).display);
if (vis === 'none') fail('touch controls should show while playing');
let rects = await pg.evaluate(() => { const T = window.__game.touch, o = {}; for (const [k, b] of Object.entries(T.buttons)) { const r = b.disc.getBoundingClientRect(); o[k] = { x: r.x, y: r.y, width: r.width, height: r.height }; } const z = T.zone.getBoundingClientRect(); o.zone = { x: z.x, y: z.y, width: z.width, height: z.height }; return o; });
console.log('controls: ' + JSON.stringify(rects));
// layout rules: thumb-sized, on screen, not overlapping each other
const names = ['jump', 'spray', 'bomb', 'slide'];
for (const n of names) {
  const r = rects[n];
  if (r.width < 64 || r.height < 64) fail(`${n} button is ${r.width.toFixed(0)}px: too small for a thumb (need >= 64)`);
  if (r.x < 0 || r.y < 0 || r.x + r.width > 844 || r.y + r.height > 390) fail(`${n} button is off screen`);
}
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
  const a = rects[names[i]], b = rects[names[j]];
  if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) fail(`${names[i]} and ${names[j]} buttons overlap`);
}



// individual controls reach the input object
const read = () => pg.evaluate(() => { const g = window.__game; g.input.update(); const i = g.input, t = i.touch; return { mx: i.moveX, my: i.moveY, jump: i.jump, spray: i.spray, bomb: i.bomb, slide: i.slide, keys: i.keys.size, t: { ...t } }; });
const JOY = { x: 150, y: 290 };
await down(10, JOY.x, JOY.y); await move(10, JOY.x + 50, JOY.y - 50); let r1 = await read();
if (!(r1.mx > 0.3 && r1.my > 0.3)) fail('joystick up-right should give moveX>0 and moveY>0: ' + JSON.stringify(r1));
await move(10, JOY.x - 60, JOY.y); r1 = await read(); if (!(r1.mx < -0.3 && Math.abs(r1.my) < 0.2)) fail('joystick left should give moveX<0: ' + JSON.stringify(r1));
await down(11, center(rects.spray).x, center(rects.spray).y); await down(12, center(rects.jump).x, center(rects.jump).y);
r1 = await read(); if (!(r1.spray && r1.jump && r1.mx < -0.3)) fail('joystick + SPRAY + JUMP held together (3 fingers) must all register: ' + JSON.stringify(r1));
await up(12); r1 = await read(); if (r1.jump || !r1.spray) fail('releasing JUMP must not release SPRAY / the joystick: ' + JSON.stringify(r1));
await down(13, center(rects.bomb).x, center(rects.bomb).y); r1 = await read(); if (!r1.bomb) fail('BOMB did not register'); await up(13);
await down(14, center(rects.slide).x, center(rects.slide).y); r1 = await read(); if (!r1.slide) fail('SLIDE did not register'); await up(14);
await up(11); await up(10); r1 = await read();
if (r1.mx || r1.my || r1.jump || r1.spray || r1.bomb || r1.slide) fail('everything must release when all fingers lift: ' + JSON.stringify(r1));
if (r1.keys) fail('keyboard state should be empty');
console.log('controls register individually and together; max fingers ' + maxFingers);

// the run: the bot's decisions become finger presses. Left thumb = joystick (held up), right thumb = SPRAY held + JUMP / SLIDE taps.
const bossStick = async (dx, dy) => move(10, JOY.x + dx * 55, JOY.y - dy * 55);
await down(10, JOY.x, JOY.y); await bossStick(0, 1);
await down(11, center(rects.spray).x, center(rects.spray).y);
let jumpHold = 0, slideOn = false, jumpOn = false, steer = 0, steps = 0, iters = 0, phase = '';
const t0 = Date.now(); let last = '';
while (steps < 60 * 420) {
  const st = await pg.evaluate(() => { const g = window.__game, W = g.world, A = W.arena, B = W.player.body, e = A.boss?.enemy, fight = A.state === 'fight' || A.state === 'victory';
    return { state: g.state, arena: A.state, fight, bs: B.s, bx: B.x, es: e ? e.s : null, ex: e ? e.x : null, intent: window.__bot.intent() }; });
  if (st.state === 'STAGECLEAR') break;
  if (st.state !== 'PLAYING') { fail('unexpected state during the run: ' + st.state); break; }
  if (st.arena !== last) { last = st.arena; phase += `${st.arena}@${Math.round(steps / 60)} `; }
  let want = { x: 0, y: 1 };
  if (st.fight && st.es !== null) {            // boss: strafe toward it / hold range with the stick
    want = { x: st.ex > st.bx + 2 ? 1 : st.ex < st.bx - 2 ? -1 : 0, y: st.es > st.bs + 3 ? 1 : st.es < st.bs - 3 ? -1 : 0 };
  } else if (st.intent.steer) want = { x: st.intent.steer, y: 1 };
  if (want.x !== steer || iters === 0) { steer = want.x; }
  await bossStick(want.x, want.y);
  const needJump = st.intent.jump && !st.fight;
  if (needJump && jumpHold <= 0 && !jumpOn) { await down(12, center(rects.jump).x, center(rects.jump).y); jumpOn = true; jumpHold = 30; }
  if (jumpOn && jumpHold <= 0) { await up(12); jumpOn = false; }
  const needSlide = st.intent.slide && !st.fight;
  if (needSlide && !slideOn) { await down(14, center(rects.slide).x, center(rects.slide).y); slideOn = true; }
  if (!needSlide && slideOn) { await up(14); slideOn = false; }
  const n = 4; await pg.evaluate((n) => window.__bot.step(n), n); steps += n; jumpHold -= n; iters++;
}
if (jumpOn) await up(12); if (slideOn) await up(14);
await up(11); await up(10);
await pg.waitForTimeout(800);
const end = await pg.evaluate(() => { const g = window.__game, W = g.world; return { state: g.state, won: W.arena.won, s: W.player.body.s, kills: W.combat.kills, score: g.run.score, keys: g.input.keys.size, source: g.input.source, text: document.getElementById('hud').innerText.includes('STAGE CLEAN') }; });
console.log(`run: ${JSON.stringify(end)} sim ${(steps / 60).toFixed(0)} s, phases ${phase}, ${iters} decisions, max simultaneous fingers ${maxFingers}, wall ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await pg.screenshot({ path: path.join(root, 'remake/shots/touch_stage_clear.png') });
if (end.state !== 'STAGECLEAR' || !end.won) fail('stage 1 was not completed with touch controls: ' + JSON.stringify(end));
if (end.keys) fail('the keyboard was used');
if (maxFingers < 3) fail('multi-touch (3 fingers) never happened');
if (end.source !== 'touch') fail('input source should be touch, was ' + end.source);
await ctx.close(); await browser.close(); server.close();
if (failures.length) { console.error(`\nTOUCH SMOKE FAILED (${failures.length})`); process.exit(1); }
console.log('TOUCH SMOKE PASSED');
