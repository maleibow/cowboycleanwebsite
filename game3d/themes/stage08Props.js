import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for Cloud Dream: cumulus towers rising out of the cloud sea, small floating islets with a crystal and a tree, twinkling stars on strings, dream-lamps along the path
// edge, and the far rings of cloud mountains, pastel islands with waterfalls and a great pale sun. Everything is soft, white and pastel pink / lilac / mint on purpose
// (original drawBackground: sky #FFB6C1 -> #FFC0CB, white puffs made of three circles, floor #f5f5f5).
export const SPARK = new THREE.Color(1.8, 1.7, 1.3);
const B = () => new Builder({ boxSeg: 1, ico: true });
const PASTEL = [0xffc2dc, 0xd9c2ff, 0xbfeedd, 0xfff0b8, 0xc2e4ff];

// a cumulus tower: a stack of fat white puffs, lilac-shaded underneath, with a pink-lit top
export const tower = () => {
  const b = B(); let y = 0.7;
  for (const [x, z, r, c] of [[0, 0, 1.7, 0xeee2fb], [0.9, 0.2, 1.25, 0xffffff], [-0.9, -0.1, 1.3, 0xf6dcee], [0.2, 0.1, 1.5, 0xffffff], [-0.3, 0.2, 1.1, 0xffd2e6], [0.5, -0.2, 0.9, 0xfff2f8]]) { b.sphere(r, c, { p: [x, y, z], s: [1.1, 0.9, 1], jitter: 0.12, ao: 0.07 }); y += r * 0.95; }
  return b.build();
};
export const puff = () => { const b = B(); for (const [x, y, z, r, c] of [[0, 0.5, 0, 1.0, 0xffffff], [-0.9, 0.35, 0.1, 0.75, 0xf2ecfa], [0.95, 0.4, -0.1, 0.8, 0xffffff], [0.1, 0.9, 0.1, 0.65, 0xffeef6]]) b.sphere(r, c, { p: [x, y, z], s: [1.2, 0.85, 1], jitter: 0.08, ao: 0.14 }); return b.build(); };

// a floating islet: grassy lilac disc on an inverted rock cone, a tiny dream tree and a pastel crystal
export const islet = () => {
  const b = B();
  b.add(new THREE.ConeGeometry(2.0, 3.2, 7), 0xb8a3d6, { p: [0, -1.3, 0], r: [Math.PI, 0, 0], jitter: 0.12, ao: 0.2 }).add(new THREE.CylinderGeometry(2.2, 2.0, 0.55, 9), 0xa8e6c0, { p: [0, 0.1, 0], jitter: 0.08, ao: 0.1 });
  b.cyl(0.1, 0.14, 1.1, 0xd9b8a0, { p: [0.5, 0.95, 0.1], seg: 5 }).sphere(0.7, 0xffc2dc, { p: [0.5, 1.7, 0.1], s: [1, 0.85, 1], jitter: 0.08 }).sphere(0.45, 0xffd9ea, { p: [0.95, 1.5, 0.3], jitter: 0.06 });
  b.add(new THREE.OctahedronGeometry(0.5, 0), 0xcfe6ff, { p: [-0.7, 0.8, -0.2], s: [0.7, 1.5, 0.7], ao: 0 }).add(new THREE.OctahedronGeometry(0.3, 0), 0xe0cfff, { p: [-1.1, 0.55, 0.3], s: [0.7, 1.3, 0.7], ao: 0 });
  b.sphere(0.12, SPARK, { p: [-0.7, 1.6, -0.2], ao: 0 });
  return b.build();
};

// a twinkling star hanging on a string from nowhere (an emissive pale gold five-point star + a ribbon)
export const hangStar = () => {
  const b = B(), pts = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.28 : 0.7, a = (i / 10) * 6.283 + 1.5708; pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  b.add(new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.22, bevelEnabled: false }).translate(0, 0, -0.11), new THREE.Color(1.7, 1.5, 0.8), { p: [0, 3.0, 0], ao: 0 });
  b.cyl(0.012, 0.012, 3.2, 0xffffff, { p: [0, 4.6, 0], seg: 3, ao: 0 });
  return b.build();
};
// a drifting ring of tiny pastel sparkles: a small cluster of floating gems
export const gems = () => { const b = B(); for (let i = 0; i < 6; i++) b.add(new THREE.OctahedronGeometry(0.18 + (i % 3) * 0.05, 0), PASTEL[i % 5], { p: [Math.sin(i * 2.1) * 0.9, 1.2 + (i % 4) * 0.5, Math.cos(i * 2.1) * 0.9], s: [0.7, 1.4, 0.7], ao: 0 }); return b.build(); };

