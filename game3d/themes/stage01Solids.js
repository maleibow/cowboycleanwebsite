import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';

// Stage 1 walkable solids that were plain coloured boxes: raised boardwalk ledges, the balance log, sandstone stepping pillars.
// Same frame as stage01Gates.js: x across (centred, width W), y absolute, z along the track (centred, depth D).
// The walkable top is exactly y1 and the footprint is exactly W x D, so the visible shape matches the hitbox.
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1 });
const STRATA = [0xc0452d, 0xd9743c, 0x9a3a2e, 0xe59a56];

// raised boardwalk (side-view section): planked faces, post every few metres, a deck of cross planks
function ledge(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2, wood = [0x8a5a33, 0x7a4c2a, 0x9a6a3c];
  b.box(W - 0.2, H - 0.2, D - 0.1, 0x4a3020, { p: [0, (y0 + y1) / 2 - 0.05, 0], ao: 0 });
  const nb = Math.round(D / 0.42), bw = D / nb;
  for (let i = 0; i < nb; i++) for (const sd of [-1, 1]) b.box(0.1, H - 0.18, bw - 0.03, wood[(i * 7 + (sd > 0 ? 1 : 0)) % 3], { p: [sd * (hx - 0.05), y0 + (H - 0.18) / 2, -hz + (i + 0.5) * bw], radius: 0.02 });
  const np = Math.round(D / 0.5), pw = D / np;
  for (let i = 0; i < np; i++) b.box(W, 0.18, pw - 0.035, tone(wood[(i * 5) % 3], 1.1), { p: [0, y1 - 0.09, -hz + (i + 0.5) * pw], radius: 0.02 });
  const nPost = Math.max(2, Math.round(D / 3.5));
  for (let i = 0; i <= nPost; i++) for (const sd of [-1, 1]) {
    const z = -hz + 0.12 + (D - 0.24) * i / nPost;
    b.box(0.2, H - 0.04, 0.24, 0x5a3a22, { p: [sd * (hx - 0.1), y0 + (H - 0.04) / 2, z], radius: 0.03 });
  }
  return { geo: b.build() };
}

// balance log: a hewn timber with bark flanks, plank deck, rope bindings and knots
function beam(rng, W, y0, y1, D) {
  const b = B(), hz = D / 2, bark = 0x6e4a2c;
  b.box(W, y1 - y0, D, bark, { p: [0, (y0 + y1) / 2, 0], radius: 0.12, ao: 0.15 });
  const n = Math.max(2, Math.round(D / 1.1)), dz = D / n;
  for (let i = 0; i < n; i++) b.box(W - 0.14, 0.1, dz - 0.04, tone(i % 2 ? 0x9a6b43 : 0xb07a4c, 1), { p: [0, y1 - 0.05, -hz + (i + 0.5) * dz], radius: 0.02, ao: 0 });
  for (let z = -hz + 3; z < hz - 2; z += rng.range(4.5, 6)) b.box(W, y1 - y0 - 0.02, 0.18, 0x3a2a1c, { p: [0, (y0 + y1) / 2, z], radius: 0.02, ao: 0 });
  for (let i = 0; i < 10; i++) b.add(new THREE.IcosahedronGeometry(1, 0), tone(bark, 0.7), { p: [(i % 2 ? 1 : -1) * (W / 2 - 0.02), y0 + (y1 - y0) * rng.range(0.2, 0.7), rng.range(-hz + 1, hz - 1)], s: [0.06, 0.12, 0.14], ao: 0 });
  for (const sd of [-1, 1]) b.box(W, y1 - y0, 0.05, 0xd8b684, { p: [0, (y0 + y1) / 2, sd * (hz - 0.025)], ao: 0 });   // pale cut ends
  return { geo: b.build() };
}

// sandstone stepping pillar: tapering strata below, a lighter flat cap on top
function platform(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, layers = Math.max(3, Math.round(H / 0.8)), capH = 0.28;
  for (let i = 0; i < layers; i++) {
    const u0 = i / layers, ya = y0 + (H - capH) * u0, yb = y0 + (H - capH) * (i + 1) / layers, inset = (1 - (i + 1) / layers) * 0.9 * (0.6 + 0.4 * rng.next());
    b.box(W - inset, yb - ya + 0.02, D - inset, STRATA[(i + Math.floor(rng.next() * 3)) % 4], { p: [(rng.next() - 0.5) * 0.06, (ya + yb) / 2, 0], radius: 0.1, jitter: 0.05, ao: 0.1 });
  }
  b.box(W, capH, D, 0xe9bd88, { p: [0, y1 - capH / 2, 0], radius: 0.08, ao: 0 });
  for (let i = 0; i < 3; i++) b.add(new THREE.IcosahedronGeometry(1, 0), 0xc9824a, { p: [rng.range(-W / 2 + 0.3, W / 2 - 0.3) , y1 - capH - 0.05, (rng.next() > 0.5 ? 1 : -1) * (D / 2 - 0.05)], s: [0.25, 0.18, 0.2], jitter: 0.06 });
  return { geo: b.build() };
}

const SOLIDS = { ledge, beam, platform };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
