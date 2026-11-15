import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { PALE, RUBY } from './stage10Props.js';

// Stage 10 slide-under gates (PLAN 4.2), same frame as stage01Gates.js: x across (centred, width W), y ABSOLUTE height, z along the track (centred, depth D). The solid fills the hitbox
// exactly (underside y0, top y1, ends +-W/2, depth D); the space below y0 stays open.
// Variants: 1 a fallen steel girder resting on two charred brick piers (rebar, a hanging chain and a dead lamp), 2 a dead traffic-signal gantry (three signal heads, one flickering ruby), 3 the
// charred frame of a shop awning with tattered black canvas and ruby dye dripping from the hem.
const B = () => new Builder({ boxSeg: 1, ico: true });
const CH = [0x1c1c22, 0x24242c, 0x2c2c36], STEEL = 0x34343e, RUST = 0x4a2a24;

function girder(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(1.0, y1 + 0.5, D + 0.2, CH[0], { p: [sd * (hx - 0.5), (y1 + 0.5) / 2 - 0.1, 0], radius: 0.06, jitter: 0.05, ao: 0.3 }); b.box(1.2, 0.25, D + 0.4, CH[2], { p: [sd * (hx - 0.5), y1 + 0.45, 0], radius: 0.04, ao: 0.1 }); for (let i = 0; i < 3; i++) b.cyl(0.025, 0.025, 0.9, RUST, { p: [sd * (hx - 0.5) + (i - 1) * 0.25, y1 + 0.95, 0.05], r: [0.2 * i, 0, (i - 1) * 0.35], seg: 3, ao: 0 }); }
  b.box(W - 1.0, H, D, STEEL, { p: [0, (y0 + y1) / 2, 0], radius: 0.04, jitter: 0.015, ao: 0.25 }).box(W - 1.0, 0.1, D * 0.5, 0x4a4a56, { p: [0, y1 - 0.05, 0], radius: 0.02, ao: 0 }); for (let i = 0; i < 8; i++) b.box(0.12, 0.16, D + 0.04, RUST, { p: [-(W - 2) / 2 + i * ((W - 2) / 7), (y0 + y1) / 2, 0], radius: 0.01, ao: 0 });   // rivets / rust bands
  const sb = B(), cx = rng.sign() * (hx - 1.8);
  for (let k = 0; k < 4; k++) sb.add(new THREE.TorusGeometry(0.06, 0.02, 4, 8), STEEL, { p: [cx, y0 - 0.08 - k * 0.1, 0], r: [k % 2 ? Math.PI / 2 : 0, 0, 0], ao: 0 }); sb.sphere(0.12, PALE, { p: [cx, y0 - 0.6, 0], s: [1, 0.7, 1], ao: 0 });
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [cx, y0, 0], amp: 0.1, speed: 1.6, phase: rng.range(0, 6) }] };
}

function signals(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.cyl(0.18, 0.24, y1 + 0.8, STEEL, { p: [sd * (hx - 0.5), (y1 + 0.8) / 2 - 0.1, 0], seg: 6, ao: 0.2 }); b.box(0.6, 0.2, 0.6, CH[1], { p: [sd * (hx - 0.5), 0.1, 0], radius: 0.03, ao: 0 }); }
  b.box(W - 0.8, H, D, 0x2c2c34, { p: [0, (y0 + y1) / 2, 0], radius: 0.05, jitter: 0.02, ao: 0.2 }).box(W - 0.8, 0.08, D + 0.06, STEEL, { p: [0, y1 - 0.04, 0], radius: 0.01, ao: 0 });
  for (let i = 0; i < 3; i++) { const x = -hx * 0.55 + i * hx * 0.55; b.box(0.34, H + 0.1, D * 0.9, 0x14141a, { p: [x, (y0 + y1) / 2, 0], radius: 0.04, ao: 0 }); for (let k = 0; k < 3; k++) b.sphere(H * 0.12, k === 0 && i === 1 ? RUBY : 0x08080c, { p: [x, y1 - H * (0.2 + k * 0.3), D / 2 + 0.02], s: [1, 1, 0.4], ao: 0 }); b.box(0.42, 0.04, 0.2, 0x14141a, { p: [x, y1 - 0.02, D / 2 + 0.06], r: [-0.2, 0, 0], ao: 0 }); }
  const sb = B(), sx = rng.sign() * (hx - 1.4);
  sb.cyl(0.015, 0.015, 0.5, STEEL, { p: [sx, y0 - 0.25, 0], seg: 3, ao: 0 }).sphere(0.1, PALE, { p: [sx, y0 - 0.58, 0], s: [1, 0.6, 1], ao: 0 });
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [sx, y0, 0], amp: 0.12, speed: 1.9, phase: rng.range(0, 6) }] };
}

function awning(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.3, y1 + 0.6, 0.3, 0x2a2018, { p: [sd * (hx - 0.4), (y1 + 0.6) / 2 - 0.1, 0], r: [0, 0, sd * 0.03], radius: 0.03, jitter: 0.03, ao: 0.3 }); b.box(0.5, 0.2, 0.5, CH[0], { p: [sd * (hx - 0.4), 0.1, 0], radius: 0.02, ao: 0 }); }
  b.box(W - 0.8, H, D, 0x14141a, { p: [0, (y0 + y1) / 2, 0], r: [0, 0, 0.006], radius: 0.05, jitter: 0.02, ao: 0.2 });
  const n = Math.round((W - 1.2) / 0.5); for (let i = 0; i < n; i++) b.box((W - 1.2) / n - 0.02, H * 0.9, D + 0.04, i % 2 ? 0x24242c : 0x18181e, { p: [-(W - 1.2) / 2 + (i + 0.5) * ((W - 1.2) / n), (y0 + y1) / 2, 0], radius: 0.02, ao: 0 });   // tattered black stripes
  b.box(W - 0.8, 0.1, D + 0.1, 0x2a2018, { p: [0, y1 - 0.05, 0], radius: 0.02, ao: 0 });
  for (let i = 0; i < 6; i++) { const x = -(W - 2) / 2 + i * ((W - 2) / 5); b.cone(0.05, 0.3 + (i % 3) * 0.15, RUBY, { p: [x, y0 - 0.1 - (i % 3) * 0.05, D / 2 - 0.05], r: [Math.PI, 0, 0], seg: 4, ao: 0 }); }   // ruby dye dripping from the hem
  const sb = B(), bx = rng.sign() * (hx - 1.7);
  for (let k = 0; k < 3; k++) sb.cone(0.14, 0.45 + k * 0.1, 0x14141a, { p: [bx + (k - 1) * 0.18, y0 - 0.2, 0], r: [Math.PI, 0, (k - 1) * 0.15], seg: 4, ao: 0 });   // a loose flap of canvas
  return { geo: b.build(), sway: [{ geo: sb.build(), pivot: [bx, y0, 0], amp: 0.16, speed: 2.1, phase: rng.range(0, 6) }] };
}

const VARIANTS = [girder, signals, awning];
export function buildBarrier(rng, W, y0, y1, { depth = 1.2, index = 0 } = {}) { return VARIANTS[Math.abs(index) % VARIANTS.length](rng, W, y0, y1, depth); }
