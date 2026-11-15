import * as P from './stage02Props.js';
import * as T from './stage02Town.js';
import { buildBarrier } from './stage02Gates.js';
import { buildSolid } from './stage02Solids.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 2: Toxic Jungle. Layered greens, giant leaves, hanging vines, glowing spores; a sludge river fills every gap.
// (original drawBackground: sky #0B5345 -> #1ABC9C, pale sun #F9E79F, trunks #1E8449 with #27AE60 canopies, hills #2ECC71, floor #117A65)
export const stage02 = {
  id: 2, name: 'Toxic Jungle',
  sky: { top: '#052f2a', mid: '#0e8a6b', horizon: '#9be8b4', sunColor: '#f9e79f', sunDir: [0.34, 0.24, -1], sunSize: 0.06, sunGlow: 0.5,
         sunBoost: 2.0, stars: 0.05, cloudColor: '#c9f3d2', cloudShade: '#2a8a6a', cloudAmount: 0.45, cloudSpeed: 0.008 },
  fog: { color: '#27906c', near: 24, far: 160 },
  light: { hemiSky: '#a8e6cc', hemiGround: '#16503a', hemiIntensity: 1.25, sun: '#fff0a8', sunIntensity: 1.4, sunOffset: [10, 20, 8] },
  look: { shadowTint: '#1d6a74', rimColor: '#b8ff9c', rimStrength: 0.6, sunLuma: 0.62, grimeTint: '#5c6a40' },
  grade: { lift: [0.0, 0.03, 0.025], gamma: [0.97, 1.0, 0.99], gain: [0.96, 1.07, 0.97], sat: 1.28, vignette: 0.6, grain: 0.03 },
  ambient: { preset: 'spore', rate: 9 },
  colors: {
    bark: 0x5d4037, barkLight: 0x7a5a42, moss: 0x3f8a44, leaf: 0x27ae60, leafDark: 0x1a7a45, leafLight: 0x58d27a, leafPale: 0xd7f5c8, vine: 0x2f8f46, vineLight: 0x57c25a,
    stone: 0x7d8f7a, bamboo: 0x9ab64a, bambooDark: 0x5c7a2a, mud: 0x33301f, floor: 0x127a48,
  },
  path: { noise: 0.08, rut: 0.18, rutX: 1.5, edge: 0.74 },
  pathPalette: { ground: 0x4f8a3e, platform: 0x7a5a38, ledge: 0x5d4037, beam: 0x5d4037, barrier: 0x6a4a2e, wall: 0x6f8a6a, quicksand: 0x6f8a2b },
  beamGap: true,
  groundDoubleSide: true,   // the terrain ribbon's triangles face down (world/scenery.js); stage 1 never drew it, stages 2+ do
  terrain: {
    height(s, x, env) {
      const ax = Math.abs(x), half = env.half;
      let flat = 0, arena = 0;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); flat = Math.max(flat, k); if (z.arena) arena = Math.max(arena, k); }
      const d = (Math.sin(x * 0.13 + s * 0.08) * 0.5 + Math.sin(x * 0.27 - s * 0.15) * 0.3 + Math.sin(s * 0.06 + x * 0.19) * 0.4 + 1.2) / 2.4;
      let h = -0.3 * (1 - smooth(half + 0.2, half + 1.2, ax));
      h += smooth(half + 0.8, half + 6, ax) * (0.3 + d * 1.2) * (1 - 0.85 * flat);
      h += smooth(arena ? 21 : 15, 30, ax) * (3 + 7 * (1 - d)) * (arena ? 1 : 1 - 0.6 * flat);   // jungle hills close the valley
      for (const q of env.gaps) if (s > q.s0 - 0.01 && s < q.s1 + 0.01) h -= 3.4 * smooth(half + 13, half + 2.5, ax);   // the river bowl; the sludge fills it
      for (const q of env.patches) if (s > q.s0 && s < q.s1 && ax < half + 0.5) h -= 0.4;
      return h;
    },
    color(s, x, h, env, out) {
      const C = stage02.colors, ax = Math.abs(x), half = env.half, n = 0.5 + 0.5 * Math.sin(x * 0.8 + s * 0.45) * Math.sin(s * 0.6 - x * 0.35);
      if (h < -1.3) { out.set(C.mud).lerp(_c.set(0x15281c), Math.min(1, (-h - 1.3) / 3)); return out; }
      if (ax < half + 1.2) out.set(C.mud).lerp(_c.set(C.moss), n * 0.5);
      else out.set(C.floor).lerp(_c.set(C.leafDark), Math.min(1, h / 6) * 0.8 + n * 0.2).lerp(_c.set(C.leaf), smooth(12, 28, ax) * 0.4);
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#bfe3b0', c: '#ffffff', d: '#97c987', density: 4, repeat: [1, 1] } },
  scatter: [
    { key: 'tree', build: P.jungleTree, perChunk: 20, band: [6.5, 30], scale: [0.8, 1.6], shadow: true },
    { key: 'leaf', build: P.giantLeaf, perChunk: 26, band: [5.4, 22], scale: [0.8, 1.7], shadow: true },
    { key: 'fern', build: P.fern, perChunk: 46, band: [4.9, 24], scale: [0.7, 1.5] },
    { key: 'mush', build: P.mushroom, perChunk: 20, band: [5.2, 18], scale: [0.7, 1.7] },
    { key: 'bulb', build: P.bulb, perChunk: 22, band: [5.2, 20], scale: [0.8, 1.6] },
    { key: 'bush', build: P.bush, perChunk: 34, band: [4.9, 24], scale: [0.8, 1.7] },
    { key: 'rock', build: P.rock, perChunk: 16, band: [5.6, 28], scale: [0.6, 1.8], stretch: [0.8, 1.3], lift: -0.1 },
    { key: 'root', build: P.rootArch, perChunk: 5, band: [20, 32], scale: [1.6, 2.8], lift: -0.5 },
  ],
  edge: { build: (C) => ({ post: P.bambooPost(C), lamp: P.sporeLamp() }), spacing: 20, offset: 1.5, lampHeight: 1.9, lampColor: 0x7dff9a, lampEmissive: 0x38ff7a },
  far: { build: P.farRing },
  hazards: { vine: P.vineGeo },
  buildBarrier, buildSolid,
  dress: {
    side: T.jungleRuins, checkpoint: T.checkpoint, bossGate: T.bossGate, arena: T.arena,
    quicksand: T.mire, gap: T.river, doubleGap: T.river, steps: T.river, beam: T.river, vines: T.river,
  },
};
const _c = new THREE.Color();
