import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { WARM, AMB, TEAL, PINK } from './stage04Props.js';

// Stage 4 walkable solids (same frame as stage04Gates.js; walkable top exactly y1, footprint exactly W x D):
//   ledge    a loading dock / sidewalk ledge (side section, H < 3) or a ROOFTOP (rooftop set-piece, H >= 3: brick sides with windows, tar roof, gravel, pipes)
//   beam     a steel girder bridge over the flooded trench      platform  a Jersey-barrier stepping block (H < 3) or a FIRE-ESCAPE landing (set-piece)
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const STEEL = 0x56607a, IRON = 0x22262f;

function rooftop(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2, brick = rng.pick([0xa5573f, 0x8a4a3a, 0xb06a4a, 0x7a5a64]);
  b.box(W - 0.06, H - 0.3, D - 0.06, brick, { p: [0, y0 + (H - 0.3) / 2, 0], radius: 0.03, jitter: 0.015, ao: 0.25 });                      // the building below
  b.box(W, 0.3, D, 0x5a5c6c, { p: [0, y1 - 0.15, 0], radius: 0.03, ao: 0 });                                                              // tar roof, top = y1
  b.box(W + 0.12, 0.34, D + 0.12, 0xb8b0a0, { p: [0, y1 - 0.5, 0], radius: 0.03, ao: 0 });                                                  // concrete cornice
  for (let i = 0; i < Math.round(D / 2.2); i++) for (const sd of [-1, 1]) for (let r = 0; r < Math.min(3, Math.floor((H - 2.4) / 1.8)); r++) {
    const lit = (i * 3 + r * 5 + (sd > 0 ? 1 : 0)) % 4 < 2, z = -hz + 1.2 + i * 2.2;
    b.box(0.08, 0.95, 0.7, lit ? WARM : 0x182034, { p: [sd * (hx + 0.01), y1 - 1.6 - r * 1.9, z], radius: 0.01, ao: 0 });
  }
  for (let i = 0; i < Math.round(W / 1.1); i++) b.box(0.55, 0.012, D - 0.4, i % 2 ? 0x676978 : 0x5a5c6c, { p: [-hx + 0.55 + i * 1.1, y1 + 0.001, 0], radius: 0.002, ao: 0 });     // tar seams
  for (let i = 0; i < 4; i++) b.box(rng.range(0.5, 1.2), 0.012, rng.range(0.5, 1.4), 0x6a6a74, { p: [rng.range(-hx + 0.8, hx - 0.8), y1 + 0.002, rng.range(-hz + 1, hz - 1)], radius: 0.002, ao: 0 });   // gravel patches
  for (const sd of [-1, 1]) b.box(0.05, 0.05, D, sd > 0 ? AMB : TEAL, { p: [sd * (hx - 0.05), y1 - 0.01, 0], radius: 0.005, ao: 0 });
  return { geo: b.build() };
}
function dock(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W - 0.1, H - 0.1, D - 0.1, 0x4a4a54, { p: [0, (y0 + y1) / 2 - 0.05, 0], ao: 0.2 }).box(W, 0.14, D, 0x6a707e, { p: [0, y1 - 0.07, 0], radius: 0.02, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.7); i++) for (const sd of [-1, 1]) b.box(0.05, H - 0.2, 0.34, i % 2 ? 0x1a1a1a : 0xf2c200, { p: [sd * (hx + 0.005), y0 + (H - 0.2) / 2 + 0.05, -hz + 0.5 + i * 0.7], radius: 0.005, ao: 0 });
  for (const sd of [-1, 1]) b.box(0.08, 0.05, D, sd > 0 ? AMB : TEAL, { p: [sd * (hx - 0.1), y1 - 0.01, 0], radius: 0.005, ao: 0 });
  b.cyl(0.14, 0.14, 0.1, 0x3a3a44, { p: [0, y1 - 0.02, 0], seg: 8, ao: 0 });
  return { geo: b.build() };
}
const ledge = (rng, W, y0, y1, D) => (y1 - y0 >= 3 ? rooftop(rng, W, y0, y1, D) : dock(rng, W, y0, y1, D));

