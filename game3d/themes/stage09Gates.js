import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { GLOW, STONES } from './stage09Props.js';

// Stage 9 slide-under gates (PLAN 4.2), same frame as stage01Gates.js: x across (centred, width W), y ABSOLUTE height, z along the track (centred, depth D). The solid fills the hitbox
// exactly (underside y0, top y1, ends +-W/2, depth D); the space below y0 stays open.
// Variants: 1 a mossy stone crypt lintel with a carved skull and a swinging chain lantern, 2 a wrought-iron cemetery arch (barred panel, spear finials, a skull on top), 3 a leaning lych-gate beam with a
// shingled roof, cobwebs and a hanging bat.
const B = () => new Builder({ boxSeg: 1, ico: true });
const IRON = 0x1c1f24, IRON2 = 0x2a2e34, WOOD = 0x3d322a, BONE = 0xcfd2c4;

function crypt(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.9, y1 + 0.6, D + 0.2, STONES[0], { p: [sd * (hx - 0.5), (y1 + 0.6) / 2 - 0.1, 0], radius: 0.08, jitter: 0.03, ao: 0.2 }); b.box(1.1, 0.3, D + 0.4, STONES[2], { p: [sd * (hx - 0.5), y1 + 0.55, 0], radius: 0.05, ao: 0.1 }); b.sphere(0.4, 0x3f5a42, { p: [sd * (hx - 0.5), 0.2, D / 2], s: [1.3, 0.4, 1], jitter: 0.05, ao: 0 }); }   // stone piers with moss
  b.box(W - 1.0, H, D, STONES[1], { p: [0, (y0 + y1) / 2, 0], radius: 0.06, jitter: 0.02, ao: 0.2 });                                            // the lintel
  b.sphere(H * 0.34, BONE, { p: [0, (y0 + y1) / 2 + 0.02, D / 2 + 0.01], s: [1, 1.05, 0.25], ao: 0 }); for (const sx of [-1, 1]) b.sphere(H * 0.09, 0x0a0c0e, { p: [sx * H * 0.12, (y0 + y1) / 2 + 0.07, D / 2 + 0.05], s: [1, 1.2, 0.3], ao: 0 });   // a carved skull
  b.box(W - 1.0, 0.1, D + 0.1, STONES[2], { p: [0, y1 - 0.05, 0], radius: 0.03, ao: 0 });
  const sb = B(), lx = rng.sign() * (hx - 1.8);
  sb.cyl(0.015, 0.015, 0.45, IRON, { p: [lx, y0 - 0.22, 0], seg: 3, ao: 0 }).box(0.2, 0.3, 0.2, IRON, { p: [lx, y0 - 0.55, 0], radius: 0.02, ao: 0 }).sphere(0.09, GLOW, { p: [lx, y0 - 0.55, 0], ao: 0 });
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [lx, y0, 0], amp: 0.12, speed: 1.4, phase: rng.range(0, 6) }] };
}

