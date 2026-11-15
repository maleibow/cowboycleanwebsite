import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for New York City scenery: brownstones, high-rises, warehouses with billboards, parked taxis, hydrants, steam stacks, street lamps,
// the far skyline and the taxi that crosses the road (world/hazTraffic.js). Lit windows and signs use vertex colours above 1.0 (bloom).
export const WARM = new THREE.Color(2.6, 1.9, 0.5), AMB = new THREE.Color(3, 1.6, 0.35), RED = new THREE.Color(3, 0.25, 0.2), GRN = new THREE.Color(0.4, 2.6, 1.0), TEAL = new THREE.Color(0.3, 2.4, 2.6), PINK = new THREE.Color(2.8, 0.4, 1.6);
const B = () => new Builder({ boxSeg: 1, ico: true });
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

// windows on all four faces (the instances are spun at random): n columns x rows, a share of them lit
const windows = (b, w, d, y0, rows, cols, seed, C, dark = 0x1a2438) => {   // single quads (2 triangles each) facing out of all four sides
  const pl = new THREE.PlaneGeometry(0.66, 0.8);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) for (let f = 0; f < 4; f++) {
    const lit = ((r * 7 + c * 3 + f * 5 + seed) % 5) < 2, u = (c + 0.5) / cols - 0.5, y = y0 + r * 1.55 + 0.9, span = f % 2 ? d : w, off = (f % 2 ? w : d) / 2 + 0.03;
    const x = f === 0 ? u * span : f === 1 ? off : f === 2 ? -u * span : -off, z = f === 0 ? off : f === 1 ? -u * span : f === 2 ? -off : u * span;
    b.add(pl, lit ? WARM : dark, { p: [x, y, z], r: [0, f * Math.PI / 2, 0], ao: 0 });
  }
};

export const brownstone = (C) => {
  const b = B(), w = 5.6, d = 5.6, h = 11;
  b.box(w, h, d, C.brick, { p: [0, h / 2, 0], radius: 0.05, jitter: 0.02, ao: 0.3 }).box(w + 0.5, 0.5, d + 0.5, C.concrete, { p: [0, h + 0.1, 0], radius: 0.04 }).box(w + 0.2, 1.0, d + 0.2, C.brickDark, { p: [0, h - 0.5, 0], radius: 0.03 });
  windows(b, w - 1, d - 1, 2.4, 5, 3, 1, C);
  b.box(2.0, 0.8, 1.5, C.concrete, { p: [0, 0.4, d / 2 + 0.6], radius: 0.03 }).box(1.2, 2.0, 0.1, 0x201814, { p: [0, 1.3, d / 2 + 0.03], radius: 0.02 });   // the stoop and door
  b.box(1.6, 0.9, 1.2, C.steel, { p: [1.4, h + 0.9, -1], radius: 0.05 }).cyl(0.7, 0.7, 1.4, C.wood, { p: [-1.3, h + 1.3, 1], seg: 8 }).cone(0.9, 0.7, C.woodDark, { p: [-1.3, h + 2.35, 1], seg: 8 });   // AC unit and a water tank
  for (let i = 0; i < 4; i++) { b.box(2.0, 0.07, 0.8, C.steel, { p: [0, 3.5 + i * 2.2, d / 2 + 0.45], radius: 0.01, ao: 0 }); b.box(0.06, 2.2, 0.06, C.steel, { p: [0.95, 2.4 + i * 2.2, d / 2 + 0.8], radius: 0.01, ao: 0 }); }   // fire escape
  return b.build();
};

export const highrise = (C) => {
  const b = B(); let y = 0, w = 6.4;
  [[14, C.glass], [9, C.concrete], [6, C.glass]].forEach(([h, c], k) => {
    b.box(w, h, w, c, { p: [0, y + h / 2, 0], radius: 0.05, jitter: 0.02, ao: 0.3 }); windows(b, w - 1, w - 1, y + 0.4, Math.floor(h / 1.55) - 1, 4 - k, k * 3, C, tone(c, 0.5));
    b.box(w + 0.3, 0.35, w + 0.3, C.steel, { p: [0, y + h, 0], radius: 0.03 }); y += h; w *= 0.78;
  });
  b.cyl(0.08, 0.12, 5, C.steel, { p: [0, y + 2.5, 0], seg: 4 }).sphere(0.17, RED, { p: [0, y + 5.05, 0], ao: 0 });
  return b.build();
};

