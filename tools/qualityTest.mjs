// Dynamic-resolution controller check: node tools/qualityTest.mjs
// A tiny device model turns the controller's decisions (render scale, bloom, post) into frame times, quantised to a 60 Hz
// display, and checks that the controller settles at <= 33.3 ms (30 fps) for slow, slower and very slow GPUs, never thrashes,
// and climbs back when the load drops. This tests the control loop, not a real GPU (headless Chromium has none).
import { createQuality } from '../game3d/core/quality.js';
let bad = 0; const fail = (m) => { bad++; console.error('FAIL: ' + m); };
const VSYNC = 1000 / 60;
// ms for one frame: cpu + gpu fill (scales with pixels), bloom and post cost a share of the fill
const frameMs = (q, dev) => { const t = q.tier, px = q.scale * q.scale, fill = dev.gpu * px * (1 + (t.bloom ? 0.3 : 0) + (t.grade || t.vignette || t.grain ? 0.2 : 0)); return Math.max(dev.cpu, 0) + fill; };
const quant = (ms) => Math.ceil(ms / VSYNC - 1e-6) * VSYNC;
function run(name, dev, frames = 2400, expectOk = true) {
  const q = createQuality(new URLSearchParams('quality=low')); let changes = 0, flips = 0, lastDir = 0, last = q.scale + q.shed;
  q.onChange = () => { changes++; const now = q.scale - q.shed * 0.1; const dir = Math.sign(now - last); if (dir && lastDir && dir !== lastDir) flips++; if (dir) lastDir = dir; last = now; };
  const tail = [];
  for (let i = 0; i < frames; i++) { const ms = quant(frameMs(q, dev)); q.sample(ms); if (i > frames - 300) tail.push(ms); }
  const avg = tail.reduce((a, b) => a + b, 0) / tail.length;
  console.log(`${name.padEnd(28)} settled ${avg.toFixed(1)} ms (${(1000 / avg).toFixed(0)} fps)  scale ${q.scale.toFixed(2)}  shed ${q.shed}  changes ${changes}  direction flips ${flips}`);
  if (expectOk && avg > 33.4) fail(`${name}: settled at ${avg.toFixed(1)} ms, over the 33.3 ms (30 fps) target`);
  if (flips > 3) fail(`${name}: the controller thrashes (${flips} direction flips)`);
  return q;
}
run('fast phone (gpu 14 ms)', { cpu: 6, gpu: 14 });
run('mid phone (gpu 30 ms)', { cpu: 10, gpu: 30 });
run('slow phone (gpu 45 ms)', { cpu: 12, gpu: 45 });
run('very slow (gpu 70 ms)', { cpu: 12, gpu: 70 });
const q = run('struggling (gpu 100 ms)', { cpu: 14, gpu: 100 }, 2400, false);
if (q.shed < 1) fail('a struggling device should shed effects once the scale floor is reached');
// recovery: load drops, everything comes back
const r = createQuality(new URLSearchParams('quality=low')); r.onChange = () => {};
let dev = { cpu: 12, gpu: 70 }; for (let i = 0; i < 1500; i++) r.sample(quant(frameMs(r, dev)));
const low = r.scale; dev = { cpu: 6, gpu: 12 }; for (let i = 0; i < 6000; i++) r.sample(quant(frameMs(r, dev)));
console.log(`recovery: scale ${low.toFixed(2)} -> ${r.scale.toFixed(2)}, shed ${r.shed}`);
if (!(r.scale > low + 0.1 && r.shed === 0)) fail('resolution and effects should recover when the load drops');
if (bad) { console.error(`QUALITY TEST FAILED (${bad})`); process.exit(1); }
console.log('QUALITY TEST PASSED');
