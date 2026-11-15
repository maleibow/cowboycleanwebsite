import * as P from './stage05Props.js';
import * as T from './stage05Town.js';
import { buildBarrier } from './stage05Gates.js';
import { buildSolid } from './stage05Solids.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 5: Paris Nights. Near-black blue sky over cream stone and zinc roofs, warm window light, a lattice tower on the skyline, a river under every gap.
// (original drawBackground: sky #141e30 -> #243b55, tower and rooftops #0a0f18 / #1f2b38 with #f1c40f windows, street #2c3e50; GRADE rgba(255,180,80,.08), warm glow motes)
export const stage05 = {
  id: 5, name: 'Paris Nights',
  sky: { top: '#070b18', mid: '#141e30', horizon: '#4a5a86', sunColor: '#ffe6b0', sunDir: [-0.45, 0.3, -1], sunSize: 0.04, sunGlow: 0.4,
         sunBoost: 2.0, stars: 0.7, moon: true, cloudColor: '#40507a', cloudShade: '#161e34', cloudAmount: 0.35, cloudSpeed: 0.008 },
  fog: { color: '#1e2c4a', near: 26, far: 170 },
  light: { hemiSky: '#9aaad8', hemiGround: '#3a3250', hemiIntensity: 1.7, sun: '#ffe2b8', sunIntensity: 1.1, sunOffset: [-11, 20, 8] },
  look: { shadowTint: '#4a4a9a', rimColor: '#ffc880', rimStrength: 0.4, sunLuma: 0.6, grimeTint: '#4a4658' },
  grade: { lift: [0.02, 0.01, 0.04], gamma: [1.0, 0.98, 1.0], gain: [1.08, 1.02, 1.0], sat: 1.2, vignette: 0.55, grain: 0.035 },
  ambient: { preset: 'mote', rate: 6 },
  colors: { stone: 0xcdbfa4, stoneLight: 0xe6dcc4, zinc: 0x5a6a86, zincLight: 0x7686a2, chimney: 0x8a4a38, awnA: 0xc0392b, cobble: 0x4a5064, walk: 0x7a7a8c },
  path: { noise: 0.08, rut: 0.0, rutX: 1.7, edge: 0.8 },
  pathPalette: { ground: 0x4a5064, platform: 0xcdbfa4, ledge: 0x6f7f98, beam: 0x8a6a45, barrier: 0x8a4a3a, wall: 0x3a4252, quicksand: 0x4a5064, bounce: 0xc0392b },
  beamGap: true,
  groundDoubleSide: true,
  groundRim: 0.3,
  terrain: {
    height(s, x, env) {
      const ax = Math.abs(x), half = env.half;
      let flat = 0, arena = 0;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); flat = Math.max(flat, k); if (z.arena) arena = Math.max(arena, k); }
      let h = 0.1 * smooth(half + 0.2, half + 1.0, ax) - 2.4 * (1 - smooth(half - 0.3, half + 0.5, ax));   // pavement a hair above the cobbles; a sunken floor under the track (the Seine's trench)
      h += smooth(half + 1.5, half + 6, ax) * 0.15 * (1 - flat);
      h += smooth(arena ? 24 : 20, 30, ax) * (2 + 4 * Math.abs(Math.sin(s * 0.09 + x * 0.05))) * (arena ? 1 : 1 - 0.5 * flat);   // the blocks behind the street
      for (const q of env.gaps) if (s > q.s0 - 0.01 && s < q.s1 + 0.01) h -= 3.0 * smooth(half + 13, half + 2.5, ax);
      return h;
    },
    color(s, x, h, env, out) {
      const C = stage05.colors, ax = Math.abs(x), half = env.half, n = 0.5 + 0.5 * Math.sin(x * 1.7 + s * 0.9) * Math.sin(s * 1.1 - x * 0.5);
      if (h < -1.2) { out.set(0x0c1428).lerp(_c.set(0x060a14), Math.min(1, (-h - 1.2) / 3)); return out; }
      if (ax < half + 0.9) out.set(C.cobble).lerp(_c.set(0x3a4056), n * 0.5); else out.set(C.walk).lerp(_c.set(C.cobble), n * 0.4).lerp(_c.set(0x2a2c3c), smooth(8, 26, ax) * 0.8);
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#d8d8e8', c: '#ffffff', d: '#a8a8c0', density: 6, repeat: [1, 1] } },
  scatter: [
    { key: 'haussmann', build: P.haussmann, perChunk: 14, band: [12, 32], scale: [0.9, 1.3], shadow: true },
    { key: 'pavilion', build: P.pavilion, perChunk: 7, band: [14, 32], scale: [0.9, 1.2], shadow: true },
    { key: 'terrace', build: P.terrace, perChunk: 12, band: [5.6, 8.6], scale: [0.9, 1.1] },
    { key: 'tree', build: P.planeTree, perChunk: 14, band: [5.4, 14], scale: [0.9, 1.4], shadow: true },
    { key: 'morris', build: P.morris, perChunk: 5, band: [5.4, 8], scale: [1, 1.2] },
  ],
  edge: { build: (C) => ({ post: P.lampPost(C), lamp: P.lampHead() }), spacing: 17, offset: 1.4, lampHeight: 3.9, lampColor: 0xffc060, lampEmissive: 0xff9a30 },
  far: { build: P.farRing },
  buildBarrier, buildSolid,
  dress: {
    side: T.cafeStreet, checkpoint: T.checkpoint, bossGate: T.bossGate, arena: T.arena,
    gap: T.river, doubleGap: T.river, steps: T.river, beam: T.river, bounceGap: T.river, awnings: T.river,
  },
};
const _c = new THREE.Color();
