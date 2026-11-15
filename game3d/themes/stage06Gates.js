import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { LAVA, HOT, RED } from './stage06Props.js';

// Stage 6 slide-under gates (PLAN 4.2), same frame as stage01Gates.js: x across (centred, width W), y ABSOLUTE height, z along the track (centred, depth D). The solid fills the
// hitbox exactly (underside y0, top y1, ends +-W/2, depth D); the space below y0 stays open.
// Variants: 1 basalt-column lintel with dripping lava, 2 mine gantry: timber frame, an iron ingot mould swinging on a chain, 3 cooled lava arch of ropy obsidian with glowing cracks.
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const ROCK = 0x2a2428, ROCKD = 0x1a1618, IRON = 0x2c2a32;

function columns(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) for (const k of [0, 1]) b.cyl(0.55, 0.62, y1 + 1.0 - k * 0.8, k ? ROCK : ROCKD, { p: [sd * (hx - 0.6 - k * 0.95), (y1 + 1.0 - k * 0.8) / 2 - 0.2, (k - 0.5) * 0.3], seg: 6, jitter: 0.03, ao: 0.25 });
  const n = Math.round((W - 2.6) / 0.85);
  for (let i = 0; i < n; i++) { const x = -(W - 2.6) / 2 + (i + 0.5) * ((W - 2.6) / n); b.cyl(0.46, 0.46, D * 1.0, i % 2 ? ROCK : ROCKD, { p: [x, (y0 + y1) / 2, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, H / 0.92], seg: 6, jitter: 0.02, ao: 0.1 }); }   // columns lying across: their hexagonal ends face the player
  b.box(W - 1.6, 0.16, D + 0.1, LAVA, { p: [0, y1 - 0.08, 0], radius: 0.02, ao: 0 });                                                     // molten glow in the joint on top, top = y1
  const sb = B(), dx = rng.range(-0.3, 0.3) * W;
  sb.cone(0.07, 0.5, LAVA, { p: [dx, y0 - 0.2, D / 2 + 0.05], r: [Math.PI, 0, 0], seg: 4, ao: 0 }).sphere(0.1, HOT, { p: [dx, y0 - 0.5, D / 2 + 0.05], s: [1, 1.4, 1], ao: 0 });   // a dripping blob of lava
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [dx, y0, D / 2 + 0.05], amp: 0.1, speed: 2.2, phase: rng.range(0, 6) }] };
}

function gantry(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0, WOOD = 0x3a2a20;
  for (const sd of [-1, 1]) { b.box(0.5, y1 + 0.9, 0.5, WOOD, { p: [sd * (hx - 0.4), (y1 - 0.9) / 2, D * 0.3], radius: 0.04 }); b.box(0.5, y1 + 0.9, 0.5, WOOD, { p: [sd * (hx - 0.4), (y1 - 0.9) / 2, -D * 0.3], radius: 0.04 }); b.box(0.7, 0.25, 1.1 * D, IRON, { p: [sd * (hx - 0.4), 0.12, 0], radius: 0.03, ao: 0 }); }
  b.box(W - 1.0, H * 0.5, D, WOOD, { p: [0, y1 - H * 0.25, 0], radius: 0.04, ao: 0.1 });
  b.box(W - 1.0, H * 0.5, D, 0x4a3628, { p: [0, y1 - H * 0.75, 0], radius: 0.04, ao: 0.1 });
  for (let i = 0; i < 4; i++) b.box(0.14, H, D + 0.06, IRON, { p: [-(W - 1.6) / 2 + i * ((W - 1.6) / 3), (y0 + y1) / 2, 0], radius: 0.01, ao: 0 });   // iron straps
  b.box(W - 1.0, 0.16, D + 0.3, IRON, { p: [0, y1 - 0.08, 0], radius: 0.02, ao: 0 });
  for (let i = 0; i < 5; i++) b.box(0.28, 0.12, 0.1, RED, { p: [-1.4 + i * 0.7, y0 + H * 0.5, D / 2 + 0.03], radius: 0.01, ao: 0 });   // glowing warning marks painted on
  const sb = B(), cx = rng.sign() * (hx - 1.7);
  sb.cyl(0.02, 0.02, 0.5, 0x6a6670, { p: [cx, y0 - 0.25, 0], seg: 3, ao: 0 }).box(0.5, 0.26, 0.3, IRON, { p: [cx, y0 - 0.62, 0], radius: 0.05 }).box(0.4, 0.1, 0.22, HOT, { p: [cx, y0 - 0.52, 0], radius: 0.02, ao: 0 });   // a hanging ingot mould, glowing
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [cx, y0, 0], amp: 0.13, speed: 1.6, phase: rng.range(0, 6) }] };
}

function crust(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.add(new THREE.IcosahedronGeometry(1, 1), ROCK, { p: [sd * (hx - 0.8), (y1 - 0.5) / 2, 0], s: [0.9, (y1 + 0.5) / 2, D * 0.55], jitter: 0.12, ao: 0.3 }); b.add(new THREE.IcosahedronGeometry(1, 1), ROCKD, { p: [sd * (hx - 1.3), 0.5, 0.4], s: [0.8, 0.9, 0.9], jitter: 0.15 }); }
  b.box(W - 1.6, H, D, ROCK, { p: [0, (y0 + y1) / 2, 0], radius: 0.18, jitter: 0.05, ao: 0.1 });                                              // the slab: ropy cooled crust
  for (let i = 0; i < 6; i++) b.box(W - 1.9, 0.12, 0.16, i % 2 ? ROCKD : tone(ROCK, 1.4), { p: [0, y0 + 0.2 + i * (H - 0.4) / 5, D / 2 + 0.02], r: [0, 0, 0.04 * (i % 2 ? 1 : -1)], radius: 0.04, ao: 0 });   // rope folds
  for (let i = 0; i < 5; i++) { const x = -(W - 2.4) / 2 + i * ((W - 2.4) / 4) + rng.range(-0.2, 0.2); b.box(0.06, H * 0.8, 0.05, i % 2 ? LAVA : HOT, { p: [x, (y0 + y1) / 2, D / 2 + 0.03], r: [0, 0, rng.range(-0.35, 0.35)], radius: 0.01, ao: 0 }); }   // glowing cracks
  b.box(W - 1.6, 0.14, D + 0.1, tone(ROCK, 1.6), { p: [0, y1 - 0.07, 0], radius: 0.02, ao: 0 });
  return { geo: b.build() };
}

const VARIANTS = [columns, gantry, crust];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) { return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth); }
