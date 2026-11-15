import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { BAND, SPARK } from './stage07Props.js';

// Stage 7 slide-under gates (PLAN 4.2), same frame as stage01Gates.js: x across (centred, width W), y ABSOLUTE height, z along the track (centred, depth D). The solid fills the hitbox
// exactly (underside y0, top y1, ends +-W/2, depth D); the space below y0 stays open.
// Variants: 1 puffy cloud bank with a rainbow underside and dangling raindrops, 2 candy-cane frame with a striped bar and gumdrops, 3 tiki palm-log lintel with a flower garland and a swinging coconut.
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });

function cloudBank(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) b.sphere(0.6 + (k % 2) * 0.15, 0xffffff, { p: [sd * (hx - 0.6), 0.5 + k * ((y1 + 0.7) / 3), 0], s: [1, 1.2, 1], jitter: 0.06, ao: 0.1 });   // two cloud pillars
  const n = Math.round(W / 1.2);
  for (let i = 0; i < n; i++) { const x = -hx + 0.6 + (i + 0.5) * ((W - 1.2) / n); b.sphere(H * 0.5 + (i % 3) * 0.08, i % 2 ? 0xffffff : 0xeef4ff, { p: [x, y0 + H * 0.5, 0], s: [1.15, 1, D * 0.6 / (H * 0.5)], jitter: 0.07, ao: 0.1 }); }   // the bank: a row of overlapping puffs
  b.box(W - 1.4, 0.2, D, 0xffffff, { p: [0, y1 - 0.1, 0], radius: 0.06, ao: 0 });                                              // flat top, top = y1
  for (let i = 0; i < 7; i++) b.box((W - 1.6) / 7 - 0.02, 0.1, D * 0.8, BAND[i], { p: [-(W - 1.6) / 2 + (i + 0.5) * ((W - 1.6) / 7), y0 + 0.05, 0], radius: 0.02, ao: 0 });   // the rainbow underside
  const sb = B(), dx = rng.range(-0.3, 0.3) * W;
  sb.add(new THREE.ConeGeometry(0.08, 0.3, 5), 0x7fd8ff, { p: [dx, y0 - 0.25, D / 2 - 0.1], r: [Math.PI, 0, 0], ao: 0 }).sphere(0.09, 0x7fd8ff, { p: [dx, y0 - 0.42, D / 2 - 0.1], ao: 0 });
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [dx, y0, D / 2 - 0.1], amp: 0.08, speed: 2.2, phase: rng.range(0, 6) }] };
}

function candy(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { for (let i = 0; i < Math.ceil((y1 + 0.9) / 0.4); i++) b.cyl(0.26, 0.26, 0.4, i % 2 ? 0xffffff : 0xff3b6a, { p: [sd * (hx - 0.5), 0.2 + i * 0.4, 0], seg: 8, ao: 0 }); b.sphere(0.34, sd > 0 ? 0xffe135 : 0x34c759, { p: [sd * (hx - 0.5), y1 + 1.15, 0], ao: 0 }); }   // candy-cane posts with gumdrop tops
  const n = Math.round((W - 1.6) / 0.5);
  for (let i = 0; i < n; i++) b.box((W - 1.6) / n - 0.01, H, D, i % 2 ? 0xffffff : 0xff3b6a, { p: [-(W - 1.6) / 2 + (i + 0.5) * ((W - 1.6) / n), (y0 + y1) / 2, 0], r: [0, 0, 0], radius: 0.05, ao: 0.05 });   // a striped bar
  b.box(W - 1.6, 0.14, D + 0.1, 0xffffff, { p: [0, y1 - 0.07, 0], radius: 0.03, ao: 0 });
  for (let i = 0; i < 6; i++) b.sphere(0.13, [0xffe135, 0x7fd8ff, 0xaf52de][i % 3], { p: [-1.6 + i * 0.64, y1 + 0.1, 0], s: [1, 0.8, 1], ao: 0 });   // gumdrops along the top
  const sb = B(), lx = rng.sign() * (hx - 1.7);
  sb.cyl(0.015, 0.015, 0.45, 0xf2efe6, { p: [lx, y0 - 0.22, 0], seg: 3, ao: 0 }); for (let k = 0; k < 6; k++) sb.cyl(0.16, 0.16, 0.12, BAND[k], { p: [lx, y0 - 0.5 - k * 0.0, 0], seg: 7, ao: 0, s: [1 - k * 0.12, 1, 1 - k * 0.12] });   // a hanging swirl lollipop
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [lx, y0, 0], amp: 0.12, speed: 1.6, phase: rng.range(0, 6) }] };
}

function tiki(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0, WOOD = 0xb8864a;
  for (const sd of [-1, 1]) { b.cyl(0.42, 0.5, y1 + 0.9, WOOD, { p: [sd * (hx - 0.5), (y1 + 0.9) / 2 - 0.2, 0], seg: 7, jitter: 0.03 }); b.box(0.6, 0.5, 0.3, 0x8a5a2a, { p: [sd * (hx - 0.5), y1 * 0.5, 0.42], radius: 0.05 }); b.box(0.4, 0.12, 0.08, 0x1c1410, { p: [sd * (hx - 0.5), y1 * 0.5 + 0.1, 0.6], radius: 0.01, ao: 0 }); }   // carved faces
  b.cyl(H * 0.5, H * 0.5, W - 1.0, WOOD, { p: [0, (y0 + y1) / 2, 0], r: [0, 0, Math.PI / 2], seg: 8, s: [1, 1, D / H], jitter: 0.03, ao: 0.1 });         // the palm-log lintel
  for (let i = 0; i < 6; i++) b.box(0.1, H * 0.9, D + 0.04, 0x8a5a2a, { p: [-2 + i * 0.8, (y0 + y1) / 2, 0], radius: 0.01, ao: 0 });
  for (let i = 0; i < 9; i++) b.sphere(0.17, [0xff9ad5, 0xffe36a, 0xc9a0ff, 0xff7a4a][i % 4], { p: [-(W - 2) / 2 + i * ((W - 2) / 8), y0 + 0.1 + Math.abs(Math.sin(i * 1.3)) * 0.1, D / 2 + 0.1], s: [1, 0.8, 0.6], ao: 0 });   // flower garland
  b.box(W - 1.0, 0.14, D + 0.1, tone(WOOD, 1.2), { p: [0, y1 - 0.05, 0], radius: 0.03, ao: 0 });
  for (let i = 0; i < 4; i++) b.cone(0.2, 0.9, 0x2fae5a, { p: [-1.5 + i, y1 + 0.35, 0], r: [0, 0, (i - 1.5) * 0.3], seg: 4, ao: 0 });
  const sb = B(), cx = rng.sign() * (hx - 1.6);
  sb.cyl(0.015, 0.015, 0.4, 0x6a4a2a, { p: [cx, y0 - 0.2, 0], seg: 3, ao: 0 }).sphere(0.2, 0x6a4a2a, { p: [cx, y0 - 0.5, 0], ao: 0 }).sphere(0.04, SPARK, { p: [cx - 0.1, y0 - 0.42, 0.14], ao: 0 });
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [cx, y0, 0], amp: 0.14, speed: 1.8, phase: rng.range(0, 6) }] };
}

const VARIANTS = [cloudBank, candy, tiki];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) { return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth); }
