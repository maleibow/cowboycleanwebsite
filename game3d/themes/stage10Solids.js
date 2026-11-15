import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { RUBY } from './stage10Props.js';

// Stage 10 walkable solids (same frame as stage10Gates.js; walkable top exactly y1, footprint exactly W x D):
//   ledge     a low block of broken concrete (coal-heap neighbours) or, tall and wide, a flooded avenue's STAIR: a charred stone stoop with a ruby-lit edge and ash drifted on the tread
//   beam      a fallen GIRDER laid across a canal: an I-beam with rivets and a ruby glow below
//   platform  a cracked concrete STEPPING STONE with chipped corners, a ruby rim of light and a drift of ash
const B = () => new Builder({ boxSeg: 1, ico: true });
const CH = [0x1c1c22, 0x24242c, 0x2c2c36, 0x34343e];

function block(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0;
  b.box(W, H - 0.04, D, CH[rng.int(0, 2)], { p: [0, (y0 + y1) / 2 - 0.02, 0], radius: Math.min(0.2, H * 0.3), jitter: 0.04, ao: 0.25 }).box(W * 0.88, 0.06, D * 0.88, CH[3], { p: [0, y1 - 0.03, 0], radius: 0.02, ao: 0 });
  b.cyl(0.02, 0.02, 0.5, 0x4a2a24, { p: [W * 0.3, y1 + 0.2, 0], r: [0.3, 0, 0.5], seg: 3, ao: 0 }); b.sphere(0.16, RUBY, { p: [-W * 0.3, y0 + 0.08, D / 2], s: [1, 0.5, 1], ao: 0 });
  return { geo: b.build() };
}
function stair(rng, W, y0, y1, D) {   // a wide step of a flooded flight: a stone block with a rim light along its front edge and ash on the tread
  const b = B(), H = y1 - y0;
  b.box(W, H - 0.1, D, CH[1], { p: [0, (y0 + y1) / 2 - 0.05, 0], radius: 0.1, jitter: 0.03, ao: 0.3 }).box(W + 0.1, 0.16, D + 0.1, CH[3], { p: [0, y1 - 0.08, 0], radius: 0.05, ao: 0.05 });
  b.box(W, 0.08, 0.1, RUBY, { p: [0, y1 - 0.12, D / 2 + 0.02], radius: 0.01, ao: 0 });
  for (let i = 0; i < Math.round(D / 3); i++) b.sphere(0.5 + (i % 2) * 0.2, 0x4a4a56, { p: [rng.range(-W * 0.4, W * 0.4), y1 - 0.02, -D / 2 + 1.5 + i * 3], s: [1.6, 0.14, 1.2], jitter: 0.05, ao: 0 });   // ash drifts
  for (const sd of [-1, 1]) b.box(0.3, 0.7, D * 0.9, CH[0], { p: [sd * (W / 2 - 0.1), y1 + 0.3, 0], radius: 0.05, jitter: 0.03, ao: 0.2 });   // low balustrades
  return { geo: b.build() };
}
const ledge = (rng, W, y0, y1, D) => (D > 6 || W > 6 ? stair(rng, W, y0, y1, D) : block(rng, W, y0, y1, D));

function beam(rng, W, y0, y1, D) {   // an I-beam: top flange, web, bottom flange, rivets; a ruby glow underneath
  const b = B(), hz = D / 2;
  b.add(new THREE.BoxGeometry(W, 0.14, D, 1, 1, Math.max(1, Math.ceil(D / 3))), CH[3], { p: [0, y1 - 0.07, 0], ao: 0.1 }).box(W * 0.3, 0.5, D, CH[2], { p: [0, y1 - 0.4, 0], radius: 0.02, ao: 0.2 }).box(W, 0.12, D, CH[2], { p: [0, y1 - 0.7, 0], radius: 0.02, ao: 0.2 });
  for (let z = -hz + 1; z < hz; z += 1.6) for (const sd of [-1, 1]) b.sphere(0.05, 0x4a4a56, { p: [sd * W * 0.3, y1 - 0.01, z], s: [1, 0.5, 1], ao: 0 });
  for (let z = -hz + 2; z < hz - 1; z += 5) b.box(W * 1.05, 0.04, 0.3, RUBY, { p: [0, y1 - 0.78, z], ao: 0 });
  return { geo: b.build() };
}
function pad(rng, W, y0, y1, D) {   // a stepping stone: a chipped concrete slab, a ruby rim, ash on top
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W, H - 0.2, D, CH[rng.int(0, 2)], { p: [0, (y0 + y1) / 2 - 0.1, 0], radius: 0.25, jitter: 0.05, ao: 0.3 }).box(W + 0.1, 0.22, D + 0.1, CH[3], { p: [0, y1 - 0.11, 0], radius: 0.12, jitter: 0.02, ao: 0 });
  for (const sd of [-1, 1]) b.box(0.07, 0.05, D * 0.9, RUBY, { p: [sd * (hx - 0.08), y1 + 0.0, 0], radius: 0.005, ao: 0 });
  b.box(W * 0.5, 0.03, 0.06, 0x14141a, { p: [0, y1 + 0.005, 0], r: [0, 0.4, 0], ao: 0 }); b.sphere(0.4, 0x4a4a56, { p: [hx * 0.3, y1 - 0.01, -hz * 0.3], s: [1.5, 0.12, 1.1], ao: 0 });
  return { geo: b.build() };
}
const SOLIDS = { ledge, beam, platform: pad };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
