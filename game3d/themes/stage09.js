import * as P from './stage09Props.js';
import * as T from './stage09Town.js';
import { buildBarrier } from './stage09Gates.js';
import { buildSolid } from './stage09Solids.js';
import { Builder } from '../actors/modelKit.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 9: Haunted Village. Black and grey under a green-lit fog and a big yellow moon: leaning cottages with sick green windows, dead trees, graves, iron fences, a bog in every gap.
// (original drawBackground: sky #2C3E50 -> #000, a yellow #F1C40F moon at the top right, black twisted trees, floor #222)
export const stage09 = {
  id: 9, name: 'Haunted Village',
  sky: { top: '#05080e', mid: '#14222e', horizon: '#2c5a50', sunColor: '#f1d46a', sunDir: [0.5, 0.32, -1], sunSize: 0.075, sunGlow: 0.35, moon: true,
         sunBoost: 1.5, stars: 0.5, cloudColor: '#2c4a48', cloudShade: '#0a1218', cloudAmount: 0.55, cloudSpeed: 0.008 },
  fog: { color: '#1a2a2e', near: 16, far: 105 },
  light: { hemiSky: '#7aa8a0', hemiGround: '#141c20', hemiIntensity: 1.4, sun: '#b8c8ff', sunIntensity: 0.95, sunOffset: [12, 20, 6] },
  look: { shadowTint: '#5a7388', rimColor: '#9affc8', rimStrength: 0.4, sunLuma: 0.6, grimeTint: '#2a3236' },
  grade: { lift: [0.0, 0.012, 0.02], gamma: [1.0, 1.02, 1.0], gain: [0.94, 1.02, 0.98], sat: 0.85, vignette: 0.6, grain: 0.05 },
  ambient: { preset: 'mote', rate: 5 },
  colors: { grass: 0x2b3a34, grassLight: 0x3c5048, dirt: 0x2c2a2e, bog: 0x10201a },
  path: { noise: 0.07, rut: 0.0, rutX: 1.5, edge: 0.72 },
  pathPalette: { ground: 0x5a5e68, platform: 0x6c707a, ledge: 0x7a7e88, beam: 0x3d322a, barrier: 0x2a2e34, wall: 0x2a2e34, quicksand: 0x3a3c44, mud: 0x10201a },
  groundRim: 0.35,
  terrain: {
    height(s, x, env) {
      const ax = Math.abs(x), half = env.half;
      let flat = 0, arena = 0, ar = null;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); flat = Math.max(flat, k); if (z.arena) { arena = Math.max(arena, k); ar = z.arena; } }
      const d = (Math.sin(x * 0.12 + s * 0.08) * 0.5 + Math.sin(x * 0.26 - s * 0.14) * 0.3 + Math.sin(s * 0.05 + x * 0.17) * 0.4 + 1.2) / 2.4;
      let h = -0.2 * (1 - smooth(half + 0.2, half + 1.2, ax));
      h += smooth(half + 0.8, half + 7, ax) * (0.3 + d * 1.2) * (1 - 0.85 * flat);                   // low mounded graves
      h += smooth(arena ? 22 : 17, 30, ax) * (2.5 + 6 * d) * (arena ? 1 : 1 - 0.6 * flat);             // black hills close the valley
      for (const q of env.gaps) if (s > q.s0 - 0.01 && s < q.s1 + 0.01) h -= 3.0 * smooth(half + 12, half + 2.5, ax);
      if (ar) { const k = arena * (1 - smooth(ar.r - 0.5, ar.r + 1.5, Math.hypot(s - ar.s, x - ar.x))); h = h * (1 - k) - 0.08 * k; }   // the arena disc lies flat
      return h;
    },
    color(s, x, h, env, out) {
      const C = stage09.colors, ax = Math.abs(x), half = env.half, n = 0.5 + 0.5 * Math.sin(x * 0.8 + s * 0.5) * Math.sin(s * 0.7 - x * 0.3);
      if (h < -0.8) { out.set(C.bog).lerp(_c.set(0x040806), Math.min(1, -h / 4)); return out; }
      if (ax < half + 1.0) out.set(C.dirt).lerp(_c.set(C.grass), n * 0.4); else out.set(C.grass).lerp(_c.set(C.grassLight), n * 0.55).lerp(_c.set(0x161c20), Math.min(1, h / 7) * 0.7);
      if (n > 0.9 && ax > half + 1.5) out.lerp(_c.set(0x4a6a52), (n - 0.9) * 5);   // pale patches of moss
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#aab4b0', c: '#ffffff', d: '#707c78', density: 5, repeat: [1, 1] } },
  scatter: [
    { key: 'tree', build: P.deadTree, perChunk: 18, band: [6, 28], scale: [0.9, 1.7], shadow: true },
    { key: 'cottage', build: P.cottage, perChunk: 6, band: [13, 30], scale: [1.0, 1.7], shadow: true },
    { key: 'grave', build: P.grave, perChunk: 22, band: [5.4, 22], scale: [0.8, 1.4], shadow: true },
    { key: 'fence', build: P.fence, perChunk: 12, band: [5.2, 14], scale: [0.9, 1.2] },
    { key: 'wisp', build: P.wisp, perChunk: 14, band: [5.6, 24], scale: [0.8, 1.4], lift: 0.4 },
  ],
  edge: { build: () => ({ post: P.ironPost(), lamp: P.lantern() }), spacing: 21, offset: 1.5, lampHeight: 2.35, lampColor: 0x6affb0, lampEmissive: 0x2aff80 },
  far: { build: P.farRing },
  hazards: { gate: gateLeaf },
  buildBarrier, buildSolid,
  dress: { side: T.hauntedRow, checkpoint: T.checkpoint, bossGate: T.bossGate, arena: T.arena,
    gap: T.bogGap, doubleGap: T.bogGap, steps: T.bogGap, beam: T.bogGap, bog: T.bogPatch, swingGate: T.gatePiers, lightsOut: T.glowStones },
};
const _c = new THREE.Color();

