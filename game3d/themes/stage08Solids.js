import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { SPARK } from './stage08Props.js';

// Stage 8 walkable solids (same frame as stage08Gates.js; walkable top exactly y1, footprint exactly W x D):
//   ledge     a soft cloud step (the rolling sheep's low neighbours) or, when tall, a toy-block tower on a cloud skirt
//   beam      a CLOUD BRIDGE across open sky: a row of fat puffs with a flat pearl-railed top
//   platform  a cloud pad: a rounded pastel slab with a fluffy underside and a glowing sparkle ring (steps / double gaps)
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const PASTEL = [0xffc2dc, 0xd9c2ff, 0xbfeedd, 0xfff0b8, 0xc2e4ff];

function step(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0;
  b.box(W, H - 0.05, D, 0xffffff, { p: [0, (y0 + y1) / 2 - 0.025, 0], radius: Math.min(0.4, H * 0.45), ao: 0.08 });
  for (let i = 0; i < Math.round(W / 0.9); i++) b.sphere(0.34, i % 2 ? 0xf2ecfa : 0xffffff, { p: [-W / 2 + 0.45 + i * 0.9, y0 + 0.1, D / 2 - 0.05], s: [1.2, 0.8, 0.9], jitter: 0.04, ao: 0 });
  b.box(W * 0.7, 0.05, D * 0.7, 0xfff4fa, { p: [0, y1 - 0.02, 0], radius: 0.02, ao: 0 }).sphere(0.08, SPARK, { p: [W * 0.25, y1 + 0.04, 0], ao: 0 });
  return { geo: b.build() };
}
function blocks(rng, W, y0, y1, D) {   // tall: stacked toy blocks on a puffy skirt, the top block is the walkable one
  const b = B(), H = y1 - y0, n = Math.max(1, Math.round(H / 0.9)), bh = H / n, cs = [PASTEL[0], PASTEL[2], PASTEL[4], PASTEL[3]];
  for (let k = 0; k < n; k++) b.box(W - (k % 2) * 0.12, bh - 0.04, D - (k % 2) * 0.12, cs[(k + 1) % 4], { p: [0, y0 + (k + 0.5) * bh, 0], radius: 0.1, ao: 0.1 });
  b.box(W + 0.1, 0.14, D + 0.1, 0xffffff, { p: [0, y1 - 0.07, 0], radius: 0.05, ao: 0 });
  for (let i = 0; i < Math.round(W / 1.1); i++) b.sphere(0.4, 0xffffff, { p: [-W / 2 + 0.5 + i * 1.1, y0 + 0.05, D / 2 + 0.05], s: [1.2, 0.8, 0.9], jitter: 0.04, ao: 0 });
  return { geo: b.build() };
}
const ledge = (rng, W, y0, y1, D) => (y1 - y0 < 1.4 && D < 3 ? step(rng, W, y0, y1, D) : blocks(rng, W, y0, y1, D));

function beam(rng, W, y0, y1, D) {   // a cloud bridge: a row of puffs under a flat top
  const b = B(), hz = D / 2, n = Math.max(2, Math.round(D / 1.8));
  b.add(new THREE.BoxGeometry(W, 0.28, D, 1, 1, Math.max(1, Math.ceil(D / 3))), 0xfff6fb, { p: [0, y1 - 0.14, 0], ao: 0.04 });
  for (let i = 0; i < n; i++) for (const sd of [-1, 1]) b.sphere(0.5 + (i % 2) * 0.1, i % 2 ? 0xf2ecfa : 0xffffff, { p: [sd * (W / 2 - 0.05), y1 - 0.45, -hz + 0.9 + i * ((D - 1.8) / Math.max(1, n - 1))], s: [1.1, 0.85, 1.2], jitter: 0.05, ao: 0.1 });
  for (let z = -hz + 1.2; z < hz - 0.5; z += 2.6) b.sphere(0.8, 0xece4fa, { p: [rng.range(-0.3, 0.3), y1 - 0.7, z], s: [1.2, 0.7, 1.2], jitter: 0.06, ao: 0.1 });
  for (const sd of [-1, 1]) b.box(0.08, 0.05, D, SPARK, { p: [sd * (W / 2 - 0.05), y1 - 0.0, 0], radius: 0.01, ao: 0 });
  return { geo: b.build() };
}
function pad(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2, c = rng.pick(PASTEL);
  b.box(W, H - 0.2, D, tone(c, 1.0), { p: [0, (y0 + y1) / 2 - 0.1, 0], radius: 0.22, jitter: 0.02, ao: 0.18 }).box(W + 0.1, 0.22, D + 0.1, 0xffffff, { p: [0, y1 - 0.11, 0], radius: 0.1, ao: 0 });
  for (const [x, z] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz], [0, hz], [0, -hz]]) b.sphere(0.5, 0xffffff, { p: [x, y0 + 0.12, z], s: [1.15, 0.8, 1.15], jitter: 0.05, ao: 0.1 });
  for (const sd of [-1, 1]) b.box(0.08, 0.05, D, SPARK, { p: [sd * (hx - 0.1), y1 - 0.0, 0], radius: 0.005, ao: 0 });
  return { geo: b.build() };
}
const SOLIDS = { ledge, beam, platform: pad };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
