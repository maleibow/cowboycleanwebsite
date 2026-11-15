import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { WARM, GAS, CORAL } from './stage05Props.js';

// Stage 5 slide-under gates (PLAN 4.2), same frame as stage01Gates.js: x across (centred, width W), y ABSOLUTE height, z along the track (centred, depth D). The solid
// fills the hitbox exactly (underside y0, top y1, ends +-W/2, depth D); the space below y0 stays open.
// Variants: 1 wrought-iron balcony with a flower box, 2 stone porte-cochère lintel with a carved keystone and hanging lanterns, 3 Art Nouveau metro canopy of green iron and amber glass.
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const IRON = 0x1c2230, STONE = 0xcdbfa4;

function balcony(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.7, y1 + 0.9, D * 0.9, STONE, { p: [sd * (hx - 0.4), (y1 - 0.9) / 2, 0], radius: 0.04, jitter: 0.01, ao: 0.1 }); b.box(0.9, 0.2, D, tone(STONE, 1.1), { p: [sd * (hx - 0.4), y1 + 0.1, 0], radius: 0.02, ao: 0 }); }
  b.box(W - 1.4, H * 0.45, D, STONE, { p: [0, y1 - H * 0.225, 0], radius: 0.03, ao: 0.1 });                                              // the stone slab (top = y1 is the floor of the balcony above)
  for (let i = 0; i < Math.round((W - 1.6) / 0.28); i++) { const x = -(W - 1.6) / 2 + 0.14 + i * 0.28; b.cyl(0.03, 0.03, H * 0.55, IRON, { p: [x, y0 + H * 0.275, D / 2 - 0.04], seg: 4, ao: 0 }); b.sphere(0.05, IRON, { p: [x, y0 + H * 0.55, D / 2 - 0.04], ao: 0 }); }   // iron balusters hanging under the slab
  b.box(W - 1.4, 0.06, 0.06, IRON, { p: [0, y0 + 0.03, D / 2 - 0.04], radius: 0.01, ao: 0 });
  b.box(W - 2.2, 0.28, 0.4, 0x6a3a22, { p: [0, y1 + 0.14 - 0.14, 0], radius: 0.03, ao: 0 });
  const sb = B(), fx = rng.range(-0.2, 0.2) * W;
  for (let i = 0; i < 5; i++) sb.sphere(0.13, [0xe74c6c, 0xffd23a, 0xf2f2f2][i % 3], { p: [fx - 0.5 + i * 0.25, y0 - 0.22 - (i % 2) * 0.06, D / 2 + 0.08], jitter: 0.02, ao: 0 });
  sb.box(1.4, 0.1, 0.12, 0x2f6a3a, { p: [fx, y0 - 0.06, D / 2 + 0.08], radius: 0.02, ao: 0 });
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [fx, y0, D / 2 + 0.08], amp: 0.12, speed: 1.4, phase: rng.range(0, 6) }] };
}

