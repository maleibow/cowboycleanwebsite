import * as P from './stage10Props.js';
import * as T from './stage10Town.js';
import { buildBarrier } from './stage10Gates.js';
import { buildSolid } from './stage10Solids.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 10: Charcoal Streets. A burnt city under a black sky with a ruby glow on the horizon: charcoal towers with pale ghostly windows, ash rising from the rubble, and ruby-red water running
// down both sides of every street and under every gap. (original drawBackground: sky #0a0a0a -> #1a1a2e, #111 buildings with #36454f windows, the floor is ruby water rgba(220,20,60,.8))
export const stage10 = {
  id: 10, name: 'Charcoal Streets',
  sky: { top: '#030306', mid: '#0e0e1c', horizon: '#3a1020', sunColor: '#ff3a5a', sunDir: [0.0, 0.06, -1], sunSize: 0.06, sunGlow: 0.9, sunBoost: 1.3, stars: 0.25,
         cloudColor: '#34283a', cloudShade: '#0a0810', cloudAmount: 0.75, cloudSpeed: 0.012 },
  fog: { color: '#14141a', near: 18, far: 125 },
  light: { hemiSky: '#9aa2bc', hemiGround: '#22222c', hemiIntensity: 1.5, sun: '#c8d4ff', sunIntensity: 0.85, sunOffset: [10, 18, 6] },
  look: { shadowTint: '#6a6a88', rimColor: '#a8b8e0', rimStrength: 0.45, sunLuma: 0.6, grimeTint: '#2a2a32' },
  grade: { lift: [0.01, 0.0, 0.015], gamma: [1.0, 1.0, 1.0], gain: [1.0, 0.98, 1.02], sat: 0.95, vignette: 0.6, grain: 0.05 },
  ambient: { preset: 'ash', rate: 18 },
  colors: { street: 0x2c2c34, rubble: 0x1c1c22, wall: 0x14141a, glow: 0xff2a50 },
  path: { noise: 0.06, rut: 0.0, rutX: 1.6, edge: 0.7 },
  pathPalette: { ground: 0x4a4a54, platform: 0x5a5a66, ledge: 0x6a6a76, beam: 0x3a3a44, barrier: 0x2a2a32, wall: 0x2a2a32, quicksand: 0x4a4a54 },
  groundRim: 0.4,
  beamGap: true,
  terrain: {
    height(s, x, env) {
      const ax = Math.abs(x), half = env.half, bw = T.CANAL;
      let flat = 0, arena = 0, ar = null;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); flat = Math.max(flat, k); if (z.arena) { arena = Math.max(arena, k); ar = z.arena; } }
      const d = (Math.sin(x * 0.12 + s * 0.08) * 0.5 + Math.sin(x * 0.27 - s * 0.14) * 0.3 + Math.sin(s * 0.05 + x * 0.17) * 0.4 + 1.2) / 2.4;
      let h = -0.15 * (1 - smooth(half + 0.2, half + 1.2, ax));
      h += smooth(half + 0.8, half + 7, ax) * (0.15 + d * 0.5) * (1 - 0.85 * flat);
      h -= 3.4 * smooth(bw.x0 - 0.8, bw.x0 + 0.4, ax) * (1 - smooth(bw.x1 - 0.4, bw.x1 + 0.9, ax));   // the canal trenches
      h += smooth(arena ? 22 : 18, 32, ax) * (2.5 + 7 * d) * (arena ? 1 : 1 - 0.6 * flat);             // rubble and shell blocks close the valley
      for (const q of env.gaps) if (s > q.s0 - 0.01 && s < q.s1 + 0.01) h -= 3.0 * smooth(half + 12, half + 2.5, ax);
      if (ar) { const k = arena * (1 - smooth(ar.r - 0.5, ar.r + 1.5, Math.hypot(s - ar.s, x - ar.x))); h = h * (1 - k) - 0.08 * k; }   // the arena disc lies flat
      return h;
    },
    color(s, x, h, env, out) {
      const C = stage10.colors, ax = Math.abs(x), half = env.half, n = 0.5 + 0.5 * Math.sin(x * 0.8 + s * 0.5) * Math.sin(s * 0.7 - x * 0.3), bw = T.CANAL;
      if (ax > bw.x0 - 0.8 && ax < bw.x1 + 0.9 && h < -1) { out.set(0x1c0a12).lerp(_c.set(0x5a1020), Math.min(1, (-h - 1) / 2.5) * 0.5); return out; }   // trench walls, reddened by the water
      if (h < -0.8) { out.set(0x1a0c12).lerp(_c.set(0x040406), Math.min(1, -h / 4)); return out; }
      if (ax < half + 1.0) out.set(0x34343c).lerp(_c.set(C.street), n * 0.5); else out.set(C.street).lerp(_c.set(C.rubble), Math.min(1, h / 5) * 0.8 + n * 0.25).lerp(_c.set(C.wall), smooth(14, 28, ax) * 0.5);
      if (n > 0.92 && ax > half + 1.5) out.lerp(_c.set(0x4a1018), (n - 0.92) * 6);   // ruby seeping up through the cracks
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#b8b8c4', c: '#ffffff', d: '#707080', density: 5, repeat: [1, 1] } },
  scatter: [
    { key: 'tower', build: P.tower, perChunk: 15, band: [19, 34], scale: [0.9, 1.7], stretch: [1, 1.7], shadow: true },
    { key: 'ruin', build: P.ruin, perChunk: 8, band: [18, 30], scale: [1.0, 1.6], shadow: true },
    { key: 'rubble', build: P.rubble, perChunk: 30, band: [5.4, 10.4], scale: [0.7, 1.5], shadow: true },
    { key: 'lamp', build: P.bentLamp, perChunk: 9, band: [5.4, 10.4], scale: [0.9, 1.3] },
    { key: 'column', build: P.column, perChunk: 10, band: [6, 10.4], scale: [0.9, 1.4], shadow: true },
  ],
  edge: { build: () => ({ post: P.bollard(), lamp: P.rubyOrb() }), spacing: 16, offset: 1.5, lampHeight: 1.3, lampColor: 0xff2a50, lampEmissive: 0xff1a40 },
  far: { build: P.farRing },
  river: T.canals,
  buildBarrier, buildSolid,
  dress: { side: T.charredStreet, checkpoint: T.checkpoint, bossGate: T.bossGate, arena: T.arena,
    gap: T.canal, doubleGap: T.canal, steps: T.canal, beam: T.canal, canalStones: T.canal },
};
const _c = new THREE.Color();
