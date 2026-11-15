import * as P from './stage07Props.js';
import * as T from './stage07Town.js';
import { buildBarrier } from './stage07Gates.js';
import { buildSolid } from './stage07Solids.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 7: Rainbow Island. A bright tropical meadow under a pale-blue sky: green hills, palms, giant blossoms, rainbow arches, a turquoise lagoon in every gap.
// (original drawBackground: sky #87CEEB -> #E0F6FF, seven rainbow arcs behind the hills, green #2ecc71 mounds; GRADE rgba(255,255,255,.04), twinkling white motes)
export const stage07 = {
  id: 7, name: 'Rainbow Island',
  sky: { top: '#3d9be0', mid: '#8ccaf5', horizon: '#f6fbff', sunColor: '#fff2c0', sunDir: [-0.3, 0.45, -1], sunSize: 0.06, sunGlow: 0.45,
         sunBoost: 1.6, stars: 0.0, cloudColor: '#ffffff', cloudShade: '#a8c8e8', cloudAmount: 0.8, cloudSpeed: 0.012 },
  fog: { color: '#bfe4fa', near: 55, far: 260 },
  light: { hemiSky: '#ffffff', hemiGround: '#7acb8a', hemiIntensity: 1.35, sun: '#fff0d0', sunIntensity: 1.0, sunOffset: [-12, 22, 8] },
  look: { shadowTint: '#8a9be0', rimColor: '#ffffff', rimStrength: 0.2, sunLuma: 0.6, grimeTint: '#8a9a82' },
  grade: { lift: [0.0, 0.0, 0.01], gamma: [1.0, 1.0, 1.0], gain: [0.98, 0.98, 1.0], sat: 1.22, vignette: 0.28, grain: 0.02 },
  ambient: { preset: 'sparkle', rate: 7 },
  colors: { leaf: 0x2fae5a, leafLight: 0x5ad07a, grass: 0x3dbb6a, grassLight: 0x7ae08a, sand: 0xd8b878, mud: 0x8a5a32, wood: 0xb8864a },
  path: { noise: 0.05, rut: 0.0, rutX: 1.7, edge: 0.88 },
  pathPalette: { ground: 0xd8b878, platform: 0xff9ad5, ledge: 0xffffff, beam: 0xaf52de, barrier: 0xff4a7a, wall: 0x8ad0a0, quicksand: 0xd8b878, mud: 0x8a5a32, slide: 0xffe135 },
  groundRim: 0.1,
  terrain: {
    height(s, x, env) {
      const ax = Math.abs(x), half = env.half;
      let flat = 0, arena = 0, ar = null;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); flat = Math.max(flat, k); if (z.arena) { arena = Math.max(arena, k); ar = z.arena; } }
      const d = (Math.sin(x * 0.1 + s * 0.06) * 0.5 + Math.sin(x * 0.21 - s * 0.11) * 0.3 + Math.sin(s * 0.045 + x * 0.14) * 0.4 + 1.2) / 2.4;
      let h = -0.2 * (1 - smooth(half + 0.2, half + 1.2, ax));
      h += smooth(half + 0.8, half + 8, ax) * (0.4 + d * 2.2) * (1 - 0.85 * flat);
      h += smooth(arena ? 24 : 20, 34, ax) * (3 + 6 * d) * (arena ? 1 : 1 - 0.6 * flat);   // rolling green hills close the valley
      for (const q of env.gaps) if (s > q.s0 - 0.01 && s < q.s1 + 0.01) h -= 3.4 * smooth(half + 13, half + 2.5, ax);
      if (ar) { const k = arena * (1 - smooth(ar.r - 0.5, ar.r + 1.5, Math.hypot(s - ar.s, x - ar.x))); h = h * (1 - k) - 0.08 * k; }   // the arena disc lies flat: no pavement or lawn pokes through it
      return h;
    },
    color(s, x, h, env, out) {
      const C = stage07.colors, ax = Math.abs(x), half = env.half, n = 0.5 + 0.5 * Math.sin(x * 0.8 + s * 0.5) * Math.sin(s * 0.7 - x * 0.3);
      if (h < -0.8) { out.set(0x1aa0c0).lerp(_c.set(0x0a5a80), Math.min(1, -h / 4)); return out; }
      if (ax < half + 1.0) out.set(C.sand).lerp(_c.set(C.grassLight), n * 0.3); else out.set(C.grass).lerp(_c.set(C.grassLight), n * 0.55).lerp(_c.set(0x2a9a5a), Math.min(1, h / 7) * 0.5);
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#e8f8e0', c: '#ffffff', d: '#c8e8c0', density: 4, repeat: [1, 1] } },
  scatter: [
    { key: 'palm', build: P.palm, perChunk: 16, band: [6, 26], scale: [0.9, 1.5], shadow: true },
    { key: 'blossom', build: P.blossom, perChunk: 18, band: [5.6, 22], scale: [0.8, 1.6] },
    { key: 'bush', build: P.bush, perChunk: 30, band: [5, 24], scale: [0.8, 1.6] },
    { key: 'lolly', build: P.lollipop, perChunk: 8, band: [7, 24], scale: [0.9, 1.5] },
    { key: 'arch', build: P.arch, perChunk: 3, band: [16, 30], scale: [1.2, 2.2] },
    { key: 'balloons', build: P.balloons, perChunk: 7, band: [6, 20], scale: [0.9, 1.4] },
  ],
  edge: { build: (C) => ({ post: P.candyPost(C), lamp: P.orb() }), spacing: 16, offset: 1.5, lampHeight: 2.35, lampColor: 0xfff0a0, lampEmissive: 0xffd040 },
  far: { build: P.farRing },
  buildBarrier, buildSolid,
  dress: { side: T.beachVillage, checkpoint: T.checkpoint, bossGate: T.bossGate, arena: T.arena,
    gap: T.lagoon, doubleGap: T.lagoon, steps: T.lagoon, beam: T.lagoon, mudPool: T.mud },
};
const _c = new THREE.Color();
