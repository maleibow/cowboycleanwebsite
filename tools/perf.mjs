// Per-stage frame-time profile on the lowest quality tier with CPU throttling.
//   node tools/perf.mjs [--stages=1,2,..] [--throttle=4] [--quality=low] [--frames=420] [--label=before] [--out=remake/perf/before.json]
// For each stage the scripted bot (tools/smokeBot.js) plays through four windows (act 1, act 2, act 3, boss fight). Every frame is
// one fixed 60 Hz simulation step + one full render (scene pass, bloom, grade), timed on the main thread. Reported per window:
//   sim ms, render-submit ms (JS + GL command submission), p50 / p95 / max frame, draw calls, triangles, heap allocation per frame
// (CDP sampling heap profiler, minor-GC objects included, attributed to the top allocating functions).
// Headless Chromium rasterises on the CPU (SwiftShader) in another process and its backlog stalls the main thread for seconds, so the
// page is a small 320x180 canvas: raster cost vanishes and what remains is the main-thread cost a phone's CPU pays (JS, culling, uniform
// uploads, draw-call submission) plus the draw-call / triangle budget. GPU fill-rate cannot be measured here; dynamic resolution handles it on devices.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const STAGES = arg('stages', '1,2,3,4,5,6,7,8,9,10').split(',').map(Number), THROTTLE = Number(arg('throttle', 4)), QUALITY = arg('quality', 'low');
const FRAMES = Number(arg('frames', 420)), LABEL = arg('label', 'run'), OUT = arg('out', '');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.txt': 'text/plain' };
const server = http.createServer((q, r) => { const p = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
const errors = [];
const results = [];

for (const N of STAGES) {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 180 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const pg = await ctx.newPage();
  pg.on('console', (m) => { if (m.type() === 'error' && !(m.location().url || '').includes('/game3d/music/') && m.location().url?.startsWith(`http://127.0.0.1:${port}`)) errors.push(`stage ${N}: ${m.text()}`); });
  pg.on('pageerror', (e) => errors.push(`stage ${N}: ${e.message}`));
  const t0 = Date.now();
  await pg.goto(`http://127.0.0.1:${port}/cleaningup3d.html?stage=${N}&seed=1&god=1&intro=0&quality=${QUALITY}&dynres=0&load=slice`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await pg.waitForFunction(() => window.__game && window.__game.ready && window.__game.world, null, { timeout: 90000 });
  const loadMs = Date.now() - t0;
  await pg.addScriptTag({ path: path.join(root, 'tools/smokeBot.js') });
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await cdp.send('Performance.enable');
  const info = await pg.evaluate(() => { const W = window.__game.world; return { gateS: W.track.gateS, name: W.stageData.name, tier: window.__game.quality.tier.name, pr: window.__game.gfx.pixelRatio, w: window.__game.gfx.width, h: window.__game.gfx.height }; });
  const wins = [['act1', 0.03, 1200], ['act2', 0.45, FRAMES], ['act3', 0.78, FRAMES], ['boss', -1, FRAMES]];   // act1 runs 20 s (~180 m): it crosses chunk and segment boundaries, which is where streaming hitches live
  const rows = [];
  for (const [name, f, nFrames] of wins) {
    await pg.evaluate(([f, name]) => {                      // position: a fraction of the way to the gate, or the boss fight
      const g = window.__game, W = g.world, K = g.input.keys; K.clear();
      if (f < 0) { W.jumpToGate(); } else W.player.teleport(W.track.gateS * f);
      window.__bot.step(90, window.__bot.make());           // let spawns / geometry settle, then reset the bot's input
      window.__perfBot = window.__bot.make(); window.__perfName = name;
    }, [f, name]);
    if (name === 'boss') await pg.evaluate(() => { const A = window.__game.world.arena, K = window.__game.input.keys; K.add('KeyW'); let n = 0; while (!(A.boss && !A.boss.passive) && n++ < 1500) window.__bot.step(1); K.clear(); });
    const m0 = (await cdp.send('Performance.getMetrics')).metrics, M0 = Object.fromEntries(m0.map((m) => [m.name, m.value]));
    await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage');
    await cdp.send('HeapProfiler.startSampling', { samplingInterval: 512, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
    const r = await pg.evaluate((FRAMES) => {
      const g = window.__game, W = g.world, K = g.input.keys, A = W.arena, B = W.player.body, bot = window.__perfBot, P = performance;
      const tSim = [], tRen = [], tAll = [], calls = [], tris = []; const stream = []; const wrap = (o, k) => { const f = o[k]; o[k] = function (...a) { const t = P.now(); const r = f.apply(this, a); stream.push(P.now() - t); return r; }; return () => { o[k] = f; }; }, un1 = wrap(W.builder, 'update'), un2 = wrap(W.scenery, 'update'); const sPer = [];
      for (let i = 0; i < FRAMES; i++) {
        if (A.state === 'fight' || A.state === 'sealed') { const e = A.boss?.enemy; K.clear(); K.add('KeyJ'); if (e) { if (e.s > B.s + 3) K.add('KeyW'); else if (e.s < B.s - 3) K.add('KeyS'); if (e.x > B.x + 2) K.add('KeyD'); else if (e.x < B.x - 2) K.add('KeyA'); } } else bot();
        stream.length = 0; const a = P.now(); g.input.update(); W.update(1 / 60, g.input); const b = P.now();
        W.render(0.5); g.gfx.render(W.scene, W.camera); const c = P.now();
        tSim.push(b - a); tRen.push(c - b); sPer.push(stream.reduce((x, y) => x + y, 0)); tAll.push(c - a); calls.push(g.gfx.renderer.info.render.calls); tris.push(g.gfx.renderer.info.render.triangles);
      }
      const q = (arr, p) => { const s = [...arr].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))]; }, mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      un1(); un2();
      return { stream: Math.max(...sPer), streamP99: q(sPer, 0.99), sim: mean(tSim), ren: mean(tRen), mean: mean(tAll), p50: q(tAll, 0.5), p95: q(tAll, 0.95), p99: q(tAll, 0.99), max: Math.max(...tAll), calls: Math.max(...calls), tris: Math.max(...tris), s: B.s, frames: FRAMES, programs: g.gfx.renderer.info.programs.length, geos: g.gfx.renderer.info.memory.geometries, texs: g.gfx.renderer.info.memory.textures };
    }, nFrames);
    const prof = (await cdp.send('HeapProfiler.stopSampling')).profile;
    const m1 = (await cdp.send('Performance.getMetrics')).metrics, M1 = Object.fromEntries(m1.map((m) => [m.name, m.value]));
    // allocation: sum sampled self sizes, attribute to leaf functions
    const by = new Map(); let total = 0;
    const label = (cf) => `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*\/game3d\//, '').replace(/^.*\/vendor\//, 'vendor/')}:${cf.lineNumber + 1}`;
    const walk = (n, owner) => {   // attribute each sample to its nearest game3d frame (so three.js internals count against whoever called them)
      const cf = n.callFrame, own = /\/game3d\/(?!vendor)/.test(cf.url) ? label(cf) : owner, self = n.selfSize || 0;
      if (self) { total += self; const k = (own || label(cf)) + (own && !/\/game3d\/(?!vendor)/.test(cf.url) && process.env.LEAF ? ' <- ' + label(cf) : ''); by.set(k, (by.get(k) || 0) + self); }
      for (const c of n.children || []) walk(c, own);
    };
    walk(prof.head, null);
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOP || 6)).map(([k, v]) => `${(v / nFrames).toFixed(0)}B/f ${k}`);
    const task = ((M1.TaskDuration - M0.TaskDuration) * 1000) / nFrames, style = ((M1.RecalcStyleDuration - M0.RecalcStyleDuration) * 1000) / nFrames, layout = ((M1.LayoutDuration - M0.LayoutDuration) * 1000) / nFrames;
    let threeB = 0; for (const [k, v] of by) if (/^api\.render render\/renderer\.js|vendor\//.test(k) || /^\(anon\)\s/.test(k)) threeB += v;
    rows.push({ win: name, ...r, allocBPerFrame: total / nFrames, allocThreeBPerFrame: threeB / nFrames, topAlloc: top, taskMs: task, styleMs: style, layoutMs: layout });
    console.log(`stage ${N} ${name.padEnd(5)} sim ${r.sim.toFixed(1)} ren ${r.ren.toFixed(1)} p50 ${r.p50.toFixed(1)} p95 ${r.p95.toFixed(1)} max ${r.max.toFixed(0)} stream-max ${r.stream.toFixed(1)} | calls ${r.calls} tris ${r.tris} | alloc ${(total / nFrames / 1024).toFixed(1)} KB/f (three/composer ${(threeB / nFrames / 1024).toFixed(1)}) | progs ${r.programs} | task ${task.toFixed(1)} style ${style.toFixed(1)}`);
  }
  results.push({ stage: N, name: info.name, loadMs, tier: info.tier, pr: info.pr, size: `${info.w}x${info.h}`, rows });
  await ctx.close();
}
await browser.close(); server.close();
const out = { label: LABEL, throttle: THROTTLE, quality: QUALITY, frames: FRAMES, results, errors };
if (OUT) { fs.mkdirSync(path.dirname(path.join(root, OUT)), { recursive: true }); fs.writeFileSync(path.join(root, OUT), JSON.stringify(out, null, 1)); }
if (errors.length) { console.error('CONSOLE ERRORS:\n' + errors.join('\n')); }
console.log('done');
