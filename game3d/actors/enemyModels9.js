import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { eyes, foot } from './partKit.js';

// Stage 9 (Haunted Village) enemy models, same contract as enemyModels.js. Looks follow the original sprites (cleaningup.html 6401-6447): zombie = a green (#2ecc71) body with a darker
// (#27ae60) head and one arm stretched out in front; ghost = a pale (#ecf0f1) sheet with a ragged hem and two black dot eyes, drawn see-through. (Bats and spiders reuse stages 2 and 1.)
// Both keep glowing eyes (colours above 1.0): in the lights-out section the eyes are what you see first.
const sin = Math.sin, cos = Math.cos, abs = Math.abs;
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };
const bi = () => new Builder({ ico: true });
const EYE = new THREE.Color(3.4, 4.0, 1.2), HOLE = new THREE.Color(1.8, 3.4, 2.2);

export const MODELS9 = {
  // ---- ZOMBIE: slow, hunched and shuffling, rotting green skin, torn shirt and trousers, glowing yellow eyes, both arms out in front (the original shows the one)
  zombie: {
    size: [0.86, 1.5],
    root: (S, p) => { const w = sin(S.t * 4.5) * S.sp; p.y = abs(w) * 0.04; p.rz = w * 0.09; p.rx = 0.16 + 0.1 * S.sp; keep(p, 1 - S.hit * 0.1); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().box(0.5, 0.62, 0.3, 0x5a6a4e, { p: [0, 0.98, 0], r: [0.08, 0, 0.04], radius: 0.07, jitter: 0.03, ao: 0.25 });                      // a torn, mouldy shirt
        b.box(0.1, 0.26, 0.04, 0x2ecc71, { p: [-0.12, 0.92, 0.17], r: [0, 0, 0.3], radius: 0.01, ao: 0 }).box(0.16, 0.12, 0.04, 0x1f7a3f, { p: [0.1, 1.2, 0.17], r: [0, 0, -0.2], radius: 0.01, ao: 0 });   // rips showing green skin
        b.box(0.52, 0.34, 0.32, 0x3a3a44, { p: [0, 0.5, 0], radius: 0.06, jitter: 0.02 }).box(0.2, 0.18, 0.34, 0x3a3a44, { p: [-0.12, 0.25, 0], r: [0, 0, 0.1], radius: 0.04, ao: 0.2 });   // ragged trousers
        b.sphere(0.27, 0x27ae60, { p: [0, 1.5, 0.08], s: [0.95, 1.05, 0.95], jitter: 0.04, ao: 0.1 }).sphere(0.07, 0x1a7a40, { p: [0.17, 1.38, 0.2], s: [1.3, 1, 0.6], ao: 0 });   // the head, a sore on the cheek
        eyes(b, { y: 1.54, z: 0.22, gap: 0.1, r: 0.06, white: EYE, pupil: 0x1a1a10, pr: 0.35, brow: 0.5, look: 0.5 });
        b.box(0.2, 0.05, 0.04, 0x1a1a10, { p: [0, 1.36, 0.26], r: [0, 0, 0.1], radius: 0.01, ao: 0 });
        for (let i = 0; i < 4; i++) b.box(0.03, 0.05, 0.03, 0xd8d4b0, { p: [-0.07 + i * 0.047, 1.38, 0.27], radius: 0.005, ao: 0 });                          // a few teeth
        return b; } },
      { name: 'armL', pose: (S, p) => { p.x = -0.33; p.y = 1.22; p.rx = -1.35 + sin(S.t * 4.5) * S.sp * 0.25; }, build: () => bi().capsule(0.075, 0.5, 0x27ae60, { p: [0, -0.28, 0] }).sphere(0.1, 0x1f8a4c, { p: [0, -0.62, 0.02], jitter: 0.02, ao: 0 }).box(0.3, 0.2, 0.3, 0x5a6a4e, { p: [0, -0.1, 0], radius: 0.05, ao: 0.2 }) },
      { name: 'armR', pose: (S, p) => { p.x = 0.33; p.y = 1.22; p.rx = -1.2 - sin(S.t * 4.5) * S.sp * 0.25; }, build: () => bi().capsule(0.075, 0.5, 0x27ae60, { p: [0, -0.28, 0] }).sphere(0.1, 0x1f8a4c, { p: [0, -0.62, 0.02], jitter: 0.02, ao: 0 }) },
      { name: 'legL', pose: (S, p) => { const c = sin(S.t * 4.5) * S.sp; p.x = -0.14; p.y = 0.32; p.rx = c * 0.5; }, build: () => { const b = bi().capsule(0.09, 0.3, 0x3a3a44, { p: [0, -0.1, 0] }); foot(b, { x: 0, y: -0.28, z: 0.06, w: 0.2, h: 0.12, l: 0.32, color: 0x24201c }); return b; } },
      { name: 'legR', pose: (S, p) => { const c = -sin(S.t * 4.5) * S.sp; p.x = 0.14; p.y = 0.32; p.rx = c * 0.5; }, build: () => { const b = bi().capsule(0.09, 0.3, 0x3a3a44, { p: [0, -0.1, 0] }); foot(b, { x: 0, y: -0.28, z: 0.06, w: 0.2, h: 0.12, l: 0.32, color: 0x24201c }); return b; } },
    ],
  },

  // ---- GHOST: a pale sheet with a scalloped hem that sways, two stubby arms and two hollow glowing eyes with a long wail of a mouth. Bobs and drifts; its fade is its hem.
  ghost: {
    size: [0.86, 1.29],
    root: (S, p) => { p.y = sin(S.t * 2.6) * 0.1; p.rz = sin(S.t * 1.9) * 0.08 - S.dx * 0.03; keep(p, 1 + sin(S.t * 3.4) * 0.03 - S.hit * 0.12); },
    parts: [
      { name: 'sheet', pose: () => {}, build: () => {
        const b = bi().sphere(0.38, 0xe6f0ee, { p: [0, 0.95, 0], s: [0.95, 1.15, 0.95], jitter: 0.02, ao: 0.1 }).add(new THREE.ConeGeometry(0.46, 0.8, 10, 1, true), 0xdce8e6, { p: [0, 0.45, 0], jitter: 0.02, ao: 0.15 });
        for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; b.cone(0.1, 0.28, 0xe6f0ee, { p: [cos(a) * 0.42, 0.1, sin(a) * 0.42], r: [Math.PI, 0, 0], seg: 5, ao: 0.1 }); }   // the ragged hem
        for (const s of [-1, 1]) b.sphere(0.075, HOLE, { p: [s * 0.14, 1.05, 0.3], s: [1, 1.5, 0.5], ao: 0 });                                                // hollow glowing eye sockets
        b.sphere(0.1, 0x10181a, { p: [0, 0.82, 0.34], s: [0.8, 1.9, 0.4], ao: 0 });                                                                          // an open wail
        return b; } },
      { name: 'arms', pose: (S, p) => { p.y = 0.92 + sin(S.t * 3) * 0.03; p.rz = sin(S.t * 2.4) * 0.08; }, build: () => { const b = bi(); for (const s of [-1, 1]) b.capsule(0.07, 0.34, 0xe6f0ee, { p: [s * 0.42, 0, 0.12], r: [-0.6, 0, s * 0.9] }); return b; } },
      { name: 'wisps', pose: (S, p) => { p.ry = S.t * 1.4; p.y = 0.1; }, build: () => { const b = bi(); for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.283; b.sphere(0.05, new THREE.Color(1.2, 2.6, 1.8), { p: [cos(a) * 0.55, 0.45 + i * 0.25, sin(a) * 0.55], s: [1, 1.5, 1], ao: 0 }); } return b; } },
    ],
  },
};
