import * as P from './stage06Props.js';
import * as T from './stage06Town.js';
import { buildBarrier } from './stage06Gates.js';
import { buildSolid } from './stage06Solids.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 6: Volcano Peak. Black rock under a blood-red sky, lava rivers in every gap, ash and embers in the air, volcanoes with glowing craters on the horizon.
// (original drawBackground: sky #2c0707 -> #590d0d, a volcano #1a0505 with an #e67e22 crater, hills #3e1a1a with #d35400 lava falls, floor #111 with a #c0392b lava line;
//  GRADE rgba(255,60,0,.14), ember particles rising)
export const stage06 = {
  id: 6, name: 'Volcano Peak',
  sky: { top: '#140303', mid: '#4a0c0c', horizon: '#ff6a20', sunColor: '#ff7a30', sunDir: [0.3, 0.12, -1], sunSize: 0.09, sunGlow: 0.8,
         sunBoost: 2.2, stars: 0.0, cloudColor: '#6a2a1a', cloudShade: '#1c0808', cloudAmount: 0.75, cloudSpeed: 0.02 },
  fog: { color: '#3a1410', near: 22, far: 150 },
  light: { hemiSky: '#c88a78', hemiGround: '#2a1010', hemiIntensity: 1.1, sun: '#ff9a60', sunIntensity: 0.9, sunOffset: [10, 16, 6] },
  look: { shadowTint: '#8a2a3a', rimColor: '#ff7a30', rimStrength: 0.5, sunLuma: 0.6, grimeTint: '#3a2a28' },
  grade: { lift: [0.04, 0.0, 0.0], gamma: [1.0, 0.98, 0.95], gain: [1.05, 0.97, 0.9], sat: 1.15, vignette: 0.6, grain: 0.04 },
  ambient: { preset: 'ember', rate: 16 },
  colors: { rock: 0x3a3236, rockDark: 0x1a1618, rockLit: 0x6a5a60, char: 0x1c1414, glow: 0xff6a20 },
  path: { noise: 0.08, rut: 0.0, rutX: 1.5, edge: 0.75 },
  pathPalette: { ground: 0x3a3236, platform: 0x4a4246, ledge: 0x2a2428, beam: 0x2a1c16, barrier: 0xa83a22, wall: 0x2a2428, quicksand: 0x3a3236 },
  beamGap: true,
  groundDoubleSide: true,
  groundRim: 0.25,
  terrain: {
    height(s, x, env) {
      const ax = Math.abs(x), half = env.half;
      let flat = 0, arena = 0, ar = null;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); flat = Math.max(flat, k); if (z.arena) { arena = Math.max(arena, k); ar = z.arena; } }
      const d = (Math.sin(x * 0.13 + s * 0.09) * 0.5 + Math.sin(x * 0.27 - s * 0.15) * 0.3 + Math.sin(s * 0.06 + x * 0.19) * 0.4 + 1.2) / 2.4;
      let h = -0.25 * (1 - smooth(half + 0.2, half + 1.2, ax));
      h += smooth(half + 0.8, half + 7, ax) * (0.4 + d * 1.8) * (1 - 0.85 * flat);
      h += smooth(arena ? 22 : 16, 30, ax) * (3 + 8 * (1 - d)) * (arena ? 1 : 1 - 0.6 * flat);
      for (const q of env.gaps) if (s > q.s0 - 0.01 && s < q.s1 + 0.01) h -= 3.4 * smooth(half + 12, half + 2.5, ax);
      if (ar) { const dd = Math.hypot(s - ar.s, x - ar.x), mouth = s < ar.s - ar.r + 7 && ax < 5; if (!mouth) h -= 3.0 * smooth(ar.r + 0.1, ar.r + 1.4, dd) * (1 - smooth(ar.r + 4.5, ar.r + 8, dd)); }   // the lava ring round the arena disc
      return h;
    },
    color(s, x, h, env, out) {
      const C = stage06.colors, ax = Math.abs(x), half = env.half, n = 0.5 + 0.5 * Math.sin(x * 1.1 + s * 0.8) * Math.sin(s * 0.9 - x * 0.4);
      if (h < -1.0) { out.set(0x2a0c08).lerp(_c.set(0xff5a10), Math.min(1, 0.6 + (-h - 1) * 0.1) * 0.25); return out; }
      if (ax < half + 1.0) out.set(C.rockLit).lerp(_c.set(C.rock), n * 0.6); else out.set(C.rock).lerp(_c.set(C.rockDark), Math.min(1, h / 6) * 0.8 + n * 0.2).lerp(_c.set(0x5a2a1a), smooth(10, 24, ax) * n * 0.5);
      if (n > 0.93 && ax > half + 1.5) out.lerp(_c.set(0xff5a10), (n - 0.93) * 7);   // thin lava veins in the rock
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#c8b8b0', c: '#ffffff', d: '#8a7068', density: 6, repeat: [1, 1] } },
  scatter: [
    { key: 'basalt', build: P.basalt, perChunk: 20, band: [6.5, 30], scale: [0.8, 1.6], shadow: true },
    { key: 'rock', build: P.lavaRock, perChunk: 26, band: [5.6, 28], scale: [0.7, 1.8], shadow: true },
    { key: 'tree', build: P.deadTree, perChunk: 12, band: [6, 22], scale: [0.8, 1.4], shadow: true },
    { key: 'vent', build: P.fumarole, perChunk: 9, band: [5.8, 20], scale: [0.8, 1.3] },
    { key: 'shards', build: P.shards, perChunk: 14, band: [5.4, 24], scale: [0.8, 1.6] },
  ],
  edge: { build: (C) => ({ post: P.brazier(C), lamp: P.flame() }), spacing: 15, offset: 1.5, lampHeight: 2.0, lampColor: 0xff8a20, lampEmissive: 0xff5a10 },
  far: { build: P.farRing },
  hazards: { plank: P.plank },
  chase: P.lavaWave,
  buildBarrier, buildSolid,
  dress: { side: T.forgeTown, checkpoint: T.checkpoint, bossGate: T.bossGate, arena: T.arena,
    gap: T.river, doubleGap: T.river, steps: T.river, beam: T.river, collapse: T.river, lavaChase: T.river },
};
const _c = new THREE.Color();
