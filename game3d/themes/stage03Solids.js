import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { CYAN, MAG, AMBER } from './stage03Props.js';

// Stage 3 walkable solids (same frame as stage03Gates.js; walkable top exactly y1, footprint exactly W x D):
//   ledge    a steel catwalk (side section)           beam      a bridge of three bundled pipes over the acid
//   platform a riveted steel pontoon (pad over acid)  conveyor  a belt: housing, side rails, end rollers, lane lines (arrows are animated by the dress)
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const STEEL = 0x4a5068, PLATE = 0x59617a, DARK = 0x20202a;
const logZ = (r, len, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);

function ledge(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W - 0.1, H - 0.2, D - 0.1, 0x2a2a38, { p: [0, (y0 + y1) / 2 - 0.1, 0], ao: 0.2 });
  const n = Math.round(D / 0.5), dz = D / n;
  for (let i = 0; i < n; i++) b.box(W, 0.12, dz - 0.07, i % 2 ? PLATE : tone(PLATE, 0.85), { p: [0, y1 - 0.06, -hz + (i + 0.5) * dz], radius: 0.01, ao: 0 });   // grated deck plates
  for (const sd of [-1, 1]) { b.box(0.14, H, D, tone(STEEL, 1.1), { p: [sd * (hx - 0.07), (y0 + y1) / 2, 0], radius: 0.01 }); for (let i = 0; i < Math.round(D / 1.4); i++) b.box(0.05, H * 0.4, 0.5, i % 2 ? 0x1a1a1a : 0xf2c200, { p: [sd * (hx + 0.01), y0 + H * 0.3, -hz + 0.7 + i * 1.4], radius: 0.005, ao: 0 }); }
  b.box(0.06, 0.06, D, CYAN, { p: [-hx + 0.2, y1 - 0.01, 0], radius: 0.005, ao: 0 }).box(0.06, 0.06, D, MAG, { p: [hx - 0.2, y1 - 0.01, 0], radius: 0.005, ao: 0 });
  for (let i = 0; i <= Math.max(2, Math.round(D / 4)); i++) for (const sd of [-1, 1]) b.box(0.2, H, 0.25, DARK, { p: [sd * (hx - 0.15), y0 + H / 2, -hz + 0.2 + (D - 0.4) * i / Math.max(2, Math.round(D / 4))], radius: 0.02 });
  return { geo: b.build() };
}

function beam(rng, W, y0, y1, D) {
  const b = B(), hz = D / 2, H = y1 - y0, r = Math.min(H, W / 3) / 2, cols = [0x6a6a7e, 0x7a4a3a, 0x5a6a7e];
  for (let k = -1; k <= 1; k++) b.add(logZ(r, D, 10), cols[k + 1], { p: [k * (W - 2 * r) / 2, y1 - r, 0], jitter: 0.008 });
  b.box(W, 0.06, D, 0x3a3a4a, { p: [0, y1 - 0.03, 0], radius: 0.01, ao: 0 });                                                       // flat plate on top so the walkable height is exactly y1
  for (let z = -hz + 1.5; z < hz - 0.5; z += rng.range(3, 4.5)) { b.box(W + 0.12, 0.28, 0.22, DARK, { p: [0, y1 - 0.25, z], radius: 0.02 }); b.box(W, 0.05, 0.1, AMBER, { p: [0, y1 - 0.02, z + 0.2], radius: 0.005, ao: 0 }); }   // flanges + amber warning lines
  for (const sd of [-1, 1]) b.box(0.06, 0.06, D, sd > 0 ? MAG : CYAN, { p: [sd * (W / 2 - 0.05), y1 - 0.02, 0], radius: 0.005, ao: 0 });
  return { geo: b.build() };
}

