import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for the Haunted Village: gnarled dead trees, crooked cottages with sickly green windows, graves (a slab, a cross and an angel), iron fence runs, floating wisps, iron lamp posts
// and the far rings of black hills with leaning silhouettes and a church spire (original drawBackground: sky #2C3E50 -> #000, a yellow moon at the top right, black twisted trees, floor #222).
export const GLOW = new THREE.Color(1.4, 3.0, 1.6), WINDOW = new THREE.Color(1.6, 3.2, 1.2), EYE = new THREE.Color(3.4, 4.0, 1.4);
const B = () => new Builder({ boxSeg: 1, ico: true });
const STONE = [0x6a7078, 0x585e66, 0x7a8088], MOSS = 0x3f5a42, WOOD = 0x2f2620, WOOD2 = 0x3d322a, SLATE = 0x2c3038;

export const deadTree = () => {   // a twisted black trunk with grasping branches, no leaves
  const b = B();
  for (let i = 0; i < 5; i++) { const t = i / 4; b.cyl(0.34 - t * 0.2, 0.4 - t * 0.2, 1.3, i % 2 ? WOOD : WOOD2, { p: [Math.sin(t * 2.4) * 0.5, 0.6 + i * 1.1, Math.cos(t * 1.7) * 0.25], r: [Math.cos(t * 2) * 0.12, 0, -Math.sin(t * 2.4) * 0.22], seg: 5, jitter: 0.04 }); }
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283 + 0.4, y = 3.2 + (i % 3) * 0.9, len = 2.0 - (i % 3) * 0.4; b.cyl(0.05, 0.16, len, WOOD, { p: [Math.cos(a) * len * 0.42 + 0.3, y + len * 0.2, Math.sin(a) * len * 0.42], r: [Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0 + 0.3], seg: 4, jitter: 0.03, ao: 0.1 });
    b.cyl(0.02, 0.06, 0.9, WOOD2, { p: [Math.cos(a) * len * 0.82 + 0.3, y + len * 0.45, Math.sin(a) * len * 0.82], r: [Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4 - 0.4], seg: 3, ao: 0 }); }
  b.sphere(0.2, 0x1a1410, { p: [0.4, 2.0, 0.3], s: [1, 1.5, 1], jitter: 0.05, ao: 0 });   // a knot-hole
  return b.build();
};

export const cottage = () => {   // a crooked two-storey cottage: leaning walls, a sagging steep roof, a crooked chimney, sickly green windows
  const b = B();
  b.box(4.0, 3.0, 3.4, 0x3a3a44, { p: [0, 1.5, 0], r: [0, 0.03, 0.025], radius: 0.1, jitter: 0.07, ao: 0.25 }).box(3.4, 2.4, 3.0, 0x44444e, { p: [0.14, 4.1, 0], r: [0, -0.05, -0.04], radius: 0.1, jitter: 0.07, ao: 0.25 });
  b.add(new THREE.ConeGeometry(2.9, 3.2, 4), SLATE, { p: [0.2, 6.9, 0], r: [0, Math.PI / 4, 0.07], s: [1, 1, 0.85], jitter: 0.05, ao: 0.2 }).box(0.7, 2.0, 0.7, 0x2a2a32, { p: [-1.1, 7.6, 0.4], r: [0, 0, 0.14], radius: 0.05 });
  for (const [x, y, z] of [[-1.0, 1.9, 1.72], [1.0, 1.9, 1.72], [0.2, 4.4, 1.55]]) { b.box(0.8, 1.1, 0.12, 0x14181c, { p: [x, y, z], r: [0, 0, x * 0.03], radius: 0.03 }); b.box(0.6, 0.9, 0.06, WINDOW, { p: [x, y, z + 0.04], r: [0, 0, x * 0.03], radius: 0.02, ao: 0 }); b.box(0.06, 0.95, 0.07, 0x14181c, { p: [x, y, z + 0.08], ao: 0 }); }
  b.box(0.9, 1.7, 0.14, 0x241c16, { p: [0, 0.85, 1.74], radius: 0.04 });
  return b.build();
};

