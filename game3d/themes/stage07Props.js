import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for Rainbow Island: bendy palms with coconut clusters, giant pastel blossoms, jellybean bushes, lollipop trees, standing rainbow arches, balloon clusters, the
// far green dome hills with a great double rainbow and puffy cloud islands. Colours are bright and saturated on purpose (original: sky #87CEEB -> #E0F6FF, hills #2ecc71, rainbow arcs).
export const BAND = [0xff3b30, 0xff9500, 0xffe135, 0x34c759, 0x32ade6, 0x5856d6, 0xaf52de];
export const SPARK = new THREE.Color(1.8, 1.7, 1.2);
const B = () => new Builder({ boxSeg: 1, ico: true });
const PASTEL = [0xff9ad5, 0xffe36a, 0x7fd8ff, 0xc9a0ff, 0x9af0b0, 0xffb07a];

export const palm = (C) => {
  const b = B();
  for (let i = 0; i < 6; i++) { const t = i / 5; b.cyl(0.26 - t * 0.1, 0.3 - t * 0.1, 1.2, i % 2 ? 0xc99a5a : 0xb8864a, { p: [Math.sin(t * 1.4) * 0.9 * t, 0.6 + i * 1.1, 0], r: [0, 0, -Math.sin(t * 1.4) * 0.5], seg: 6, jitter: 0.03 }); }
  const tx = 0.95, ty = 6.7;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; b.add(new THREE.ConeGeometry(0.34, 3.4, 4), i % 2 ? C.leaf : C.leafLight, { p: [tx + Math.cos(a) * 1.5, ty - 0.4, Math.sin(a) * 1.5], r: [Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15], s: [1, 1, 0.3], ao: 0.1 }); }
  for (const [x, z] of [[0.15, 0.1], [-0.15, -0.1], [0.05, -0.2]]) b.sphere(0.24, 0x6a4a2a, { p: [tx + x, ty - 0.55, z], ao: 0 });
  return b.build();
};
export const blossom = (C) => {   // a giant flower: a green stem, big layered petals, a bright centre
  const b = B(); const col = PASTEL[2], col2 = PASTEL[0];
  b.cyl(0.1, 0.16, 3.2, C.leaf, { p: [0, 1.6, 0], seg: 5 }).add(new THREE.ConeGeometry(0.4, 1.2, 4), C.leafLight, { p: [0.55, 1.2, 0], r: [0, 0, -1.1], s: [1, 1, 0.2] });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; b.sphere(0.62, i % 2 ? col : col2, { p: [Math.cos(a) * 0.95, 3.4 + Math.sin(a) * 0.12, Math.sin(a) * 0.95], s: [1, 0.35, 1], r: [0, -a, 0], jitter: 0.05, ao: 0.05 }); }
  b.sphere(0.5, 0xffd23a, { p: [0, 3.55, 0], s: [1, 0.6, 1], ao: 0 });
  return b.build();
};
export const bush = (C) => { const b = B(); for (const [x, y, z, r, c] of [[0, 0.6, 0, 0.85, C.leaf], [0.8, 0.45, 0.2, 0.6, C.leafLight], [-0.7, 0.45, -0.1, 0.65, C.leaf]]) b.sphere(r, c, { p: [x, y, z], s: [1, 0.85, 1], jitter: 0.05, ao: 0.15 }); for (let i = 0; i < 5; i++) b.sphere(0.12, PASTEL[i % 6], { p: [Math.sin(i * 1.7) * 0.9, 0.55 + (i % 3) * 0.2, Math.cos(i * 1.7) * 0.9], ao: 0 }); return b.build(); };
export const lollipop = (C) => {   // a stick and a swirled candy disc
  const b = B(); b.cyl(0.1, 0.12, 3.6, 0xf2efe6, { p: [0, 1.8, 0], seg: 5 });
  for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(1.35 - i * 0.2, 1.35 - i * 0.2, 0.3 + i * 0.01, 14).rotateX(Math.PI / 2), BAND[(i * 2) % 7], { p: [0, 4.4, 0.01 * i], ao: 0.05, s: [1, 1, 1] });
  b.add(new THREE.TorusGeometry(1.4, 0.1, 4, 16), 0xffffff, { p: [0, 4.4, 0], ao: 0 });
  return b.build();
};
export const arch = (C) => {   // a small rainbow standing in a meadow (seven stacked half-tori)
  const b = B(); for (let i = 0; i < 7; i++) b.add(new THREE.TorusGeometry(4.4 - i * 0.34, 0.2, 4, 18, Math.PI), BAND[i], { p: [0, 0, 0], s: [1, 1, 0.5], ao: 0 });
  b.sphere(0.9, 0xffffff, { p: [-4.3, 0.3, 0], s: [1.2, 0.7, 1], jitter: 0.1, ao: 0 }).sphere(0.7, 0xffffff, { p: [-3.4, 0.2, 0.2], jitter: 0.1, ao: 0 }).sphere(0.9, 0xffffff, { p: [4.3, 0.3, 0], s: [1.2, 0.7, 1], jitter: 0.1, ao: 0 }).sphere(0.7, 0xffffff, { p: [3.4, 0.2, 0.2], jitter: 0.1, ao: 0 });
  return b.build();
};
export const balloons = (C) => { const b = B(); b.cyl(0.015, 0.015, 3, 0xf2efe6, { p: [0, 1.5, 0], seg: 3, ao: 0 }); for (let i = 0; i < 5; i++) { const a = i * 1.26; b.sphere(0.46, PASTEL[(i + 1) % 6], { p: [Math.cos(a) * 0.5, 3.6 + (i % 3) * 0.5, Math.sin(a) * 0.5], s: [1, 1.2, 1], ao: 0.05 }); b.cone(0.07, 0.14, PASTEL[(i + 1) % 6], { p: [Math.cos(a) * 0.5, 3.0 + (i % 3) * 0.5, Math.sin(a) * 0.5], r: [Math.PI, 0, 0], seg: 4, ao: 0 }); } return b.build(); };

