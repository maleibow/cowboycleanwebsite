import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { CYAN, MAG, AMBER } from './stage03Props.js';

// Stage 3 slide-under gates (PLAN 4.2), same frame as stage01Gates.js: x across (centred, width W), y ABSOLUTE height, z along the
// track (centred, depth D). The solid part fills the hitbox exactly (underside y0, top y1, ends +-W/2, depth D); the space below y0 stays open.
// Variants: 1 hydraulic press, 2 crushed-car stack on a girder, 3 overhead conveyor gantry with swinging cargo.
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const STEEL = [0x4a5068, 0x56607a, 0x3e4660], IRON = 0x22222c;
const stripes = (b, x0, x1, y, z, h, d, n = 10) => { const w = (x1 - x0) / n; for (let i = 0; i < n; i++) b.box(w, h, d, i % 2 ? 0x1a1a1a : 0xf2c200, { p: [x0 + (i + 0.5) * w, y, z], radius: 0.005, ao: 0 }); };
const pillar = (b, x, y1, D, steel) => {                                  // an I-beam column with a hazard-striped foot
  b.box(0.8, y1 + 0.9, 0.4, steel, { p: [x, (y1 - 0.9) / 2, 0], radius: 0.02, ao: 0.1 }).box(0.8, y1 + 0.9, 0.12, tone(steel, 1.25), { p: [x, (y1 - 0.9) / 2, D * 0.45], radius: 0.01 }).box(0.8, y1 + 0.9, 0.12, tone(steel, 1.25), { p: [x, (y1 - 0.9) / 2, -D * 0.45], radius: 0.01 });
  stripes(b, x - 0.4, x + 0.4, 0.3, D * 0.5 + 0.03, 0.6, 0.06, 4); stripes(b, x - 0.4, x + 0.4, 0.3, -D * 0.5 - 0.03, 0.6, 0.06, 4);
};

// ---- 1. hydraulic press: a steel block between two columns, hazard stripe along its lower edge, two rams on top, an amber warning lamp that swings on a chain
function pressGate(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0, steel = rng.pick(STEEL);
  for (const sd of [-1, 1]) pillar(b, sd * (hx - 0.45), y1, D, steel);
  b.box(W - 1.5, H, D, tone(steel, 0.9), { p: [0, (y0 + y1) / 2, 0], radius: 0.04, ao: 0.1 });
  stripes(b, -(W - 1.5) / 2, (W - 1.5) / 2, y0 + 0.2, D / 2 + 0.02, 0.4, 0.05, 12); stripes(b, -(W - 1.5) / 2, (W - 1.5) / 2, y0 + 0.2, -D / 2 - 0.02, 0.4, 0.05, 12);
  b.box(W - 1.5, 0.3, D, tone(steel, 1.3), { p: [0, y1 - 0.15, 0], radius: 0.02, ao: 0 });                                      // top plate, top = y1
  for (let i = 0; i < 6; i++) b.cyl(0.07, 0.07, 0.06, 0x9aa0b0, { p: [-(W - 2.2) / 2 + i * ((W - 2.2) / 5), (y0 + y1) / 2 + 0.2, D / 2 + 0.03], r: [Math.PI / 2, 0, 0], seg: 5, ao: 0 });   // rivets
  for (const sx of [-0.28, 0.28]) { b.cyl(0.3, 0.3, 1.0, 0x8a90a0, { p: [sx * W, y1 + 0.5, 0], seg: 8 }).cyl(0.16, 0.16, 1.4, 0xc8ccd8, { p: [sx * W, y1 + 1.2, 0], seg: 8 }); }
  b.box(W - 1.5, 0.08, 0.08, CYAN, { p: [0, y0 + 0.62, D / 2 + 0.05], radius: 0.01, ao: 0 });
  const lx = rng.sign() * (hx - 1.7), lb = B();
  lb.cyl(0.02, 0.02, 0.55, IRON, { p: [lx, y0 - 0.28, D / 2 + 0.2], seg: 3, ao: 0 }).sphere(0.2, AMBER, { p: [lx, y0 - 0.7, D / 2 + 0.2], s: [1, 1.2, 1], ao: 0 }).cyl(0.22, 0.22, 0.06, IRON, { p: [lx, y0 - 0.45, D / 2 + 0.2], seg: 7, ao: 0 });
  return { geo: b.build(), sway: [{ geo: lb.build(), pivot: [lx, y0, D / 2 + 0.2], amp: 0.1, speed: 1.9, phase: rng.range(0, 6) }] };
}

