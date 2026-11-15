import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for Paris Nights: cream Haussmann blocks with zinc mansard roofs and warm lit windows, café terraces (round tables, bistro chairs, striped
// parasols), plane trees, Morris columns, gas lamps, the far skyline with a lattice tower. Lit windows use vertex colours above 1.0 (bloom).
export const WARM = new THREE.Color(2.7, 1.9, 0.55), GAS = new THREE.Color(3, 2.1, 0.7), CORAL = new THREE.Color(2.8, 0.7, 0.5), TRI = new THREE.Color(0.4, 0.8, 3);
const B = () => new Builder({ boxSeg: 1, ico: true });
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

// tall shuttered windows with a share of them lit, on all four faces (instances are spun at random)
const windows = (b, w, d, y0, rows, cols, seed, dark = 0x141c2c) => {
  const pl = new THREE.PlaneGeometry(0.62, 1.1);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) for (let f = 0; f < 4; f++) {
    const lit = ((r * 5 + c * 3 + f * 7 + seed) % 5) < 3, u = (c + 0.5) / cols - 0.5, y = y0 + r * 2.1 + 1, span = f % 2 ? d : w, off = (f % 2 ? w : d) / 2 + 0.03;
    const x = f === 0 ? u * span : f === 1 ? off : f === 2 ? -u * span : -off, z = f === 0 ? off : f === 1 ? -u * span : f === 2 ? -off : u * span;
    b.add(pl, lit ? WARM : dark, { p: [x, y, z], r: [0, f * Math.PI / 2, 0], ao: 0 });
  }
};

export const haussmann = (C) => {
  const b = B(), w = 8, d = 6.4, h = 12;
  b.box(w, h, d, C.stone, { p: [0, h / 2, 0], radius: 0.05, jitter: 0.02, ao: 0.3 }).box(w + 0.4, 0.5, d + 0.4, C.stoneLight, { p: [0, h, 0], radius: 0.03 }).box(w + 0.3, 0.4, d + 0.3, C.stoneLight, { p: [0, 3.6, 0], radius: 0.03, ao: 0 });
  windows(b, w - 1.2, d - 1, 4.2, 4, 3, 1);
  b.box(w - 0.6, 3.2, d - 0.6, C.zinc, { p: [0, h + 1.9, 0], radius: 0.05 });                                                         // mansard: a steep zinc roof with dormers
  b.box(w - 1.2, 1.2, d - 1.2, C.zincLight, { p: [0, h + 3.9, 0], radius: 0.05 });
  for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) { b.box(0.9, 1.3, 0.7, C.stoneLight, { p: [-2.4 + i * 2.4, h + 1.7, sd * (d / 2 - 0.15)], radius: 0.04 }); b.box(0.5, 0.8, 0.06, WARM, { p: [-2.4 + i * 2.4, h + 1.72, sd * (d / 2 + 0.22)], radius: 0.01, ao: 0 }); }
  for (let i = 0; i < 4; i++) b.cyl(0.14, 0.16, 0.7, C.chimney, { p: [-3 + i * 2, h + 5.0, 0.4], seg: 6 });                          // chimney pots
  for (let i = 0; i < 3; i++) { b.box(2.4, 0.08, 0.7, 0x1c1e26, { p: [-2.4 + i * 2.4, 4.2, d / 2 + 0.36], radius: 0.01 }); b.box(2.4, 0.5, 0.05, 0x1c1e26, { p: [-2.4 + i * 2.4, 4.5, d / 2 + 0.7], radius: 0.01, ao: 0 }); }   // iron balcony
  b.box(2.4, 2.6, 0.12, 0x2a2018, { p: [0, 1.3, d / 2 + 0.03], radius: 0.03 }).box(2.8, 0.3, 0.4, C.stoneLight, { p: [0, 2.8, d / 2 + 0.15], radius: 0.04, ao: 0 });
  return b.build();
};

export const pavilion = (C) => {   // a lower corner building with a rounded turret
  const b = B(), w = 6.5, d = 6, h = 8;
  b.box(w, h, d, tone(C.stone, 0.92), { p: [0, h / 2, 0], radius: 0.05, jitter: 0.02, ao: 0.3 }).cyl(2.2, 2.4, h + 1.5, C.stone, { p: [-w / 2, (h + 1.5) / 2, d / 2], seg: 10 }).cone(2.6, 3.2, C.zinc, { p: [-w / 2, h + 3.1, d / 2], seg: 10 });
  windows(b, w - 1, d - 1, 1.6, 3, 3, 3); b.box(w + 0.3, 0.45, d + 0.3, C.stoneLight, { p: [0, h, 0], radius: 0.03 }).box(w - 0.4, 2.2, d - 0.4, C.zinc, { p: [0, h + 1.3, 0], radius: 0.05 });
  return b.build();
};

