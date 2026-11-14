import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for Desert Scrub scenery. Each recipe builds ONE merged, vertex-coloured geometry that the
// scenery engine instances. Recipes take the theme colour table so a re-skin is a data change.
const cap = (b, r, l, c, o) => b.add(new THREE.CapsuleGeometry(r, l, 2, 7), c, o);

export const saguaro = (C) => {
  const b = new Builder();
  cap(b, 0.32, 2.6, C.cactus, { p: [0, 1.6, 0], jitter: 0.04 }); cap(b, 0.26, 0.9, C.cactus, { p: [-0.78, 1.9, 0] });
  cap(b, 0.22, 0.5, C.cactus, { p: [-0.55, 1.45, 0], r: [0, 0, 1.57] }); cap(b, 0.24, 0.8, C.cactus, { p: [0.75, 2.5, 0] });
  cap(b, 0.2, 0.45, C.cactus, { p: [0.5, 2.0, 0], r: [0, 0, 1.57] });
  b.box(0.07, 3.4, 0.07, C.cactusLight, { p: [0, 1.7, -0.3], radius: 0.02, ao: 0 }).sphere(0.12, 0xff6fa5, { p: [0, 3.3, 0], ao: 0 });
  return b.build();
};
export const barrelCactus = (C) => {
  const b = new Builder().sphere(0.45, C.cactus, { p: [0, 0.38, 0], s: [1, 0.85, 1], jitter: 0.03 });
  for (let i = 0; i < 6; i++) b.box(0.05, 0.62, 0.05, C.cactusLight, { p: [Math.cos(i * 1.047) * 0.43, 0.38, Math.sin(i * 1.047) * 0.43], r: [0, -i * 1.047, 0], radius: 0.02, ao: 0 });
  return b.sphere(0.14, 0xffd23a, { p: [0, 0.82, 0], ao: 0 }).build();
};
export const rock = (C) => new Builder()
  .add(new THREE.IcosahedronGeometry(0.8, 1), C.redRock, { p: [0, 0.3, 0], s: [1.3, 0.8, 1], jitter: 0.25 })
  .add(new THREE.IcosahedronGeometry(0.45, 1), C.redRockLit, { p: [0.8, 0.15, 0.3], jitter: 0.2 }).build();
export const spire = (C) => { // tall banded rock tooth for the valley walls
  const b = new Builder();
  [[1.6, 1.3, 1.4, 0], [1.3, 1.1, 1.4, 1.4], [1.0, 0.8, 1.6, 2.8], [0.7, 0.4, 1.2, 4.2]].forEach(([rb, rt, h, y], i) =>
    b.cyl(rt, rb, h, C.strata[i % 4], { p: [0, y + h / 2, 0], seg: 7, jitter: 0.3 }));
  return b.build();
};
export const bush = (C) => {
  const b = new Builder();
  for (let i = 0; i < 6; i++) b.cone(0.12, 0.7, C.bush, { p: [Math.sin(i) * 0.18, 0.3, Math.cos(i) * 0.18], r: [Math.cos(i) * 0.5, 0, Math.sin(i) * 0.5], seg: 5 });
  return b.build();
};
export const tumbleweed = (C) => { // three crossed rings of dry twig
  const b = new Builder();
  for (let i = 0; i < 4; i++) b.add(new THREE.TorusGeometry(0.5, 0.05, 4, 10), C.bush, { r: [i * 0.8, i * 1.3, i * 0.4], ao: 0, jitter: 0.05 });
  return b.sphere(0.3, C.woodDark, { ao: 0, jitter: 0.1 }).build();
};
export const skull = (C) => new Builder() // a cow skull on a post: desert dressing near the quicksand
  .cyl(0.04, 0.05, 1.0, C.woodDark, { p: [0, 0.5, 0], seg: 5 })
  .box(0.4, 0.28, 0.3, 0xf3ead8, { p: [0, 1.05, 0], radius: 0.1 })
  .box(0.9, 0.06, 0.08, 0xf3ead8, { p: [0, 1.15, 0], r: [0, 0, 0.12], radius: 0.02 })
  .sphere(0.06, 0x2a1a24, { p: [-0.1, 1.07, -0.14], ao: 0 }).sphere(0.06, 0x2a1a24, { p: [0.1, 1.07, -0.14], ao: 0 }).build();

// Fence post with cross-bars; the lantern is a separate emissive mesh so the bloom pass picks it up.
export const fencePost = (C) => new Builder()
  .box(0.2, 1.3, 0.2, C.wood, { p: [0, 0.65, 0], jitter: 0.03 }).box(0.7, 0.1, 0.1, C.woodDark, { p: [0, 1.0, 0] }).box(0.6, 0.08, 0.08, C.wood, { p: [0, 0.6, 0] }).build();
export const lantern = () => new Builder().box(0.2, 0.26, 0.2, 0xffffff, { p: [0, 0, 0], radius: 0.05, ao: 0 }).build();

// ---- far parallax: a ring of jagged peaks and two rings of mesas around the camera (built once) ----
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#e9906e');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false });
  const layers = [];
  const make = (n, dist, hMin, hMax, base, strata, haze, peaks, follow) => {
    const geo = new Builder();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.1, 0.1), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), w = rng.range(14, 34), k = rng.range(0.55, 0.9);
      if (peaks) { // purple mountains: stacked cones
        geo.cone(w * 1.05, h, base, { p: [cx, h / 2, cz], seg: 6, jitter: 1.2, ao: 0.35 }).cone(w * 0.6, h * 0.8, strata, { p: [cx + w * 0.7, h * 0.4, cz], seg: 5, jitter: 1, ao: 0.3 });
        continue;
      }
      const bh = h / 4, rr = [1, 0.95, 0.88, 0.82, 0.7];
      for (let bnd = 0; bnd < 4; bnd++) geo.add(new THREE.CylinderGeometry(w * rr[bnd + 1], w * rr[bnd], bh + 0.2, 6, 1, bnd === 3), bnd % 2 ? strata : base, { p: [cx, bh * (bnd + 0.5), cz], s: [1, 1, k], r: [0, a, 0], jitter: 0.9, ao: 0.3 });
      geo.add(new THREE.CylinderGeometry(w * 0.66, w * 0.7, 0.6, 7), strata, { p: [cx, h + 0.2, cz], s: [1, 1, k], r: [0, a, 0], ao: 0 });
    }
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) { // bake the horizon haze: the lower and the farther, the more it melts into the sky colour
      t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / hMax))) + haze * 0.25); col.setXYZ(i, t.r, t.g, t.b);
    }
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(16, 340, 40, 85, 0x6b3f86, 0x8a5aa6, 0.5, true, 0.94);
  make(15, 270, 30, 60, 0xa04a74, 0xc2607e, 0.38, false, 0.9);
  make(14, 205, 22, 44, 0xbf4f30, 0xe27a3e, 0.24, false, 0.85);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 6, cam.z * m.userData.follow); } };
}
