import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';

// Geometry recipes for the Charcoal Streets: burnt-out towers with pale ghostly windows, jagged ruined walls, rubble heaps, bent street lamps, broken columns, ruby-lit bollards along the path edge
// and the far rings of black skyline (original drawBackground: sky #0a0a0a -> #1a2a2e, charcoal #111 buildings with #222 outlines and pale #36454f windows, the floor is ruby water).
export const PALE = new THREE.Color(2.2, 2.6, 3.0), PALE2 = new THREE.Color(1.5, 1.9, 2.4), RUBY = new THREE.Color(3.2, 0.25, 0.5);
const B = () => new Builder({ boxSeg: 1, ico: true });
const CH = [0x1c1c22, 0x24242c, 0x2c2c36, 0x18181e];

export const tower = () => {   // a burnt-out tower: charcoal block, rows of dim pale windows (some dark), a broken top with exposed floors and rebar
  const b = B(), W = 4.2, H = 12, D = 4.0;
  b.box(W, H, D, CH[0], { p: [0, H / 2, 0], radius: 0.12, jitter: 0.07, ao: 0.3 }).box(W + 0.3, 0.5, D + 0.3, CH[2], { p: [0, 3.2, 0], radius: 0.05, ao: 0.2 }).box(W + 0.3, 0.5, D + 0.3, CH[2], { p: [0, 7.2, 0], radius: 0.05, ao: 0.2 });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) { const lit = (r * 3 + c * 5) % 7 < 3, x = -1.3 + c * 1.3, y = 1.4 + r * 1.9; b.box(0.7, 1.0, 0.12, lit ? PALE : 0x0a0a0e, { p: [x, y, D / 2 + 0.01], radius: 0.03, ao: 0 }); if (lit && (r + c) % 2) b.box(0.7, 1.0, 0.12, PALE2, { p: [x, y, -D / 2 - 0.01], radius: 0.03, ao: 0 }); }
  for (let i = 0; i < 5; i++) b.box(0.8 + (i % 2) * 0.5, 0.9 + (i % 3) * 0.5, D * 0.9, CH[i % 4], { p: [-1.6 + i * 0.85, H + 0.4 + (i % 3) * 0.3, 0], r: [0, 0, (i - 2) * 0.05], radius: 0.05, jitter: 0.05, ao: 0.2 });   // the jagged crown
  for (let i = 0; i < 4; i++) b.cyl(0.03, 0.03, 1.4, 0x3a2a2a, { p: [-1.5 + i, H + 1.2, 0.3], r: [0.2, 0, (i - 1.5) * 0.25], seg: 3, ao: 0 });   // rebar
  return b.build();
};
export const ruin = () => {   // a ruined wall: a broken brick face with window holes, pale glass left in one
  const b = B();
  b.box(5.6, 4.4, 0.6, CH[1], { p: [0, 2.2, 0], radius: 0.08, jitter: 0.06, ao: 0.3 }); for (let i = 0; i < 6; i++) b.box(0.8, 0.8 + (i % 3) * 0.9, 0.62, CH[i % 4], { p: [-2.4 + i * 0.96, 4.5 + (i % 3) * 0.4, 0], r: [0, 0, (i - 3) * 0.06], radius: 0.04, jitter: 0.04, ao: 0.2 });
  for (const x of [-1.6, 1.4]) { b.box(0.9, 1.3, 0.7, 0x08080c, { p: [x, 2.6, 0.02], radius: 0.03, ao: 0 }); } b.box(0.7, 1.1, 0.12, PALE2, { p: [1.4, 2.6, 0.22], radius: 0.03, ao: 0 });
  b.box(1.6, 0.4, 1.2, CH[2], { p: [2.8, 0.2, 1.0], r: [0, 0.4, 0.1], radius: 0.05, jitter: 0.04 }).box(1.0, 0.6, 0.8, CH[0], { p: [-2.9, 0.3, 0.9], r: [0, -0.3, -0.1], radius: 0.05, jitter: 0.04 });
  return b.build();
};
export const rubble = () => { const b = B(); for (const [x, y, z, r, c] of [[0, 0.4, 0, 0.9, CH[0]], [0.8, 0.3, 0.3, 0.6, CH[1]], [-0.7, 0.3, -0.2, 0.7, CH[2]], [0.2, 0.8, 0.1, 0.5, CH[3]]]) b.add(new THREE.IcosahedronGeometry(r, 0), c, { p: [x, y, z], s: [1.2, 0.8, 1], jitter: 0.1, ao: 0.2 }); b.box(0.3, 0.9, 0.2, 0x3a3030, { p: [0.4, 1.0, -0.4], r: [0.3, 0.4, 0.5], radius: 0.02, ao: 0 }); b.sphere(0.12, RUBY, { p: [-0.5, 0.45, 0.6], s: [1, 0.6, 1], ao: 0 }); return b.build(); };
export const bentLamp = () => { const b = B(); b.cyl(0.08, 0.13, 3.6, 0x2c2c34, { p: [0, 1.8, 0], r: [0, 0, 0.08], seg: 5 }).cyl(0.06, 0.06, 1.6, 0x2c2c34, { p: [0.7, 3.9, 0], r: [0, 0, 1.15], seg: 4 }).box(0.5, 0.18, 0.3, 0x18181e, { p: [1.4, 3.7, 0], r: [0, 0, 0.5], radius: 0.03 }).sphere(0.12, PALE, { p: [1.46, 3.55, 0], s: [1.2, 0.6, 1], ao: 0 }); return b.build(); };
export const column = () => { const b = B(); b.cyl(0.55, 0.65, 3.2, CH[2], { p: [0, 1.6, 0], seg: 8, jitter: 0.04, ao: 0.25 }).cyl(0.75, 0.75, 0.3, CH[1], { p: [0, 0.15, 0], seg: 8, ao: 0.2 }).cyl(0.7, 0.45, 0.5, CH[1], { p: [0, 3.4, 0], r: [0.05, 0, 0.12], seg: 8, jitter: 0.06, ao: 0.2 }); b.box(0.9, 0.7, 0.9, CH[0], { p: [1.2, 0.35, 0.6], r: [0.2, 0.5, 0.4], radius: 0.05 }); b.cyl(0.5, 0.55, 1.2, CH[2], { p: [-1.4, 0.55, 0.4], r: [0, 0, 1.5], seg: 8 }); return b.build(); };

