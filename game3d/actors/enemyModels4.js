import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { eyes, wing, foot } from './partKit.js';

// Stage 4 (New York City) enemy models, same contract as enemyModels.js. Looks follow the original sprites (cleaningup.html 6003-6040, 6300-6345):
// pizza = a yellow slice with an orange crust and red pepperoni, pigeon = grey bird with a lighter head and an orange beak, police = a dark patrol car with red and
// blue roof lights and black wheels. (Rats reuse stage 3's rat.)
const sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };
const bi = () => new Builder({ ico: true });
const RED = new THREE.Color(3, 0.2, 0.2), BLUE = new THREE.Color(0.3, 0.9, 3.2), WHITE = new THREE.Color(3, 2.8, 2.2);

export const MODELS4 = {
  // ---- PIZZA: a hungry slice on two little feet: cheese-yellow triangle, a fat crust, pepperoni, angry eyes, a drip of cheese
  pizza: {
    size: [0.86, 0.86],
    root: (S, p) => { const w = sin(S.t * 12) * S.sp; keep(p, 1 + w * 0.06 - S.hit * 0.12); p.rz = w * 0.08; p.rx = 0.1 * S.sp; },
    parts: [
      { name: 'slice', pose: () => {}, build: () => {
        const b = bi(); const tri = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2 + 0.0);   // an upright triangular slice: point down, crust up
        b.add(tri, 0xf1c40f, { p: [0, 0.62, 0], r: [0, 0, 0], s: [1, 1, 1], jitter: 0.015, ao: 0.1 }).box(0.9, 0.22, 0.2, 0xe67e22, { p: [0, 1.05, 0], radius: 0.1, jitter: 0.01, ao: 0 }).box(0.8, 0.12, 0.24, 0xc9690f, { p: [0, 1.12, 0], radius: 0.05, ao: 0 });
        for (const [x, y, r] of [[-0.22, 0.86, 0.09], [0.2, 0.78, 0.1], [0.02, 0.5, 0.085]]) b.cyl(r, r, 0.06, 0xc0392b, { p: [x, y, 0.06], r: [Math.PI / 2, 0, 0], seg: 8, ao: 0 });
        b.capsule(0.06, 0.2, 0xffd84a, { p: [-0.32, 0.5, 0.07] }).capsule(0.05, 0.14, 0xffd84a, { p: [0.3, 0.55, 0.07] });
        eyes(b, { y: 0.68, z: 0.09, gap: 0.14, r: 0.095, pr: 0.5, brow: 0.5 }); b.box(0.2, 0.04, 0.04, 0x5a2a08, { p: [0, 0.44, 0.1], radius: 0.01, ao: 0 });
        return b; } },
      { name: 'footL', pose: (S, p) => { const c = sin(S.t * 12) * S.sp; p.x = -0.16; p.y = max(0, c) * 0.1; p.z = c * 0.1; }, build: () => foot(new Builder(), { x: 0, y: 0.08, z: 0.04, w: 0.16, h: 0.14, l: 0.26, color: 0x3a261c }) },
      { name: 'footR', pose: (S, p) => { const c = -sin(S.t * 12) * S.sp; p.x = 0.16; p.y = max(0, c) * 0.1; p.z = c * 0.1; }, build: () => foot(new Builder(), { x: 0, y: 0.08, z: 0.04, w: 0.16, h: 0.14, l: 0.26, color: 0x3a261c }) },
    ],
  },

  // ---- PIGEON: a plump grey city pigeon: pale head, an orange beak, a green-purple neck sheen, flapping wings and a bomb under its tail
  pigeon: {
    size: [1.07, 0.64],
    root: (S, p) => { p.rx = S.dive ? 0.7 : 0.1; p.rz = clamp(-S.dx * 0.05, -0.4, 0.4); p.y = sin(S.t * 9) * 0.05; keep(p, 1 - S.hit * 0.1); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().sphere(0.26, 0x7f8c8d, { p: [0, 0.36, -0.04], s: [0.95, 0.9, 1.3], jitter: 0.03 }).sphere(0.17, 0x95a5a6, { p: [0, 0.38, 0.2], s: [1, 0.9, 1] }).sphere(0.15, 0xbdc3c7, { p: [0, 0.52, 0.3], jitter: 0.02 })
          .sphere(0.1, 0x6a5a9a, { p: [0.0, 0.46, 0.22], s: [1.4, 0.7, 0.8], ao: 0 }).cone(0.045, 0.2, 0xf39c12, { p: [0, 0.5, 0.46], r: [Math.PI / 2, 0, 0], seg: 5 });
        for (const s of [-1, 1]) b.sphere(0.04, 0xffb36a, { p: [s * 0.08, 0.56, 0.4], ao: 0 }).sphere(0.02, 0x111111, { p: [s * 0.085, 0.56, 0.435], ao: 0 });
        b.box(0.3, 0.03, 0.3, 0x5f6d6e, { p: [0, 0.34, -0.38], r: [0.25, 0, 0], radius: 0.01 }).sphere(0.09, 0x1a1a22, { p: [0, 0.15, -0.1], jitter: 0.02 }).cyl(0.012, 0.012, 0.1, 0xff9a30, { p: [0, 0.22, -0.1], seg: 3, ao: 0 }).sphere(0.03, RED, { p: [0, 0.26, -0.1], ao: 0 });   // the bomb it carries
        for (const s of [-1, 1]) b.cone(0.03, 0.1, 0xe8903a, { p: [s * 0.08, 0.1, 0.05], r: [0.4, 0, 0], seg: 4, ao: 0 });
        return b; } },
      { name: 'wingL', pose: (S, p) => { const f = S.dive ? -0.9 : sin(S.t * (S.sp > 0.3 ? 12 : 8)) * 0.9 + 0.1; p.x = -0.14; p.y = 0.42; p.rz = -f; p.ry = S.dive ? 0.5 : 0; }, build: () => wing(new Builder(), { side: -1, span: 0.55, chord: 0.28, feathers: 4, color: 0x7f8c8d, tip: 0x5f6d6e }) },
      { name: 'wingR', pose: (S, p) => { const f = S.dive ? -0.9 : sin(S.t * (S.sp > 0.3 ? 12 : 8)) * 0.9 + 0.1; p.x = 0.14; p.y = 0.42; p.rz = f; p.ry = S.dive ? -0.5 : 0; }, build: () => wing(new Builder(), { side: 1, span: 0.55, chord: 0.28, feathers: 4, color: 0x7f8c8d, tip: 0x5f6d6e }) },
    ],
  },

  // ---- POLICE: a stubby patrol car, dark body and lighter cabin, a white door stripe, wheels, flashing red and blue roof lights, glowing headlights (original: #2c3e50 body, #34495e cabin)
  police: {
    size: [1.71, 0.86],
    root: (S, p) => { p.y = abs(sin(S.t * 18)) * 0.02 * S.sp; p.rx = -0.03 * S.sp; keep(p, 1 - S.hit * 0.08); },
    parts: [
      { name: 'car', pose: () => {}, build: () => {
        const b = bi().box(1.45, 0.4, 0.8, 0x2c3e50, { p: [0, 0.38, 0], radius: 0.1, jitter: 0.01, ao: 0.2 }).box(0.8, 0.32, 0.7, 0x34495e, { p: [-0.05, 0.7, 0], radius: 0.1 }).box(0.7, 0.2, 0.74, 0x10202e, { p: [-0.05, 0.72, 0], radius: 0.05, ao: 0 });
        b.box(1.46, 0.1, 0.82, 0xf2f2f2, { p: [0, 0.42, 0], radius: 0.02, ao: 0 }).box(0.5, 0.05, 0.82, 0x1a1a22, { p: [-0.1, 0.38, 0], radius: 0.01, ao: 0 });
        for (const s of [-1, 1]) { b.box(0.16, 0.1, 0.06, WHITE, { p: [0.7, 0.4, s * 0.28], radius: 0.02, ao: 0 }); b.box(0.12, 0.08, 0.05, RED, { p: [-0.72, 0.42, s * 0.28], radius: 0.02, ao: 0 }); }
        b.box(0.3, 0.12, 0.05, 0xf2f2f2, { p: [0.05, 0.38, 0.41], radius: 0.01, ao: 0 }).box(0.3, 0.12, 0.05, 0xf2f2f2, { p: [0.05, 0.38, -0.41], radius: 0.01, ao: 0 });
        return b; } },
      { name: 'wheels', pose: (S, p) => { p.y = 0; }, build: () => { const b = bi(); for (const [x, z] of [[0.45, 1], [-0.45, 1], [0.45, -1], [-0.45, -1]]) b.cyl(0.19, 0.19, 0.14, 0x15151a, { p: [x, 0.19, z * 0.38], r: [Math.PI / 2, 0, 0], seg: 8, ao: 0 }).cyl(0.09, 0.09, 0.16, 0x9aa0b0, { p: [x, 0.19, z * 0.38], r: [Math.PI / 2, 0, 0], seg: 6, ao: 0 }); return b; } },
      { name: 'lightR', pose: (S, p) => { const on = sin(S.t * 14) > 0; p.sy = p.sx = p.sz = on ? 1 : 0.001; }, build: () => bi().box(0.2, 0.12, 0.22, RED, { p: [0.0, 0.93, 0.17], radius: 0.03, ao: 0 }) },
      { name: 'lightB', pose: (S, p) => { const on = sin(S.t * 14) <= 0; p.sy = p.sx = p.sz = on ? 1 : 0.001; }, build: () => bi().box(0.2, 0.12, 0.22, BLUE, { p: [0.0, 0.93, -0.17], radius: 0.03, ao: 0 }) },
    ],
  },
};
