import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for Toxic Jungle scenery: one merged, vertex-coloured geometry per recipe, instanced by world/scenery.js.
// Glowing parts use vertex colours above 1.0 so the bloom pass picks them up (no extra material or draw call).
const ICO = (r = 1, d = 1) => new THREE.IcosahedronGeometry(r, d);
const GLOW = (r, g, b) => new THREE.Color(r, g, b);

// A fat jungle tree: flared buttress roots, a mossy trunk, a layered canopy and a few hanging vines.
export const jungleTree = (C) => {
  const b = new Builder({ boxSeg: 1, ico: true });
  b.cyl(0.55, 0.95, 2.4, C.bark, { p: [0, 1.2, 0], seg: 8, jitter: 0.06 }).cyl(0.42, 0.55, 3.6, C.barkLight, { p: [0, 4.1, 0.05], seg: 8, jitter: 0.06 });
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; b.cone(0.34, 1.6, C.bark, { p: [Math.cos(a) * 0.8, 0.7, Math.sin(a) * 0.8], r: [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], seg: 4 }); }
  b.sphere(0.5, C.moss, { p: [0.4, 1.5, 0.5], s: [1, 0.55, 1], jitter: 0.05, ao: 0 });
  [[0, 7.4, 0, 2.8, C.leaf], [-1.9, 6.7, 0.6, 2.0, C.leafDark], [1.9, 6.9, -0.4, 2.2, C.leafLight], [0.3, 8.6, 0.2, 1.9, C.leaf], [0.2, 6.2, 1.8, 1.7, C.leafDark]]
    .forEach(([x, y, z, r, c]) => b.add(ICO(r, 1), c, { p: [x, y, z], s: [1, 0.72, 1], jitter: 0.35, ao: 0.25 }));
  for (const [x, z, l] of [[-1.5, 1.5, 3.2], [1.2, 1.9, 2.5], [-0.3, -2.0, 3.4], [2.2, 0.2, 2.1]]) {
    b.cyl(0.04, 0.05, l, C.vine, { p: [x, 6.2 - l / 2, z], seg: 4, ao: 0 }).sphere(0.12, C.leafLight, { p: [x, 6.2 - l, z], ao: 0 });
  }
  return b.build();
};

// Giant broad leaf on a stem (a banana-style fan): three big leaf blades with a pale midrib.
export const giantLeaf = (C) => {
  const b = new Builder({ boxSeg: 1, ico: true });
  b.cyl(0.07, 0.1, 2.4, C.leafDark, { p: [0, 1.2, 0], seg: 5, ao: 0.2 });
  [[-0.5, 2.6, 0.25, 0.45, 1.3], [0.55, 2.8, -0.2, -0.5, 1.4], [0, 3.2, 0.5, 0.05, 1.1]].forEach(([x, y, z, tilt, len], i) => {
    b.box(1.1, 0.05, len * 2, i % 2 ? C.leaf : C.leafLight, { p: [x, y, z], r: [0.5, tilt, tilt * 0.6], radius: 0.02, ao: 0 });
    b.box(0.06, 0.07, len * 2, C.leafPale, { p: [x, y + 0.04, z], r: [0.5, tilt, tilt * 0.6], radius: 0.01, ao: 0 });
  });
  return b.build();
};

export const fern = (C) => {
  const b = new Builder({ boxSeg: 1, ico: true });
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283; b.cone(0.1, 1.5, i % 2 ? C.leaf : C.leafLight, { p: [Math.cos(a) * 0.36, 0.55, Math.sin(a) * 0.36], r: [Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0], seg: 4, ao: 0.2 }); }
  return b.build();
};

// Toxic mushroom: pale stalk, a spotted glowing cap.
export const mushroom = (C) => {
  const b = new Builder({ boxSeg: 1, ico: true });
  b.cyl(0.1, 0.16, 0.75, C.leafPale, { p: [0, 0.37, 0], seg: 6, jitter: 0.02 });
  b.add(new THREE.SphereGeometry(0.62, 9, 5, 0, 6.283, 0, 1.45), GLOW(0.35, 1.7, 0.8), { p: [0, 0.7, 0], s: [1, 0.8, 1], jitter: 0.03, ao: 0 });
  for (const [x, z, r] of [[0.2, 0.2, 0.1], [-0.25, 0.1, 0.08], [0.05, -0.3, 0.09], [-0.1, 0.35, 0.07]]) b.sphere(r, 0xe9ffd0, { p: [x, 1.06 - (x * x + z * z) * 0.6, z], s: [1, 0.5, 1], ao: 0 });
  return b.build();
};

// Glowing bulb flower on a curling stem.
export const bulb = (C) => {
  const b = new Builder({ boxSeg: 1, ico: true });
  b.cyl(0.04, 0.06, 1.3, C.leafDark, { p: [0, 0.65, 0], seg: 4, ao: 0.1 }).sphere(0.26, GLOW(1.9, 0.45, 1.6), { p: [0, 1.45, 0], s: [1, 1.2, 1], ao: 0 }).sphere(0.14, GLOW(2.2, 1.9, 0.5), { p: [0, 1.62, 0], ao: 0 });
  for (let i = 0; i < 3; i++) b.cone(0.1, 0.5, C.leaf, { p: [Math.cos(i * 2.1) * 0.2, 0.28, Math.sin(i * 2.1) * 0.2], r: [Math.sin(i * 2.1) * 0.8, 0, -Math.cos(i * 2.1) * 0.8], seg: 4, ao: 0 });
  return b.build();
};