function porte(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.9, y1 + 0.9, D, STONE, { p: [sd * (hx - 0.5), (y1 - 0.9) / 2, 0], radius: 0.05, jitter: 0.015, ao: 0.15 }); b.box(1.1, 0.35, D + 0.2, tone(STONE, 0.8), { p: [sd * (hx - 0.5), 0.17, 0], radius: 0.03, ao: 0 }); for (let y = 0.6; y < y1; y += 0.7) b.box(0.95, 0.04, D + 0.02, tone(STONE, 0.78), { p: [sd * (hx - 0.5), y, 0], radius: 0.004, ao: 0 }); }
  b.box(W - 1.8, H, D, STONE, { p: [0, (y0 + y1) / 2, 0], radius: 0.04, jitter: 0.01, ao: 0.1 });
  b.box(0.7, H * 0.55, D + 0.12, tone(STONE, 0.72), { p: [0, y0 + H * 0.28, 0], r: [0, 0, 0], radius: 0.05, ao: 0 });
  b.box(W - 1.8, 0.22, D + 0.3, tone(STONE, 1.12), { p: [0, y1 - 0.11, 0], radius: 0.03, ao: 0 });                                       // cornice, top = y1
  for (let i = 0; i < Math.round((W - 2.4) / 0.5); i++) b.box(0.18, 0.14, D + 0.04, tone(STONE, 0.7), { p: [-(W - 2.4) / 2 + 0.25 + i * 0.5, y1 - 0.34, 0], radius: 0.01, ao: 0 });   // dentils
  const lb = B(), lx = hx - 1.7;
  for (const sd of [-1, 1]) { const x = sd * lx; lb.cyl(0.015, 0.015, 0.4, IRON, { p: [x, y0 - 0.2, D / 2 + 0.1], seg: 3, ao: 0 }).box(0.26, 0.4, 0.26, 0x14161e, { p: [x, y0 - 0.62, D / 2 + 0.1], radius: 0.04 }).box(0.18, 0.28, 0.18, GAS, { p: [x, y0 - 0.62, D / 2 + 0.1], radius: 0.03, ao: 0 }); }
  return { geo: b.build(), sway: [{ geo: lb.build(), pivot: [0, y0, D / 2 + 0.1], amp: 0.1, speed: 1.7, phase: rng.range(0, 6) }] };
}

function metro(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0, GREEN = 0x2f6a4a;
  for (const sd of [-1, 1]) { b.box(0.4, y1 + 0.9, 0.4, GREEN, { p: [sd * (hx - 0.3), (y1 - 0.9) / 2, 0], radius: 0.05 }); b.box(0.7, 0.3, 0.7, tone(GREEN, 0.7), { p: [sd * (hx - 0.3), 0.15, 0], radius: 0.04, ao: 0 }); b.sphere(0.3, WARM, { p: [sd * (hx - 0.3), y1 + 1.0, 0], ao: 0 }); }   // two green iron posts, each topped with an amber globe
  b.box(W - 1.0, H, D, GREEN, { p: [0, (y0 + y1) / 2, 0], radius: 0.06, ao: 0.1 });
  const n = Math.round((W - 1.4) / 0.9);
  for (let i = 0; i < n; i++) b.box((W - 1.4) / n - 0.12, H * 0.55, D + 0.04, new THREE.Color(2.2, 1.4, 0.4), { p: [-(W - 1.4) / 2 + (i + 0.5) * ((W - 1.4) / n), y0 + H * 0.5, 0], radius: 0.02, ao: 0 });   // amber glass panes
  for (let i = 0; i <= n; i++) b.box(0.07, H * 0.7, D + 0.08, GREEN, { p: [-(W - 1.4) / 2 + i * ((W - 1.4) / n), y0 + H * 0.5, 0], radius: 0.01, ao: 0 });
  b.box(W - 1.0, 0.16, D + 0.3, tone(GREEN, 0.75), { p: [0, y1 - 0.08, 0], radius: 0.02, ao: 0 });                                       // roof edge, top = y1
  b.box(W - 3, 0.55, 0.14, 0x14161e, { p: [0, y1 + 0.35, D / 2], radius: 0.03, ao: 0 }).box(W - 3.4, 0.28, 0.16, WARM, { p: [0, y1 + 0.35, D / 2 + 0.02], radius: 0.01, ao: 0 });   // MÉTRO sign band
  const lb = B(), lx = rng.sign() * (hx - 1.5);
  lb.cyl(0.015, 0.015, 0.35, IRON, { p: [lx, y0 - 0.17, 0], seg: 3, ao: 0 }).sphere(0.17, CORAL, { p: [lx, y0 - 0.5, 0], ao: 0 });
  return { geo: b.build(), sway: [{ geo: lb.build(), pivot: [lx, y0, 0], amp: 0.14, speed: 1.9, phase: rng.range(0, 6) }] };
}

const VARIANTS = [balcony, porte, metro];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) { return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth); }