export const warehouse = (C) => {
  const b = B(), w = 9, d = 7, h = 8.5;
  b.box(w, h, d, tone(C.brick, 0.8), { p: [0, h / 2, 0], radius: 0.05, jitter: 0.02, ao: 0.3 }).box(w + 0.4, 0.4, d + 0.4, C.concrete, { p: [0, h, 0], radius: 0.03 });
  windows(b, w - 1.2, d - 1, 3.2, 3, 4, 2, C);
  b.box(3.2, 3.0, 0.15, 0x2a2a34, { p: [0, 1.5, d / 2 + 0.03], radius: 0.03 }).box(3.2, 0.12, 0.2, AMB, { p: [0, 3.05, d / 2 + 0.06], radius: 0.01, ao: 0 });   // loading door with a lamp bar
  for (const sx of [-1, 1]) b.cyl(0.12, 0.14, 2.6, C.steel, { p: [sx * 3, h + 1.3, 0], seg: 5 });
  b.box(7.4, 2.6, 0.25, 0x15182a, { p: [0, h + 2.9, 0], radius: 0.04 }).box(6.6, 0.4, 0.3, PINK, { p: [0, h + 3.7, 0.03], radius: 0.02, ao: 0 }).box(6.6, 0.4, 0.3, TEAL, { p: [0, h + 2.9, 0.03], radius: 0.02, ao: 0 }).box(6.6, 0.4, 0.3, AMB, { p: [0, h + 2.1, 0.03], radius: 0.02, ao: 0 });   // roof billboard
  return b.build();
};

// A yellow cab, 4.2 m long facing +z, wheels on y = 0: body, dark glass cabin, checker stripe, roof light, lamps. Parked ones are scenery; the one that crosses the road is the hazard.
export const taxi = (C) => {
  const b = B();
  b.box(1.9, 0.62, 4.2, C.taxi, { p: [0, 0.68, 0], radius: 0.14, jitter: 0.01, ao: 0.2 }).box(1.7, 0.58, 2.1, tone(C.taxi, 0.95), { p: [0, 1.25, -0.2], radius: 0.18 }).box(1.62, 0.34, 1.96, 0x14202e, { p: [0, 1.28, -0.2], radius: 0.1, ao: 0 });
  for (let i = 0; i < 10; i++) for (const sd of [-1, 1]) b.box(0.03, 0.09, 0.2, i % 2 ? 0x15151a : 0xf2f2f2, { p: [sd * 0.96, 0.72, -1.9 + i * 0.42], radius: 0.005, ao: 0 });
  b.box(0.7, 0.2, 0.3, 0xffffff, { p: [0, 1.65, -0.2], radius: 0.05, ao: 0 }).box(0.7, 0.04, 0.32, AMB, { p: [0, 1.76, -0.2], radius: 0.01, ao: 0 });
  for (const sd of [-1, 1]) { b.box(0.3, 0.16, 0.08, new THREE.Color(3, 2.8, 2.0), { p: [sd * 0.66, 0.74, 2.1], radius: 0.03, ao: 0 }); b.box(0.28, 0.12, 0.06, RED, { p: [sd * 0.68, 0.76, -2.1], radius: 0.02, ao: 0 }); }
  for (const [x, z] of [[-1, 1.3], [1, 1.3], [-1, -1.3], [1, -1.3]]) b.cyl(0.36, 0.36, 0.26, 0x15151a, { p: [x * 0.88, 0.36, z], r: [0, 0, Math.PI / 2], seg: 9, ao: 0 }).cyl(0.2, 0.2, 0.28, 0x9aa0b0, { p: [x * 0.88, 0.36, z], r: [0, 0, Math.PI / 2], seg: 7, ao: 0 });
  return b.build();
};
export const hydrant = (C) => new Builder({ boxSeg: 1, ico: true }).cyl(0.2, 0.24, 0.7, 0xc0392b, { p: [0, 0.35, 0], seg: 8 }).sphere(0.2, 0xc0392b, { p: [0, 0.76, 0], ao: 0 }).cyl(0.1, 0.1, 0.55, 0xd8493b, { p: [0, 0.4, 0], r: [0, 0, Math.PI / 2], seg: 6, ao: 0 }).build();
// A steam stack: an orange-and-white striped pipe with a plume of puffs
export const ventStack = (C) => {
  const b = B(); b.cyl(0.35, 0.45, 2.2, 0xff7a1a, { p: [0, 1.1, 0], seg: 8 }).cyl(0.37, 0.47, 0.35, 0xf2f2f2, { p: [0, 0.7, 0], seg: 8 }).cyl(0.37, 0.47, 0.35, 0xf2f2f2, { p: [0, 1.5, 0], seg: 8 }).cyl(0.42, 0.34, 0.2, 0xff7a1a, { p: [0, 2.3, 0], seg: 8, ao: 0 });
  [[0, 2.9, 0, 0.5], [0.2, 3.5, 0.1, 0.62], [-0.1, 4.2, 0, 0.7], [0.2, 5.0, -0.1, 0.55]].forEach(([x, y, z, r], i) => b.sphere(r, i % 2 ? 0xb8c4dc : 0xd8e0f0, { p: [x, y, z], jitter: 0.1, ao: 0 }));
  return b.build();
};
export const trashBags = (C) => { const b = B(); for (const [x, z, r, c] of [[0, 0, 0.5, 0x15151c], [0.5, 0.2, 0.4, 0x252530], [-0.4, 0.3, 0.38, 0x1a1a22], [0.1, -0.4, 0.34, 0x2a2a38]]) b.sphere(r, c, { p: [x, r * 0.8, z], s: [1, 0.85, 1], jitter: 0.06 }); b.cyl(0.22, 0.22, 0.6, 0x7a8a9a, { p: [0.9, 0.3, 0.3], seg: 8 }).cyl(0.24, 0.24, 0.05, 0x5a6a7a, { p: [0.9, 0.62, 0.3], seg: 8, ao: 0 }); return b.build(); };
export const billboard = (C) => {
  const b = B(); b.cyl(0.14, 0.18, 7, C.steel, { p: [0, 3.5, 0], seg: 6 }).box(4.2, 2.2, 0.2, 0x12162a, { p: [0, 7.4, 0], radius: 0.04 });
  b.box(3.8, 0.28, 0.25, PINK, { p: [0, 8.2, 0.02], radius: 0.02, ao: 0 }).box(3.8, 0.28, 0.25, AMB, { p: [0, 7.4, 0.02], radius: 0.02, ao: 0 }).box(3.8, 0.28, 0.25, TEAL, { p: [0, 6.6, 0.02], radius: 0.02, ao: 0 });
  b.box(1.2, 0.2, 0.2, C.steel, { p: [0, 8.7, 0.4], radius: 0.02 }); return b.build();
};
// Track edge: a street lamp, the head is a separate emissive mesh
export const lampPost = (C) => new Builder({ boxSeg: 1, ico: true }).cyl(0.09, 0.13, 4.6, C.steel, { p: [0, 2.3, 0], seg: 6 }).box(0.9, 0.08, 0.08, C.steel, { p: [-0.4, 4.55, 0], radius: 0.01 }).box(0.5, 0.12, 0.3, 0x2a3040, { p: [-0.85, 4.5, 0], radius: 0.03 }).box(0.3, 0.3, 0.3, C.steel, { p: [0, 0.15, 0], radius: 0.03 }).build();
export const lampHead = () => new Builder({ boxSeg: 1, ico: true }).box(0.42, 0.1, 0.24, 0xffffff, { p: [0, 0, 0], radius: 0.03, ao: 0 }).build();