// Track edge: a charcoal bollard with a ruby light strip; the lamp is a separate emissive mesh
export const bollard = () => { const b = B(); b.cyl(0.14, 0.18, 1.0, 0x2c2c34, { p: [0, 0.5, 0], seg: 6 }).cyl(0.2, 0.2, 0.12, 0x18181e, { p: [0, 1.05, 0], seg: 6 }).box(0.34, 0.1, 0.34, 0x18181e, { p: [0, 0.05, 0], radius: 0.02 }); return b.build(); };
export const rubyOrb = () => B().sphere(0.14, RUBY, { p: [0, 0, 0], s: [1, 1.2, 1], ao: 0 }).build();

// Far scenery: three parallax rings of black skyline: stepped towers with a few pale windows, ruined crowns and a half-fallen spire (built once).
export function farRing(C, rng) {
  const group = new THREE.Group(), hazeC = new THREE.Color('#2a1018');
  const mat = createToon({ vertexColors: true, grime: false, fog: false, rim: false }), layers = [];
  const make = (n, dist, hMin, hMax, base, haze, follow) => {
    const geo = new Builder({ boxSeg: 1 });
    for (let i = 0; i < n * 3; i++) {
      const a = (i / (n * 3)) * Math.PI * 2 + rng.range(-0.03, 0.03), cx = Math.sin(a) * dist, cz = Math.cos(a) * dist, h = rng.range(hMin, hMax), w = h * rng.range(0.28, 0.6);
      geo.box(w, h, w * 0.9, i % 2 ? base : 0x0c0c12, { p: [cx, h / 2, cz], r: [0, a, rng.range(-0.02, 0.02)], ao: 0 });
      if (i % 3 === 0) geo.box(w * 0.7, h * 0.2, w * 0.7, base, { p: [cx, h + h * 0.08, cz], r: [0, a, rng.range(-0.15, 0.15)], ao: 0 });
      if (i % 5 === 1) geo.add(new THREE.ConeGeometry(w * 0.5, h * 0.7, 4), 0x08080c, { p: [cx, h + h * 0.3, cz], r: [0.15, a, 0.1], ao: 0 });   // a leaning spire
      for (let k = 0; k < 4; k++) if ((i + k) % 3 === 0) geo.box(w * 0.12, w * 0.16, 0.5, PALE, { p: [cx + Math.sin(a + 1.57) * rng.range(-0.3, 0.3) * w, h * rng.range(0.3, 0.9), cz + Math.cos(a + 1.57) * rng.range(-0.3, 0.3) * w - 0.0], r: [0, a, 0], ao: 0 });
    }
    const g = geo.build(), col = g.attributes.color, pos = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < col.count; i++) { if (Math.max(col.getX(i), col.getY(i), col.getZ(i)) > 0.9) continue; t.setRGB(col.getX(i), col.getY(i), col.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, pos.getY(i) / hMax))) + haze * 0.1); col.setXYZ(i, t.r, t.g, t.b); }
    const m = new THREE.Mesh(g, mat); m.userData = { follow }; group.add(m); layers.push(m);
  };
  make(16, 330, 40, 110, 0x1a1a22, 0.55, 0.95);
  make(14, 260, 28, 70, 0x16161c, 0.38, 0.9);
  make(12, 205, 16, 44, 0x121217, 0.22, 0.85);
  return { group, update(cam) { for (const m of layers) m.position.set(cam.x * m.userData.follow, cam.y - 4, cam.z * m.userData.follow); } };
}
