import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { blob, eyes, wing, spike } from './partKit.js';

// Stage 2 (Toxic Jungle) enemy models, same contract as enemyModels.js: { size, root(S,p), parts:[{ name, build, pose(S,p) }] }.
// Looks follow the original sprites (cleaningup.html 5400-5666): slime = green jelly, bloom = purple petal flower on a yellow core,
// sludge = dark green slab with yellow eyes, bat = purple wings and a red eye, frog = big-eyed green hopper, centipede = orange segments.
const sin = Math.sin, cos = Math.cos, max = Math.max, abs = Math.abs, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };
const GLOW = (r, g, b) => new THREE.Color(r, g, b);

export const MODELS2 = {
  // ---- SLIME: a wobbling green jelly with a pale belly, two big eyes and a gooey grin (original: #2ecc71 body, #abebc6 shine)
  slime: {
    size: [1.07, 1.0],
    root: (S, p) => { const w = sin(S.t * 9) * (0.04 + S.sp * 0.07); keep(p, 1 + w - S.hit * 0.14); p.rx = 0.07 * S.sp; },
    parts: [
      { name: 'body', pose: (S, p) => { p.z = sin(S.t * 9) * 0.03 * S.sp; }, build: () => {
        const b = new Builder(); blob(b, { r: 0.52, p: [0, 0.5, 0], color: 0x2ecc71, hi: 0xabebc6, squash: [1.05, 0.88, 1], jitter: 0.05 });
        for (const [x, y, z, r] of [[-0.28, 0.3, 0.38, 0.07], [0.3, 0.7, 0.3, 0.055], [0.1, 0.25, 0.46, 0.05]]) b.sphere(r, 0xdfffe8, { p: [x, y, z], ao: 0 });   // bubbles trapped in the jelly
        eyes(b, { y: 0.62, z: 0.4, gap: 0.19, r: 0.13, pr: 0.45, brow: 0.35 });
        b.box(0.3, 0.06, 0.05, 0x0c3a1c, { p: [0, 0.38, 0.5], r: [0, 0, 0.0], radius: 0.02, ao: 0 });
        return b; } },
      { name: 'goo', pose: (S, p) => { p.y = 0; p.sx = 1 + 0.12 * sin(S.t * 5); p.sz = p.sx; }, build: () => new Builder().cyl(0.62, 0.7, 0.07, 0x1e8449, { p: [0, 0.035, 0], seg: 10, jitter: 0.08, ao: 0 }) },
    ],
  },

  // ---- BLOOM: a toxic flower, five spinning purple petals round a yellow-orange core with angry eyes, hanging on a curling stem
  bloom: {
    size: [1.29, 1.29],
    root: (S, p) => { p.y = sin(S.t * 2.4) * 0.05; p.rz = sin(S.t * 1.7) * 0.06; keep(p, 1 - S.hit * 0.12); },
    parts: [
      { name: 'stem', pose: (S, p) => { p.rz = sin(S.t * 2.1) * 0.15; }, build: () => {
        const b = new Builder(); b.cyl(0.04, 0.07, 0.8, 0x27ae60, { p: [0, 0.4, 0], seg: 5, ao: 0.2 }).add(new THREE.IcosahedronGeometry(0.16, 0), 0x2ecc71, { p: [0.12, 0.3, 0], s: [1.6, 0.4, 0.8], r: [0, 0, -0.5], ao: 0 }).add(new THREE.IcosahedronGeometry(0.16, 0), 0x229954, { p: [-0.12, 0.15, 0], s: [1.6, 0.4, 0.8], r: [0, 0, 0.5], ao: 0 });
        return b; } },
      { name: 'petals', pose: (S, p) => { p.y = 0.85; p.rz = S.t * 2.4; }, build: () => {
        const b = new Builder(); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; b.add(new THREE.OctahedronGeometry(0.3, 0), i % 2 ? 0x9b59b6 : 0x8e44ad, { p: [Math.cos(a) * 0.42, Math.sin(a) * 0.42, -0.04], s: [0.8, 1.5, 0.45], r: [0, 0, a - Math.PI / 2], ao: 0 }); }
        return b; } },
      { name: 'core', pose: (S, p) => { p.y = 0.85; }, build: () => {
        const b = new Builder().sphere(0.3, 0xf1c40f, { p: [0, 0, 0.02], s: [1, 1, 0.8], ao: 0 }).sphere(0.17, 0xe67e22, { p: [0, 0, 0.13], s: [1, 1, 0.6], ao: 0 });
        eyes(b, { y: 0.04, z: 0.26, gap: 0.11, r: 0.075, pr: 0.55, brow: 0.55, shine: false }); b.box(0.2, 0.04, 0.04, 0x5a2a08, { p: [0, -0.13, 0.28], radius: 0.01, ao: 0 });
        for (let i = 0; i < 4; i++) b.sphere(0.04, GLOW(1.5, 3.2, 1.2), { p: [Math.cos(i * 1.6) * 0.34, Math.sin(i * 1.6) * 0.34, 0.1], ao: 0 });   // spore pods
        return b; } },
    ],
  },

  // ---- BAT: dark purple body, big ears, a red eye and fangs, leathery wings that flap (original: #4a235a body, #9b59b6 wings, #e74c3c eye)
  bat: {
    size: [1.28, 0.64],
    root: (S, p) => { p.rx = S.dive ? 0.9 : 0.1; p.rz = clamp(-S.dx * 0.07, -0.6, 0.6); p.y = S.dive ? 0 : sin(S.t * 10) * 0.06; keep(p, 1 - S.hit * 0.1); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = new Builder().sphere(0.22, 0x4a235a, { p: [0, 0.34, 0], s: [0.9, 1, 1.1], jitter: 0.03 }).sphere(0.17, 0x6c3483, { p: [0, 0.42, 0.18], jitter: 0.02 });
        for (const s of [-1, 1]) { spike(b, { p: [s * 0.1, 0.62, 0.15], r: 0.06, h: 0.24, color: 0x4a235a, rot: [0, 0, s * -0.25], seg: 4 }); b.sphere(0.04, 0xff3b30, { p: [s * 0.07, 0.45, 0.32], ao: 0 }); b.cone(0.022, 0.1, 0xf3ead8, { p: [s * 0.045, 0.3, 0.32], r: [Math.PI, 0, 0], seg: 4, ao: 0 }); }
        b.cone(0.03, 0.16, 0x4a235a, { p: [0, 0.2, -0.22], r: [-1.2, 0, 0], seg: 4 });
        return b; } },
      { name: 'wingL', pose: (S, p) => { const f = S.dive ? -0.9 : sin(S.t * (S.sp > 0.3 ? 14 : 9)) * 0.95 + 0.1; p.x = -0.12; p.y = 0.4; p.rz = -f; p.ry = S.dive ? 0.5 : 0; }, build: () => wing(new Builder(), { side: -1, span: 0.62, chord: 0.3, feathers: 4, color: 0x9b59b6, tip: 0x6c3483 }) },
      { name: 'wingR', pose: (S, p) => { const f = S.dive ? -0.9 : sin(S.t * (S.sp > 0.3 ? 14 : 9)) * 0.95 + 0.1; p.x = 0.12; p.y = 0.4; p.rz = f; p.ry = S.dive ? -0.5 : 0; }, build: () => wing(new Builder(), { side: 1, span: 0.62, chord: 0.3, feathers: 4, color: 0x9b59b6, tip: 0x6c3483 }) },
    ],
  },

  // ---- FROG: a fat green hopper with bulging eyes, a pale throat and big back legs that kick out in flight (original: #2ecc71 ball, white eye)
  frog: {
    size: [1.07, 0.9],
    root: (S, p) => { keep(p, S.air ? 1.1 : 1 - 0.3 * S.squash - S.hit * 0.1); p.rx = S.air ? clamp(S.vy * 0.04, -0.3, 0.3) : 0; },
    parts: [
      { name: 'body', pose: (S, p) => { p.y = S.air ? 0 : abs(sin(S.t * 3)) * 0.02; }, build: () => {
        const b = new Builder().sphere(0.42, 0x2ecc71, { p: [0, 0.4, 0], s: [1.15, 0.8, 1.15], jitter: 0.03 }).sphere(0.3, 0xd5f5b8, { p: [0, 0.3, 0.2], s: [1, 0.8, 0.7], ao: 0 })
          .box(0.55, 0.05, 0.06, 0x145a32, { p: [0, 0.44, 0.45], radius: 0.02, ao: 0 });
        for (const [x, y, z, r] of [[-0.22, 0.58, -0.1, 0.07], [0.18, 0.62, -0.14, 0.06], [0.0, 0.66, 0.0, 0.05]]) b.sphere(r, 0x1e8449, { p: [x, y, z], s: [1, 0.6, 1], ao: 0 });
        for (const s of [-1, 1]) { b.sphere(0.15, 0x27ae60, { p: [s * 0.22, 0.72, 0.18], ao: 0 }).sphere(0.115, 0xffffff, { p: [s * 0.23, 0.75, 0.27], s: [1, 1, 0.7], ao: 0 }).sphere(0.055, 0x111111, { p: [s * 0.22, 0.75, 0.36], s: [1, 1.3, 0.5], ao: 0 }); }
        return b; } },
      { name: 'legL', pose: (S, p) => { p.x = -0.34; p.y = 0.18; p.z = -0.1; p.rx = S.air ? 1.1 : 0; p.sy = S.air ? 1.5 : 1; }, build: () => new Builder().sphere(0.2, 0x27ae60, { p: [0, 0.1, 0], s: [0.7, 1, 1.1] }).box(0.16, 0.08, 0.4, 0x1e8449, { p: [0, -0.12, 0.14], radius: 0.03 }) },
      { name: 'legR', pose: (S, p) => { p.x = 0.34; p.y = 0.18; p.z = -0.1; p.rx = S.air ? 1.1 : 0; p.sy = S.air ? 1.5 : 1; }, build: () => new Builder().sphere(0.2, 0x27ae60, { p: [0, 0.1, 0], s: [0.7, 1, 1.1] }).box(0.16, 0.08, 0.4, 0x1e8449, { p: [0, -0.12, 0.14], radius: 0.03 }) },
    ],
  },

  // ---- SLUDGE: a slow dark-green slab of muck with a glossy patch, dripping edges and small yellow eyes (original: #145a32 slab, #229954 patch, #f1c40f eyes)
  sludge: {
    size: [1.7, 1.3],
    root: (S, p) => { const w = sin(S.t * 3) * (0.03 + S.sp * 0.05); keep(p, 1 + w - S.hit * 0.1); p.rz = sin(S.t * 2) * 0.02; },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = new Builder().box(1.6, 1.05, 1.15, 0x145a32, { p: [0, 0.62, 0], radius: 0.3, jitter: 0.07 }).box(1.0, 0.55, 0.12, 0x229954, { p: [-0.18, 0.78, 0.55], radius: 0.1, ao: 0 })
          .sphere(0.45, 0x1e8449, { p: [-0.35, 1.18, 0.05], s: [1.3, 0.6, 1], jitter: 0.05 }).sphere(0.32, 0x1e8449, { p: [0.4, 1.2, -0.1], s: [1.2, 0.6, 1], jitter: 0.05 });
        for (let i = 0; i < 7; i++) b.capsule(0.09 + (i % 2) * 0.03, 0.2 + (i % 3) * 0.12, 0x0e4326, { p: [-0.7 + i * 0.235, 0.18 - (i % 3) * 0.04, 0.55], s: [1, 1, 0.8] });   // drips along the front edge
        for (const [x, y, r] of [[-0.2, 1.38, 0.07], [0.35, 1.45, 0.05], [0.0, 1.5, 0.045]]) b.sphere(r, 0x6dffa0, { p: [x, y, 0], ao: 0 });
        for (const s of [-1, 1]) { b.box(0.34, 0.1, 0.1, 0x0a2a18, { p: [s * 0.34, 1.0, 0.58], r: [0, 0, -s * 0.4], radius: 0.03, ao: 0 }); b.sphere(0.13, 0xf1c40f, { p: [s * 0.34, 0.86, 0.58], s: [1, 1, 0.5], ao: 0 }).sphere(0.06, 0x111111, { p: [s * 0.34, 0.85, 0.65], s: [1, 1.4, 0.5], ao: 0 }); }
        b.box(0.7, 0.08, 0.06, 0x0a2a18, { p: [0, 0.55, 0.59], radius: 0.02, ao: 0 });
        return b; } },
      { name: 'arms', pose: (S, p) => { p.rx = sin(S.t * 3) * S.sp * 0.3; }, build: () => { const b = new Builder(); for (const s of [-1, 1]) b.capsule(0.15, 0.5, 0x145a32, { p: [s * 0.88, 0.5, 0.1], r: [0, 0, s * 0.25] }).sphere(0.21, 0x1e8449, { p: [s * 0.95, 0.2, 0.12], jitter: 0.04 }); return b; } },
    ],
  },

  // ---- CENTIPEDE: a low orange armoured crawler, red head with yellow eyes and pincers, undulating segments (original: #d35400 segments, #c0392b head)
  centipede: {
    size: [1.71, 0.43],
    root: (S, p) => { p.y = abs(sin(S.t * 16)) * 0.015 * S.sp; keep(p, 1 - S.hit * 0.15); },
    parts: [
      { name: 'head', pose: (S, p) => { p.z = 0.62; p.x = sin(S.t * 7) * 0.05 * S.sp; p.ry = sin(S.t * 7) * 0.2 * S.sp; }, build: () => {
        const b = new Builder().sphere(0.2, 0xc0392b, { p: [0, 0.2, 0], s: [1, 0.85, 1.1], jitter: 0.02 });
        for (const s of [-1, 1]) { b.sphere(0.05, 0xf1c40f, { p: [s * 0.09, 0.27, 0.15], ao: 0 }).cone(0.035, 0.28, 0x4a1a10, { p: [s * 0.08, 0.14, 0.26], r: [1.4, 0, s * 0.5], seg: 4, ao: 0 }).cone(0.022, 0.3, 0xe8e0cc, { p: [s * 0.17, 0.3, 0.1], r: [-0.3, 0, -s * 0.9], seg: 4, ao: 0 }); }
        return b; } },
      ...[0, 1, 2].map((k) => ({ name: 'seg' + k, pose: (S, p) => { const u = S.t * 7 - k * 1.3; p.z = 0.22 - k * 0.56; p.x = sin(u) * 0.09 * S.sp; p.ry = cos(u) * 0.2 * S.sp; }, build: () => {
        const b = new Builder();
        for (const z of [0.14, -0.14]) {
          b.sphere(0.19, (k + (z > 0 ? 0 : 1)) % 2 ? 0xd35400 : 0xe67e22, { p: [0, 0.2, z], s: [1.15, 0.8, 0.95], jitter: 0.015 }).box(0.34, 0.04, 0.05, 0x7a2e00, { p: [0, 0.3, z - 0.05], radius: 0.01, ao: 0 });
          for (const s of [-1, 1]) b.cone(0.022, 0.28, 0x7a2e00, { p: [s * 0.27, 0.1, z], r: [0, 0, s * 1.1], seg: 3, ao: 0 });
        }
        return b; } })),
    ],
  },
};
