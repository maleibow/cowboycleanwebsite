import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { eyes } from './partKit.js';

// Stage 7 (Rainbow Island) enemy models, same contract as enemyModels.js. Looks follow the original sprites (cleaningup.html 6367-6420):
// paint_blob = a wobbling splat of paint whose lumps are red, blue, yellow and purple (the original cycles those four colours), mud_cloud = a brown raincloud with dark mud drips.
// (frogs reuse stage 2's frog.)
const sin = Math.sin, cos = Math.cos;
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };
const bi = () => new Builder({ ico: true });

export const MODELS7 = {
  // ---- PAINT BLOB: a glossy puddle-monster of four colours with big wobbly eyes, a drippy skirt, and splatter dots flying off it
  paint_blob: {
    size: [1.07, 1.07],
    root: (S, p) => { const w = sin(S.t * 9) * S.sp; keep(p, 1 + w * 0.1 + sin(S.t * 5) * 0.03 - S.hit * 0.14); p.rz = w * 0.05; },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().sphere(0.46, 0xe74c3c, { p: [0, 0.48, 0], s: [1.1, 0.95, 1], jitter: 0.05, ao: 0.15 }).sphere(0.28, 0x3498db, { p: [-0.34, 0.62, 0.08], jitter: 0.04, ao: 0.05 }).sphere(0.3, 0xf1c40f, { p: [0.36, 0.58, -0.02], jitter: 0.04, ao: 0.05 })
          .sphere(0.2, 0x9b59b6, { p: [0.04, 0.88, -0.1], jitter: 0.03, ao: 0 }).sphere(0.18, 0xffffff, { p: [-0.18, 0.7, 0.3], s: [1, 0.5, 0.4], ao: 0 });   // red body, blue/yellow/purple lumps, a highlight
        for (const [x, z, c] of [[-0.35, 0.3, 0x3498db], [0.3, 0.32, 0xf1c40f], [0, 0.42, 0x9b59b6], [-0.1, -0.4, 0xe74c3c]]) b.sphere(0.13, c, { p: [x, 0.14, z], s: [1, 0.7, 1], jitter: 0.02, ao: 0 });   // drips round the base
        eyes(b, { y: 0.56, z: 0.4, gap: 0.16, r: 0.12, pr: 0.55, brow: 0.35, look: 0.5 });
        b.box(0.2, 0.05, 0.05, 0x5a1f1f, { p: [0, 0.34, 0.45], radius: 0.015, ao: 0 });
        return b; } },
      { name: 'splats', pose: (S, p) => { p.ry = S.t * 3; p.y = 0.05 * sin(S.t * 7); }, build: () => { const b = bi(); for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283; b.sphere(0.07, [0xe74c3c, 0x3498db, 0xf1c40f, 0x9b59b6][i], { p: [cos(a) * 0.62, 0.6 + (i % 2) * 0.2, sin(a) * 0.62], ao: 0 }); } return b; } },
    ],
  },

  // ---- MUD CLOUD: a heavy brown cloud of churned mud with a grumpy face; dark drips hang under it and it lets go of lumps of mud (a falling mud bomb)
  mud_cloud: {
    size: [1.29, 0.86],
    root: (S, p) => { p.y = sin(S.t * 2.2) * 0.07; keep(p, 1 + sin(S.t * 3.1) * 0.04 - S.hit * 0.12); },
    parts: [
      { name: 'cloud', pose: () => {}, build: () => {
        const b = bi(); for (const [x, y, z, r, c] of [[0, 0.5, 0, 0.42, 0x795548], [-0.42, 0.42, 0.05, 0.3, 0x8d6e63], [0.44, 0.46, -0.03, 0.32, 0x6d4c41], [0.1, 0.76, 0.02, 0.3, 0x8d6e63], [-0.22, 0.28, 0.12, 0.24, 0x6d4c41], [0.26, 0.26, 0.1, 0.26, 0x795548]]) b.sphere(r, c, { p: [x, y, z], s: [1.15, 0.9, 1], jitter: 0.05, ao: 0.15 });
        eyes(b, { y: 0.52, z: 0.36, gap: 0.16, r: 0.1, pr: 0.5, brow: 0.45, look: 0.3 }); b.box(0.28, 0.06, 0.05, 0x3a2418, { p: [0, 0.34, 0.4], r: [0, 0, 0.0], radius: 0.015, ao: 0 });
        return b; } },
      { name: 'drips', pose: (S, p) => { p.y = -0.03 * sin(S.t * 5); }, build: () => { const b = bi(); for (const x of [-0.32, -0.05, 0.28]) { b.cyl(0.05, 0.07, 0.3, 0x5d4037, { p: [x, 0.12, 0.05], seg: 5, ao: 0 }); b.sphere(0.09, 0x5d4037, { p: [x, -0.04, 0.05], s: [1, 1.3, 1], ao: 0 }); } return b; } },
    ],
  },
};