export const grave = () => {   // a cluster: a leaning slab, a cross, a small angel, moss and a candle-less stub
  const b = B();
  b.box(0.9, 1.3, 0.22, STONE[0], { p: [0, 0.65, 0], r: [0.05, 0, 0.12], radius: 0.08, jitter: 0.03, ao: 0.2 }).add(new THREE.CylinderGeometry(0.45, 0.45, 0.22, 10, 1, false, 0, Math.PI).rotateZ(-Math.PI / 2).rotateY(Math.PI / 2), STONE[0], { p: [0.04, 1.3, 0], r: [0.05, 0, 0.12], ao: 0.1 });
  b.box(0.2, 1.5, 0.18, STONE[1], { p: [1.3, 0.75, 0.2], r: [0, 0, -0.1], radius: 0.04, ao: 0.15 }).box(0.8, 0.2, 0.18, STONE[1], { p: [1.26, 1.1, 0.2], r: [0, 0, -0.1], radius: 0.04, ao: 0.15 });
  b.box(0.6, 0.5, 0.3, STONE[2], { p: [-1.1, 0.25, 0.3], r: [0, 0.2, 0.05], radius: 0.06, ao: 0.2 }).sphere(0.2, STONE[2], { p: [-1.1, 0.7, 0.3], ao: 0.1 });
  b.sphere(0.5, MOSS, { p: [0, 0.1, 0.4], s: [1.6, 0.25, 1], jitter: 0.05, ao: 0 }).sphere(0.4, MOSS, { p: [1.3, 0.08, 0.5], s: [1.4, 0.25, 1], jitter: 0.05, ao: 0 });
  return b.build();
};
export const fence = () => {   // four iron fence panels with spear tops
  const b = B();
  for (let k = 0; k < 4; k++) { const x0 = (k - 1.5) * 1.6; b.box(1.5, 0.08, 0.08, 0x16181c, { p: [x0, 1.0, 0], radius: 0.02, ao: 0 }).box(1.5, 0.08, 0.08, 0x16181c, { p: [x0, 0.35, 0], radius: 0.02, ao: 0 }); for (let i = 0; i < 7; i++) { const x = x0 - 0.66 + i * 0.22; b.cyl(0.028, 0.028, 1.45, 0x1c1f24, { p: [x, 0.72, 0], seg: 4, ao: 0 }).cone(0.05, 0.22, 0x2a2e34, { p: [x, 1.55, 0], seg: 4, ao: 0 }); } b.box(0.14, 1.7, 0.14, 0x22252a, { p: [x0 + 0.8, 0.85, 0], radius: 0.03, ao: 0.1 }); }
  return b.build();
};
export const wisp = () => { const b = B(); b.sphere(0.2, GLOW, { p: [0, 1.4, 0], s: [1, 1.5, 1], ao: 0 }).sphere(0.1, new THREE.Color(1.2, 2.2, 1.4), { p: [0.05, 0.95, 0], s: [1, 1.6, 1], ao: 0 }).sphere(0.06, new THREE.Color(1.0, 1.8, 1.2), { p: [-0.05, 0.65, 0.03], s: [1, 1.6, 1], ao: 0 }); return b.build(); };

// Track edge: a black iron lamp post with a sickly green lantern (a separate emissive mesh)
export const ironPost = () => { const b = B(); b.cyl(0.06, 0.1, 2.3, 0x1c1f24, { p: [0, 1.15, 0], seg: 5 }).box(0.3, 0.12, 0.3, 0x22252a, { p: [0, 0.06, 0], radius: 0.02 }).box(0.34, 0.06, 0.34, 0x22252a, { p: [0, 2.34, 0], radius: 0.01 }).cone(0.2, 0.3, 0x22252a, { p: [0, 2.7, 0], seg: 4 }); for (const sd of [-1, 1]) b.cyl(0.015, 0.015, 0.4, 0x22252a, { p: [sd * 0.2, 2.35, 0], r: [0, 0, sd * 0.9], seg: 3, ao: 0 }); return b.build(); };
export const lantern = () => B().sphere(0.14, GLOW, { p: [0, 0, 0], s: [1, 1.3, 1], ao: 0 }).build();

// Far scenery: three parallax rings of black hills with crooked cottages, dead trees and a church spire, hazed toward the green fog (built once).
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#2a4a44');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false }), layers = [];
  const make = (n, dist, hMin, hMax, base, haze, follow, extra) => {
    const geo = new Builder({ boxSeg: 1 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.08, 0.08), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), w = h * rng.range(1.6, 2.6);
      geo.add(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), base, { p: [cx, 0, cz], s: [w, h, w * 0.7], jitter: h * 0.04, ao: 0 });
      const k = rng.int(0, 3), top = h * 0.92;   // a silhouette on the crest: a leaning cottage, a dead tree, a spire
      if (k === 0) { geo.box(h * 0.5, h * 0.4, h * 0.4, 0x0a0c10, { p: [cx, top + h * 0.15, cz], r: [0, 0, rng.range(-0.15, 0.15)], ao: 0 }).add(new THREE.ConeGeometry(h * 0.42, h * 0.4, 4), 0x08090c, { p: [cx, top + h * 0.5, cz], r: [0, Math.PI / 4, 0.1], ao: 0 }); }
      else if (k === 1) { geo.cyl(h * 0.05, h * 0.09, h * 0.7, 0x08090c, { p: [cx, top + h * 0.3, cz], r: [0, 0, rng.range(-0.2, 0.2)], seg: 5, ao: 0 }); for (let q = 0; q < 4; q++) geo.cyl(h * 0.015, h * 0.04, h * 0.45, 0x08090c, { p: [cx + rng.range(-1, 1) * h * 0.2, top + h * (0.5 + q * 0.1), cz], r: [0, 0, rng.range(-1.1, 1.1)], seg: 3, ao: 0 }); }
      else if (k === 2) { geo.box(h * 0.28, h * 0.8, h * 0.28, 0x0a0c10, { p: [cx, top + h * 0.35, cz], ao: 0 }).add(new THREE.ConeGeometry(h * 0.24, h * 0.55, 4), 0x08090c, { p: [cx, top + h * 0.98, cz], r: [0, Math.PI / 4, 0], ao: 0 }); }
    }
    extra?.(geo);
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) { if (Math.max(col.getX(i), col.getY(i), col.getZ(i)) > 1.01) continue; t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / (hMax * 1.6)))) + haze * 0.1); col.setXYZ(i, t.r, t.g, t.b); }
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(16, 330, 36, 80, 0x161a20, 0.5, 0.95);
  make(14, 260, 24, 52, 0x12161a, 0.34, 0.9);
  make(12, 205, 14, 32, 0x0e1216, 0.2, 0.85);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 4, cam.z * m.userData.follow); } };
}
export const STONES = STONE;
