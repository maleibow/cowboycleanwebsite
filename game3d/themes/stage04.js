import * as P from './stage04Props.js';
import * as T from './stage04Town.js';
import { buildBarrier } from './stage04Gates.js';
import { buildSolid } from './stage04Solids.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 4: New York City. Navy night skyline, lit yellow windows, wet asphalt with a dashed line, taxis, steam; a flooded trench fills every gap.
// (original drawBackground: sky #0d1b2a -> #1b263b, small yellow moon #f1c40f, towers #16213e / #0f3460 with #f1c40f windows, road #333 with a dashed #f1c40f line)
export const stage04 = {
  id: 4, name: 'New York City',
  sky: { top: '#050a16', mid: '#102040', horizon: '#3a5a8a', sunColor: '#f1c40f', sunDir: [0.55, 0.28, -1], sunSize: 0.045, sunGlow: 0.5,
         sunBoost: 2.4, stars: 0.5, moon: true, cloudColor: '#4a5a80', cloudShade: '#1a2442', cloudAmount: 0.4, cloudSpeed: 0.01 },
  fog: { color: '#1b3158', near: 24, far: 160 },
  light: { hemiSky: '#8aa6d8', hemiGround: '#26324c', hemiIntensity: 1.7, sun: '#ffe2b0', sunIntensity: 1.2, sunOffset: [-10, 20, 7] },
  look: { shadowTint: '#3c4c9a', rimColor: '#ffd070', rimStrength: 0.3, sunLuma: 0.6, grimeTint: '#4a5266' },
  grade: { lift: [0.0, 0.01, 0.045], gamma: [1.0, 0.98, 1.02], gain: [1.06, 1.0, 1.1], sat: 1.22, vignette: 0.55, grain: 0.035 },
  ambient: { preset: 'mote', rate: 6 },
  colors: { brick: 0xa5573f, brickDark: 0x6a362c, concrete: 0x9aa0b0, steel: 0x4a5468, glass: 0x2a4a7a, taxi: 0xf5c518, wood: 0x6a4a32, woodDark: 0x3a2a1c, asphalt: 0x2e323e, walk: 0x6a7080 },
  path: { noise: 0.05, rut: 0.14, rutX: 1.7, edge: 0.78, dash: 0xf1c40f },
  pathPalette: { ground: 0x4a4e5c, platform: 0x7a808e, ledge: 0x6a7080, beam: 0x9a7a4a, barrier: 0x8a4a3a, wall: 0x3a4252, quicksand: 0x4a4e5c },
  beamGap: true,
  groundDoubleSide: true,
  groundRim: 0.2,
  terrain: {
    height(s, x, env) {
      const ax = Math.abs(x), half = env.half;
      let flat = 0, arena = 0;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); flat = Math.max(flat, k); if (z.arena) arena = Math.max(arena, k); }
      let h = 0.12 * smooth(half + 0.2, half + 1.0, ax) - 2.6 * (1 - smooth(half - 0.3, half + 0.5, ax));   // sidewalks a hair above the road; a sunken floor under it (the manholes' shafts)
      h += smooth(half + 1.5, half + 6, ax) * 0.18 * (1 - flat);
      h += smooth(arena ? 24 : 20, 30, ax) * (1.5 + 4 * Math.abs(Math.sin(s * 0.11 + x * 0.05))) * (arena ? 1 : 1 - 0.5 * flat);    // block faces far off the road
      for (const q of env.gaps) if (s > q.s0 - 0.01 && s < q.s1 + 0.01) h -= 3.2 * smooth(half + 13, half + 2.5, ax);                       // the trench
      return h;
    },
    color(s, x, h, env, out) {
      const C = stage04.colors, ax = Math.abs(x), half = env.half, n = 0.5 + 0.5 * Math.sin(x * 1.3 + s * 0.8) * Math.sin(s * 0.9 - x * 0.4);
      if (h < -1.3) { out.set(0x0c1424).lerp(_c.set(0x06090f), Math.min(1, (-h - 1.3) / 3)); return out; }
      if (ax < half + 0.9) out.set(C.asphalt); else out.set(C.walk).lerp(_c.set(C.asphalt), n * 0.35).lerp(_c.set(0x2a2c38), smooth(8, 26, ax) * 0.8);
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#d8d8e8', c: '#ffffff', d: '#a8a8c0', density: 5, repeat: [1, 1] } },
  scatter: [
    { key: 'brownstone', build: P.brownstone, perChunk: 14, band: [12, 30], scale: [0.9, 1.3], shadow: true },
    { key: 'highrise', build: P.highrise, perChunk: 11, band: [15, 36], scale: [1.0, 1.6], shadow: true },
    { key: 'warehouse', build: P.warehouse, perChunk: 7, band: [13, 30], scale: [0.9, 1.2], shadow: true },
    { key: 'taxi', build: P.taxi, perChunk: 10, band: [5.9, 8.2], scale: [1, 1], shadow: true },
    { key: 'hydrant', build: P.hydrant, perChunk: 14, band: [5.3, 7], scale: [1, 1.2] },
    { key: 'vent', build: P.ventStack, perChunk: 8, band: [5.6, 11], scale: [0.6, 0.9] },
    { key: 'bags', build: P.trashBags, perChunk: 16, band: [5.2, 9], scale: [0.8, 1.3] },
    { key: 'sign', build: P.billboard, perChunk: 5, band: [8, 22], scale: [1, 1.5] },
  ],
  edge: { build: (C) => ({ post: P.lampPost(C), lamp: P.lampHead() }), spacing: 18, offset: 1.4, lampHeight: 4.5, lampColor: 0xffd070, lampEmissive: 0xffb040 },
  far: { build: P.farRing },
  hazards: { taxi: P.taxi },
  buildBarrier, buildSolid,
  dress: {
    side: T.shopStreet, checkpoint: T.checkpoint, bossGate: T.bossGate, arena: T.arena,
    gap: T.river, doubleGap: T.river, steps: T.river, beam: T.river, rooftops: T.river, manholes: T.manholes, crossing: T.crossing,
  },
};
const _c = new THREE.Color();
