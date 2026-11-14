import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';

// Stage 2 walkable solids (same frame as stage02Gates.js; walkable top exactly y1, footprint exactly W x D):
//   ledge    a mossy log boardwalk (side section)       beam      a fallen log bridge, three lashed trunks
//   platform a lashed log raft with lily pads (lily-pad hops, vine islands)
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const ROPE = 0xd6c08a, MOSS = 0x3f8a44;
const logZ = (r, len, seg = 8) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);   // a cylinder lying along the track

function ledge(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2, wood = [0x6a4a2e, 0x5d4037, 0x74502f];
  b.box(W - 0.2, H - 0.2, D - 0.1, 0x3a2a1c, { p: [0, (y0 + y1) / 2 - 0.05, 0], ao: 0 });
  const nb = Math.round(D / 0.5), bw = D / nb;
  for (let i = 0; i < nb; i++) for (const sd of [-1, 1]) b.box(0.12, H - 0.18, bw - 0.04, wood[(i * 7 + (sd > 0 ? 1 : 0)) % 3], { p: [sd * (hx - 0.06), y0 + (H - 0.18) / 2, -hz + (i + 0.5) * bw], radius: 0.03 });
  const nl = Math.max(2, Math.round(W / 0.5)), lw = W / nl;                                   // deck of round logs lying across the walkway
  for (let i = 0; i < Math.round(D / 0.6); i++) { const z = -hz + (i + 0.5) * (D / Math.round(D / 0.6)); b.add(new THREE.CylinderGeometry(0.22, 0.22, W, 7).rotateZ(Math.PI / 2), tone(wood[i % 3], 1.12), { p: [0, y1 - 0.2, z], s: [1, 0.85, 1], jitter: 0.015 }); }
  for (let i = 0; i < 4; i++) b.box(rng.range(0.6, 1.6), 0.12, rng.range(0.6, 1.4), MOSS, { p: [rng.range(-hx + 0.8, hx - 0.8), y1 - 0.03, rng.range(-hz + 0.6, hz - 0.6)], radius: 0.05, ao: 0 });
  for (let i = 0; i <= Math.max(2, Math.round(D / 3.5)); i++) for (const sd of [-1, 1]) b.cyl(0.13, 0.16, H, 0x4a3a2a, { p: [sd * (hx - 0.12), y0 + H / 2, -hz + 0.2 + (D - 0.4) * i / Math.max(2, Math.round(D / 3.5))], seg: 6 });
  return { geo: b.build() };
}

function beam(rng, W, y0, y1, D) {
  const b = B(), hz = D / 2, H = y1 - y0, r = Math.min(H, W / 3) / 2, bark = [0x6a4a2e, 0x5d4037, 0x74502f];
  for (let k = -1; k <= 1; k++) {
    const x = k * (W - 2 * r) / 2;
    b.add(logZ(r, D, 9), bark[(k + 1) % 3], { p: [x, y1 - r, 0], jitter: 0.012, s: [1, 1, 1] });
    for (const sd of [-1, 1]) b.cyl(r * 0.96, r * 0.96, 0.05, 0xc9a672, { p: [x, y1 - r, sd * (hz - 0.02)], r: [Math.PI / 2, 0, 0], seg: 9, ao: 0 });
  }
  b.box(W, 0.06, D, MOSS, { p: [0, y1 - 0.03, 0], radius: 0.02, ao: 0 });                          // flat moss mat so the walkable top is exactly y1
  for (let z = -hz + 2; z < hz - 1; z += rng.range(3.5, 5)) b.box(W + 0.06, 0.1, 0.16, ROPE, { p: [0, y1 - 0.05, z], radius: 0.02, ao: 0 });
  for (let i = 0; i < 9; i++) b.cyl(0.04, 0.07, 0.3 + rng.next() * 0.25, 0xe9f6d4, { p: [rng.sign() * (W / 2 - 0.1), y1 - 0.5 + 0.15, rng.range(-hz + 1, hz - 1)], seg: 4, ao: 0 });
  return { geo: b.build() };
}

function platform(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, hz = D / 2, bark = [0x6a4a2e, 0x5d4037, 0x74502f], deck = 0.55, n = Math.max(3, Math.round(W / 0.55)), lw = W / n;
  b.box(W - 0.1, y1 - y0 - deck, D - 0.1, 0x2c4a2a, { p: [0, y0 + (y1 - y0 - deck) / 2, 0], ao: 0 });                // the raft's body, mostly under the sludge
  for (let i = 0; i < n; i++) { const x = -hx + (i + 0.5) * lw; b.add(logZ(lw * 0.5, D, 8), tone(bark[i % 3], 1.1), { p: [x, y1 - deck / 2 - 0.03, 0], s: [1, deck / lw, 1], jitter: 0.01 }); }
  for (const z of [-hz + 0.6, 0, hz - 0.6]) b.box(W + 0.15, 0.12, 0.2, tone(bark[0], 0.7), { p: [0, y1 - 0.14, z], radius: 0.04 }).box(0.2, 0.14, 0.22, ROPE, { p: [-hx + 0.3, y1 - 0.1, z], radius: 0.04, ao: 0 }).box(0.2, 0.14, 0.22, ROPE, { p: [hx - 0.3, y1 - 0.1, z], radius: 0.04, ao: 0 });
  b.box(W, 0.04, D, MOSS, { p: [0, y1 - 0.02, 0], radius: 0.01, ao: 0 });
  for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) { const z = rng.range(-hz + 0.8, hz - 0.8); b.add(new THREE.CylinderGeometry(0.95, 0.95, 0.05, 14), tone(0x3fae55, 0.9 + 0.2 * i), { p: [sd * (hx + 0.9 + i * 0.7), -1.14, z], ao: 0 }); b.box(0.06, 0.05, 0.9, 0x1d6a33, { p: [sd * (hx + 0.9 + i * 0.7), -1.11, z + 0.45], ao: 0 }); }   // lily pads floating on the sludge beside the raft (decoration, not walkable)
  return { geo: b.build() };
}

const SOLIDS = { ledge, beam, platform };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
