import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for Volcano Peak: black basalt column clusters, jagged lava rock, charred dead trees, glowing fumaroles, obsidian shards, brazier lamps, the far volcanoes
// (a crater glowing orange, an ash plume, lava streaks), the collapsing-bridge plank and the lava wave that chases the player. Glow uses vertex colours above 1.0 (bloom).
export const LAVA = new THREE.Color(3.2, 1.2, 0.2), HOT = new THREE.Color(3.4, 2.2, 0.6), RED = new THREE.Color(2.8, 0.35, 0.1);
const B = () => new Builder({ boxSeg: 1, ico: true });
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

// a hexagonal basalt column cluster: columns of different heights, a glowing crack down one
export const basalt = (C) => {
  const b = B(); let k = 0;
  for (const [x, z, h, r] of [[0, 0, 5.5, 0.9], [1.5, 0.3, 3.6, 0.8], [-1.4, 0.4, 4.4, 0.85], [0.5, -1.4, 3.0, 0.8], [-0.6, 1.5, 2.2, 0.75], [1.8, -1.2, 1.8, 0.7]]) {
    b.cyl(r, r * 1.1, h, k++ % 2 ? C.rock : C.rockDark, { p: [x, h / 2, z], seg: 6, jitter: 0.04, ao: 0.3 }).cyl(r * 0.96, r * 0.96, 0.14, tone(C.rock, 1.5), { p: [x, h + 0.02, z], seg: 6, ao: 0 });
    b.box(0.07, h * 0.55, 0.05, LAVA, { p: [x + r * 0.84, h * 0.4, z + r * 0.45], r: [0, 0.5, 0.05], radius: 0.01, ao: 0 });
  }
  return b.build();
};
export const lavaRock = (C) => {   // a lumpy black boulder with a molten seam
  const b = B();
  b.add(new THREE.IcosahedronGeometry(1, 1), C.rock, { p: [0, 0.7, 0], s: [1.5, 1.0, 1.2], jitter: 0.35, ao: 0.25 }).add(new THREE.IcosahedronGeometry(0.7, 1), C.rockDark, { p: [0.9, 0.5, 0.5], s: [1, 0.8, 1], jitter: 0.25 });
  b.box(1.4, 0.07, 0.06, LAVA, { p: [-0.1, 1.0, 1.1], r: [0.1, 0.2, 0.15], radius: 0.01, ao: 0 }).box(0.8, 0.06, 0.05, HOT, { p: [0.3, 0.6, 1.2], r: [0, -0.3, -0.2], radius: 0.01, ao: 0 });
  return b.build();
};
export const deadTree = (C) => {
  const b = B(); b.cyl(0.14, 0.3, 4.2, 0x1c1414, { p: [0, 2.1, 0], seg: 5, jitter: 0.05 });
  for (const [y, a, l] of [[2.6, 0.8, 1.6], [3.2, -0.9, 1.4], [3.8, 2.2, 1.1], [2.0, -2.4, 1.2]]) b.cyl(0.04, 0.1, l, 0x1c1414, { p: [Math.cos(a) * l * 0.35, y + 0.4, Math.sin(a) * l * 0.35], r: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], seg: 4, ao: 0.1 });
  b.sphere(0.07, RED, { p: [0.1, 1.4, 0.28], ao: 0 });    // an ember still glowing in the char
  return b.build();
};
export const fumarole = (C) => {   // a cracked mound with a molten throat and a column of smoke puffs
  const b = B(); b.add(new THREE.CylinderGeometry(0.9, 1.7, 0.9, 9), C.rockDark, { p: [0, 0.45, 0], jitter: 0.12, ao: 0.3 }).cyl(0.65, 0.65, 0.1, LAVA, { p: [0, 0.92, 0], seg: 9, ao: 0 });
  for (let i = 0; i < 4; i++) b.sphere(0.42 + i * 0.12, 0x3a3030, { p: [Math.sin(i * 1.9) * 0.2, 1.8 + i * 0.95, Math.cos(i * 1.9) * 0.2], jitter: 0.1, ao: 0 });
  for (const a of [0.4, 2.1, 3.9, 5.3]) b.box(0.9, 0.05, 0.07, HOT, { p: [Math.cos(a) * 1.15, 0.2, Math.sin(a) * 1.15], r: [0, -a, 0], radius: 0.01, ao: 0 });
  return b.build();
};
export const shards = (C) => {   // obsidian shards leaning out of the ground
  const b = B(); for (const [x, z, h, t] of [[0, 0, 2.6, 0.2], [0.5, 0.3, 1.6, -0.35], [-0.5, 0.2, 1.9, 0.4], [0.1, -0.5, 1.2, -0.1]]) b.cone(0.28, h, 0x14121c, { p: [x, h / 2, z], r: [t, 0, -t], seg: 4, ao: 0.2 });
  return b.build();
};
// Track edge: an iron brazier bowl on a post (the flame is a separate emissive mesh)
export const brazier = (C) => B().cyl(0.07, 0.1, 1.5, 0x1c1a20, { p: [0, 0.75, 0], seg: 5 }).cyl(0.34, 0.2, 0.28, 0x2a2630, { p: [0, 1.58, 0], seg: 7 }).cyl(0.36, 0.36, 0.05, 0x3a3640, { p: [0, 1.74, 0], seg: 7, ao: 0 }).build();
export const flame = () => B().cone(0.28, 0.75, 0xffffff, { p: [0, 0, 0], seg: 5, ao: 0 }).sphere(0.18, 0xffffff, { p: [0.05, -0.2, 0], ao: 0 }).build();