// Track edge: a slim pearl post topped with a crescent moon; the lamp is a separate glowing pearl
export const dreamPost = () => {
  const b = B(); b.cyl(0.07, 0.1, 2.1, 0xf4eefc, { p: [0, 1.05, 0], seg: 6 }).sphere(0.16, 0xffc2dc, { p: [0, 0.14, 0], ao: 0 });
  b.add(new THREE.TorusGeometry(0.26, 0.07, 5, 14, Math.PI * 1.45), 0xfff0b8, { p: [0, 2.3, 0], r: [0, 0, 0.9], s: [1, 1, 0.7], ao: 0 });
  return b.build();
};
export const pearl = () => B().sphere(0.17, 0xffffff, { p: [0, 0, 0], ao: 0 }).build();

// A cloud platform for the moving clouds (world/hazClouds.js): 4.4 m long x 4.4 m wide, flat top at y = 0, soft fluffy underside. `size` scales x and z.
export const cloudPad = () => {
  const b = B();
  b.add(new THREE.CylinderGeometry(2.15, 1.9, 0.5, 14), 0xffffff, { p: [0, -0.25, 0], jitter: 0.05, ao: 0.08 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; b.sphere(0.85 + (i % 3) * 0.12, i % 2 ? 0xffffff : 0xf4eefc, { p: [Math.cos(a) * 1.85, -0.45, Math.sin(a) * 1.85], s: [1, 0.85, 1], jitter: 0.07, ao: 0.1 }); }
  for (const [x, z, r] of [[0, 0, 1.0], [-0.9, 0.7, 0.8], [0.9, -0.6, 0.85]]) b.sphere(r, 0xe9def8, { p: [x, -0.95, z], s: [1.2, 0.8, 1.2], jitter: 0.1, ao: 0.2 });
  b.add(new THREE.CylinderGeometry(1.85, 1.9, 0.07, 14), 0xfff4fa, { p: [0, -0.035, 0], ao: 0 });
  for (const [x, z, c] of [[0.9, 0.7, 0xffc2dc], [-1.1, -0.5, 0xc2e4ff], [0.2, -1.3, 0xfff0b8]]) b.sphere(0.09, c, { p: [x, 0.03, z], s: [1, 0.5, 1], ao: 0 });
  return b.build();
};

// Far scenery: three parallax rings of cloud mountains, pastel floating islands with thin waterfalls, and a great pale sun with a halo ring (built once).
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#ffe6f2');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false }), layers = [];
  const make = (n, dist, hMin, hMax, base, haze, follow, extra) => {
    const geo = new Builder({ boxSeg: 1, ico: true });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.08, 0.08), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), w = h * rng.range(1.5, 2.4);
      for (let k = 0; k < 6; k++) geo.sphere(h * rng.range(0.22, 0.42), k % 2 ? 0xffffff : base, { p: [cx + rng.range(-w, w) * 0.8, h * rng.range(0.1, 0.55), cz + rng.range(-w, w) * 0.25], s: [1.25, 0.85, 1], jitter: h * 0.03, ao: 0 });
    }
    extra?.(geo);
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) { if (Math.max(col.getX(i), col.getY(i), col.getZ(i)) > 1.01) continue; t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / hMax))) + haze * 0.2); col.setXYZ(i, t.r, t.g, t.b); }
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(16, 330, 40, 90, 0xf4e6fa, 0.5, 0.95, (geo) => {
    for (let i = 0; i < 8; i++) {   // floating islands with a waterfall
      const a = rng.range(0, 6.283), d = 300, ix = Math.sin(a) * d, iz = Math.cos(a) * d, iy = rng.range(50, 130), r = rng.range(16, 28);
      geo.add(new THREE.ConeGeometry(r, r * 1.3, 8), 0xc9b4e6, { p: [ix, iy - r * 0.65, iz], r: [Math.PI, 0, 0], jitter: 1.2, ao: 0 }).add(new THREE.CylinderGeometry(r * 1.05, r, 3, 10), 0xb8ecd0, { p: [ix, iy + 1, iz], jitter: 0.8, ao: 0 });
      geo.sphere(r * 0.45, 0xffc2dc, { p: [ix + r * 0.2, iy + r * 0.5, iz], s: [1, 0.8, 1], jitter: 1, ao: 0 });
      geo.cyl(0.9, 0.9, iy * 0.9, 0xcfeaff, { p: [ix - r * 0.5, iy * 0.45, iz], seg: 4, ao: 0 });
    }
    geo.sphere(34, new THREE.Color(1.5, 1.35, 1.2), { p: [-80, 118, -300], ao: 0, s: [1, 1, 0.2] }); geo.add(new THREE.TorusGeometry(54, 2.2, 4, 40), new THREE.Color(1.2, 1.05, 1.1), { p: [-80, 118, -302], ao: 0 });   // the sun and its halo
  });
  make(14, 260, 28, 60, 0xe9dcf8, 0.34, 0.9);
  make(12, 205, 16, 36, 0xf4eefc, 0.2, 0.85);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 4, cam.z * m.userData.follow); } };
}
