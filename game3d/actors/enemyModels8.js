import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { eyes } from './partKit.js';

// Stage 8 (Cloud Dream) enemy models, same contract as enemyModels.js. Looks follow the original sprite (cleaningup.html 6374): storm_cloud = a lumpy slate-blue (#34495e) cloud with a yellow
// zig-zag lightning bolt under it. Here: a heavy thundercloud with angry yellow eyes, rain streaks and a bolt that crackles brighter just before it drops one. (bats and pigeons reuse stages 2 and 4.)
const sin = Math.sin, cos = Math.cos;
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };
const bi = () => new Builder({ ico: true });
const BOLT = new THREE.Color(2.4, 2.0, 0.5);

export const MODELS8 = {
  // ---- STORM CLOUD: a dark, puffed-up thundercloud with a scowl, drizzle underneath and a crackling bolt
  storm_cloud: {
    size: [1.29, 0.86],
    root: (S, p) => { p.y = sin(S.t * 2.4) * 0.08; p.rz = sin(S.t * 1.7) * 0.05; keep(p, 1 + sin(S.t * 3.3) * 0.045 - S.hit * 0.12); },
    parts: [
      { name: 'cloud', pose: () => {}, build: () => {
        const b = bi(); for (const [x, y, z, r, c] of [[0, 0.5, 0, 0.44, 0x62749a], [-0.44, 0.42, 0.04, 0.32, 0x4c6080], [0.46, 0.46, -0.04, 0.34, 0x566a8c], [0.08, 0.8, 0.0, 0.32, 0x7488ae], [-0.24, 0.26, 0.12, 0.26, 0x4c6080], [0.28, 0.26, 0.1, 0.28, 0x566a8c]]) b.sphere(r, c, { p: [x, y, z], s: [1.15, 0.9, 1], jitter: 0.05, ao: 0.18 });
        eyes(b, { y: 0.52, z: 0.38, gap: 0.17, r: 0.1, pr: 0.5, brow: 0.5, look: 0.3, white: 0xffe98a });
        b.box(0.3, 0.06, 0.05, 0x14182a, { p: [0, 0.32, 0.42], r: [0, 0, 0.0], radius: 0.015, ao: 0 });
        return b; } },
      { name: 'rain', pose: (S, p) => { p.y = -0.04 * sin(S.t * 8); }, build: () => { const b = bi(); for (const x of [-0.36, -0.12, 0.14, 0.38]) b.cyl(0.012, 0.012, 0.28 + (x > 0 ? 0.06 : 0), 0xbfe0ff, { p: [x, 0.12, 0.05], seg: 3, ao: 0 }); return b; } },
      { name: 'bolt', pose: (S, p) => { const f = sin(S.t * 31) > 0.2 ? 1 : 0.55; p.sx = p.sy = p.sz = f; p.y = 0.02; }, build: () => { const b = bi(); b.cone(0.1, 0.42, BOLT, { p: [-0.04, 0.2, 0.22], r: [Math.PI, 0, 0.35], seg: 4, ao: 0 }).cone(0.08, 0.34, BOLT, { p: [0.04, -0.04, 0.22], r: [Math.PI, 0, -0.4], seg: 4, ao: 0 }); return b; } },
    ],
  },
};
