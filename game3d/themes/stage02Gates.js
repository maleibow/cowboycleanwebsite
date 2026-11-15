import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';

// Stage 2 slide-under gates (PLAN 4.2), same frame as stage01Gates.js: x across (centred, width W), y ABSOLUTE height, z along the
// track (centred, depth D). The solid part fills the hitbox exactly (underside y0, top y1, ends +-W/2, depth D); everything below y0
// stays open between the end posts. Variants: 1 log gate, 2 stone totem lintel, 3 bamboo scaffold. Glow = vertex colours above 1.
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const ROPE = 0xd6c08a, VINE = 0x2f8f46, GLYPH = new THREE.Color(0.35, 1.9, 0.9), LAMP = new THREE.Color(1.4, 3.2, 0.9);
// a cylinder lying along x (log) or z, built from a pre-rotated geometry so Builder only has to place it
const logX = (r, len, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2);

// vine curtain: hanging strands with leaves, as a sway part pivoted at the top
function curtain(rng, W, yTop, drop, D, n) {
  const sb = B(), xs = [];
  for (let i = 0; i < n; i++) {
    const x = (-0.42 + (0.84 * (i + rng.range(0.15, 0.85))) / n) * W, l = drop * rng.range(0.6, 1), z = D / 2 + 0.06 * (i % 2 ? 1 : -1);
    sb.cyl(0.035, 0.045, l, VINE, { p: [x, yTop - l / 2, z], seg: 4, ao: 0 }).add(new THREE.IcosahedronGeometry(0.13, 0), tone(0x57c25a, 1 + (i % 3) * 0.1), { p: [x, yTop - l, z], s: [1.4, 0.6, 1], ao: 0 });
    if (l > 1.2) sb.add(new THREE.IcosahedronGeometry(0.1, 0), 0x3fa84a, { p: [x + 0.1, yTop - l * 0.55, z], s: [1.4, 0.6, 1], ao: 0 });
    xs.push(x);
  }
  return { geo: sb.build(), pivot: [0, yTop, D / 2], amp: 0.06, speed: 1.3, phase: rng.range(0, 6) };
}

// ---- 1. log gate: two mossy stumps, two stacked lashed logs, a moss cap with mushrooms
function logGate(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, bark = rng.pick([0x6a4a2e, 0x5d4037, 0x74502f]), r = Math.min(0.6, D / 2), H = y1 - y0;
  for (const sd of [-1, 1]) {
    b.cyl(0.55, 0.7, y1 + 1.0, bark, { p: [sd * (hx - 0.55), (y1 - 1.0) / 2, 0], seg: 9, jitter: 0.05 });
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + sd; b.cone(0.22, 1.1, tone(bark, 0.8), { p: [sd * (hx - 0.55) + Math.cos(a) * 0.7, -0.1, Math.sin(a) * 0.5], r: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], seg: 4, ao: 0 }); }
    b.sphere(0.45, 0x4f9a46, { p: [sd * (hx - 0.55), y1 + 0.2, 0.1], s: [1.1, 0.5, 1], jitter: 0.06, ao: 0 });
  }
  const rows = Math.max(2, Math.round(H / 1.05)), rh = (H - 0.5) / rows;
  for (let i = 0; i < rows; i++) {
    const yc = y0 + rh * (i + 0.5), rr = Math.min(r, rh * 0.62);
    b.add(logX(rr, W - 0.6), tone(bark, 0.9 + (i % 2) * 0.22), { p: [0, yc, i % 2 ? 0.04 : -0.04], s: [1, 1, Math.min(1.3, r / rr)], jitter: 0.02 });
    for (const sd of [-1, 1]) b.cyl(rr * 0.97, rr * 0.97, 0.05, 0xc9a672, { p: [sd * (hx - 0.3), yc, 0], r: [0, 0, Math.PI / 2], seg: 9, ao: 0 });   // pale cut ends
  }
  for (const x of [-0.28, 0.1, 0.34]) for (const y of [y0 + 0.5, y1 - 0.8]) b.box(0.16, 0.2, D + 0.14, ROPE, { p: [x * W, y, 0], radius: 0.04, ao: 0 });   // rope lashings
  b.box(W - 0.9, 0.5, D, 0x3f8a44, { p: [0, y1 - 0.25, 0], radius: 0.16, jitter: 0.04, ao: 0 });                                  // moss cap, top = y1
  for (const [x, h] of [[-0.3, 0.5], [-0.1, 0.35], [0.28, 0.45]]) b.cyl(0.05, 0.07, h, 0xe9f6d4, { p: [x * W, y1 + h / 2 - 0.1, 0.05], seg: 5 }).add(new THREE.SphereGeometry(0.2, 7, 4, 0, 6.283, 0, 1.5), GLYPH, { p: [x * W, y1 + h - 0.1, 0.05], ao: 0 });
  return { geo: b.build(), sway: [curtain(rng, W - 1.2, y0 + 0.5, 1.7, D, 6)] };
}