// One bridge plank: 4.0 m wide, 2.4 m long (z), charred timber with iron bands and ember-red cracks; the top is at y = 0
export const plank = (C) => {
  const b = new Builder({ boxSeg: 1, ico: true });
  b.box(4.0, 0.3, 2.32, 0x2a1c16, { p: [0, -0.15, 0], radius: 0.04, jitter: 0.015, ao: 0.1 }).box(4.4, 0.18, 0.26, 0x3a3640, { p: [0, -0.12, 0.9], radius: 0.02, ao: 0 }).box(4.4, 0.18, 0.26, 0x3a3640, { p: [0, -0.12, -0.9], radius: 0.02, ao: 0 });
  for (let i = 0; i < 6; i++) b.box(0.55, 0.02, 2.3, i % 2 ? 0x201510 : 0x34241a, { p: [-1.7 + i * 0.68, 0.001, 0], radius: 0.002, ao: 0 });
  for (const x of [-1.2, 0.5, 1.5]) b.box(0.05, 0.02, 1.4, RED, { p: [x, 0.012, 0.2], radius: 0.005, ao: 0 });
  return b.build();
};

// The chaser: a wall of lava as wide as the road. A churning bank of molten blobs with a bright crest, a black crust floating on top, and a curling front. place() has the
// same signature as the dust ball (world/level.js).
export function lavaWave() {
  const group = new THREE.Group(); group.visible = false; group.matrixAutoUpdate = false;
  const mat = createToon({ vertexColors: true, grime: false, rim: false, tint: false, emissive: 0xff4a10, emissiveIntensity: 0.5 });
  const b = new Builder({ ico: true });
  for (let i = 0; i < 16; i++) { const x = -8 + i, h = 3.4 + 1.4 * Math.sin(i * 1.7) + (i % 3) * 0.5; b.sphere(1.5 + (i % 4) * 0.2, i % 2 ? LAVA : new THREE.Color(2.6, 0.7, 0.12), { p: [x * 0.95, h * 0.5, 0.3 * Math.sin(i * 2.3)], s: [1, h / 1.7, 1.6], jitter: 0.25, ao: 0 }); }
  for (let i = 0; i < 12; i++) b.sphere(0.8 + (i % 3) * 0.3, HOT, { p: [-7 + i * 1.3, 4.0 + 1.1 * Math.sin(i * 2.1), 1.6 + (i % 2) * 0.5], jitter: 0.3, ao: 0 });   // the white-hot crest
  for (let i = 0; i < 9; i++) b.box(2.2 + (i % 3), 0.5, 1.6, 0x1c1414, { p: [-7 + i * 1.8, 5.6 + (i % 3) * 0.35, 0.4], r: [0.3 * Math.sin(i), i, 0.2 * Math.cos(i)], radius: 0.1, jitter: 0.1 });   // floating black crust slabs
  for (let i = 0; i < 7; i++) b.sphere(0.45, LAVA, { p: [-6 + i * 2, 2.4, 2.8 + (i % 2) * 0.6], s: [1, 0.7, 1.4], jitter: 0.15, ao: 0 });
  const body = new THREE.Mesh(b.build(), mat); body.castShadow = false; group.add(body);
  const _p = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4(), f = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() };
  return {
    group,
    place(track, s, t, particles) {
      track.frameAt(s, f); _p.copy(f.p).addScaledVector(f.u, -0.2 + Math.sin(t * 3) * 0.12); _z.copy(f.t).negate(); _m.makeBasis(f.r, f.u, _z).setPosition(_p);
      group.matrix.copy(_m); group.matrixWorldNeedsUpdate = true; group.visible = true; body.scale.set(1, 1 + Math.sin(t * 5) * 0.04, 1); mat.emissiveIntensity = 0.45 + 0.15 * Math.sin(t * 7);
      if (Math.random() < 0.8) particles.emit('ember', _p.x + (Math.random() - 0.5) * 14, _p.y + 3 + Math.random() * 3, _p.z + (Math.random() - 0.5) * 3, { count: 1.5, scale: 1.4 });
    },
  };
}