function platform(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, hz = D / 2, deck = 0.5;
  b.box(W - 0.1, y1 - y0 - deck, D - 0.1, 0x1a1a26, { p: [0, y0 + (y1 - y0 - deck) / 2, 0], ao: 0 });                         // body, below the acid line
  b.box(W, deck, D, STEEL, { p: [0, y1 - deck / 2, 0], radius: 0.05, ao: 0.1 });
  b.box(W - 0.4, 0.06, D - 0.4, PLATE, { p: [0, y1 - 0.03, 0], radius: 0.01, ao: 0 });
  for (let i = 0; i < 12; i++) b.box(W / 12, 0.12, 0.2, i % 2 ? 0x1a1a1a : 0xf2c200, { p: [-hx + (i + 0.5) * (W / 12), y1 - 0.1, hz - 0.12], radius: 0.005, ao: 0 }).box(W / 12, 0.12, 0.2, i % 2 ? 0xf2c200 : 0x1a1a1a, { p: [-hx + (i + 0.5) * (W / 12), y1 - 0.1, -hz + 0.12], radius: 0.005, ao: 0 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cyl(0.07, 0.07, 0.05, 0xc8ccd8, { p: [x * (hx - 0.3), y1 - 0.02, z * (hz - 0.5)], seg: 5, ao: 0 });
  b.box(0.06, 0.1, D - 0.6, CYAN, { p: [-hx - 0.01, y1 - 0.25, 0], radius: 0.005, ao: 0 }).box(0.06, 0.1, D - 0.6, MAG, { p: [hx + 0.01, y1 - 0.25, 0], radius: 0.005, ao: 0 });
  for (const sd of [-1, 1]) b.cyl(0.04, 0.04, 2.2, 0x6a6a7e, { p: [sd * (hx + 0.35), y1 + 0.5, 0], r: [0, 0, sd * 0.25], seg: 4, ao: 0 });   // chains from the cranes that dropped it here
  return { geo: b.build() };
}

function conveyor(rng, W, y0, y1, D) {
  const b = B(), hx = W / 2, hz = D / 2, H = y1 - y0;
  b.box(W, H - 0.12, D, 0x2a2a38, { p: [0, y0 + (H - 0.12) / 2, 0], radius: 0.04, ao: 0.2 });                                       // housing
  b.box(W - 0.5, 0.12, D, 0x1c1c24, { p: [0, y1 - 0.06, 0], radius: 0.01, ao: 0 });                                                   // the rubber belt itself, top = y1
  for (let i = 0; i < Math.round(D / 1.1); i++) b.box(W - 0.6, 0.015, 0.05, 0x2e2e3a, { p: [0, y1 + 0.001, -hz + 0.6 + i * 1.1], radius: 0.002, ao: 0 });   // slat seams
  for (const sd of [-1, 1]) { b.box(0.25, 0.3, D, tone(STEEL, 1.15), { p: [sd * (hx - 0.125), y1 - 0.15 + 0.05, 0], radius: 0.02 }); b.box(0.06, 0.06, D, sd > 0 ? MAG : CYAN, { p: [sd * (hx - 0.12), y1 + 0.003, 0], radius: 0.005, ao: 0 }); for (let i = 0; i < Math.round(D / 1.0); i++) b.box(0.05, 0.14, 0.5, i % 2 ? 0x1a1a1a : 0xf2c200, { p: [sd * (hx + 0.005), y1 - 0.4, -hz + 0.5 + i * 1.0], radius: 0.005, ao: 0 }); }
  for (const sz of [-1, 1]) b.add(new THREE.CylinderGeometry(0.28, 0.28, W - 0.1, 12).rotateZ(Math.PI / 2), 0x8a90a0, { p: [0, y1 - 0.2, sz * (hz - 0.2)], ao: 0 });   // end rollers
  for (let i = 0; i <= Math.max(1, Math.round(D / 5)); i++) for (const sd of [-1, 1]) b.box(0.3, 1.0, 0.3, DARK, { p: [sd * (hx - 0.5), y0 + 0.5, -hz + 0.3 + (D - 0.6) * i / Math.max(1, Math.round(D / 5))], radius: 0.02 });
  return { geo: b.build() };
}

const SOLIDS = { ledge, beam, platform, conveyor };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