// ---- 2. stone totem gate: two carved pillars with glowing eyes, a full-height lintel carved with glyph rows, mossy
function totemGate(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, st = rng.pick([0x8a9a82, 0x7d8f7a, 0x94a28c]), dk = tone(st, 0.6), lt = tone(st, 1.2), H = y1 - y0;
  for (const sd of [-1, 1]) {
    const px = sd * (hx - 0.5);
    b.box(1.0, y1 + 0.9, D * 0.9, st, { p: [px, (y1 - 0.9) / 2, 0], radius: 0.06, jitter: 0.03, ao: 0.1 });
    b.box(1.15, 0.28, D, lt, { p: [px, y1 - 0.4, 0], radius: 0.05, ao: 0 }).box(1.15, 0.28, D, dk, { p: [px, 0.3, 0], radius: 0.05, ao: 0 });
    for (const sy of [1, -1]) b.box(0.62, 0.14, 0.1, GLYPH, { p: [px, y0 + H / 2 + sy * 0.28 + 0.2, D * 0.45 + 0.02], radius: 0.02, ao: 0 });                 // glowing eyes
    b.box(0.5, 0.1, 0.1, dk, { p: [px, y0 + H / 2 - 0.35, D * 0.45 + 0.02], radius: 0.02, ao: 0 });
  }
  b.box(W - 1.9, H, D, st, { p: [0, (y0 + y1) / 2, 0], radius: 0.05, jitter: 0.02, ao: 0.1 });                                            // the lintel, exactly the hitbox
  b.box(W - 1.9, 0.26, D + 0.08, lt, { p: [0, y1 - 0.13, 0], radius: 0.03, ao: 0 }).box(W - 1.9, 0.26, D + 0.08, dk, { p: [0, y0 + 0.13, 0], radius: 0.03, ao: 0 });
  const n = Math.max(4, Math.round((W - 3) / 0.7));
  for (let i = 0; i < n; i++) { const x = -(W - 3) / 2 + (i + 0.5) * ((W - 3) / n); b.box(0.3, H - 0.9, 0.08, i % 3 ? dk : GLYPH, { p: [x, (y0 + y1) / 2, D / 2 + 0.02], radius: 0.02, ao: 0 }); if (i % 2) b.box(0.3, 0.3, 0.09, GLYPH, { p: [x, (y0 + y1) / 2 + 0.55, D / 2 + 0.03], radius: 0.02, ao: 0 }); }
  b.sphere(0.5, 0x3f8a44, { p: [-hx + 1.7, y1, 0], s: [1.6, 0.45, 1], jitter: 0.05, ao: 0 }).sphere(0.45, 0x4f9a46, { p: [hx - 2.4, y1, 0], s: [1.6, 0.45, 1], jitter: 0.05, ao: 0 });
  return { geo: b.build(), sway: [curtain(rng, W - 2.6, y0, 1.5, D, 5)] };
}

