import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for Neo-Scrap City scenery: scrap towers, shipping containers, junk piles, neon pylons, cogs, the track-edge bollards,
// the far skyline and the crusher piston. One merged vertex-coloured geometry each. Neon uses vertex colours above 1.0 (bloom picks them up).
export const CYAN = new THREE.Color(0.25, 2.6, 2.4), MAG = new THREE.Color(2.8, 0.3, 2.0), AMBER = new THREE.Color(3.0, 1.7, 0.4), LIME = new THREE.Color(0.8, 3, 0.5);
const B = () => new Builder({ boxSeg: 1, ico: true });
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const NEON = [CYAN, MAG, AMBER, CYAN];

// A scrap tower: three stacked, tapering slabs of dark plate with rows of lit windows, neon bands, a roof antenna and a rust-streaked base.
export const scrapTower = (C) => {
  const b = B(); let y = 0, w = 3.4;
  [[4.6, C.metal], [3.8, C.metalLight], [2.8, C.metal]].forEach(([h, c], k) => {
    b.box(w, h, w, c, { p: [0, y + h / 2, 0], radius: 0.05, jitter: 0.02, ao: 0.3 });
    b.box(w + 0.18, 0.18, w + 0.18, NEON[k], { p: [0, y + h, 0], radius: 0.03, ao: 0 });                                                      // neon band between slabs
    for (let i = 0; i < 9; i++) { const f = i % 4, col = (i * 7 + k * 3) % 5 < 2 ? NEON[(i + k) % 4] : tone(0x1a1530, 1), ox = ((i % 3) - 1) * (w * 0.28), oy = y + 0.8 + Math.floor(i / 3) * (h / 3.4);
      const face = [[ox, oy, w / 2 + 0.02, 0.5, 0.36], [ox, oy, -w / 2 - 0.02, 0.5, 0.36], [w / 2 + 0.02, oy, ox, 0.36, 0.5], [-w / 2 - 0.02, oy, ox, 0.36, 0.5]][f];
      b.box(face[3], 0.34, face[4], col, { p: [face[0], face[1], face[2]], radius: 0.02, ao: 0 }); }
    y += h; w *= 0.78;
  });
  b.cyl(0.05, 0.07, 3.2, C.metalLight, { p: [0, y + 1.6, 0], seg: 4 }).sphere(0.14, new THREE.Color(3, 0.2, 0.2), { p: [0, y + 3.25, 0], ao: 0 });   // antenna with a red beacon
  b.box(1.0, 0.12, 0.12, C.rust, { p: [-1.6, 3.2, 1.55], r: [0, 0, 0.1], radius: 0.02, ao: 0 });
  return b.build();
};

// Two stacked shipping containers: corrugated sides (ridges), door bars, a neon edge strip.
export const container = (C) => {
  const b = B(), cols = [0xb5412a, 0x2a7a8a, 0x8a6a2a, 0x6a2a7a];
  [[0, cols[0], 0.0], [1, cols[1], 0.3]].forEach(([k, col, off]) => {
    const y = k * 1.3, w = 2.6, L = 5.2;
    b.box(w, 1.25, L, col, { p: [off, y + 0.65, 0], radius: 0.03, ao: 0.2 });
    for (let i = 0; i < 9; i++) for (const sd of [-1, 1]) b.box(0.05, 1.05, 0.12, tone(col, 0.7), { p: [off + sd * (w / 2 + 0.02), y + 0.65, -L / 2 + 0.35 + i * 0.55], radius: 0.01, ao: 0 });
    b.box(w, 0.1, 0.12, tone(col, 1.3), { p: [off, y + 1.27, L / 2 - 0.1], radius: 0.01, ao: 0 });
    b.box(0.1, 1.1, 0.06, tone(col, 0.5), { p: [off - 0.5, y + 0.65, L / 2 + 0.02], radius: 0.01, ao: 0 }).box(0.1, 1.1, 0.06, tone(col, 0.5), { p: [off + 0.5, y + 0.65, L / 2 + 0.02], radius: 0.01, ao: 0 });
  });
  b.box(0.06, 0.1, 5.2, NEON[0], { p: [1.3, 2.62, 0], radius: 0.01, ao: 0 }).box(0.06, 0.1, 5.2, MAG, { p: [-1.0, 1.35, 0], radius: 0.01, ao: 0 });
  return b.build();
};

