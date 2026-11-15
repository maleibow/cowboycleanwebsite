import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { foot } from './partKit.js';

// Stage 3 (Neo-Scrap City) enemy models, same contract as enemyModels.js. Looks follow the original sprites (cleaningup.html 5749-5978):
// smog = a black cloud with glowing cyan eyes, slag = blue-grey scrap with a cyan core, drone = grey saucer with a magenta eye, trash = a grey bin
// with magenta / cyan glare, rat = grey rat with red eyes and a magenta tag, roach = navy shell with cyan glow. Neon uses colours above 1.0 (bloom).
const sin = Math.sin, cos = Math.cos, max = Math.max, abs = Math.abs, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };
const CYAN = new THREE.Color(0.25, 2.8, 2.5), MAG = new THREE.Color(2.9, 0.25, 2.1), RED = new THREE.Color(3, 0.2, 0.2), AMBER = new THREE.Color(3, 1.7, 0.4);
const bi = () => new Builder({ ico: true });

export const MODELS3 = {
  // ---- SMOG: a drifting cloud of black exhaust, glowing cyan eyes and a ragged cyan grin, puffs orbiting it
  smog: {
    size: [1.07, 1.07],
    root: (S, p) => { p.y = sin(S.t * 2.1) * 0.06; keep(p, 1 + sin(S.t * 3.4) * 0.04 - S.hit * 0.12); },
    parts: [
      { name: 'cloud', pose: () => {}, build: () => {
        const b = bi(); for (const [x, y, z, r, c] of [[0, 0.55, 0, 0.42, 0x15131c], [-0.3, 0.45, 0.05, 0.3, 0x24202e], [0.3, 0.5, -0.03, 0.32, 0x1c1926], [0.05, 0.85, 0.02, 0.3, 0x2c2838], [-0.18, 0.2, 0.1, 0.24, 0x1c1926], [0.22, 0.22, 0.05, 0.26, 0x24202e]]) b.sphere(r, c, { p: [x, y, z], jitter: 0.05, ao: 0.1 });
        for (const s of [-1, 1]) { b.sphere(0.11, CYAN, { p: [s * 0.17, 0.6, 0.38], s: [1, 1.2, 0.6], ao: 0 }); b.box(0.2, 0.05, 0.05, 0x050308, { p: [s * 0.17, 0.74, 0.4], r: [0, 0, -s * 0.5], radius: 0.01, ao: 0 }); }
        for (let i = 0; i < 5; i++) b.box(0.07, 0.07, 0.04, CYAN, { p: [-0.2 + i * 0.1, 0.34 + (i % 2) * 0.05, 0.42], radius: 0.01, ao: 0 });
        return b; } },
      { name: 'puffs', pose: (S, p) => { p.ry = S.t * 1.2; p.y = 0.05 * sin(S.t * 3); }, build: () => { const b = bi(); for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283; b.sphere(0.12 + (i % 2) * 0.04, 0x2c2838, { p: [cos(a) * 0.62, 0.35 + (i % 3) * 0.18, sin(a) * 0.62], jitter: 0.03, ao: 0 }); } return b; } },
    ],
  },

  // ---- SLAG: a hunched scrap golem of blue-grey plate, a glowing cyan core in its chest, rivets, one oversized pipe arm
  slag: {
    size: [1.07, 1.07],
    root: (S, p) => { const w = sin(S.t * 8) * S.sp; p.y = abs(w) * 0.05; p.rz = w * 0.05; keep(p, 1 - S.hit * 0.12); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().box(0.78, 0.7, 0.55, 0x34495e, { p: [0, 0.62, 0], radius: 0.08, jitter: 0.03, ao: 0.2 }).box(0.5, 0.36, 0.42, 0x3f5873, { p: [0, 1.08, 0.02], radius: 0.07 }).box(0.62, 0.12, 0.5, 0x22303f, { p: [0, 0.3, 0], radius: 0.03 });
        b.sphere(0.17, CYAN, { p: [0, 0.66, 0.29], s: [1, 1, 0.5], ao: 0 }).add(new THREE.TorusGeometry(0.21, 0.04, 4, 10), 0x1a2733, { p: [0, 0.66, 0.29], ao: 0 });
        b.box(0.34, 0.07, 0.06, CYAN, { p: [0, 1.1, 0.25], radius: 0.01, ao: 0 }).cyl(0.04, 0.05, 0.3, 0x22303f, { p: [0.16, 1.4, 0], seg: 4 }).sphere(0.05, AMBER, { p: [0.16, 1.57, 0], ao: 0 });
        for (const [x, y] of [[-0.3, 0.9], [0.3, 0.9], [-0.3, 0.38], [0.3, 0.38]]) b.sphere(0.04, 0x9aa8b8, { p: [x, y, 0.28], s: [1, 1, 0.5], ao: 0 });
        return b; } },
      { name: 'armL', pose: (S, p) => { p.x = -0.5; p.y = 0.95; p.rx = sin(S.t * 8) * S.sp * 0.7; }, build: () => bi().cyl(0.12, 0.14, 0.8, 0x34495e, { p: [0, -0.35, 0], seg: 6 }).box(0.3, 0.3, 0.3, 0x22303f, { p: [0, -0.8, 0.02], radius: 0.05 }).sphere(0.1, CYAN, { p: [0, -0.8, 0.18], ao: 0 }) },
      { name: 'armR', pose: (S, p) => { p.x = 0.5; p.y = 0.95; p.rx = -sin(S.t * 8) * S.sp * 0.7; }, build: () => bi().box(0.22, 0.7, 0.22, 0x3f5873, { p: [0, -0.32, 0], radius: 0.04 }).cyl(0.2, 0.2, 0.36, 0x22303f, { p: [0, -0.8, 0.04], r: [Math.PI / 2, 0, 0], seg: 6 }).cyl(0.1, 0.1, 0.4, 0x9aa8b8, { p: [0, -0.8, 0.28], r: [Math.PI / 2, 0, 0], seg: 6 }) },
      { name: 'legs', pose: (S, p) => { p.y = abs(sin(S.t * 8)) * 0.04 * S.sp; }, build: () => { const b = bi(); for (const s of [-1, 1]) foot(b, { x: s * 0.2, y: 0.16, z: 0.03, w: 0.3, h: 0.3, l: 0.4, color: 0x22303f }); return b; } },
    ],
  },

  // ---- DRONE: a grey saucer with a dark core, one big magenta eye, four caged rotors and a chin gun (original: #95a5a6 disc, #2c3e50 core, #ff00cc eye)
  drone: {
    size: [1.07, 0.64],
    root: (S, p) => { p.rx = S.dive ? 0.6 : 0.08; p.rz = clamp(-S.dx * 0.05, -0.4, 0.4); p.y = sin(S.t * 6) * 0.05; keep(p, 1 - S.hit * 0.1); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi(); b.add(new THREE.SphereGeometry(0.4, 12, 7, 0, 6.283, 0, 1.6), 0x95a5a6, { p: [0, 0.22, 0], s: [1, 0.55, 1], jitter: 0.01, ao: 0.2 }).cyl(0.4, 0.46, 0.14, 0x7f8c8d, { p: [0, 0.16, 0], seg: 12, ao: 0.1 }).cyl(0.26, 0.28, 0.1, 0x2c3e50, { p: [0, 0.3, 0], seg: 10, ao: 0 });
        b.sphere(0.17, MAG, { p: [0, 0.3, 0.3], s: [1, 1, 0.6], ao: 0 }).add(new THREE.TorusGeometry(0.2, 0.035, 4, 10), 0x1a2733, { p: [0, 0.3, 0.3], ao: 0 });
        b.cyl(0.04, 0.05, 0.3, 0x2c3e50, { p: [0, 0.07, 0.3], r: [Math.PI / 2, 0, 0], seg: 5 }).sphere(0.04, RED, { p: [0, 0.07, 0.46], ao: 0 });
        for (const a of [0.78, 2.36, 3.93, 5.5]) { const x = cos(a) * 0.5, z = sin(a) * 0.5; b.box(0.5, 0.05, 0.07, 0x7f8c8d, { p: [x / 2, 0.2, z / 2], r: [0, -a, 0], radius: 0.01 }); b.add(new THREE.TorusGeometry(0.2, 0.03, 4, 12).rotateX(Math.PI / 2), 0x2c3e50, { p: [x, 0.24, z], ao: 0 }).cyl(0.17, 0.17, 0.012, 0xcfd8dc, { p: [x, 0.26, z], seg: 10, ao: 0 }); }
        b.sphere(0.035, AMBER, { p: [0.3, 0.12, -0.3], ao: 0 }).sphere(0.035, CYAN, { p: [-0.3, 0.12, -0.3], ao: 0 });
        return b; } },
    ],
  },

  // ---- RAT: a low grey cyber-rat, red eyes, long ears and teeth, a magenta ear tag and a cyan collar, a whipping tail (original: #7f8c8d, red eye, #ff00cc)
  rat: {
    size: [1.29, 0.75],
    root: (S, p) => { p.y = abs(sin(S.t * 14)) * 0.03 * S.sp; p.rx = 0.05 * S.sp; keep(p, 1 - S.hit * 0.15); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().sphere(0.3, 0x7f8c8d, { p: [0, 0.32, -0.12], s: [0.9, 0.8, 1.45], jitter: 0.03 }).sphere(0.2, 0x95a5a6, { p: [0, 0.34, 0.26], s: [0.9, 0.85, 1.1], jitter: 0.02 }).sphere(0.1, 0xffb3c8, { p: [0, 0.32, 0.5], ao: 0 });
        for (const s of [-1, 1]) { b.sphere(0.13, 0x95a5a6, { p: [s * 0.15, 0.54, 0.2], s: [1, 1.1, 0.4], ao: 0 }); b.sphere(0.05, RED, { p: [s * 0.1, 0.42, 0.38], ao: 0 }); b.cone(0.02, 0.1, 0xf3ead8, { p: [s * 0.03, 0.22, 0.48], r: [Math.PI, 0, 0], seg: 4, ao: 0 }); b.box(0.2, 0.01, 0.01, 0xcfd8dc, { p: [s * 0.16, 0.33, 0.52], r: [0, 0, s * 0.2], ao: 0 }); }
        b.sphere(0.04, MAG, { p: [0.17, 0.62, 0.2], ao: 0 }).add(new THREE.TorusGeometry(0.18, 0.03, 4, 10), CYAN, { p: [0, 0.3, 0.18], r: [0, 0, 0], s: [1, 1, 1], ao: 0 });
        return b; } },
      { name: 'tail', pose: (S, p) => { p.z = -0.4; p.ry = sin(S.t * 9) * 0.5; }, build: () => bi().cyl(0.02, 0.05, 0.7, 0xf0b5c0, { p: [0, 0.18, -0.3], r: [Math.PI / 2 - 0.2, 0, 0], seg: 4, ao: 0 }).cyl(0.012, 0.02, 0.4, 0xf0b5c0, { p: [0, 0.16, -0.78], r: [Math.PI / 2 + 0.2, 0, 0], seg: 4, ao: 0 }) },
      { name: 'legs', pose: (S, p) => { p.z = sin(S.t * 14) * 0.08 * S.sp; }, build: () => { const b = bi(); for (const [x, z] of [[-1, 0.22], [1, 0.22], [-1, -0.28], [1, -0.28]]) b.box(0.08, 0.14, 0.2, 0x6c7a7b, { p: [x * 0.2, 0.07, z], radius: 0.03 }); return b; } },
    ],
  },

  // ---- ROACH: a flat navy shell with a glossy cyan stripe and glowing cyan eyes, six scuttling legs and wiggling antennae (original: #2c3e50, #00ffcc)
  roach: {
    size: [0.86, 0.32],
    root: (S, p) => { p.y = abs(sin(S.t * 22)) * 0.012 * S.sp; keep(p, 1 - S.hit * 0.15); },
    parts: [
      { name: 'shell', pose: () => {}, build: () => {
        const b = bi().sphere(0.2, 0x2c3e50, { p: [0, 0.14, -0.04], s: [0.9, 0.55, 1.5], jitter: 0.01 }).sphere(0.11, 0x1b2733, { p: [0, 0.12, 0.2], s: [1, 0.7, 1] }).box(0.03, 0.04, 0.4, CYAN, { p: [0, 0.255, -0.04], radius: 0.01, ao: 0 });
        for (const s of [-1, 1]) { b.sphere(0.035, CYAN, { p: [s * 0.06, 0.16, 0.29], ao: 0 }); b.box(0.12, 0.02, 0.24, 0x3a4f66, { p: [s * 0.09, 0.2, -0.06], r: [0, s * 0.12, 0], radius: 0.01, ao: 0 }); }
        return b; } },
      { name: 'legsA', pose: (S, p) => { p.ry = sin(S.t * 22) * 0.25 * S.sp; }, build: () => { const b = bi(); for (const [x, z] of [[-1, 0.12], [1, -0.05], [-1, -0.2]]) b.box(0.28, 0.025, 0.04, 0x1b2733, { p: [x * 0.22, 0.07, z], r: [0, 0, x * 0.4], radius: 0.005, ao: 0 }); return b; } },
      { name: 'legsB', pose: (S, p) => { p.ry = -sin(S.t * 22) * 0.25 * S.sp; }, build: () => { const b = bi(); for (const [x, z] of [[1, 0.12], [-1, -0.05], [1, -0.2]]) b.box(0.28, 0.025, 0.04, 0x1b2733, { p: [x * 0.22, 0.07, z], r: [0, 0, x * 0.4], radius: 0.005, ao: 0 }); return b; } },
      { name: 'feelers', pose: (S, p) => { p.ry = sin(S.t * 6) * 0.3; p.z = 0.28; }, build: () => { const b = bi(); for (const s of [-1, 1]) b.cyl(0.008, 0.014, 0.4, 0x1b2733, { p: [s * 0.08, 0.2, 0.18], r: [1.2, 0, s * 0.4], seg: 3, ao: 0 }); return b; } },
    ],
  },

  // ---- TRASH: a hulking wheelie bin with a snapping lid, magenta and cyan eyes, junk spilling out and two lid-shields for hands (original: #7f8c8d bin, #bdc3c7 lid, #ff00cc / #00ffcc)
  trash: {
    size: [1.7, 1.7],
    root: (S, p) => { const w = sin(S.t * 4) * S.sp; p.y = abs(w) * 0.07; p.rz = w * 0.04; keep(p, 1 - S.hit * 0.08); },
    parts: [
      { name: 'bin', pose: () => {}, build: () => {
        const b = bi().box(1.3, 1.15, 1.0, 0x7f8c8d, { p: [0, 0.78, 0], radius: 0.12, jitter: 0.04, ao: 0.2 }).box(1.36, 0.1, 1.06, 0x5d6b6c, { p: [0, 0.3, 0], radius: 0.03 });
        for (let i = 0; i < 5; i++) b.box(0.06, 0.95, 0.05, 0x6a7879, { p: [-0.5 + i * 0.25, 0.8, 0.51], radius: 0.01, ao: 0 });
        b.box(1.0, 0.3, 0.12, 0x120e1c, { p: [0, 1.0, 0.5], radius: 0.05, ao: 0 }); b.sphere(0.15, MAG, { p: [-0.3, 1.02, 0.56], s: [1, 1, 0.5], ao: 0 }).sphere(0.15, CYAN, { p: [0.3, 1.02, 0.56], s: [1, 1, 0.5], ao: 0 });
        for (let i = 0; i < 6; i++) b.cone(0.07, 0.17, 0xe8dcc8, { p: [-0.42 + i * 0.17, 0.86, 0.55], r: [Math.PI, 0, 0], seg: 4, ao: 0 });
        b.box(0.5, 0.06, 0.05, 0x4a4a5a, { p: [0, 0.55, 0.52], radius: 0.01, ao: 0 });
        for (const [x, c] of [[-0.5, 0xc0392b], [0.1, 0x2a7aa8], [0.55, 0xd4a017]]) b.cyl(0.13, 0.13, 0.4, c, { p: [x, 1.55, -0.1], r: [0.3, 0, x], seg: 7 });        // junk poking out of the top
        b.box(0.5, 0.5, 0.06, 0xf0e6dc, { p: [0.2, 1.4, 0.1], r: [0.2, 0.4, 0.3], radius: 0.02, ao: 0 }).sphere(0.17, 0x2e6a4a, { p: [-0.25, 1.45, 0.15], s: [1, 0.8, 1], jitter: 0.04 });
        for (const s of [-1, 1]) b.cyl(0.2, 0.2, 0.12, 0x15151a, { p: [s * 0.5, 0.2, -0.25], r: [0, 0, Math.PI / 2], seg: 8, ao: 0 });
        return b; } },
      { name: 'lid', pose: (S, p) => { p.y = 1.35; p.z = -0.5; p.rx = -0.25 - 0.35 * abs(sin(S.t * 3)); }, build: () => bi().box(1.36, 0.14, 1.1, 0xbdc3c7, { p: [0, 0.05, 0.55], radius: 0.05, ao: 0.1 }).box(0.5, 0.1, 0.06, 0x7f8c8d, { p: [0, 0.14, 1.0], radius: 0.02, ao: 0 }) },
      { name: 'armL', pose: (S, p) => { p.x = -0.78; p.y = 1.0; p.rx = sin(S.t * 4) * S.sp * 0.4; }, build: () => bi().box(0.2, 0.6, 0.2, 0x5d6b6c, { p: [0, -0.3, 0], radius: 0.04 }).cyl(0.34, 0.34, 0.06, 0xbdc3c7, { p: [-0.05, -0.7, 0.12], r: [Math.PI / 2, 0, 0], seg: 10, ao: 0 }).box(0.1, 0.1, 0.1, 0x4a4a5a, { p: [-0.05, -0.7, 0.18], radius: 0.02, ao: 0 }) },
      { name: 'armR', pose: (S, p) => { p.x = 0.78; p.y = 1.0; p.rx = -sin(S.t * 4) * S.sp * 0.4; }, build: () => bi().box(0.2, 0.6, 0.2, 0x5d6b6c, { p: [0, -0.3, 0], radius: 0.04 }).cyl(0.34, 0.34, 0.06, 0xbdc3c7, { p: [0.05, -0.7, 0.12], r: [Math.PI / 2, 0, 0], seg: 10, ao: 0 }).box(0.1, 0.1, 0.1, 0x4a4a5a, { p: [0.05, -0.7, 0.18], radius: 0.02, ao: 0 }) },
    ],
  },
};
