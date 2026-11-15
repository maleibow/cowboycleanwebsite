import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { STONES } from './stage09Props.js';

// Stage 9 walkable solids (same frame as stage09Gates.js; walkable top exactly y1, footprint exactly W x D):
//   ledge     a leaning GRAVESTONE (low: the lights-out set-piece's hop-overs, with a cross carved on the face) or, when tall, a moss-covered crypt wall with an iron door
//   beam      a rotted PLANK BRIDGE over the bog: boards, a few broken, rope rails on stakes
//   platform  a stepping SLAB: a flat grave slab on a mossy base with a cracked cross
const B = () => new Builder({ boxSeg: 1, ico: true });
const MOSS = 0x3f5a42, IRON = 0x1c1f24;

function stone(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2;
  b.box(W, H - 0.04, D, STONES[0], { p: [0, (y0 + y1) / 2 - 0.02, 0], radius: Math.min(0.22, H * 0.3), jitter: 0.015, ao: 0.2 }).box(W * 0.86, 0.06, D * 0.86, STONES[2], { p: [0, y1 - 0.03, 0], radius: 0.02, ao: 0 });
  b.box(0.1, H * 0.62, 0.05, 0x2a2e34, { p: [0, y0 + H * 0.5, D / 2 + 0.01], radius: 0.01, ao: 0 }).box(0.4, 0.1, 0.05, 0x2a2e34, { p: [0, y0 + H * 0.58, D / 2 + 0.01], radius: 0.01, ao: 0 });   // a cross carved on the face
  b.sphere(0.34, MOSS, { p: [-hx * 0.6, y0 + 0.05, D / 2], s: [1.5, 0.45, 1], jitter: 0.04, ao: 0 }).sphere(0.26, MOSS, { p: [hx * 0.7, y1 - 0.05, -D * 0.2], s: [1.4, 0.3, 1], jitter: 0.04, ao: 0 });
  return { geo: b.build() };
}
function crypt(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0;
  b.box(W, H - 0.1, D, STONES[1], { p: [0, (y0 + y1) / 2 - 0.05, 0], radius: 0.08, jitter: 0.04, ao: 0.25 }).box(W + 0.2, 0.2, D + 0.2, STONES[2], { p: [0, y1 - 0.1, 0], radius: 0.05, ao: 0.1 });
  for (let k = 0; k < Math.round(H / 0.7); k++) b.box(W + 0.02, 0.04, D + 0.02, 0x2a2e34, { p: [0, y0 + 0.5 + k * 0.7, 0], ao: 0 });
  b.box(Math.min(1.2, W * 0.4), Math.min(1.8, H * 0.7), 0.1, IRON, { p: [0, y0 + Math.min(1.8, H * 0.7) / 2, D / 2 + 0.02], radius: 0.03, ao: 0 });   // an iron door
  b.sphere(0.5, MOSS, { p: [W * 0.3, y0 + 0.15, D / 2], s: [1.5, 0.4, 1], jitter: 0.05, ao: 0 });
  return { geo: b.build() };
}
const ledge = (rng, W, y0, y1, D) => (y1 - y0 < 1.4 && D < 3 ? stone(rng, W, y0, y1, D) : crypt(rng, W, y0, y1, D));

function beam(rng, W, y0, y1, D) {   // rotted boards laid along the span with a few missing, rope rails
  const b = B(), hz = D / 2, n = Math.max(3, Math.round(D / 0.5));
  b.box(0.2, 0.2, D, 0x2a2018, { p: [-W / 2 + 0.2, y1 - 0.3, 0], radius: 0.03, ao: 0.2 }).box(0.2, 0.2, D, 0x2a2018, { p: [W / 2 - 0.2, y1 - 0.3, 0], radius: 0.03, ao: 0.2 });   // stringers
  for (let i = 0; i < n; i++) b.box(W, 0.12, D / n - 0.05, i % 3 ? 0x4a3a2c : 0x3a2c22, { p: [0, y1 - 0.06, -hz + (i + 0.5) * (D / n)], r: [0, rng.range(-0.02, 0.02), 0], radius: 0.015, ao: 0.1 });
  for (let z = -hz + 2; z < hz - 1; z += 4) for (const sd of [-1, 1]) { b.cyl(0.05, 0.06, 0.9, 0x2a2018, { p: [sd * (W / 2 + 0.05), y1 + 0.3, z], seg: 4, ao: 0.1 }); }
  for (const sd of [-1, 1]) b.box(0.03, 0.03, D, 0x6a5a40, { p: [sd * (W / 2 + 0.05), y1 + 0.62, 0], ao: 0 });
  return { geo: b.build() };
}
function slab(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W, H - 0.2, D, 0x30343a, { p: [0, (y0 + y1) / 2 - 0.1, 0], radius: 0.18, jitter: 0.03, ao: 0.25 }).box(W + 0.12, 0.22, D + 0.12, STONES[rng.int(0, 2)], { p: [0, y1 - 0.11, 0], radius: 0.06, jitter: 0.015, ao: 0 });
  b.box(0.12, 0.03, D * 0.7, 0x22262c, { p: [0, y1 + 0.005, 0], radius: 0.01, ao: 0 }).box(W * 0.55, 0.03, 0.12, 0x22262c, { p: [0, y1 + 0.005, -D * 0.12], radius: 0.01, ao: 0 });   // a cracked cross
  for (const [x, z] of [[-hx, -hz], [hx, hz], [hx, -hz]]) b.sphere(0.42, MOSS, { p: [x, y0 + 0.12, z], s: [1.3, 0.5, 1.3], jitter: 0.05, ao: 0 });
  return { geo: b.build() };
}
const SOLIDS = { ledge, beam, platform: slab };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
