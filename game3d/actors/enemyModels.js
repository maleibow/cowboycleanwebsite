import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { blob, eyes, wing, leg, foot, ear, spike, ring } from './partKit.js';
import { MODELS2 } from './enemyModels2.js';
import { MODELS3 } from './enemyModels3.js';
import { MODELS4 } from './enemyModels4.js';
import { MODELS5 } from './enemyModels5.js';
import { MODELS6 } from './enemyModels6.js';
import { MODELS7 } from './enemyModels7.js';
import { MODELS8 } from './enemyModels8.js';
import { MODELS9 } from './enemyModels9.js';

// Procedural enemy models (PLAN 4, 7). A model is a list of parts, each an own InstancedMesh (see enemyRender.js):
//   { size:[w,h], root(S,p), parts:[{ name, build() -> Builder, pose(S,p) }] }
// `build` makes geometry around the part's pivot; `pose` writes where that pivot is and how it turns, from the
// per-enemy state S = { t (seconds + phase), sp (0..1 speed), dx (lateral speed), air, vy, squash (0..1 hop windup),
// dive, hit (0..1) }. p = { x,y,z, rx,ry,rz, sx,sy,sz }. Looks follow the original sprites (cleaningup.html 5082-5350).
const sin = Math.sin, cos = Math.cos, max = Math.max, abs = Math.abs, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };      // volume-preserving squash

