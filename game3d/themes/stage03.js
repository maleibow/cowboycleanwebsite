import * as P from './stage03Props.js';
import * as T from './stage03Town.js';
import { buildBarrier } from './stage03Gates.js';
import { buildSolid } from './stage03Solids.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 3: Neo-Scrap City. Night, deep purple, cyan/magenta neon, scrap towers, conveyor belts; toxic acid fills every gap.
// (original drawBackground: sky #15002b -> #8e0045, magenta moon #ff007f, towers #1a0033 / #2d004d with #ff00cc and #00ffcc outlines, floor #34495e)
export const stage03 = {
  id: 3, name: 'Neo-Scrap City',
  sky: { top: '#0b0120', mid: '#3a0a58', horizon: '#c91d86', sunColor: '#ff3da6', sunDir: [0.5, 0.3, -1], sunSize: 0.1, sunGlow: 0.8,
         sunBoost: 2.2, stars: 0.9, moon: true, cloudColor: '#8a2a9a', cloudShade: '#2a0a48', cloudAmount: 0.45, cloudSpeed: 0.012 },
  fog: { color: '#34104e', near: 18, far: 135 },
  light: { hemiSky: '#8f7ae6', hemiGround: '#1a0f33', hemiIntensity: 1.1, sun: '#ff6ad0', sunIntensity: 1.0, sunOffset: [12, 20, 6] },
  look: { shadowTint: '#3a2a8a', rimColor: '#33ffe6', rimStrength: 0.7, sunLuma: 0.55, grimeTint: '#4a3a62' },
  grade: { lift: [0.02, 0.0, 0.06], gamma: [1.0, 0.95, 1.03], gain: [1.1, 0.94, 1.16], sat: 1.25, vignette: 0.62, grain: 0.035 },
  ambient: { preset: 'spark', rate: 10 },
  colors: { metal: 0x2a2f48, metalLight: 0x4a5270, rust: 0x8a4a32, asphalt: 0x211f38, asphaltLight: 0x2c2a48, hazard: 0xf2c200 },
  path: { noise: 0.06, rut: 0.22, rutX: 1.5, edge: 0.72 },
  pathPalette: { ground: 0x6a6f94, platform: 0x59617a, ledge: 0x4a5068, beam: 0x6a6a7e, barrier: 0x4a5068, wall: 0x3e4660, quicksand: 0x4a5068, conveyor: 0x2a2a38 },
  beamGap: true,
  groundDoubleSide: true,
  groundRim: 0.12,   // the cyan rim light would flood the flat ground at a grazing angle
  terrain: {
    height(s, x, env) {
      const ax = Math.abs(x), half = env.half;
      let flat = 0, arena = 0;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); flat = Math.max(flat, k); if (z.arena) arena = Math.max(arena, k); }
      const d = (Math.sin(x * 0.15 + s * 0.1) * 0.5 + Math.sin(x * 0.31 - s * 0.17) * 0.3 + Math.sin(s * 0.07 + x * 0.21) * 0.4 + 1.2) / 2.4;
      let h = -0.3 * (1 - smooth(half + 0.2, half + 1.2, ax));
      h += smooth(half + 0.8, half + 5, ax) * (0.2 + d * 0.9) * (1 - 0.85 * flat);                  // piled scrap beside the road
      h += smooth(arena ? 22 : 18, 30, ax) * (2 + 5 * (1 - d)) * (arena ? 1 : 1 - 0.6 * flat);      // scrap mountains close the valley
      for (const q of env.gaps) if (s > q.s0 - 0.01 && s < q.s1 + 0.01) h -= 3.4 * smooth(half + 13, half + 2.5, ax);   // the acid pit
      return h;
    },
    color(s, x, h, env, out) {
      const C = stage03.colors, ax = Math.abs(x), half = env.half, n = 0.5 + 0.5 * Math.sin(x * 0.9 + s * 0.5) * Math.sin(s * 0.65 - x * 0.3);
      if (h < -1.3) { out.set(0x0f2a1a).lerp(_c.set(0x061008), Math.min(1, (-h - 1.3) / 3)); return out; }
      if (ax < half + 1.2) out.set(C.asphaltLight).lerp(_c.set(C.asphalt), n * 0.5);
      else out.set(C.asphalt).lerp(_c.set(C.rust), Math.min(1, h / 5) * 0.55 + n * 0.12).lerp(_c.set(C.metal), smooth(12, 28, ax) * 0.4);
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#c8c0e0', c: '#ffffff', d: '#9a90c0', density: 5, repeat: [1, 1] } },
  scatter: [
    { key: 'tower', build: P.scrapTower, perChunk: 14, band: [9, 34], scale: [1.0, 2.0], shadow: true },
    { key: 'container', build: P.container, perChunk: 12, band: [6.5, 26], scale: [0.9, 1.3], shadow: true },
    { key: 'junk', build: P.junkPile, perChunk: 24, band: [5.5, 22], scale: [0.8, 1.5], shadow: true },
    { key: 'pylon', build: P.neonPylon, perChunk: 7, band: [7, 22], scale: [0.9, 1.4] },
    { key: 'cog', build: P.cog, perChunk: 6, band: [8, 28], scale: [1, 2], lift: -0.5 },
  ],
  edge: { build: (C) => ({ post: P.bollard(C), lamp: P.bollardLamp() }), spacing: 16, offset: 1.5, lampHeight: 1.4, lampColor: 0x25ffe6, lampEmissive: 0x00e8d0 },
  far: { build: P.farRing },
  hazards: { piston: P.pistonGeo },
  buildBarrier, buildSolid,
  dress: {
    side: T.neonAlley, checkpoint: T.checkpoint, bossGate: T.bossGate, arena: T.arena,
    conveyor: T.beltDress, reversal: T.beltDress, gap: T.river, doubleGap: T.river, steps: T.river, beam: T.river,
  },
};
const _c = new THREE.Color();
