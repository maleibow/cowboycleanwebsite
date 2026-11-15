import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { LAVA, HOT, RED } from './stage06Props.js';

// Stage 6 walkable solids (same frame as stage06Gates.js; walkable top exactly y1, footprint exactly W x D):
//   ledge     a basalt shelf with glowing edge cracks (low, side section) or a tall obsidian mesa (high)
//   beam      a chained timber causeway over a lava gap: charred planks, iron chain rails, lanterns of ember
//   platform  a basalt stepping pillar: a hexagonal column cluster, top glowing at the rim
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const ROCK = 0x2a2428, ROCKD = 0x1a1618, IRON = 0x2c2a32;

function shelf(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W - 0.1, H - 0.1, D - 0.1, ROCKD, { p: [0, (y0 + y1) / 2 - 0.05, 0], radius: 0.08, jitter: 0.04, ao: 0.25 }).box(W, 0.2, D, ROCK, { p: [0, y1 - 0.1, 0], radius: 0.05, jitter: 0.02, ao: 0 });
  for (let i = 0; i < Math.round(D / 1.2); i++) for (const sd of [-1, 1]) b.box(0.06, Math.max(0.2, H - 0.3), 0.08, i % 2 ? LAVA : RED, { p: [sd * (hx + 0.005), y0 + (H - 0.3) / 2 + 0.1, -hz + 0.5 + i * 1.2], r: [0, 0, 0.2 * sd], radius: 0.005, ao: 0 });
  for (const sd of [-1, 1]) b.box(0.08, 0.05, D, sd > 0 ? LAVA : HOT, { p: [sd * (hx - 0.1), y1 - 0.01, 0], radius: 0.005, ao: 0 });
  return { geo: b.build() };
}
function mesa(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W - 0.4, H - 0.3, D - 0.4, ROCK, { p: [0, y0 + (H - 0.3) / 2, 0], radius: 0.12, jitter: 0.06, ao: 0.3 }).box(W, 0.4, D, ROCKD, { p: [0, y1 - 0.2, 0], radius: 0.08, jitter: 0.03, ao: 0 });
  for (let i = 0; i < 6; i++) { const z = rng.range(-hz + 1, hz - 1), sd = rng.sign(); b.box(0.07, rng.range(1, H * 0.6), 0.09, i % 2 ? LAVA : HOT, { p: [sd * (hx - 0.18), y1 - H * 0.35, z], r: [0, 0, 0.1], radius: 0.01, ao: 0 }); }
  for (let i = 0; i < 3; i++) b.cone(0.3, rng.range(0.5, 1.0), 0x14121c, { p: [rng.range(-hx + 0.8, hx - 0.8), y1 + 0.3, rng.range(-hz + 1, hz - 1)], seg: 4, ao: 0.1 });   // obsidian spikes
  return { geo: b.build() };
}
const ledge = (rng, W, y0, y1, D) => (y1 - y0 >= 3 ? mesa(rng, W, y0, y1, D) : shelf(rng, W, y0, y1, D));

function beam(rng, W, y0, y1, D) {
  const b = B(), hz = D / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.16, H, D, ROCKD, { p: [sd * (W / 2 - 0.08), y1 - H / 2, 0], radius: 0.01 }); b.box(0.06, 0.06, D, IRON, { p: [sd * (W / 2 - 0.08), y1 + 0.7, 0], radius: 0.01, ao: 0 }); }
  b.box(W - 0.3, 0.14, D, 0x2a1c16, { p: [0, y1 - 0.07, 0], radius: 0.01, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.45); i++) b.box(W - 0.4, 0.02, 0.05, i % 2 ? 0x201510 : 0x3a2a20, { p: [0, y1, -hz + 0.25 + i * 0.45], radius: 0.002, ao: 0 });
  for (let z = -hz + 2; z < hz - 1; z += rng.range(4, 5.5)) { b.box(W + 0.1, 0.16, 0.18, IRON, { p: [0, y1 - H * 0.6, z], radius: 0.02 }); for (const sd of [-1, 1]) { b.cyl(0.05, 0.06, 0.8, IRON, { p: [sd * (W / 2 - 0.08), y1 + 0.38, z], seg: 4 }); b.sphere(0.09, LAVA, { p: [sd * (W / 2 - 0.08), y1 + 0.82, z], ao: 0 }); } }
  return { geo: b.build() };
}
function pillar(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W, H - 0.2, D, ROCK, { p: [0, (y0 + y1) / 2 - 0.1, 0], radius: 0.1, jitter: 0.04, ao: 0.25 }).box(W + 0.1, 0.22, D + 0.1, ROCKD, { p: [0, y1 - 0.11, 0], radius: 0.06, ao: 0 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.3, 0.34, H - 0.1, (sx + sz) ? ROCKD : ROCK, { p: [sx * (hx - 0.3), (y0 + y1) / 2, sz * (hz - 0.3)], seg: 6, ao: 0.3 });
  for (const sd of [-1, 1]) b.box(0.08, 0.05, D, sd > 0 ? LAVA : HOT, { p: [sd * (hx - 0.08), y1 - 0.01, 0], radius: 0.005, ao: 0 });
  for (let i = 0; i < 3; i++) b.box(0.05, H * 0.6, 0.06, i % 2 ? LAVA : RED, { p: [-hx + 0.8 + i * 1.0, (y0 + y1) / 2, hz + 0.01], radius: 0.005, ao: 0 });
  return { geo: b.build() };
}
const SOLIDS = { ledge, beam, platform: pillar };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