// ---- 3. bamboo scaffold: lashed bamboo ladder-frame with a thatch banner and a swinging spore lantern
function bambooGate(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, bam = rng.pick([0x9ab64a, 0x8fae44, 0xa8c456]), joint = tone(bam, 0.6), H = y1 - y0;
  for (const sd of [-1, 1]) for (const k of [0, 1]) {
    const px = sd * (hx - 0.3 - k * 0.42), h = y1 + 1.0 + k * 0.5;
    b.cyl(0.19, 0.21, h, bam, { p: [px, (y1 - 1.0 + k * 0.5) / 2 + (k ? 0.25 : 0), 0], seg: 8, jitter: 0.015 });
    for (let y = 0.5; y < h - 0.6; y += 0.85) b.cyl(0.235, 0.235, 0.09, joint, { p: [px, y - 0.8, 0], seg: 8, ao: 0 });
  }
  const rows = Math.max(4, Math.round(H / 0.5)), rh = H / rows;
  for (let i = 0; i < rows; i++) b.add(logX(Math.min(0.2, rh * 0.5), W - 1.5, 8), i % 2 ? bam : tone(bam, 1.1), { p: [0, y0 + rh * (i + 0.5), (i % 2) * 0.07 - 0.03], s: [1, 1, Math.min(1.4, D / 0.6)] });
  for (const x of [-0.3, 0.0, 0.3]) b.box(0.13, H + 0.1, D + 0.16, ROPE, { p: [x * W, (y0 + y1) / 2, 0], radius: 0.03, ao: 0 });         // vertical lashings
  b.box(W - 1.2, 0.18, D, tone(bam, 0.8), { p: [0, y1 - 0.09, 0], radius: 0.03, ao: 0 });                                         // top rail, top = y1
  const sx = rng.range(-0.22, 0.22) * W, tb = B();                                                                                // woven banner hung in front, painted with a warning stripe
  tb.box(1.8, 0.95, 0.1, 0xd9c690, { p: [sx, y1 - 1.0, D / 2 + 0.1], radius: 0.03 }).box(1.8, 0.14, 0.12, 0x2a5a2a, { p: [sx, y1 - 1.35, D / 2 + 0.11], radius: 0.01, ao: 0 }).box(1.8, 0.14, 0.12, 0x2a5a2a, { p: [sx, y1 - 0.65, D / 2 + 0.11], radius: 0.01, ao: 0 })
    .box(0.55, 0.1, 0.12, 0xc03a2e, { p: [sx - 0.25, y1 - 1.0, D / 2 + 0.12], r: [0, 0, -0.7], radius: 0.01, ao: 0 }).box(0.55, 0.1, 0.12, 0xc03a2e, { p: [sx + 0.25, y1 - 1.0, D / 2 + 0.12], r: [0, 0, 0.7], radius: 0.01, ao: 0 });
  const lx = rng.sign() * (hx - 1.4), lb = B();
  lb.cyl(0.02, 0.02, 0.5, ROPE, { p: [lx, y0 - 0.25 + 0.0, 0.2], seg: 3, ao: 0 }).add(new THREE.SphereGeometry(0.2, 8, 6), LAMP, { p: [lx, y0 - 0.65, 0.2], s: [1, 1.2, 1], ao: 0 }).cone(0.13, 0.12, 0x4a3a20, { p: [lx, y0 - 0.38, 0.2], seg: 6, ao: 0 });
  return { geo: b.build(), sway: [{ geo: tb.build(), pivot: [sx, y1 - 0.5, D / 2 + 0.1], amp: 0.07, speed: 1.6, phase: rng.range(0, 6) }, { geo: lb.build(), pivot: [lx, y0, 0.2], amp: 0.09, speed: 1.5, phase: rng.range(0, 6) }] };
}

const VARIANTS = [logGate, totemGate, bambooGate];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) { return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth); }