function beam(rng, W, y0, y1, D) {
  const b = B(), hz = D / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.14, H, D, STEEL, { p: [sd * (W / 2 - 0.07), y1 - H / 2, 0], radius: 0.01 }); b.box(0.5, 0.06, D, tone(STEEL, 1.2), { p: [sd * (W / 2 - 0.25), y1 - 0.03, 0], radius: 0.01, ao: 0 }); b.box(0.5, 0.06, D, tone(STEEL, 1.2), { p: [sd * (W / 2 - 0.25), y1 - H + 0.03, 0], radius: 0.01, ao: 0 }); }
  b.box(W - 0.3, 0.12, D, 0x9a7a4a, { p: [0, y1 - 0.06, 0], radius: 0.01, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.5); i++) b.box(W - 0.4, 0.02, 0.04, 0x6a5232, { p: [0, y1 - 0.0, -hz + 0.25 + i * 0.5], radius: 0.002, ao: 0 });
  for (let z = -hz + 2; z < hz - 1; z += rng.range(3.5, 5)) { b.box(W + 0.1, 0.16, 0.16, IRON, { p: [0, y1 - H * 0.55, z], radius: 0.02 }); b.box(W, 0.05, 0.1, AMB, { p: [0, y1 - 0.02, z + 0.2], radius: 0.005, ao: 0 }); }
  return { geo: b.build() };
}

function fireEscape(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, hz = D / 2;
  b.box(W, 0.1, D, 0x2a2e3a, { p: [0, y1 - 0.05, 0], radius: 0.01, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.3); i++) b.box(W - 0.2, 0.05, 0.12, i % 2 ? 0x4a5468 : 0x56607a, { p: [0, y1 - 0.005, -hz + 0.15 + i * 0.3], radius: 0.005, ao: 0 });      // grating
  for (const sd of [-1, 1]) { b.box(0.12, 0.3, D, STEEL, { p: [sd * (hx - 0.06), y1 - 0.25, 0], radius: 0.01 }); b.box(0.08, 0.07, D, sd > 0 ? AMB : TEAL, { p: [sd * (hx - 0.06), y1 - 0.01, 0], radius: 0.005, ao: 0 }); }
  const posts = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (const [x, z] of posts) b.box(0.14, y1 - y0, 0.14, 0x3a4252, { p: [x * (hx - 0.2), (y0 + y1) / 2, z * (hz - 0.2)], radius: 0.01 });
  for (let k = 0; k < Math.max(1, Math.floor((y1 - y0) / 1.6)); k++) b.box(W - 0.3, 0.06, 0.08, 0x3a4252, { p: [0, y0 + 0.8 + k * 1.6, hz - 0.2], r: [0, 0, 0.0], radius: 0.01, ao: 0 });
  b.box(0.08, Math.hypot(y1 - y0, 1.5), 0.08, 0x3a4252, { p: [hx - 0.2, (y0 + y1) / 2, 0], r: [0.5, 0, 0], radius: 0.01, ao: 0 });         // stair stringer
  b.box(W * 0.8, 0.5, 0.06, 0x0f1420, { p: [0, y1 - 0.45, hz + 0.02], radius: 0.01, ao: 0 }).box(0.3, 0.3, 0.07, WARM, { p: [-W * 0.25, y1 - 0.45, hz + 0.04], radius: 0.02, ao: 0 });
  return { geo: b.build() };
}
function jersey(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W - 0.1, H - 0.4, D - 0.1, 0x3a3a44, { p: [0, y0 + (H - 0.4) / 2, 0], ao: 0.2 }).box(W, 0.45, D, 0x8a8e9a, { p: [0, y1 - 0.225, 0], radius: 0.05, jitter: 0.01, ao: 0.1 });
  b.box(W - 0.3, 0.04, D - 0.3, 0x9a9eaa, { p: [0, y1 - 0.02, 0], radius: 0.01, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.8); i++) for (const sd of [-1, 1]) b.box(0.05, 0.4, 0.38, i % 2 ? 0x1a1a1a : 0xf2c200, { p: [sd * (hx + 0.005), y1 - 0.22, -hz + 0.5 + i * 0.8], radius: 0.005, ao: 0 });
  b.box(0.08, 0.08, 0.08, AMB, { p: [hx - 0.25, y1 + 0.0, hz - 0.25], radius: 0.01, ao: 0 }).box(0.08, 0.08, 0.08, AMB, { p: [-hx + 0.25, y1 + 0.0, -hz + 0.25], radius: 0.01, ao: 0 });
  return { geo: b.build() };
}
const platform = (rng, W, y0, y1, D) => (y1 > 1.4 && y1 - y0 >= 4.5 ? fireEscape(rng, W, y0, y1, D) : jersey(rng, W, y0, y1, D));

const SOLIDS = { ledge, beam, platform };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
