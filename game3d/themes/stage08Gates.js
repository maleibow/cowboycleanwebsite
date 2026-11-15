import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { SPARK } from './stage08Props.js';

// Stage 8 slide-under gates (PLAN 4.2), same frame as stage01Gates.js: x across (centred, width W), y ABSOLUTE height, z along the track (centred, depth D). The solid fills the hitbox
// exactly (underside y0, top y1, ends +-W/2, depth D); the space below y0 stays open.
// Variants: 1 a four-poster bed frame with a fat quilted pillow for the bar, 2 a baby mobile: a gold crescent bar with stars dangling under it, 3 a slate storm cloud with rain streaks and a lightning bolt.
const B = () => new Builder({ boxSeg: 1, ico: true });
const BOLT = new THREE.Color(2.2, 1.9, 0.6);

function bedPillow(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.cyl(0.22, 0.26, y1 + 0.7, 0xf2d8b8, { p: [sd * (hx - 0.4), (y1 + 0.7) / 2 - 0.1, 0], seg: 8, ao: 0.1 }); b.sphere(0.34, 0xffd9a0, { p: [sd * (hx - 0.4), y1 + 0.85, 0], ao: 0 }); b.cyl(0.35, 0.35, 0.18, 0xffc2dc, { p: [sd * (hx - 0.4), y0 - 0.3, 0], seg: 8, ao: 0 }); }   // bedposts with ball finials
  b.box(W - 1.1, H, D, 0xfff4fa, { p: [0, (y0 + y1) / 2, 0], radius: Math.min(H, D) * 0.42, jitter: 0.015, ao: 0.08 });                    // the pillow
  for (let i = 0; i < 6; i++) b.box(0.06, H * 0.84, D + 0.03, i % 2 ? 0xffc2dc : 0xc2e4ff, { p: [-(W - 2.2) / 2 + i * ((W - 2.2) / 5), (y0 + y1) / 2, 0], radius: 0.02, ao: 0 });   // quilted stripes
  b.box(W - 1.1, 0.04, D * 0.6, SPARK, { p: [0, y1 - 0.02, 0], radius: 0.01, ao: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.sphere(0.12, 0xffc2dc, { p: [sx * (hx - 0.65), y0 + 0.08, sz * (D / 2 - 0.1)], s: [1, 1.4, 1], ao: 0 });   // corner tassels
  const sb = B(), zx = rng.range(-0.25, 0.25) * W;
  sb.sphere(0.13, 0xffffff, { p: [zx, y0 - 0.2, 0], s: [1, 1.3, 1], ao: 0 }); sb.cyl(0.012, 0.012, 0.2, 0xf2efe6, { p: [zx, y0 - 0.1, 0], seg: 3, ao: 0 });   // a dangling cloud-bead
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [zx, y0, 0], amp: 0.1, speed: 1.4, phase: rng.range(0, 6) }] };
}

function mobile(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.cyl(0.16, 0.2, y1 + 0.6, 0xe6d4f5, { p: [sd * (hx - 0.45), (y1 + 0.6) / 2 - 0.1, 0], seg: 6, ao: 0.1 }); b.add(new THREE.TorusGeometry(0.34, 0.09, 5, 14, Math.PI * 1.5), 0xfff0b8, { p: [sd * (hx - 0.45), y1 + 0.75, 0], r: [0, 0, sd * 0.7], ao: 0 }); }   // crescent finials
  b.box(W - 1.0, H, D, 0xfff0b8, { p: [0, (y0 + y1) / 2, 0], radius: Math.min(H, D) * 0.38, ao: 0.08 });                    // the gold crescent bar
  for (let i = 0; i < 7; i++) b.sphere(H * 0.32, i % 2 ? 0xffe38a : 0xffd0f0, { p: [-(W - 2) / 2 + i * ((W - 2) / 6), y1 - 0.02, 0], s: [1, 0.55, D * 0.5 / (H * 0.32)], ao: 0 });
  b.box(W - 1.0, 0.05, D * 0.7, SPARK, { p: [0, y1 - 0.03, 0], radius: 0.01, ao: 0 });
  const sb = B(); const xs = [-0.32, 0, 0.32];
  xs.forEach((f, k) => { const x = f * W, len = 0.4 + (k % 2) * 0.22; sb.cyl(0.012, 0.012, len, 0xf2efe6, { p: [x, y0 - len / 2, 0], seg: 3, ao: 0 }); sb.add(new THREE.OctahedronGeometry(0.17, 0), k % 2 ? 0xc2e4ff : SPARK, { p: [x, y0 - len - 0.12, 0], s: [1, 1.3, 0.5], ao: 0 }); });
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [0, y0, 0], amp: 0.13, speed: 1.7, phase: rng.range(0, 6) }] };
}

function stormBank(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) b.sphere(0.58 + (k % 2) * 0.16, k % 2 ? 0x8a8cb8 : 0x9a9cc8, { p: [sd * (hx - 0.6), 0.5 + k * ((y1 + 0.6) / 3), 0], s: [1, 1.2, 1], jitter: 0.06, ao: 0.15 });   // two slate pillars of cloud
  const n = Math.round(W / 1.1);
  for (let i = 0; i < n; i++) { const x = -hx + 0.55 + (i + 0.5) * ((W - 1.1) / n); b.sphere(H * 0.52 + (i % 3) * 0.08, i % 2 ? 0x7b7ea8 : 0x9396c0, { p: [x, y0 + H * 0.5, 0], s: [1.15, 1, D * 0.6 / (H * 0.5)], jitter: 0.07, ao: 0.2 }); }
  b.box(W - 1.4, 0.2, D, 0xa9acd0, { p: [0, y1 - 0.1, 0], radius: 0.06, ao: 0 });
  for (let i = 0; i < 9; i++) b.cyl(0.015, 0.015, 0.35 + (i % 3) * 0.12, 0xbfe0ff, { p: [-hx + 1 + i * ((W - 2) / 8), y0 - 0.12 - (i % 3) * 0.04, rng.range(-0.3, 0.3)], seg: 3, ao: 0 });   // rain streaks
  const sb = B(), bx = rng.sign() * (hx - 1.7);
  sb.cone(0.14, 0.55, BOLT, { p: [bx, y0 - 0.3, 0], r: [Math.PI, 0, 0.35], seg: 4, ao: 0 }).cone(0.1, 0.4, BOLT, { p: [bx + 0.1, y0 - 0.7, 0], r: [Math.PI, 0, -0.4], seg: 4, ao: 0 });   // a zig-zag bolt
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [bx, y0, 0], amp: 0.1, speed: 2.4, phase: rng.range(0, 6) }] };
}

const VARIANTS = [bedPillow, mobile, stormBank];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) { return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth); }
