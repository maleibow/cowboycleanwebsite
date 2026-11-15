// node tools/perfTable.mjs remake/perf/before.json remake/perf/after.json  ->  markdown before / after table per stage
import fs from 'node:fs';
const [A, B] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const agg = (st) => { const r = st.rows; return {
  p50: med(r.map((w) => w.p50)), p95: Math.max(...r.map((w) => w.p95)), stream: Math.max(...r.map((w) => w.stream)), calls: Math.max(...r.map((w) => w.calls)), tris: Math.max(...r.map((w) => w.tris)),
  alloc: r.reduce((s, w) => s + w.allocBPerFrame, 0) / r.length / 1024, app: r.reduce((s, w) => s + (w.allocBPerFrame - (w.allocThreeBPerFrame || 0)), 0) / r.length / 1024, progs: Math.max(...r.map((w) => w.programs)) }; };
const f1 = (x) => x.toFixed(1), d = (a, b, k, fmt = f1) => `${fmt(a)} → ${fmt(b)}`;
console.log(`Low tier, ${A.throttle}x CPU throttle, 320x180 canvas (main-thread cost; software GL cannot time the GPU). Per stage over act 1 (20 s run), act 2, act 3 and the boss fight.\n`);
console.log('| Stage | frame p50 (ms) | frame p95 (ms) | streaming hitch max (ms) | draw calls max | triangles max | alloc KB/frame (app only) | shader programs |');
console.log('|---|---|---|---|---|---|---|---|');
for (const sa of A.results) {
  const sb = B.results.find((s) => s.stage === sa.stage); if (!sb) continue; const a = agg(sa), b = agg(sb);
  console.log(`| ${sa.stage} ${sa.name} | ${d(a.p50, b.p50)} | ${d(a.p95, b.p95)} | ${d(a.stream, b.stream)} | ${d(a.calls, b.calls, 0, (x) => x)} | ${d(a.tris / 1000, b.tris / 1000, 0, (x) => x.toFixed(0) + 'k')} | ${d(a.app, b.app)} | ${d(a.progs, b.progs, 0, (x) => x)} |`);
}
const all = (R, k) => R.results.flatMap((s) => s.rows.map((w) => w[k]));
const tot = (R) => ({ p50: med(all(R, 'p50')), p95: med(all(R, 'p95')), tris: Math.max(...all(R, 'tris')), calls: Math.max(...all(R, 'calls')), over: R.results.flatMap((s) => s.rows).filter((w) => w.tris > 120000).length, n: R.results.flatMap((s) => s.rows).length });
const ta = tot(A), tb = tot(B);
console.log(`\nAll windows: median frame p50 ${f1(ta.p50)} → ${f1(tb.p50)} ms, median p95 ${f1(ta.p95)} → ${f1(tb.p95)} ms, worst triangles ${ta.tris} → ${tb.tris}, worst draw calls ${ta.calls} → ${tb.calls}; windows over the 120k-triangle mobile budget: ${ta.over}/${ta.n} → ${tb.over}/${tb.n}.`);