export const bush = (C) => {
  const b = new Builder({ boxSeg: 1, ico: true });
  for (let i = 0; i < 5; i++) b.add(ICO(0.42, 1), i % 2 ? C.leaf : C.leafDark, { p: [Math.cos(i * 1.3) * 0.35, 0.3, Math.sin(i * 1.3) * 0.35], s: [1, 0.8, 1], jitter: 0.12, ao: 0.2 });
  return b.build();
};
export const rock = (C) => new Builder({ boxSeg: 1, ico: true }).add(ICO(0.8, 1), C.stone, { p: [0, 0.3, 0], s: [1.3, 0.8, 1], jitter: 0.22 }).sphere(0.5, C.moss, { p: [0, 0.62, 0], s: [1.2, 0.35, 1], jitter: 0.08, ao: 0 }).build();
export const rootArch = (C) => { // a big arching root wall for the valley sides
  const b = new Builder({ boxSeg: 1, ico: true });
  for (let i = 0; i < 4; i++) b.add(new THREE.TorusGeometry(2.2 + i * 0.4, 0.38, 5, 9, 3.1), i % 2 ? C.bark : C.barkLight, { p: [i * 0.3 - 0.5, 0, i * 0.5 - 0.7], jitter: 0.12, ao: 0.1 });
  return b.build();
};

// Edge lamps: a bamboo stake with a spore lantern, so the track edge glows green (post + a separate emissive lamp).
export const bambooPost = (C) => new Builder({ boxSeg: 1, ico: true })
  .cyl(0.07, 0.09, 1.7, C.bamboo, { p: [0, 0.85, 0], seg: 6 }).cyl(0.11, 0.11, 0.07, C.bambooDark, { p: [0, 0.55, 0], seg: 6 }).cyl(0.11, 0.11, 0.07, C.bambooDark, { p: [0, 1.2, 0], seg: 6 })
  .cone(0.12, 0.3, C.leafDark, { p: [0.12, 1.75, 0], r: [0, 0, -0.8], seg: 4, ao: 0 }).build();
export const sporeLamp = () => new Builder({ boxSeg: 1, ico: true }).sphere(0.17, GLOW(1.2, 3.4, 1.6), { p: [0, 0, 0], s: [1, 1.25, 1], ao: 0 }).build();

// The vine the player swings on (world/hazVine.js): hangs down from its pivot at the origin, length ~5.2 m, ends in a gripping loop.
export const vineGeo = (C) => {
  const b = new Builder({ boxSeg: 1, ico: true }), L = 5.2, n = 9, dy = L / n;
  b.sphere(0.34, C.bark, { p: [0, 0.05, 0], s: [1.3, 0.8, 1], jitter: 0.06 }).cone(0.3, 0.8, C.bark, { p: [0.35, 0.4, 0], r: [0, 0, -0.9], seg: 5 }).cone(0.26, 0.7, C.bark, { p: [-0.3, 0.35, 0], r: [0, 0, 0.8], seg: 5 });
  for (let i = 0; i < n; i++) {
    const x = Math.sin(i * 0.9) * 0.1, k = 1 - i * 0.04;
    b.cyl(0.12 * k, 0.135 * k, dy + 0.05, i % 2 ? C.vine : C.vineLight, { p: [x, -dy * (i + 0.5), 0], seg: 6, ao: 0 });
    if (i % 2 === 1) b.add(ICO(0.2, 0), C.leaf, { p: [x + 0.2, -dy * (i + 0.5), 0.05], s: [1.5, 0.5, 0.9], r: [0, 0, 0.5], ao: 0 }).add(ICO(0.2, 0), C.leafLight, { p: [x - 0.2, -dy * (i + 0.9), -0.05], s: [1.5, 0.5, 0.9], r: [0, 0, -0.5], ao: 0 });
  }
  b.add(new THREE.TorusGeometry(0.34, 0.12, 5, 10), C.vineLight, { p: [0, -L - 0.12, 0], r: [0, Math.PI / 2, 0], ao: 0 }).sphere(0.16, GLOW(2.4, 0.8, 2.0), { p: [0, -L - 0.55, 0], ao: 0 });   // loop + a glowing bulb to grab
  return b.build();
};

// ---- far parallax: layered canopy silhouettes (domes of foliage on trunks), haze-baked (built once). Same contract as stage01's farRing.
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#58c9a0');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false });
  const layers = [];
  const make = (n, dist, hMin, hMax, base, top, haze, follow) => {
    const geo = new Builder({ boxSeg: 1, ico: true });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.1, 0.1), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), w = rng.range(12, 30);
      geo.cyl(w * 0.1, w * 0.14, h, base, { p: [cx, h / 2, cz], seg: 5, jitter: 0.4 });
      geo.add(new THREE.IcosahedronGeometry(w * 0.9, 1), top, { p: [cx, h + w * 0.1, cz], s: [1.25, 0.7, 1.1], jitter: w * 0.12, ao: 0.4 });
      geo.add(new THREE.IcosahedronGeometry(w * 0.6, 1), base, { p: [cx + w * 0.6, h * 0.8, cz + rng.range(-3, 3)], s: [1.2, 0.7, 1], jitter: w * 0.1, ao: 0.3 });
    }
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / (hMax * 1.3)))) + haze * 0.3), col.setXYZ(i, t.r, t.g, t.b);
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(16, 330, 40, 80, 0x0b4a3a, 0x137a55, 0.55, 0.94);
  make(15, 262, 28, 56, 0x0f6a48, 0x1c9a64, 0.4, 0.9);
  make(14, 205, 20, 40, 0x137a4c, 0x29b774, 0.26, 0.85);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 6, cam.z * m.userData.follow); } };
}
