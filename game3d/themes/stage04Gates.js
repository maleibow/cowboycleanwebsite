import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { WARM, AMB, RED, GRN, PINK, TEAL } from './stage04Props.js';

// Stage 4 slide-under gates (PLAN 4.2), same frame as stage01Gates.js: x across (centred, width W), y ABSOLUTE height, z along the
// track (centred, depth D). The solid fills the hitbox exactly (underside y0, top y1, ends +-W/2, depth D); the space below y0 stays open.
// Variants: 1 construction scaffold, 2 brick storefront lintel with a lit sign, 3 highway-sign gantry with a swinging traffic light.
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const STEEL = 0x56607a, IRON = 0x22262f;
const pipe = (r, len, seg = 8) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2);

// ---- 1. scaffold: steel pipe towers with X braces, stacked orange-and-white striped boards, a plank top and a work lamp; a tarp flaps below
function scaffold(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) for (const k of [0, 1]) {
    const x = sd * (hx - 0.25 - k * 0.55);
    b.cyl(0.07, 0.07, y1 + 1.2, STEEL, { p: [x, (y1 - 1.2) / 2 + 0.6, D * 0.4], seg: 6 }).cyl(0.07, 0.07, y1 + 1.2, STEEL, { p: [x, (y1 - 1.2) / 2 + 0.6, -D * 0.4], seg: 6 });
    for (let y = 0.4; y < y1 + 0.2; y += 1.2) b.cyl(0.085, 0.085, 0.07, 0x9aa0b0, { p: [x, y, D * 0.4], seg: 6, ao: 0 }).cyl(0.085, 0.085, 0.07, 0x9aa0b0, { p: [x, y, -D * 0.4], seg: 6, ao: 0 });   // couplers
  }
  const rows = Math.max(3, Math.round(H / 0.55)), rh = (H - 0.12) / rows;
  for (let i = 0; i < rows; i++) b.box(W - 1.9, rh - 0.03, D, i % 2 ? 0xf2f2f2 : 0xff7a1a, { p: [0, y0 + rh * (i + 0.5), 0], radius: 0.01, ao: 0.05 });      // hazard boards
  for (let i = 0; i < 7; i++) b.box(0.5, rh - 0.03, D + 0.02, 0x1a1a1a, { p: [-(W - 1.9) / 2 + 0.6 + i * ((W - 2.9) / 6), y0 + rh * (1 + (i % 2) * 2) - rh * 0.5, 0], r: [0, 0, 0.6], radius: 0.005, ao: 0 });   // diagonal stripes
  b.box(W - 1.9, 0.12, D + 0.5, 0x9a7a4a, { p: [0, y1 - 0.06, 0], radius: 0.01, ao: 0 });                                             // plank top, top = y1
  for (const z of [-D / 2 - 0.1, D / 2 + 0.1]) for (const sd of [-1, 1]) b.cyl(0.04, 0.04, Math.hypot(1.6, H), STEEL, { p: [sd * (hx - 0.8), (y0 + y1) / 2, z], r: [0, 0, sd * 0.7], seg: 4, ao: 0 });   // X braces
  b.box(0.3, 0.22, 0.3, 0x22262f, { p: [hx - 1.4, y1 - 0.2, D / 2 + 0.3], radius: 0.04 }).box(0.22, 0.14, 0.12, AMB, { p: [hx - 1.4, y1 - 0.2, D / 2 + 0.5], radius: 0.02, ao: 0 });
  const sb = B(), tx = rng.range(-0.2, 0.2) * W;
  sb.box(2.3, 0.8, 0.05, 0x2a6a9a, { p: [tx, y0 - 0.45, D / 2 + 0.1], radius: 0.02 }).box(2.3, 0.07, 0.07, 0xf2f2f2, { p: [tx, y0 - 0.06, D / 2 + 0.1], radius: 0.01, ao: 0 });   // a blue tarp
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [tx, y0, D / 2 + 0.1], amp: 0.1, speed: 1.6, phase: rng.range(0, 6) }] };
}