// Junk pile: a crushed car shell, a stack of tyres, a couple of drums and bent pipe.
export const junkPile = (C) => {
  const b = B();
  b.box(2.4, 0.55, 1.1, C.rust, { p: [0, 0.4, 0], r: [0, 0.3, 0.06], radius: 0.06, jitter: 0.06, ao: 0.2 }).box(1.2, 0.4, 1.0, tone(C.rust, 0.7), { p: [-0.1, 0.8, 0], r: [0, 0.3, 0.1], radius: 0.05, jitter: 0.05 })
    .box(0.9, 0.22, 0.04, CYAN, { p: [-0.1, 0.84, 0.52], r: [0, 0.3, 0.1], ao: 0 });
  for (let i = 0; i < 4; i++) b.add(new THREE.TorusGeometry(0.34, 0.13, 5, 9).rotateX(Math.PI / 2), 0x1c1c22, { p: [1.6 + (i % 2) * 0.1, 0.15 + Math.floor(i / 1) * 0.24, 0.9], ao: 0.1 });
  for (const [x, z, c] of [[-1.5, 0.9, 0x7a2e8a], [-1.2, -0.6, 0x2a5a8a]]) b.cyl(0.3, 0.3, 0.8, c, { p: [x, 0.4, z], seg: 8 }).cyl(0.31, 0.31, 0.06, 0x222222, { p: [x, 0.7, z], seg: 8, ao: 0 });
  b.add(new THREE.TorusGeometry(0.6, 0.07, 4, 8, 3.8), C.metalLight, { p: [0.3, 0.6, -0.9], r: [0.3, 0.4, 0], ao: 0 });
  return b.build();
};

// Neon pylon: a steel pole carrying a big two-colour sign panel and a lamp.
export const neonPylon = (C) => {
  const b = B();
  b.cyl(0.12, 0.18, 6.4, C.metalLight, { p: [0, 3.2, 0], seg: 6 }).box(2.6, 1.5, 0.14, 0x15112a, { p: [0, 5.6, 0], radius: 0.04 });
  b.box(2.3, 0.18, 0.18, MAG, { p: [0, 6.2, 0.06], radius: 0.02, ao: 0 }).box(2.3, 0.18, 0.18, CYAN, { p: [0, 5.0, 0.06], radius: 0.02, ao: 0 });
  for (let i = 0; i < 4; i++) b.box(0.38, 0.6, 0.1, i % 2 ? AMBER : MAG, { p: [-0.95 + i * 0.63, 5.6, 0.08], radius: 0.02, ao: 0 });
  b.box(0.1, 0.1, 1.2, C.metalLight, { p: [0, 6.45, 0.55], radius: 0.01 }).sphere(0.16, LIME, { p: [0, 6.45, 1.15], ao: 0 });
  return b.build();
};