// A café terrace on the pavement: a striped canvas parasol over a round table with two bistro chairs and a small lamp.
export const terrace = (C) => {
  const b = B();
  for (const [x, z, a] of [[0, 0, 0], [1.8, 0.6, 0.8]]) {
    b.cyl(0.45, 0.45, 0.05, 0x2a2e38, { p: [x, 0.72, z], seg: 10 }).cyl(0.04, 0.06, 0.7, 0x1c1e26, { p: [x, 0.36, z], seg: 5 }).cyl(0.22, 0.22, 0.04, 0x1c1e26, { p: [x, 0.02, z], seg: 8 });
    for (const sd of [-1, 1]) { const cx = x + sd * 0.7, cz = z + 0.1; b.cyl(0.24, 0.24, 0.05, 0xd35400, { p: [cx, 0.46, cz], seg: 8 }).box(0.4, 0.36, 0.04, 0xd35400, { p: [cx + sd * 0.12, 0.7, cz], r: [0, 0, -sd * 0.2], radius: 0.01, ao: 0 }); for (const [lx, lz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) b.cyl(0.018, 0.018, 0.46, 0x1c1e26, { p: [cx + lx, 0.23, cz + lz], seg: 3, ao: 0 }); }
    b.cyl(0.03, 0.03, 2.6, 0x3a3a44, { p: [x, 1.3, z - 0.5], seg: 4 }); for (let i = 0; i < 8; i++) { const an = (i / 8) * 6.283; b.cone(0.95, 0.55, i % 2 ? 0xf2efe6 : C.awnA, { p: [x, 2.7, z - 0.5], seg: 8, ao: 0, s: [1, 1, 1], r: [0, an, 0] }); }
    b.cone(1.5, 0.6, 0xf2efe6, { p: [x, 2.8, z - 0.5], seg: 8, ao: 0.05 }); b.cone(1.5, 0.6, C.awnA, { p: [x, 2.78, z - 0.5], seg: 4, ao: 0, r: [0, a, 0], s: [1, 1.0, 1] });
  }
  return b.build();
};

export const planeTree = (C) => {
  const b = B();
  b.cyl(0.22, 0.34, 5.2, 0xb8b0a0, { p: [0, 2.6, 0], seg: 7, jitter: 0.04 }).cyl(0.12, 0.2, 2.4, 0xb8b0a0, { p: [0.8, 5.6, 0], r: [0, 0, -0.6], seg: 5 }).cyl(0.12, 0.2, 2.2, 0xb8b0a0, { p: [-0.7, 5.5, 0.2], r: [0, 0, 0.6], seg: 5 });
  for (const [x, y, z, r, c] of [[0, 7.2, 0, 2.3, 0x2c5a3a], [1.5, 6.4, 0.4, 1.7, 0x35704a], [-1.5, 6.5, -0.3, 1.8, 0x2a523a], [0.2, 8.4, 0.2, 1.5, 0x3a7a50]]) b.sphere(r, c, { p: [x, y, z], s: [1.25, 0.85, 1.25], jitter: 0.3, ao: 0.1 });
  return b.build();
};

export const morris = (C) => {   // a Morris column: a green advertising drum with a domed top and poster bands
  const b = B(); b.cyl(0.95, 1.05, 0.5, 0x2a4a38, { p: [0, 0.25, 0], seg: 10 }).cyl(0.9, 0.9, 2.2, 0x35604a, { p: [0, 1.6, 0], seg: 10 }).cyl(1.0, 1.0, 0.25, 0x2a4a38, { p: [0, 2.8, 0], seg: 10 }).cone(1.0, 0.9, 0x2a4a38, { p: [0, 3.4, 0], seg: 10 }).sphere(0.12, 0x2a4a38, { p: [0, 3.95, 0], ao: 0 });
  for (let i = 0; i < 3; i++) b.box(0.5, 1.3, 0.05, [CORAL, WARM, TRI][i], { p: [Math.sin(i * 2.1) * 0.9, 1.7, Math.cos(i * 2.1) * 0.9], r: [0, i * 2.1, 0], radius: 0.01, ao: 0 });
  return b.build();
};

// Track edge: a gas lamp on a fluted iron post (the head is a separate emissive mesh)
export const lampPost = (C) => new Builder({ boxSeg: 1, ico: true }).cyl(0.07, 0.12, 3.6, 0x1c2230, { p: [0, 1.8, 0], seg: 6 }).cyl(0.2, 0.2, 0.3, 0x2a3040, { p: [0, 0.15, 0], seg: 6 }).cyl(0.16, 0.12, 0.2, 0x1c2230, { p: [0, 3.65, 0], seg: 6 })
  .box(0.5, 0.05, 0.05, 0x1c2230, { p: [0, 3.2, 0], radius: 0.01 }).sphere(0.1, 0x1c2230, { p: [0.25, 3.25, 0], ao: 0 }).sphere(0.1, 0x1c2230, { p: [-0.25, 3.25, 0], ao: 0 }).build();
export const lampHead = () => new Builder({ boxSeg: 1, ico: true }).cyl(0.18, 0.12, 0.4, 0xffffff, { p: [0, 0, 0], seg: 6, ao: 0 }).build();

// Far skyline: three parallax rings of zinc roofs and chimney stacks with lit windows, and one great lattice tower (its legs, trusses and a beacon) in the second ring.
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#2c4468');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false }), layers = [];
  const make = (n, dist, hMin, hMax, base, haze, follow, lit, tower) => {
    const geo = new Builder({ boxSeg: 1 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.06, 0.06), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), w = rng.range(12, 26), d = rng.range(10, 18);
      geo.box(w, h, d, base, { p: [cx, h / 2, cz], r: [0, a, 0], radius: 0.1 }).box(w * 0.9, h * 0.18, d * 0.9, tone(base, 1.5), { p: [cx, h + h * 0.09, cz], r: [0, a, 0], radius: 0.1 });
      for (let k = 0; k < 3; k++) geo.box(1.2, h * 0.14, 1.2, base, { p: [cx + rng.range(-w * 0.35, w * 0.35), h * 1.18, cz + rng.range(-d * 0.3, d * 0.3)], r: [0, a, 0] });
      for (let k = 0; k < lit; k++) { const ox = rng.range(-w * 0.4, w * 0.4), oy = rng.range(h * 0.1, h * 0.9), rr = d / 2 + 0.05; geo.box(1.4, 2.0, 0.4, rng.chance(0.75) ? WARM : CORAL, { p: [cx + Math.cos(a) * ox + Math.sin(a) * rr, oy, cz - Math.sin(a) * ox + Math.cos(a) * rr], r: [0, a, 0], radius: 0.01, ao: 0 }); }
    }
    if (tower) {   // the tower: four splayed legs closing to a mast, cross-bracing, two platforms, a beacon
      const a = 0.35, tx = Math.sin(a) * dist, tz = Math.cos(a) * dist, H = 190, dark = 0x1a2438;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) geo.box(3, H * 0.55, 3, dark, { p: [tx + sx * 17 * 0.5, H * 0.275, tz + sz * 17 * 0.5], r: [-sz * 0.17, 0, sx * 0.17] });
      for (let k = 0; k < 4; k++) { const y = 22 + k * 26, w = 38 - k * 9; geo.box(w, 2.2, w, dark, { p: [tx, y, tz] }); geo.box(w * 0.7, 6, 1, dark, { p: [tx, y + 4, tz], r: [0, 0, 0.5] }); }
      geo.box(12, 3, 12, dark, { p: [tx, H * 0.56, tz] }).box(5, H * 0.35, 5, dark, { p: [tx, H * 0.75, tz] }).box(3, 24, 3, dark, { p: [tx, H * 0.97, tz] }).box(3, 3, 3, CORAL, { p: [tx, H * 1.1, tz], ao: 0 });
      for (let k = 0; k < 10; k++) geo.box(1.5, 1.5, 1.5, WARM, { p: [tx + (k % 2 ? 7 : -7) * (1 - k / 14), 20 + k * 14, tz + 9 * (1 - k / 14)], ao: 0 });
    }
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) { if (Math.max(col.getX(i), col.getY(i), col.getZ(i)) > 1) continue; t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / (hMax * 1.2)))) + haze * 0.2); col.setXYZ(i, t.r, t.g, t.b); }
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(22, 340, 36, 80, 0x0f1828, 0.5, 0.95, 5, false);
  make(20, 275, 26, 60, 0x14203a, 0.36, 0.9, 5, true);
  make(18, 215, 18, 44, 0x1a2a48, 0.22, 0.85, 4, false);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 6, cam.z * m.userData.follow); } };
}
