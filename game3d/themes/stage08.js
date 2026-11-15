import * as P from './stage08Props.js';
import * as T from './stage08Town.js';
import { buildBarrier } from './stage08Gates.js';
import { buildSolid } from './stage08Solids.js';
import { smooth } from '../world/scenery.js';
import * as THREE from 'three';

// Stage 8: Cloud Dream. A soft, bright dream above a sea of cloud: pink-to-white sky, pearl-white walkways, lilac shadows, floating islets and stars, a sleepy village for the side section.
// (original drawBackground: sky #FFB6C1 -> #FFC0CB, white puffs made of three circles, floor #f5f5f5; the path is open sky wherever there is a gap)
export const stage08 = {
  id: 8, name: 'Cloud Dream',
  sky: { top: '#f59cc8', mid: '#ffc9e0', horizon: '#fff6fa', sunColor: '#fff4e0', sunDir: [-0.42, 0.34, -1], sunSize: 0.07, sunGlow: 0.5,
         sunBoost: 1.5, stars: 0.12, cloudColor: '#ffffff', cloudShade: '#e6b8e0', cloudAmount: 0.85, cloudSpeed: 0.008 },
  fog: { color: '#ffe3ef', near: 48, far: 230 },
  light: { hemiSky: '#ffffff', hemiGround: '#f4e4ff', hemiIntensity: 1.8, sun: '#fff2ea', sunIntensity: 0.95, sunOffset: [-12, 22, 8] },
  look: { shadowTint: '#c8bdee', rimColor: '#ffffff', rimStrength: 0.3, sunLuma: 0.62, grimeTint: '#b0aac4' },
  grade: { lift: [0.01, 0.0, 0.02], gamma: [1.0, 1.0, 0.99], gain: [1.0, 0.98, 1.0], sat: 1.25, vignette: 0.22, grain: 0.02 },
  ambient: { preset: 'sparkle', rate: 8 },
  colors: { cloud: 0xffffff, lilac: 0xd9c2ff, pink: 0xffc2dc, mint: 0xbfeedd },
  path: { noise: 0.035, rut: 0.0, rutX: 1.7, edge: 0.9 },
  pathPalette: { ground: 0xffe2ef, platform: 0xdccbff, ledge: 0xffffff, beam: 0xf4eefc, barrier: 0xc2e4ff, wall: 0xd9c2ff, quicksand: 0xfff3f8 },
  groundRim: 0.12,
  terrain: {
    height(s, x, env) {   // the cloud sea, well below the walkway, with soft cumulus banks rising at the sides
      const ax = Math.abs(x), half = env.half;
      let arena = 0, ar = null;
      for (const z of env.zones) { const k = smooth(z.s0 - 6, z.s0 + 2, s) * (1 - smooth(z.s1 - 2, z.s1 + 6, s)); if (z.arena) { arena = Math.max(arena, k); ar = z.arena; } }
      const d = (Math.sin(x * 0.12 + s * 0.07) * 0.5 + Math.sin(x * 0.25 - s * 0.13) * 0.3 + Math.sin(s * 0.05 + x * 0.17) * 0.4 + 1.2) / 2.4;
      let h = -3.3 + (-2.6 + d * 0.6) * smooth(half - 0.2, half + 2.5, ax);                    // under the path: close below; the cliff falls away to the sea
      h += smooth(half + 10, half + 26, ax) * (0.4 + 2.2 * d);                                  // cumulus banks at the sides
      if (ar) { const k = arena * (1 - smooth(ar.r - 0.5, ar.r + 1.5, Math.hypot(s - ar.s, x - ar.x))); h = h * (1 - k) - 2.2 * k; }   // the arena disc floats clear of the sea
      return h;
    },
    color(s, x, h, env, out) {
      const n = 0.5 + 0.5 * Math.sin(x * 0.7 + s * 0.45) * Math.sin(s * 0.6 - x * 0.3), k = Math.min(1, Math.max(0, (-h - 0.5) / 6));
      out.set(0xffffff).lerp(_c.set(0xe9dcff), k * 0.6).lerp(_c.set(0xffd0e4), n * 0.4);
      return out;
    },
  },
  ground: { texture: { type: 'speckle', size: 128, a: '#ffffff', b: '#f6eefc', c: '#ffffff', d: '#e4d6f6', density: 3, repeat: [1, 1] } },
  scatter: [
    { key: 'tower', build: P.tower, perChunk: 15, band: [9, 34], scale: [1.2, 2.5], shadow: false },
    { key: 'puff', build: P.puff, perChunk: 26, band: [6.5, 26], scale: [1.0, 2.1] },
    { key: 'islet', build: P.islet, perChunk: 9, band: [10, 30], scale: [0.9, 1.9], lift: 4.5 },
    { key: 'star', build: P.hangStar, perChunk: 10, band: [7, 22], scale: [0.9, 1.5], lift: 3 },
    { key: 'gems', build: P.gems, perChunk: 12, band: [5.6, 18], scale: [0.9, 1.5], lift: 4.2 },
  ],
  edge: { build: () => ({ post: P.dreamPost(), lamp: P.pearl() }), spacing: 18, offset: 1.5, lampHeight: 2.05, lampColor: 0xffffff, lampEmissive: 0xffd9ec },
  far: { build: P.farRing },
  hazards: { cloud: P.cloudPad },
  buildBarrier, buildSolid,
  dress: { side: T.slumberRow, checkpoint: T.checkpoint, bossGate: T.bossGate, arena: T.arena,
    gap: T.cloudSea, doubleGap: T.cloudSea, steps: T.cloudSea, beam: T.cloudSea, cloudHop: T.cloudSea, cloudRide: T.cloudSea },
};
const _c = new THREE.Color();