// Half-buried cog: a big toothed wheel standing in the scrap.
export const cog = (C) => {
  const b = B(), R = 2.0;
  b.cyl(R, R, 0.5, C.metalLight, { p: [0, R * 0.5, 0], r: [Math.PI / 2, 0, 0], seg: 14, ao: 0.1 }).cyl(0.55, 0.55, 0.7, C.rust, { p: [0, R * 0.5, 0], r: [Math.PI / 2, 0, 0], seg: 8, ao: 0 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.box(0.5, 0.5, 0.5, C.metalLight, { p: [Math.cos(a) * (R + 0.15), R * 0.5 + Math.sin(a) * (R + 0.15), 0], r: [0, 0, a], radius: 0.03 }); }
  b.add(new THREE.TorusGeometry(R * 0.7, 0.07, 4, 14), NEON[1], { p: [0, R * 0.5, 0.27], ao: 0 });
  return b.build();
};

// Track edge: a short steel bollard with a neon cap (the cap is a separate emissive mesh).
export const bollard = (C) => new Builder({ boxSeg: 1, ico: true }).cyl(0.12, 0.15, 1.2, C.metalLight, { p: [0, 0.6, 0], seg: 6 }).box(0.36, 0.1, 0.36, C.rust, { p: [0, 0.05, 0], radius: 0.02 }).box(0.28, 0.1, 0.28, 0x222233, { p: [0, 1.22, 0], radius: 0.02 }).build();
export const bollardLamp = () => new Builder({ boxSeg: 1, ico: true }).box(0.2, 0.34, 0.2, 0xffffff, { p: [0, 0, 0], radius: 0.05, ao: 0 }).build();

// The crusher piston: head hanging from the origin (bottom at y = 0, 3.6 x 1.2 x 2.4 m), hazard-striped, with a hydraulic arm rising 6 m.
export const pistonGeo = (C) => {
  const b = B();
  b.box(3.6, 1.2, 2.4, 0x4a4a5a, { p: [0, 0.6, 0], radius: 0.06, ao: 0.1 });
  for (let i = 0; i < 9; i++) b.box(0.3, 0.26, 2.46, i % 2 ? 0x1a1a1a : 0xf2c200, { p: [-1.6 + i * 0.4, 0.2, 0], radius: 0.01, ao: 0 });
  b.box(3.7, 0.12, 2.5, 0x2a2a34, { p: [0, 0.03, 0], radius: 0.02, ao: 0 }).box(3.2, 0.1, 0.1, AMBER, { p: [0, 1.0, 1.22], radius: 0.01, ao: 0 });
  for (const sx of [-1, 1]) b.cyl(0.22, 0.22, 6.4, 0x9aa0b0, { p: [sx * 1.0, 4.4, 0], seg: 8 }).cyl(0.34, 0.34, 1.6, 0x5a5a6a, { p: [sx * 1.0, 6.4, 0], seg: 8 }).box(0.1, 6.2, 0.1, CYAN, { p: [sx * 1.0, 4.3, 0.28], radius: 0.01, ao: 0 });
  b.box(3.0, 0.4, 1.6, 0x3a3a4a, { p: [0, 7.2, 0], radius: 0.04 });
  return b.build();
};

// ---- far skyline: rings of dark towers with lit windows and neon outlines, haze-baked toward the magenta horizon (built once)
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#8a2a8a');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false });
  const layers = [];
  const make = (n, dist, hMin, hMax, base, haze, follow, lit) => {
    const geo = new Builder({ boxSeg: 1 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.08, 0.08), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), w = rng.range(9, 20), d = rng.range(9, 16);
      geo.box(w, h, d, base, { p: [cx, h / 2, cz], r: [0, a, 0], radius: 0.1 });
      if (rng.chance(0.5)) geo.box(w * 0.6, h * 0.35, d * 0.6, base, { p: [cx, h + h * 0.17, cz], r: [0, a, 0], radius: 0.1 });
      geo.box(w + 0.6, 0.5, d + 0.6, i % 2 ? CYAN : MAG, { p: [cx, h * rng.range(0.5, 0.9), cz], r: [0, a, 0], radius: 0.05, ao: 0 });
      for (let k = 0; k < lit; k++) { const ox = rng.range(-w * 0.4, w * 0.4), oy = rng.range(h * 0.1, h * 0.95), fz = Math.cos(a) * -1, fx = Math.sin(a); geo.box(1.4, 1.0, 0.5, rng.chance(0.5) ? AMBER : rng.chance(0.5) ? CYAN : MAG, { p: [cx + fx * (d / 2 + 0.05) + Math.cos(a) * ox, oy, cz + fz * 0 + (d / 2 + 0.05) * Math.cos(a) - Math.sin(a) * ox], r: [0, a, 0], radius: 0.01, ao: 0 }); }
    }
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) { if (Math.max(col.getX(i), col.getY(i), col.getZ(i)) > 1) continue; t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / hMax))) + haze * 0.2); col.setXYZ(i, t.r, t.g, t.b); }
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(18, 330, 60, 150, 0x1a0a30, 0.5, 0.94, 5);
  make(16, 262, 40, 100, 0x24103e, 0.36, 0.9, 5);
  make(14, 205, 26, 62, 0x2d1650, 0.22, 0.85, 4);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 6, cam.z * m.userData.follow); } };
}