// Track edge: a candy-striped post with a glowing pastel orb on top (the orb is a separate emissive mesh)
export const candyPost = (C) => { const b = B(); for (let i = 0; i < 6; i++) b.cyl(0.1, 0.1, 0.34, i % 2 ? 0xffffff : 0xff4a7a, { p: [0, 0.17 + i * 0.34, 0], seg: 6, ao: 0 }); b.cyl(0.18, 0.2, 0.18, 0xffffff, { p: [0, 2.15, 0], seg: 6 }); return b.build(); };
export const orb = () => B().sphere(0.2, 0xffffff, { p: [0, 0, 0], ao: 0 }).build();

// Far scenery: three parallax rings of green dome hills with palm clusters, a great double rainbow, and puffy cloud islands floating on the horizon (built once).
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#bfe8ff');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false }), layers = [];
  const make = (n, dist, hMin, hMax, base, haze, follow, extra) => {
    const geo = new Builder({ boxSeg: 1 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.08, 0.08), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), w = h * rng.range(1.6, 2.6);
      geo.add(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), base, { p: [cx, 0, cz], s: [w, h, w * 0.8], jitter: h * 0.03, ao: 0 });
      for (let k = 0; k < 3; k++) { const ox = rng.range(-w * 0.5, w * 0.5), oz = rng.range(-w * 0.3, w * 0.3); geo.cyl(0.8, 1.1, 9, 0xb8864a, { p: [cx + ox, h * 0.85 + 4, cz + oz], seg: 5, ao: 0 }).sphere(5, 0x1f9a4a, { p: [cx + ox, h * 0.85 + 10, cz + oz], s: [1.6, 0.6, 1.6], jitter: 1, ao: 0 }); }   // palm tufts on the hilltops
    }
    extra?.(geo);
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) { if (Math.max(col.getX(i), col.getY(i), col.getZ(i)) > 1.01) continue; t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / hMax))) + haze * 0.18); col.setXYZ(i, t.r, t.g, t.b); }
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(16, 330, 40, 90, 0x3dbb6a, 0.5, 0.95, (geo) => {   // the double rainbow, standing on the horizon
    for (const [ang, R, sc] of [[0.2, 150, 1], [0.2, 215, 0.8]]) for (let i = 0; i < 7; i++) geo.add(new THREE.TorusGeometry(R - i * 6, 3.2, 4, 40, Math.PI), BAND[sc < 1 ? 6 - i : i], { p: [Math.sin(ang) * 310, 0, Math.cos(ang) * 310 - 4], r: [0, ang + Math.PI / 2 + Math.PI, 0], s: [1, 1, 0.3], ao: 0 });
    for (let i = 0; i < 10; i++) { const a = rng.range(0, 6.283); geo.sphere(rng.range(12, 22), 0xffffff, { p: [Math.sin(a) * 300, rng.range(60, 140), Math.cos(a) * 300], s: [1.8, 0.7, 1.1], jitter: 3, ao: 0 }); }   // cloud islands
  });
  make(14, 260, 28, 60, 0x2fae5a, 0.34, 0.9);
  make(12, 205, 16, 36, 0x28a050, 0.2, 0.85);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 4, cam.z * m.userData.follow); } };
}
