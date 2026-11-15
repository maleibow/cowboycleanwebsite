import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { eyes, foot } from './partKit.js';

// Stage 6 (Volcano Peak) enemy models, same contract as enemyModels.js. Looks follow the original sprites (cleaningup.html 6264-6300):
// magma = a squat red-hot trapezoid of molten rock with an orange core that swells and two yellow eyes, ember = a spinning yellow eight-pointed spark with a white core.
// (slag reuses stage 3's scrap golem.) Glow uses colours above 1.0 (bloom).
const sin = Math.sin, cos = Math.cos, abs = Math.abs, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };
const bi = () => new Builder({ ico: true });
const CORE = new THREE.Color(3.2, 1.3, 0.2), HOT = new THREE.Color(3.4, 2.4, 0.6), EYE = new THREE.Color(3.4, 3.0, 0.5), WHITE = new THREE.Color(3.5, 3.2, 2.6);

export const MODELS6 = {
  // ---- MAGMA: a molten-rock brute: a dark red crust broken by a glowing orange belly, stubby legs, two yellow eyes under a heavy brow. Its core pulses as it walks.
  magma: {
    size: [1.5, 1.07],
    root: (S, p) => { const w = sin(S.t * 5) * S.sp; p.y = abs(w) * 0.04; p.rz = w * 0.04; keep(p, 1 + sin(S.t * 3) * 0.04 - S.hit * 0.12); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().box(1.3, 0.8, 0.9, 0xc0392b, { p: [0, 0.65, 0], radius: 0.2, jitter: 0.06, ao: 0.22 }).box(1.0, 0.5, 0.8, 0x8a2418, { p: [0, 1.1, 0], radius: 0.18, jitter: 0.05 });
        b.sphere(0.3, 0x3a1410, { p: [-0.5, 1.2, 0.1], s: [1, 0.8, 1], jitter: 0.05 }).sphere(0.26, 0x3a1410, { p: [0.45, 1.25, -0.1], s: [1, 0.8, 1], jitter: 0.05 });   // dark crust plates on the shoulders
        b.sphere(0.34, CORE, { p: [0, 0.62, 0.42], s: [1.3, 1, 0.5], ao: 0 });                                                                                          // the molten belly
        for (const [x, y, a] of [[-0.4, 0.9, 0.5], [0.35, 0.95, -0.6], [-0.3, 0.4, -0.4], [0.4, 0.35, 0.3]]) b.box(0.34, 0.05, 0.05, CORE, { p: [x, y, 0.46], r: [0, 0, a], radius: 0.01, ao: 0 });   // cracks
        b.box(1.0, 0.14, 0.3, 0x2a0e0a, { p: [0, 1.0, 0.4], radius: 0.05 });
        for (const s of [-1, 1]) { b.sphere(0.12, EYE, { p: [s * 0.24, 0.98, 0.45], s: [1, 1, 0.6], ao: 0 }); b.sphere(0.05, 0x1a0a06, { p: [s * 0.24, 0.98, 0.54], ao: 0 }); b.box(0.3, 0.06, 0.06, 0x1a0a06, { p: [s * 0.24, 1.12, 0.46], r: [0, 0, -s * 0.35], radius: 0.01, ao: 0 }); }   // yellow eyes under a heavy brow
        for (const x of [-0.3, -0.1, 0.1, 0.3]) b.cone(0.05, 0.15, 0xe8d8b0, { p: [x, 0.44, 0.46], r: [Math.PI, 0, 0], seg: 4, ao: 0 });
        return b; } },
      { name: 'core', pose: (S, p) => { const k = 1 + sin(S.t * 6) * 0.12; p.sx = p.sy = p.sz = k; p.y = 0.62 * (1 - k); p.z = 0.0; }, build: () => bi().sphere(0.22, HOT, { p: [0, 0.62, 0.45], s: [1, 1, 0.4], ao: 0 }) },
      { name: 'legs', pose: (S, p) => { p.y = abs(sin(S.t * 5)) * 0.03 * S.sp; }, build: () => { const b = bi(); for (const s of [-1, 1]) foot(b, { x: s * 0.4, y: 0.2, z: 0.03, w: 0.42, h: 0.4, l: 0.5, color: 0x3a1410 }); return b; } },
    ],
  },

  // ---- EMBER: a spitting spark: a spinning eight-pointed star of flame with a white-hot heart and a trail of cinders. Whirls at you and dives.
  ember: {
    size: [0.64, 0.64],
    root: (S, p) => { p.y = sin(S.t * 8) * 0.06; p.rx = S.dive ? 0.8 : 0; p.rz = clamp(-S.dx * 0.05, -0.4, 0.4); },
    parts: [
      { name: 'star', pose: (S, p) => { p.y = 0.34; p.rz = S.t * 6; }, build: () => {
        const b = bi(); for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283, long = i % 2 === 0; b.cone(long ? 0.13 : 0.1, long ? 0.46 : 0.28, long ? 0xf1c40f : 0xe67e22, { p: [cos(a) * (long ? 0.3 : 0.2), sin(a) * (long ? 0.3 : 0.2), 0], r: [0, 0, a - Math.PI / 2], seg: 4, ao: 0 }); }
        b.sphere(0.2, 0xff9a20, { p: [0, 0, 0], jitter: 0.02, ao: 0 }); return b; } },
      { name: 'heart', pose: (S, p) => { p.y = 0.34; const k = 1 + sin(S.t * 14) * 0.15; p.sx = p.sy = p.sz = k; }, build: () => { const b = bi().sphere(0.13, WHITE, { ao: 0 }); eyes(b, { y: 0.02, z: 0.1, gap: 0.07, r: 0.04, pr: 0.6, white: 0xffffff, brow: 0.4, look: 0.1 }); return b; } },
      { name: 'cinders', pose: (S, p) => { p.y = 0.34; p.ry = S.t * 2; }, build: () => { const b = bi(); for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283; b.sphere(0.04, CORE, { p: [cos(a) * 0.5, -0.05 - i * 0.04, sin(a) * 0.5], ao: 0 }); } return b; } },
    ],
  },
};