export const MODELS = {
  // ---- DIRT: a lumpy brown clod with big angry eyes, shuffling on two little feet (original: #5d4037 ball, white eyes)
  dirt: {
    size: [1.07, 1.07],
    root: (S, p) => { const w = S.sp * sin(S.t * 11); keep(p, 1 + w * 0.07 - S.hit * 0.12); p.rx = 0.08 * S.sp; p.rz = w * 0.04; },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = new Builder(); blob(b, { r: 0.5, p: [0, 0.6, 0], color: 0x5d4037, hi: 0x8d6e63, clods: 6, clod: 0x4a2e24, jitter: 0.07 });
        for (const [x, z, r] of [[-0.12, -0.05, 0.28], [0.1, 0, 0.34], [0.02, 0.06, 0.3]]) b.cone(0.03, r, 0x8a9a3a, { p: [x, 1.12 + r * 0.3, z], r: [0, 0, x * 2.4], seg: 4, ao: 0 });   // a tuft of weeds
        eyes(b, { y: 0.68, z: 0.42, gap: 0.19, r: 0.13, pr: 0.45, brow: 0.38 });
        b.box(0.22, 0.05, 0.05, 0x2a160f, { p: [0, 0.4, 0.5], radius: 0.02, ao: 0 });   // grumpy mouth
        return b; } },
      { name: 'footL', pose: (S, p) => { const c = sin(S.t * 11) * S.sp; p.x = -0.2; p.y = max(0, c) * 0.14; p.z = c * 0.12; }, build: () => foot(new Builder(), { x: 0, y: 0.09, z: 0.04, w: 0.22, h: 0.16, l: 0.34, color: 0x3a261c }) },
      { name: 'footR', pose: (S, p) => { const c = -sin(S.t * 11) * S.sp; p.x = 0.2; p.y = max(0, c) * 0.14; p.z = c * 0.12; }, build: () => foot(new Builder(), { x: 0, y: 0.09, z: 0.04, w: 0.22, h: 0.16, l: 0.34, color: 0x3a261c }) },
    ],
  },

  // ---- ICE: a hopping blue crystal with a dark slit glare and a ring of shards (original: #5dade2 gem, #154360 slash)
  ice: {
    size: [1.07, 1.07],
    root: (S, p) => { keep(p, S.air ? 1.15 : 1 - 0.32 * S.squash - S.hit * 0.1); p.rx = S.air ? clamp(-S.vy * 0.03, -0.25, 0.25) : 0; },
    parts: [
      { name: 'body', pose: (S, p) => { p.y = S.air ? 0 : sin(S.t * 3) * 0.02; }, build: () => {
        const b = new Builder().add(new THREE.OctahedronGeometry(0.5, 0), 0x5dade2, { p: [0, 0.62, 0], s: [0.95, 1.2, 0.95], jitter: 0.04 })
          .add(new THREE.OctahedronGeometry(0.3, 0), 0xaed6f1, { p: [-0.08, 0.7, 0.2], s: [0.9, 1.2, 0.6], ao: 0 });
        for (const [x, z, t] of [[-0.18, -0.05, 0.4], [0.2, -0.1, -0.35], [0.0, -0.2, 0.0]]) spike(b, { p: [x, 1.3, z], r: 0.08, h: 0.3, color: 0xcfeeff, rot: [0, 0, t] });
        for (const s of [-1, 1]) b.box(0.26, 0.07, 0.06, 0x154360, { p: [s * 0.16, 0.7, 0.4], r: [0, 0, -s * 0.35], radius: 0.02, ao: 0 }).sphere(0.025, 0xffffff, { p: [s * 0.14, 0.68, 0.44], ao: 0 });
        return b; } },
      { name: 'legs', pose: (S, p) => { p.y = S.air ? 0.1 : 0; p.sy = S.air ? 1.3 : 1; }, build: () => { const b = new Builder(); for (const s of [-1, 1]) b.cone(0.1, 0.22, 0x3d8fc4, { p: [s * 0.2, 0.1, 0.05], r: [Math.PI, 0, 0], seg: 5 }); return b; } },
      { name: 'shards', pose: (S, p) => { p.ry = S.t * (S.air ? 7 : 2.5); p.y = 0.3 + sin(S.t * 3) * 0.04; }, build: () => ring(new Builder(), { n: 4, radius: 0.62, size: 0.1, color: 0xd6f0ff, y: 0.45 }) },
    ],
  },

  // ---- VULTURE: dark hunched bird, bald red head, hooked yellow beak, ragged wings (original: #333 body, #e74c3c head)
  vulture: {
    size: [1.5, 0.86],
    root: (S, p) => { p.rx = S.dive ? 0.95 : 0.12; p.rz = clamp(-S.dx * 0.06, -0.5, 0.5); p.y = S.dive ? 0 : sin(S.t * 8.5) * 0.06; keep(p, 1 - S.hit * 0.1); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = new Builder().sphere(0.3, 0x333338, { p: [0, 0.55, -0.02], s: [0.95, 0.9, 1.35], jitter: 0.04 }).sphere(0.2, 0x55555c, { p: [0, 0.5, 0.2], s: [1, 0.9, 0.7], ao: 0 })
          .cone(0.26, 0.28, 0xe8e0d0, { p: [0, 0.74, 0.28], r: [1.2, 0, 0], seg: 8 });                                // pale ruff collar
        for (let i = -1; i <= 1; i++) b.box(0.1, 0.03, 0.36, i % 2 ? 0x222226 : 0x3a3a40, { p: [i * 0.1, 0.5, -0.5], r: [0.25, -i * 0.25, 0], radius: 0.01 });  // tail feathers
        for (const s of [-1, 1]) b.cone(0.04, 0.2, 0xcc8a2a, { p: [s * 0.1, 0.18, 0.02], r: [0.4, 0, 0], seg: 4 });  // talons
        return b; } },
      { name: 'head', pose: (S, p) => { p.x = 0; p.y = 0.78; p.z = 0.36; p.rx = S.dive ? -0.7 : 0.15 + sin(S.t * 4) * 0.1; p.ry = sin(S.t * 2.1) * 0.35; }, build: () => {
        const b = new Builder().cyl(0.06, 0.09, 0.22, 0xd9786a, { p: [0, -0.1, 0], seg: 7 }).sphere(0.17, 0xe74c3c, { p: [0, 0.02, 0.04], s: [1, 1, 1.05] })
          .cone(0.07, 0.3, 0xf1c40f, { p: [0, -0.02, 0.27], r: [Math.PI / 2 + 0.35, 0, 0], seg: 6 }).cone(0.04, 0.1, 0xf1c40f, { p: [0, -0.12, 0.38], r: [Math.PI - 0.2, 0, 0], seg: 5 });
        eyes(b, { y: 0.07, z: 0.15, gap: 0.1, r: 0.055, pr: 0.5, brow: 0.5, look: 0.2 }); return b; } },
      { name: 'wingL', pose: (S, p) => { const f = S.dive ? -1.05 : sin(S.t * (S.sp > 0.3 ? 9 : 6.5)) * 0.85 + 0.12; p.x = -0.18; p.y = 0.62; p.rz = -f; p.ry = S.dive ? 0.7 : 0; }, build: () => wing(new Builder(), { side: -1, span: 0.8, chord: 0.34, color: 0x222226, tip: 0x45454c }) },
      { name: 'wingR', pose: (S, p) => { const f = S.dive ? -1.05 : sin(S.t * (S.sp > 0.3 ? 9 : 6.5)) * 0.85 + 0.12; p.x = 0.18; p.y = 0.62; p.rz = f; p.ry = S.dive ? -0.7 : 0; }, build: () => wing(new Builder(), { side: 1, span: 0.8, chord: 0.34, color: 0x222226, tip: 0x45454c }) },
    ],
  },

  // ---- RABBIT: grey bruiser with huge ears, red eyes and buck teeth, hops (original: #7f8c8d fur, #e74c3c eye)
  rabbit: {
    size: [1.07, 1.1],
    root: (S, p) => { keep(p, S.air ? 1.12 : 1 - 0.28 * S.squash - S.hit * 0.1); p.rx = S.air ? clamp(S.vy * 0.04, -0.3, 0.3) : 0; },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = new Builder().sphere(0.4, 0x7f8c8d, { p: [0, 0.48, -0.02], s: [1, 0.95, 1.05], jitter: 0.03 }).sphere(0.27, 0xbdc3c7, { p: [0, 0.42, 0.2], s: [1, 1, 0.6], ao: 0 })
          .sphere(0.31, 0x95a5a6, { p: [0, 0.88, 0.2], jitter: 0.03 }).sphere(0.1, 0xffcdd2, { p: [0, 0.82, 0.48], s: [1.1, 0.8, 0.8], ao: 0 })   // head, pink nose
          .sphere(0.14, 0xf8f4ef, { p: [0, 0.34, -0.42], jitter: 0.04 })                                                                       // cotton tail
          .sphere(0.1, 0x6b5238, { p: [0.25, 0.6, 0.0], jitter: 0.03 }).sphere(0.08, 0x6b5238, { p: [-0.22, 0.4, 0.1], jitter: 0.03 });      // dirt smudges
        eyes(b, { y: 0.95, z: 0.38, gap: 0.14, r: 0.085, white: 0xff4a3a, pupil: 0xffffff, pr: 0.3, brow: 0.45, shine: false });
        b.box(0.07, 0.1, 0.03, 0xffffff, { p: [-0.04, 0.68, 0.48], radius: 0.01, ao: 0 }).box(0.07, 0.1, 0.03, 0xffffff, { p: [0.04, 0.68, 0.48], radius: 0.01, ao: 0 });
        return b; } },
      { name: 'earL', pose: (S, p) => { p.x = -0.14; p.y = 1.1; p.z = 0.15; p.rz = 0.22 + sin(S.t * 2.3) * 0.06; p.rx = S.air ? -0.5 : sin(S.t * 5) * 0.04 * S.sp - 0.1; }, build: () => ear(new Builder(), { len: 0.5, r: 0.09, color: 0x7f8c8d, inner: 0xffcdd2, tilt: 0 }) },
      { name: 'earR', pose: (S, p) => { p.x = 0.14; p.y = 1.1; p.z = 0.15; p.rz = -0.22 - sin(S.t * 2.7 + 1) * 0.06; p.rx = S.air ? -0.5 : sin(S.t * 5 + 1) * 0.04 * S.sp - 0.1; }, build: () => ear(new Builder(), { len: 0.5, r: 0.09, color: 0x7f8c8d, inner: 0xffcdd2, tilt: 0 }) },
      { name: 'legs', pose: (S, p) => { p.sy = S.air ? 1.25 : 1; p.z = S.air ? -0.08 : 0; p.rx = S.air ? 0.4 : 0; }, build: () => {
        const b = new Builder(); for (const s of [-1, 1]) b.sphere(0.2, 0x7f8c8d, { p: [s * 0.3, 0.24, -0.12], s: [0.7, 1, 1.1] }).box(0.16, 0.1, 0.34, 0x6c7a7b, { p: [s * 0.3, 0.06, 0.1], radius: 0.04 }).box(0.1, 0.1, 0.16, 0x6c7a7b, { p: [s * 0.14, 0.07, 0.34], radius: 0.04 });
        return b; } },
    ],
  },

  // ---- DIRTY ICE: a slow brown mud block with a melting ice window and glowing red eyes (original: #5d4037 slab, #aed6f1 patch)
  dirty_ice: {
    size: [1.5, 1.5],
    root: (S, p) => { const w = sin(S.t * 5) * S.sp; p.y = abs(w) * 0.08; p.rz = w * 0.05; keep(p, 1 - S.hit * 0.08); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = new Builder().box(1.35, 1.1, 1.1, 0x5d4037, { p: [0, 0.82, 0], radius: 0.18, jitter: 0.06 }).box(0.62, 0.6, 0.12, 0xaed6f1, { p: [-0.3, 1.1, 0.5], radius: 0.1, ao: 0, jitter: 0.04 })
          .box(0.5, 0.42, 0.1, 0xe6f6ff, { p: [-0.34, 1.16, 0.56], radius: 0.08, ao: 0 });
        for (const [x, z, t] of [[-0.35, 0.05, 0.3], [0.1, -0.1, 0], [0.4, 0.1, -0.35]]) spike(b, { p: [x, 1.5, z], r: 0.12, h: 0.38, color: 0xb9e4fa, rot: [0, 0, t] });
        for (let i = 0; i < 5; i++) b.sphere(0.1 + (i % 2) * 0.04, 0x4a2e24, { p: [-0.5 + i * 0.25, 0.3 + (i % 3) * 0.04, 0.5], s: [1, 1.3, 0.8], jitter: 0.03 });     // mud drips along the bottom
        eyes(b, { y: 0.78, z: 0.56, gap: 0.27, r: 0.14, white: 0xe74c3c, pupil: 0xffffff, pr: 0.35, brow: 0.5, look: 0, shine: false });
        b.box(0.7, 0.06, 0.05, 0x2a160f, { p: [0.05, 0.5, 0.57], radius: 0.02, ao: 0 });
        return b; } },
      { name: 'armL', pose: (S, p) => { p.x = -0.78; p.y = 1.0; p.rx = sin(S.t * 5) * S.sp * 0.5; }, build: () => new Builder().box(0.26, 0.7, 0.28, 0x5d4037, { p: [0, -0.3, 0], radius: 0.08 }).sphere(0.17, 0x4a2e24, { p: [0, -0.7, 0.02] }) },
      { name: 'armR', pose: (S, p) => { p.x = 0.78; p.y = 1.0; p.rx = -sin(S.t * 5) * S.sp * 0.5; }, build: () => new Builder().box(0.26, 0.7, 0.28, 0x5d4037, { p: [0, -0.3, 0], radius: 0.08 }).sphere(0.17, 0x4a2e24, { p: [0, -0.7, 0.02] }) },
      { name: 'footL', pose: (S, p) => { const c = sin(S.t * 5) * S.sp; p.x = -0.35; p.y = max(0, c) * 0.18; }, build: () => foot(new Builder(), { x: 0, y: 0.15, z: 0.05, w: 0.42, h: 0.3, l: 0.5, color: 0x3a261c }) },
      { name: 'footR', pose: (S, p) => { const c = -sin(S.t * 5) * S.sp; p.x = 0.35; p.y = max(0, c) * 0.18; }, build: () => foot(new Builder(), { x: 0, y: 0.15, z: 0.05, w: 0.42, h: 0.3, l: 0.5, color: 0x3a261c }) },
    ],
  },

  // ---- SPIDER: low black widow with a red hourglass, glowing eyes and a tripod walk (original: #111 body, 8 legs)
  spider: {
    size: [1.29, 0.54],
    root: (S, p) => { p.y = abs(sin(S.t * 14)) * 0.03 * S.sp; p.rx = 0.06 * S.sp; keep(p, 1 - S.hit * 0.15); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = new Builder().sphere(0.26, 0x2c2c38, { p: [0, 0.3, -0.2], s: [1, 0.85, 1.2], jitter: 0.03 }).sphere(0.19, 0x3a3a48, { p: [0, 0.3, 0.17], s: [1, 0.9, 1] })
          .cone(0.07, 0.14, 0xd62a2a, { p: [0, 0.5, -0.2], r: [0, 0, Math.PI], seg: 4, ao: 0 }).cone(0.07, 0.14, 0xd62a2a, { p: [0, 0.38, -0.2], seg: 4, ao: 0 });
        for (const [x, y, r] of [[-0.07, 0.36, 0.05], [0.07, 0.36, 0.05], [-0.14, 0.33, 0.032], [0.14, 0.33, 0.032], [-0.04, 0.4, 0.03], [0.04, 0.4, 0.03]]) b.sphere(r, 0xff3b30, { p: [x, y, 0.33], ao: 0 });
        for (const s of [-1, 1]) b.cone(0.025, 0.12, 0xf3ead8, { p: [s * 0.06, 0.2, 0.33], r: [Math.PI, 0, 0], seg: 4, ao: 0 });
        return b; } },
      { name: 'legsA', pose: (S, p) => { const c = sin(S.t * 14) * S.sp; p.ry = c * 0.3; p.y = max(0, cos(S.t * 14)) * 0.05 * S.sp; }, build: () => legSet(0) },
      { name: 'legsB', pose: (S, p) => { const c = -sin(S.t * 14) * S.sp; p.ry = c * 0.3; p.y = max(0, -cos(S.t * 14)) * 0.05 * S.sp; }, build: () => legSet(1) },
    ],
  },
};

Object.assign(MODELS, MODELS2, MODELS3, MODELS4, MODELS5, MODELS6, MODELS7, MODELS8, MODELS9);   // stage 2-9 types live in enemyModels2..9.js

// Eight legs in two tripod sets: set 0 = L0 R1 L2 R3, set 1 = R0 L1 R2 L3 (front to back).
function legSet(set) {
  const b = new Builder();
  for (let i = 0; i < 4; i++) {
    const side = (i + set) % 2 ? 1 : -1, z0 = 0.18 - i * 0.12, zf = 0.5 - i * 0.34;
    leg(b, { hip: [side * 0.12, 0.3, z0 * 0.7], foot: [side * (0.6 - Math.abs(zf) * 0.12), 0.02, zf], r: 0.032, color: 0x1c1c26, bend: 0.12, up: 0.28 });
  }
  return b;
}