// Far volcanoes: three parallax rings of black cones with a glowing crater, lava streaks down the flanks and a leaning plume of ash (built once).
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#4a1410');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false }), layers = [];
  const make = (n, dist, hMin, hMax, base, haze, follow) => {
    const geo = new Builder({ boxSeg: 1 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.08, 0.08), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), r = h * rng.range(0.55, 0.8);
      geo.add(new THREE.ConeGeometry(r, h, 9, 1), base, { p: [cx, h / 2, cz], jitter: h * 0.02, ao: 0 }).cyl(r * 0.2, r * 0.26, h * 0.06, tone(base, 0.6), { p: [cx, h * 0.97, cz], seg: 9 });
      geo.cyl(r * 0.17, r * 0.17, h * 0.03, LAVA, { p: [cx, h * 0.99, cz], seg: 9, ao: 0 });                         // the crater
      for (let k = 0; k < 4; k++) { const ak = rng.range(0, 6.283); geo.box(r * 0.03, h * 0.5, r * 0.04, k % 2 ? LAVA : RED, { p: [cx + Math.cos(ak) * r * 0.32, h * 0.62, cz + Math.sin(ak) * r * 0.32], r: [Math.sin(ak) * 0.7, 0, -Math.cos(ak) * 0.7], ao: 0 }); }   // lava streaks
      for (let k = 0; k < 5; k++) geo.sphere(r * (0.1 + k * 0.045), 0x2a1c1c, { p: [cx + k * r * 0.12, h * 1.05 + k * h * 0.12, cz], jitter: r * 0.03, ao: 0 });   // ash plume
    }
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) { if (Math.max(col.getX(i), col.getY(i), col.getZ(i)) > 1) continue; t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / hMax))) + haze * 0.2); col.setXYZ(i, t.r, t.g, t.b); }
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(14, 340, 50, 110, 0x1c1010, 0.5, 0.95);
  make(14, 270, 36, 80, 0x241414, 0.34, 0.9);
  make(12, 210, 22, 50, 0x2e1a18, 0.2, 0.85);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 6, cam.z * m.userData.follow); } };
}