// ---- 2. crushed-car stack: two layers of flattened wrecks lying across the track, held on a girder between two columns
function carStack(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, steel = rng.pick(STEEL), paint = [0xc0392b, 0x2a6fa8, 0xd4a017, 0x7a3a9a, 0x2a8a5a], L = (W - 1.7) / 2, H = y1 - y0 - 0.35, lh = H / 2;
  for (const sd of [-1, 1]) pillar(b, sd * (hx - 0.45), y1, D, steel);
  b.box(W - 1.5, 0.35, D, tone(steel, 0.8), { p: [0, y0 + 0.175, 0], radius: 0.02, ao: 0.1 });                                  // the girder, underside = y0
  b.box(W - 1.5, 0.06, 0.1, CYAN, { p: [0, y0 + 0.03, D / 2 + 0.04], radius: 0.01, ao: 0 });
  for (let layer = 0; layer < 2; layer++) for (let k = 0; k < 2; k++) {
    const cx = (k - 0.5) * (L + 0.05), cy = y0 + 0.35 + lh * layer, col = rng.pick(paint), bh = lh * 0.58, ch = lh * 0.42;
    b.box(L, bh, D, col, { p: [cx, cy + bh / 2, 0], radius: 0.06, jitter: 0.03, ao: 0.15 });                                  // body
    b.box(L * 0.5, ch, D * 0.92, tone(col, 0.82), { p: [cx + (layer ? -0.3 : 0.3), cy + bh + ch / 2 - 0.01, 0], radius: 0.05, jitter: 0.03 });   // cabin
    b.box(L * 0.4, ch * 0.5, 0.05, 0x10131c, { p: [cx + (layer ? -0.3 : 0.3), cy + bh + ch * 0.5, D / 2 * 0.92 + 0.02], radius: 0.01, ao: 0 }).box(L * 0.4, ch * 0.5, 0.05, 0x10131c, { p: [cx + (layer ? -0.3 : 0.3), cy + bh + ch * 0.5, -D / 2 * 0.92 - 0.02], radius: 0.01, ao: 0 });
    for (const wx of [-0.34, 0.34]) for (const wz of [-1, 1]) b.cyl(0.2, 0.2, 0.14, 0x15151a, { p: [cx + wx * L, cy + 0.2, wz * (D / 2 + 0.01)], r: [Math.PI / 2, 0, 0], seg: 8, ao: 0 });
    b.box(0.35, 0.16, 0.06, AMBER, { p: [cx + (k ? 1 : -1) * (L / 2 - 0.1), cy + bh * 0.6, D / 2 + 0.02], radius: 0.01, ao: 0 });
  }
  b.box(W - 1.5, 0.12, D, tone(steel, 1.1), { p: [0, y1 - 0.06, 0], radius: 0.01, ao: 0 });                                       // top plate, top = y1
  return { geo: b.build() };
}

// ---- 3. overhead conveyor gantry: a belt housing with roller ends and a neon belly strip, and cargo hanging from it on chains
function gantryGate(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, steel = rng.pick(STEEL), H = y1 - y0;
  for (const sd of [-1, 1]) pillar(b, sd * (hx - 0.45), y1, D, steel);
  b.box(W - 1.3, H, D, tone(steel, 0.85), { p: [0, (y0 + y1) / 2, 0], radius: 0.05, ao: 0.1 });
  for (const sd of [-1, 1]) { b.cyl(H * 0.36, H * 0.36, D + 0.1, 0x20202a, { p: [sd * (hx - 0.8), (y0 + y1) / 2, 0], r: [Math.PI / 2, 0, 0], seg: 10, ao: 0 }); b.cyl(H * 0.18, H * 0.18, D + 0.14, 0x9aa0b0, { p: [sd * (hx - 0.8), (y0 + y1) / 2, 0], r: [Math.PI / 2, 0, 0], seg: 8, ao: 0 }); }
  for (let i = 0; i < 7; i++) b.box(0.18, H * 0.5, D + 0.06, i % 2 ? 0x2a2a34 : 0x383846, { p: [-(W - 3.4) / 2 + i * ((W - 3.4) / 6), (y0 + y1) / 2 + 0.1, 0], radius: 0.01 });   // belt slats on the housing's face
  b.box(W - 1.3, 0.14, D + 0.04, tone(steel, 1.3), { p: [0, y1 - 0.07, 0], radius: 0.01, ao: 0 });
  b.box(W - 1.3, 0.09, 0.1, MAG, { p: [0, y0 + 0.09, D / 2 + 0.03], radius: 0.01, ao: 0 }).box(W - 1.3, 0.09, 0.1, MAG, { p: [0, y0 + 0.09, -D / 2 - 0.03], radius: 0.01, ao: 0 });
  const sway = [];
  for (const [i, x] of [-0.25, 0.22].entries()) {                                                                                  // a hook + crate on a chain, swinging
    const cx = x * W, sb = B(), len = 0.5 + 0.2 * i, col = rng.pick([0xc89a3a, 0x6a8a9a, 0xb5412a]);
    sb.cyl(0.025, 0.025, len, 0x9aa0b0, { p: [cx, y0 - len / 2, 0.1], seg: 4, ao: 0 }).box(0.55, 0.4, 0.5, col, { p: [cx, y0 - len - 0.2, 0.1], radius: 0.04 }).box(0.57, 0.06, 0.52, tone(col, 0.6), { p: [cx, y0 - len - 0.2, 0.1], radius: 0.01, ao: 0 });
    sway.push({ geo: sb.build(), pivot: [cx, y0, 0.1], amp: 0.12, speed: 1.4 + i * 0.4, phase: rng.range(0, 6) });
  }
  return { geo: b.build(), sway };
}

const VARIANTS = [pressGate, carStack, gantryGate];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) { return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth); }