// One iron gate leaf for world/hazGate.js: hinge at the origin, 4 m long along +x, 3.4 m tall, 0.3 m thick. Frame, bars with spear tips, a scroll ring and a skull plaque.
function gateLeaf() {
  const b = new Builder({ boxSeg: 1, ico: true }), IRON = 0x1c1f24, IRON2 = 0x2c3036, L = 4;
  b.box(L, 0.18, 0.28, IRON, { p: [L / 2, 0.3, 0], radius: 0.03 }).box(L, 0.18, 0.28, IRON, { p: [L / 2, 2.9, 0], radius: 0.03 }).box(0.22, 3.4, 0.3, IRON2, { p: [0.11, 1.7, 0], radius: 0.03 }).box(0.2, 3.3, 0.28, IRON2, { p: [L - 0.1, 1.65, 0], radius: 0.03 });
  const n = 14; for (let i = 1; i < n; i++) { const x = (i / n) * L, tall = 3.1 + (i % 2) * 0.28; b.box(0.07, tall, 0.1, i % 2 ? IRON : IRON2, { p: [x, tall / 2 + 0.05, 0], radius: 0.01, ao: 0 }); b.cone(0.07, 0.3, IRON2, { p: [x, tall + 0.2, 0], seg: 4, ao: 0 }); }
  b.add(new THREE.TorusGeometry(0.55, 0.05, 5, 14), IRON2, { p: [L / 2, 1.6, 0], ao: 0 }).sphere(0.3, 0xcfd2c4, { p: [L / 2, 1.6, 0.06], s: [1, 1.05, 0.5], ao: 0 });
  for (const sx of [-1, 1]) b.sphere(0.08, 0x08090a, { p: [L / 2 + sx * 0.11, 1.65, 0.2], s: [1, 1.2, 0.4], ao: 0 });
  b.box(0.3, 0.3, 0.32, 0x4a5058, { p: [0.12, 0.9, 0], radius: 0.04 });
  return b.build();
}
