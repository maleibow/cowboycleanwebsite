import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';

// Stage 1 slide-under gates (PLAN 4.2). Each builder works in the box's own frame: x across the track (centred), y ABSOLUTE
// height, z along the track (centred, depth D). The solid part fills the hitbox exactly: underside y0, top y1, ends at
// +-W/2, depth D. Everything below y0 stays open between the end posts, so the gap reads from the default camera.
// Returns { geo, sway?: [{ geo, pivot:[x,y,z], amp, speed, phase }] } (swaying parts are authored in the same frame).
// Glowing bits (the lantern) use vertex colours above 1.0, so they need no extra material or draw call; bloom picks them up.
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1 });
const IRON = 0x2a2420, LAMP = new THREE.Color(3.2, 2.1, 0.7);

// ---- 1. timber ranch gate: two posts, heavy crossbeams, a plank panel and a swaying "duck" sign
function timberGate(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, wood0 = rng.pick([0x8a5a33, 0x9a6a3c, 0x7a4c2a]), wood = tone(wood0, 1.08), dark = tone(wood0, 0.62), light = tone(wood0, 1.3);
  const bot = y0 + 0.62, top = y1 - 0.62, pw0 = W - 1.24, n = Math.max(4, Math.round(pw0 / 0.5)), pw = pw0 / n;
  for (const sd of [-1, 1]) {
    b.box(0.62, y1 + 0.8, 0.95, wood, { p: [sd * (hx - 0.31), (y1 - 0.8) / 2, 0], radius: 0 })
      .box(0.62, 0.14, 1.02, IRON, { p: [sd * (hx - 0.31), y0 + 0.31, 0], radius: 0, ao: 0 })
      .box(0.62, 0.14, 1.02, IRON, { p: [sd * (hx - 0.31), y1 - 0.31, 0], radius: 0, ao: 0 });
  }
  b.box(W, 0.62, 1.0, dark, { p: [0, y0 + 0.31, 0], radius: 0 }).box(W, 0.62, D, wood, { p: [0, y1 - 0.31, 0], radius: 0 });   // lower beam (underside = y0), top beam (top = y1)
  for (let i = 0; i < n; i++) b.box(pw - 0.04, top - bot, 0.5, i % 2 ? light : wood, { p: [-hx + 0.62 + (i + 0.5) * pw, (top + bot) / 2, 0], radius: 0.02 });
  for (const z of [-0.3, 0.3]) for (const sd of [-1, 1]) {   // Z-braces on both faces
    const ax = sd * (hx - 0.62), ay = bot + 0.12, bx = 0, by = top - 0.12, L = Math.hypot(bx - ax, by - ay);
    b.box(L, 0.2, 0.1, dark, { p: [(ax + bx) / 2, (ay + by) / 2, z], r: [0, 0, Math.atan2(by - ay, bx - ax)], radius: 0.02 });
  }
  const sx = rng.range(-0.28, 0.28) * W, sgn = rng.sign(), cream = 0xe9d9a8, red = rng.pick([0x8a2e2e, 0x2e5a7a, 0x4a6a2e]), sb = B();
  sb.box(0.05, 0.5, 0.05, IRON, { p: [sx - 0.55, top - 0.25, 0.42], ao: 0 }).box(0.05, 0.5, 0.05, IRON, { p: [sx + 0.55, top - 0.25, 0.42], ao: 0 })
    .box(1.9, 0.82, 0.12, red, { p: [sx, top - 0.91, 0.42], radius: 0.03 })
    .box(1.9, 0.07, 0.14, cream, { p: [sx, top - 0.54, 0.42], radius: 0.01, ao: 0 }).box(1.9, 0.07, 0.14, cream, { p: [sx, top - 1.28, 0.42], radius: 0.01, ao: 0 })
    .box(0.62, 0.12, 0.14, cream, { p: [sx - 0.3, top - 0.92, 0.42], r: [0, 0, -0.7 * sgn], radius: 0.01, ao: 0 }).box(0.62, 0.12, 0.14, cream, { p: [sx + 0.3, top - 0.92, 0.42], r: [0, 0, 0.7 * sgn], radius: 0.01, ao: 0 }); // chevron
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [sx, top, 0.42], amp: 0.11, speed: 1.7, phase: rng.range(0, 6) }] };
}