// ---- 2. storefront: a brick lintel with a lit sign band and striped awning trim, brick pillars, a neon OPEN board swinging below
function storefront(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0, brick = rng.pick([0x8a4a3a, 0x7a4034, 0x9a5a44]), dk = tone(brick, 0.65);
  for (const sd of [-1, 1]) { b.box(0.95, y1 + 0.9, D * 0.95, brick, { p: [sd * (hx - 0.5), (y1 - 0.9) / 2, 0], radius: 0.03, jitter: 0.02, ao: 0.1 }); for (let y = 0.5; y < y1; y += 0.5) b.box(1.0, 0.04, D, dk, { p: [sd * (hx - 0.5), y, 0], radius: 0.005, ao: 0 }); }
  b.box(W - 1.9, H, D, brick, { p: [0, (y0 + y1) / 2, 0], radius: 0.03, jitter: 0.02, ao: 0.1 });
  for (let y = y0 + 0.4; y < y1; y += 0.5) b.box(W - 1.9, 0.04, D + 0.02, dk, { p: [0, y, 0], radius: 0.005, ao: 0 });
  const n = Math.round((W - 2) / 0.45);
  for (let i = 0; i < n; i++) b.box((W - 2) / n - 0.03, 0.2, D + 0.1, i % 2 ? 0xe8e0d0 : 0xc0392b, { p: [-(W - 2) / 2 + (i + 0.5) * ((W - 2) / n), y0 + 0.1, 0], radius: 0.01, ao: 0 });      // striped awning trim along the underside
  const sc = rng.pick([AMB, PINK, TEAL]);
  b.box(W - 2.6, H * 0.4, 0.1, 0x14182a, { p: [0, y0 + H * 0.58, D / 2 + 0.03], radius: 0.03, ao: 0 }).box(W - 3.0, 0.14, 0.12, sc, { p: [0, y0 + H * 0.58 + H * 0.14, D / 2 + 0.06], radius: 0.01, ao: 0 }).box(W - 3.0, 0.14, 0.12, sc, { p: [0, y0 + H * 0.58 - H * 0.14, D / 2 + 0.06], radius: 0.01, ao: 0 });
  for (let i = 0; i < 5; i++) b.box(0.42, H * 0.22, 0.1, i % 2 ? WARM : sc, { p: [-1.4 + i * 0.7, y0 + H * 0.58, D / 2 + 0.07], radius: 0.02, ao: 0 });     // letter blocks
  b.box(W - 1.9, 0.2, D + 0.25, C0, { p: [0, y1 - 0.1, 0], radius: 0.02, ao: 0 });                                                      // coping, top = y1
  const sw = B(), lx = rng.sign() * (hx - 1.7);
  sw.cyl(0.02, 0.02, 0.4, IRON, { p: [lx, y0 - 0.2, D / 2 + 0.3], seg: 3, ao: 0 }).box(0.9, 0.4, 0.06, 0x14182a, { p: [lx, y0 - 0.6, D / 2 + 0.3], radius: 0.02 }).box(0.7, 0.2, 0.08, RED, { p: [lx, y0 - 0.6, D / 2 + 0.32], radius: 0.02, ao: 0 });
  return { geo: b.build(), sway: [{ geo: sw.build(), pivot: [lx, y0, D / 2 + 0.3], amp: 0.1, speed: 1.8, phase: rng.range(0, 6) }] };
}
const C0 = 0xb8b0a0;

// ---- 3. highway-sign gantry: two steel posts, a truss with a big green sign, white border and an arrow; a traffic light on a chain
function signGantry(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.5, y1 + 0.9, 0.5, STEEL, { p: [sd * (hx - 0.3), (y1 - 0.9) / 2, 0], radius: 0.03 }); b.box(0.9, 0.3, 0.9, 0x7a8090, { p: [sd * (hx - 0.3), 0.15, 0], radius: 0.03, ao: 0 }); }
  b.box(W - 1.2, H, D, 0x1f7a4a, { p: [0, (y0 + y1) / 2, 0], radius: 0.03, ao: 0.05 });
  b.box(W - 1.5, H - 0.25, 0.06, 0x2a9a60, { p: [0, (y0 + y1) / 2, D / 2 + 0.02], radius: 0.02, ao: 0 }).box(W - 1.5, H - 0.25, 0.06, 0x2a9a60, { p: [0, (y0 + y1) / 2, -D / 2 - 0.02], radius: 0.02, ao: 0 });
  for (const z of [-D / 2 - 0.05, D / 2 + 0.05]) { b.box(W - 1.4, 0.07, 0.04, 0xf2f2f2, { p: [0, y1 - 0.12, z], radius: 0.005, ao: 0 }).box(W - 1.4, 0.07, 0.04, 0xf2f2f2, { p: [0, y0 + 0.12, z], radius: 0.005, ao: 0 });
    for (let i = 0; i < 5; i++) b.box(0.34, H * 0.34, 0.04, 0xf2f2f2, { p: [-1.6 + i * 0.55, (y0 + y1) / 2 + H * 0.1, z], radius: 0.01, ao: 0 });                                      // sign text blocks
    b.box(0.9, 0.16, 0.04, 0xf2f2f2, { p: [1.8, (y0 + y1) / 2 - H * 0.22, z], radius: 0.01, ao: 0 }).cone(0.18, 0.4, 0xf2f2f2, { p: [2.4, (y0 + y1) / 2 - H * 0.22, z], r: [0, 0, -Math.PI / 2], seg: 3, ao: 0 }); }
  b.box(W - 1.2, 0.14, D + 0.1, 0x9aa0b0, { p: [0, y1 - 0.07, 0], radius: 0.01, ao: 0 });                                              // top rail, top = y1
  const lb = B(), lx = rng.sign() * (hx - 1.6);
  lb.cyl(0.02, 0.02, 0.5, IRON, { p: [lx, y0 - 0.25, D / 2 + 0.25], seg: 3, ao: 0 }).box(0.4, 1.0, 0.3, 0x1a1c24, { p: [lx, y0 - 0.95, D / 2 + 0.25], radius: 0.05 });
  [[RED, 0.2], [AMB, 0], [GRN, -0.2]].forEach(([c, dy], i) => lb.sphere(0.11, i === 0 ? c : new THREE.Color(0.25, 0.2, 0.15), { p: [lx, y0 - 0.95 + dy * 1.3, D / 2 + 0.42], s: [1, 1, 0.6], ao: 0 }));
  return { geo: b.build(), sway: [{ geo: lb.build(), pivot: [lx, y0, D / 2 + 0.25], amp: 0.12, speed: 1.5, phase: rng.range(0, 6) }] };
}

const VARIANTS = [scaffold, storefront, signGantry];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) { return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth); }
