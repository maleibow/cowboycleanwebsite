import * as P from './stage01Props.js';
import * as T from './stage01Town.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 1: Desert Scrub. Palette + look. Dusk desert: purple sky, red mesas, orange sand.
// (original drawBackground: sky #2c3e50 -> #e67e22, sun #f1c40f, hills #4a235a / #c0392b / #d35400, floor #e67e22)
export const stage01 = {
  id: 1, name: 'Desert Scrub',
  sky: { top: '#2a1f66', mid: '#b24a7e', horizon: '#ff9a52', sunColor: '#ffc46a', sunDir: [-0.38, 0.17, -1], sunSize: 0.07, sunGlow: 0.55,
         sunBoost: 2.4, stars: 0.55, cloudColor: '#ffb394', cloudShade: '#7a4170', cloudAmount: 0.5, cloudSpeed: 0.01 },
  fog: { color: '#e99a78', near: 28, far: 175 },
  light: { hemiSky: '#e4d4f6', hemiGround: '#e0a07c', hemiIntensity: 2.5, sun: '#ffd09a', sunIntensity: 1.8, sunOffset: [-13, 19, 9] },
  look: { shadowTint: '#c79be6', rimColor: '#ffb070', rimStrength: 0.6, sunLuma: 0.6, grimeTint: '#6f7068' },
  // lift / gamma / gain per stage: warm highlights, violet shadows (original GRADE: rgba(255,140,40,.10))
  grade: { lift: [0.035, 0.0, 0.06], gamma: [1.0, 0.97, 0.93], gain: [1.08, 1.0, 0.9], sat: 1.14, vignette: 0.5, grain: 0.03 },
  ambient: { preset: 'mote', rate: 6 },
  colors: {
    sandLight: 0xe9bd88, sand: 0xe08a46, sandDark: 0xb04e38, rut: 0xc88a60, kerb: 0x8c4638, redRock: 0xc0452d, redRockLit: 0xe0643c,
    strata: [0xc0452d, 0xd9743c, 0x9a3a2e, 0xe59a56], purple: 0x5a3178, purpleFar: 0x7a4690, cactus: 0x58cc7a, cactusLight: 0xb4f59a,
    wood: 0x8a5a33, woodDark: 0x5c3a20, bush: 0xc9a24a,
  },
  // ---- track surface (world/trackBuilder.js): colour noise along the path and two wheel ruts
  path: { noise: 0.07, rut: 0.28, rutX: 1.5, edge: 0.78 },
  pathPalette: { ground: 0xd9a064, platform: 0xe6b574, ledge: 0xa8663c, beam: 0x9a6b43, barrier: 0xd94a3d, wall: 0x6b5b7a, quicksand: 0xd7a05a },
  // ---- ground shaping in track space (world/scenery.js). y is relative to the path top; env lists the gaps / zones nearby.
  terrain: {
    height(s, x, env) {
      const ax = Math.abs(x), half = env.half;
      let flat = 0, arena = 0;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); flat = Math.max(flat, k); if (z.arena) arena = Math.max(arena, k); }
      const d = (Math.sin(x * 0.11 + s * 0.07) * 0.5 + Math.sin(x * 0.23 - s * 0.13) * 0.3 + Math.sin(s * 0.05 + x * 0.17) * 0.4 + 1.2) / 2.4;
      let h = -0.3 * (1 - smooth(half + 0.2, half + 1.2, ax));
      h += smooth(half + 0.8, half + 7, ax) * (0.3 + d * 1.4) * (1 - 0.85 * flat);
      h += smooth(arena ? 21 : 17, 30, ax) * (2.5 + 6 * (1 - d)) * (arena ? 1 : 1 - 0.6 * flat);   // canyon walls close the valley
      for (const q of env.gaps) if (s > q.s0 && s < q.s1) h -= 6.5 * smooth(half + 15, half + 3.5, ax);
      return h;
    },
    color(s, x, h, env, out) {
      const C = stage01.colors, ax = Math.abs(x), half = env.half, n = 0.5 + 0.5 * Math.sin(x * 0.9 + s * 0.4) * Math.sin(s * 0.7 - x * 0.3);
      if (h < -0.8) { out.set(C.strata[Math.floor(-h * 1.2) % 4]).lerp(_c.set(0x4a1f3a), Math.min(1, -h / 5) * 0.85); return out; }   // canyon wall bands, darkening with depth
      if (ax < half + 1.2) out.set(C.kerb).lerp(_c.set(C.sandDark), n * 0.5);
      else out.set(C.sand).lerp(_c.set(C.sandDark), Math.min(1, h / 6) * 0.8 + n * 0.15).lerp(_c.set(C.redRockLit), smooth(14, 30, ax) * 0.5);
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#f0d8bc', c: '#ffffff', d: '#d9b48c', density: 4, repeat: [1, 1] } },
  // ---- instanced scatter: perChunk = instances per 120 m, band = lateral distance range, scale = size range
  scatter: [
    { key: 'cactus', build: P.saguaro, perChunk: 24, band: [6, 30], scale: [0.8, 1.7], shadow: true },
    { key: 'barrel', build: P.barrelCactus, perChunk: 14, band: [5.6, 20], scale: [0.7, 1.4], shadow: true },
    { key: 'rock', build: P.rock, perChunk: 34, band: [5.6, 34], scale: [0.6, 2.2], stretch: [0.8, 1.3], lift: -0.1, shadow: true },
    { key: 'spire', build: P.spire, perChunk: 9, band: [22, 32], scale: [1.4, 2.6], stretch: [1, 1.8], lift: -0.5 },
    { key: 'bush', build: P.bush, perChunk: 50, band: [4.9, 24], scale: [0.7, 1.5] },
  ],
  edge: { build: (C) => ({ post: P.fencePost(C), lamp: P.lantern() }), spacing: 25, offset: 1.6, lampHeight: 1.5 },   // fence posts + glowing lanterns
  far: { build: P.farRing },                                                                                     // three parallax rings of peaks and mesas
  tumble: { count: 9, build: P.tumbleweed },
  dress: { side: T.ghostTown, checkpoint: T.checkpointFlag, bossGate: T.bossGate, arena: T.arenaDress, quicksand: T.quicksandPatch },
};
const _c = new THREE.Color();