// The crusher-free hazard car: see `taxi`. Far skyline: layered towers with lit windows and one spire, haze baked toward the horizon glow (built once).
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#38527a');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false });
  const layers = [];
  const make = (n, dist, hMin, hMax, base, haze, follow, lit) => {
    const geo = new Builder({ boxSeg: 1 });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.07, 0.07), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), w = rng.range(9, 22), d = rng.range(9, 16);
      geo.box(w, h, d, base, { p: [cx, h / 2, cz], r: [0, a, 0], radius: 0.1 });
      if (rng.chance(0.6)) { geo.box(w * 0.65, h * 0.3, d * 0.65, base, { p: [cx, h + h * 0.15, cz], r: [0, a, 0], radius: 0.1 }); if (rng.chance(0.4)) geo.cone(w * 0.12, h * 0.5, base, { p: [cx, h * 1.45, cz], seg: 4 }); }
      for (let k = 0; k < lit; k++) { const ox = rng.range(-w * 0.4, w * 0.4), oy = rng.range(h * 0.08, h * 0.95), rr = d / 2 + 0.05; geo.box(1.3, 1.0, 0.4, rng.chance(0.7) ? WARM : TEAL, { p: [cx + Math.sin(a) * 0 + Math.cos(a) * ox + Math.sin(a) * rr, oy, cz - Math.sin(a) * ox + Math.cos(a) * rr], r: [0, a, 0], radius: 0.01, ao: 0 }); }
    }
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) { if (Math.max(col.getX(i), col.getY(i), col.getZ(i)) > 1) continue; t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / hMax))) + haze * 0.25); col.setXYZ(i, t.r, t.g, t.b); }
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(20, 330, 60, 170, 0x0d1830, 0.55, 0.94, 6);
  make(18, 262, 40, 110, 0x132244, 0.4, 0.9, 6);
  make(16, 205, 26, 70, 0x1a2c54, 0.24, 0.85, 5);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 6, cam.z * m.userData.follow); } };
}