function ironArch(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.34, y1 + 0.8, 0.34, IRON, { p: [sd * (hx - 0.4), (y1 + 0.8) / 2 - 0.1, 0], radius: 0.04, ao: 0.1 }); b.cone(0.28, 0.6, IRON2, { p: [sd * (hx - 0.4), y1 + 0.95, 0], seg: 4, ao: 0 }); b.sphere(0.2, IRON2, { p: [sd * (hx - 0.4), y1 + 0.6, 0], ao: 0 }); }   // iron posts with spear finials
  b.box(W - 0.8, 0.16, D, IRON, { p: [0, y0 + 0.08, 0], radius: 0.03 }).box(W - 0.8, 0.16, D, IRON, { p: [0, y1 - 0.08, 0], radius: 0.03 });   // rails
  const n = Math.round((W - 1.2) / 0.22); for (let i = 0; i < n; i++) { const x = -(W - 1.2) / 2 + i * ((W - 1.2) / (n - 1)); b.box(0.06, H - 0.1, D * 0.6, i % 2 ? IRON2 : IRON, { p: [x, (y0 + y1) / 2, 0], radius: 0.01, ao: 0 }); if (i % 3 === 0) b.cone(0.05, 0.2, IRON2, { p: [x, y1 + 0.08, 0], seg: 4, ao: 0 }); }   // the bars
  b.sphere(H * 0.3, BONE, { p: [0, y1 + 0.2, 0], s: [1, 1, 0.5], ao: 0 }); for (const sx of [-1, 1]) b.sphere(H * 0.07, 0x0a0c0e, { p: [sx * H * 0.1, y1 + 0.24, H * 0.14], s: [1, 1.2, 0.4], ao: 0 });   // a skull on the crest
  const sb = B(), bx = rng.sign() * (hx - 1.8);
  sb.cyl(0.014, 0.014, 0.35, IRON, { p: [bx, y0 - 0.18, 0], seg: 3, ao: 0 }).cone(0.14, 0.26, 0x6a5a30, { p: [bx, y0 - 0.45, 0], r: [Math.PI, 0, 0], seg: 6, ao: 0 }).sphere(0.04, 0x3a3010, { p: [bx, y0 - 0.6, 0], ao: 0 });   // a rusty bell
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [bx, y0, 0], amp: 0.14, speed: 1.9, phase: rng.range(0, 6) }] };
}

function lych(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.5, y1 + 1.1, 0.5, WOOD, { p: [sd * (hx - 0.45), (y1 + 1.1) / 2 - 0.1, 0], r: [0, 0, sd * 0.03], radius: 0.04, jitter: 0.03, ao: 0.2 }); b.box(0.9, 0.2, 0.9, 0x2a2018, { p: [sd * (hx - 0.45), 0.1, 0], radius: 0.03, ao: 0 }); }
  b.box(W - 0.8, H, D, WOOD, { p: [0, (y0 + y1) / 2, 0], r: [0, 0, 0.012], radius: 0.05, jitter: 0.02, ao: 0.2 }).box(W - 0.8, 0.1, D + 0.08, 0x2a2018, { p: [0, y1 - 0.05, 0], radius: 0.02, ao: 0 });
  b.add(new THREE.CylinderGeometry(0.01, 1, 1, 3, 1, false), 0x2c3038, { p: [0, y1 + 0.75, 0], r: [0, 0, Math.PI / 2], s: [1.1, W * 0.55, D * 0.75], ao: 0.1 });   // a peaked roof (decoration: above the hitbox)
  for (let i = 0; i < 6; i++) b.box(0.5, 0.05, D + 0.2, i % 2 ? 0x363a44 : 0x2c3038, { p: [-hx + 1.1 + i * (W - 2.2) / 5, y1 + 0.5 + Math.sin((i / 5) * 3.14) * 0.45, 0], r: [0, 0, 0.02], ao: 0 });
  for (const sd of [-1, 1]) b.cone(0.4, 0.8, 0xc9ccd2, { p: [sd * (hx - 0.9), y1 - 0.35, D / 2 - 0.05], r: [Math.PI * 0.5 - 0.3, 0, sd * 0.7], s: [1, 1, 0.1], seg: 3, ao: 0 });   // cobwebs in the corners
  const sb = B(), bx = rng.sign() * (hx - 1.6);
  sb.sphere(0.12, 0x201a26, { p: [bx, y0 - 0.2, 0], s: [1, 1.2, 1], ao: 0 }); for (const sd of [-1, 1]) sb.box(0.3, 0.02, 0.18, 0x201a26, { p: [bx + sd * 0.17, y0 - 0.2, 0], r: [0, 0, sd * 0.3], ao: 0 }); sb.cyl(0.01, 0.01, 0.1, 0x201a26, { p: [bx, y0 - 0.06, 0], seg: 3, ao: 0 });   // a bat hanging by its feet
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [bx, y0, 0], amp: 0.08, speed: 2.2, phase: rng.range(0, 6) }] };
}

const VARIANTS = [crypt, ironArch, lych];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) { return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth); }