// ---- 2. hitching rail: log posts, the rail itself at the underside, a striped canvas awning, rope rings, a lantern
function hitchingRail(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, log = rng.pick([0x7a4c2a, 0x6a4226, 0x8a5a33]), cloth = [0xf6e9c8, rng.pick([0xe0482a, 0x2f8fb0, 0x7aa83a])];
  for (const sd of [-1, 1]) b.cyl(0.26, 0.3, y1 + 0.8, log, { p: [sd * (hx - 0.3), (y1 - 0.8) / 2, 0], seg: 12 }).cyl(0.31, 0.31, 0.12, IRON, { p: [sd * (hx - 0.3), y1 - 0.5, 0], seg: 12, ao: 0 });
  b.box(W, 0.6, D, tone(log, 0.8), { p: [0, y1 - 0.3, 0], radius: 0 });                                   // header beam, top = y1
  b.cyl(0.3, 0.3, W, log, { p: [0, y0 + 0.3, 0], r: [0, 0, Math.PI / 2], seg: 12 });                          // the rail, underside = y0
  const yb = y0 + 0.55, yt = y1 - 0.6, ns = Math.max(6, Math.round((W - 1.2) / 0.55)), sw = (W - 1.2) / ns, ph = rng.range(0, 6);
  for (let i = 0; i < ns; i++) b.box(sw - 0.01, yt - yb, 0.14, cloth[i % 2], { p: [-hx + 0.6 + (i + 0.5) * sw, (yt + yb) / 2, -0.1 + Math.sin(i * 0.9 + ph) * 0.09], radius: 0, ao: 0 });
  const rope = 0xcdb98a, ropeAt = [-0.3, 0.05, 0.32].map((k) => k * W);
  for (const x of ropeAt) b.add(new THREE.TorusGeometry(0.34, 0.05, 5, 10), rope, { p: [x, y0 + 0.3, 0], r: [0, Math.PI / 2, 0], ao: 0 });
  for (const x of [ropeAt[0], ropeAt[2]]) b.box(0.06, 0.3, 0.06, rope, { p: [x, y0 - 0.1, 0.3], ao: 0 }).sphere(0.07, rope, { p: [x, y0 - 0.27, 0.3], ao: 0 });   // loose rope ends
  const lx = rng.sign() * (hx - 1.25), ly = y1 - 0.6, lb = B(), lz = 0.45, sway = [];                           // lantern on a short chain
  lb.box(0.04, 0.3, 0.04, IRON, { p: [lx, ly - 0.15, lz], ao: 0 }).cone(0.2, 0.16, IRON, { p: [lx, ly - 0.38, lz], seg: 4, ao: 0 })
    .box(0.3, 0.05, 0.3, IRON, { p: [lx, ly - 0.77, lz], ao: 0 });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lb.box(0.04, 0.36, 0.04, IRON, { p: [lx + sx * 0.14, ly - 0.58, lz + sz * 0.14], ao: 0 });
  lb.box(0.22, 0.32, 0.22, LAMP, { p: [lx, ly - 0.58, lz], ao: 0, radius: 0.05 });
  sway.push({ geo: lb.build(), pivot: [lx, ly, lz], amp: 0.07, speed: 1.4, phase: rng.range(0, 6) });
  return { geo: b.build(), sway };
}

// ---- 3. leaning rock slab: a long slab propped on a boulder at one end and a tall rock pillar at the other, rubble above
function rockSlab(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, f = rng.sign(), a = rng.range(0.06, 0.1), t = 0.9, th = f * a, rock = rng.pick([0x9a7488, 0x8a6a80, 0xa07a8a]);
  const Ls = (W - t * Math.sin(a)) / Math.cos(a), yc = y0 + (Ls / 2) * Math.sin(a) + (t / 2) * Math.cos(a);   // slab ends at +-W/2, lowest corner exactly y0
  const surf = (x) => yc + x * Math.tan(th) + t / (2 * Math.cos(th));                                          // slab top surface height at lateral x
  const ICO = new THREE.IcosahedronGeometry(1, 1), low = -f, high = f, dk = tone(rock, 0.62);
  b.box(Ls, t, D, rock, { p: [0, yc, 0], r: [0, 0, th], radius: 0, ao: 0.12 });
  for (let i = 0; i < 3; i++) b.box(Ls, 0.07, D + 0.02, i % 2 ? dk : tone(rock, 1.2), { p: [0, yc - 0.28 + i * 0.28, 0], r: [0, 0, th], radius: 0, ao: 0 });   // strata bands
  for (let i = 0; i < 4; i++) { const u = rng.range(-0.4, 0.4) * Ls; b.box(0.07, rng.range(0.4, 0.7), 0.05, dk, { p: [u, yc + (u * Math.tan(th)), D / 2 + 0.01], r: [0, 0, th + rng.range(-0.5, 0.5)], radius: 0, ao: 0 }); }   // cracks
  b.add(ICO, tone(rock, 0.8), { p: [low * (hx + 0.1), (y0 - 0.5) / 2, 0.05], s: [0.8, (y0 + 0.5) / 2, 0.8], jitter: 0.2 })                      // the prop boulder under the low end
    .add(ICO, tone(rock, 0.65), { p: [low * (hx + 0.15), -0.2, 0.3], s: [0.6, 0.5, 0.5], jitter: 0.14 });
  b.box(0.7, y1 + 0.5, D * 0.95, tone(rock, 0.78), { p: [high * (hx - 0.35), (y1 - 0.5) / 2, 0], radius: 0, ao: 0.12 });                       // tall pillar at the high end
  const n = rng.pick([3, 4]), xa = -hx + 0.8, xb = hx - 0.8, w = (xb - xa) / n;
  for (let i = 0; i < n; i++) {                                                                                  // lumpy boulders between slab and capstone
    const x = xa + (i + 0.5) * w, lo = Math.min(surf(x - w / 2), surf(x + w / 2)) - 0.1, hi = y1 - 0.3, hh = (hi - lo) / 2;
    b.add(ICO, tone(rock, 0.78 + (i % 2) * 0.22), { p: [x, lo + hh, 0], s: [w * 0.62, hh * 1.05, D * 0.52], jitter: 0.22, ao: 0.1 });
  }
  b.box(W - 1.0, 0.42, D, tone(rock, 1.22), { p: [0, y1 - 0.21, 0], radius: 0, ao: 0 });                          // capstone: top = y1
  return { geo: b.build() };
}

const VARIANTS = [timberGate, hitchingRail, rockSlab];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) {
  return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth);
}
