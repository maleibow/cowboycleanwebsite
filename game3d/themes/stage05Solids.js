import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { WARM, GAS, CORAL } from './stage05Props.js';

// Stage 5 walkable solids (same frame as stage05Gates.js; walkable top exactly y1, footprint exactly W x D):
//   ledge     a stone pavement kerb / loading step (low) or a ZINC ROOFTOP with chimney pots (tall)
//   beam      a wrought-iron footbridge across a gap: lattice sides, a plank deck, gas lamps
//   platform  a stone balustrade pedestal (low) or a chimney stack top
//   bounce    a striped café AWNING (the stage's springs): scalloped canvas stretched over a curved iron frame. y1 = the top of the canvas (the hit surface)
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const IRON = 0x1c2230, STONE = 0xcdbfa4, ZINC = 0x6f7f98;

function rooftop(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W - 0.06, H - 0.3, D - 0.06, STONE, { p: [0, y0 + (H - 0.3) / 2, 0], radius: 0.03, jitter: 0.015, ao: 0.25 }).box(W, 0.3, D, ZINC, { p: [0, y1 - 0.15, 0], radius: 0.03, ao: 0 }).box(W + 0.14, 0.3, D + 0.14, tone(STONE, 1.1), { p: [0, y1 - 0.45, 0], radius: 0.03, ao: 0 });
  for (let i = 0; i < Math.round(D / 2.4); i++) for (const sd of [-1, 1]) for (let r = 0; r < Math.min(3, Math.floor((H - 2.4) / 2)); r++) {
    const lit = (i * 3 + r * 5 + (sd > 0 ? 1 : 0)) % 4 < 2, z = -hz + 1.3 + i * 2.4;
    b.box(0.08, 1.1, 0.62, lit ? WARM : 0x141c2c, { p: [sd * (hx + 0.01), y1 - 1.8 - r * 2.0, z], radius: 0.01, ao: 0 });
  }
  for (let i = 0; i < Math.round(D / 0.9); i++) b.box(W - 0.3, 0.02, 0.34, i % 2 ? 0x7f8fa8 : 0x6f7f98, { p: [0, y1 + 0.001, -hz + 0.5 + i * 0.9], radius: 0.002, ao: 0 });   // zinc standing seams
  for (let i = 0; i < 2; i++) { const cx = rng.range(-hx + 0.9, hx - 0.9), cz = rng.range(-hz + 1.5, hz - 1.5); b.box(0.8, 0.5, 0.8, tone(STONE, 0.85), { p: [cx, y1 + 0.25, cz], radius: 0.04 }); for (const dx of [-0.2, 0.2]) b.cyl(0.13, 0.15, 0.4, 0x8a4a38, { p: [cx + dx, y1 + 0.7, cz], seg: 6 }); }   // chimney pots stay near the edges' reach but small
  for (const sd of [-1, 1]) { b.box(0.08, 0.06, D, sd > 0 ? GAS : CORAL, { p: [sd * (hx - 0.05), y1 - 0.01, 0], radius: 0.005, ao: 0 }); }
  return { geo: b.build() };
}
function kerb(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W - 0.1, H - 0.1, D - 0.1, tone(STONE, 0.7), { p: [0, (y0 + y1) / 2 - 0.05, 0], ao: 0.2 }).box(W, 0.14, D, STONE, { p: [0, y1 - 0.07, 0], radius: 0.02, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.8); i++) for (const sd of [-1, 1]) b.box(0.05, H - 0.2, 0.36, i % 2 ? 0x15161c : 0xb8ad94, { p: [sd * (hx + 0.005), y0 + (H - 0.2) / 2 + 0.05, -hz + 0.5 + i * 0.8], radius: 0.005, ao: 0 });
  for (const sd of [-1, 1]) b.box(0.08, 0.05, D, sd > 0 ? GAS : CORAL, { p: [sd * (hx - 0.1), y1 - 0.01, 0], radius: 0.005, ao: 0 });
  return { geo: b.build() };
}
const ledge = (rng, W, y0, y1, D) => (y1 - y0 >= 3 ? rooftop(rng, W, y0, y1, D) : kerb(rng, W, y0, y1, D));

function beam(rng, W, y0, y1, D) {   // an iron footbridge: two lattice girders, a plank deck, a gas lamp at each end
  const b = B(), hz = D / 2, H = y1 - y0;
  for (const sd of [-1, 1]) { b.box(0.12, 0.7, D, IRON, { p: [sd * (W / 2 - 0.06), y1 + 0.2, 0], radius: 0.01 }); b.box(0.1, H, D, IRON, { p: [sd * (W / 2 - 0.05), y1 - H / 2, 0], radius: 0.01 });
    for (let z = -hz + 0.5; z < hz - 0.3; z += 0.9) b.box(0.06, 0.75, 0.06, IRON, { p: [sd * (W / 2 - 0.06), y1 + 0.2, z], r: [0.6, 0, 0], radius: 0.005, ao: 0 }); }
  b.box(W - 0.2, 0.12, D, 0x8a6a45, { p: [0, y1 - 0.06, 0], radius: 0.01, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.45); i++) b.box(W - 0.3, 0.02, 0.05, 0x5a4228, { p: [0, y1, -hz + 0.25 + i * 0.45], radius: 0.002, ao: 0 });
  for (let z = -hz + 2.5; z < hz - 1; z += rng.range(4.5, 6)) { b.box(W, 0.18, 0.18, IRON, { p: [0, y1 - H * 0.6, z], radius: 0.02 }); b.cyl(0.04, 0.05, 1.0, IRON, { p: [W / 2 - 0.1, y1 + 0.5, z], seg: 4 }); b.sphere(0.1, GAS, { p: [W / 2 - 0.1, y1 + 1.05, z], ao: 0 }); }
  return { geo: b.build() };
}
const pedestal = (rng, W, y0, y1, D) => {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W, H, D, STONE, { p: [0, (y0 + y1) / 2, 0], radius: 0.04, jitter: 0.01, ao: 0.2 }).box(W + 0.2, 0.2, D + 0.2, tone(STONE, 1.12), { p: [0, y1 - 0.1, 0], radius: 0.03, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.6); i++) for (const sd of [-1, 1]) b.cyl(0.1, 0.12, Math.max(0.3, H - 0.5), tone(STONE, 0.85), { p: [sd * (hx + 0.02), (y0 + y1) / 2 - 0.1, -hz + 0.4 + i * 0.6], seg: 6, ao: 0 });   // little balusters round the side
  b.sphere(0.12, GAS, { p: [hx - 0.25, y1 + 0.05, hz - 0.25], ao: 0 }).sphere(0.12, GAS, { p: [-hx + 0.25, y1 + 0.05, -hz + 0.25], ao: 0 });
  return { geo: b.build() };
};

// An awning: the top face is y1 (what you land on), 0.3 m deep; a curved sail of alternating stripes with a scalloped valance and two iron arms back to the wall line.
function awning(rng, W, y0, y1, D) {
  const b = B(), hz = D / 2, hx = W / 2, n = Math.max(6, Math.round(W / 0.55)), cw = W / n, pal = rng.pick([[0xc0392b, 0xf4efe6], [0x2c5aa8, 0xf4efe6], [0x1f7a4a, 0xf4efe6], [0xd18a10, 0x2a2018]]);
  for (let i = 0; i < n; i++) {
    const x = -hx + (i + 0.5) * cw, col = pal[i % 2];
    b.box(cw - 0.01, 0.3, D, col, { p: [x, y1 - 0.15, 0], radius: 0.04, jitter: 0.012, ao: 0.05 });                                       // the sail: its top is the landing surface
    b.box(cw - 0.01, 0.26, 0.16, col, { p: [x, y1 - 0.2, hz + 0.05], radius: 0.06, ao: 0 }); b.cone(cw * 0.5, 0.22, col, { p: [x, y1 - 0.4, hz + 0.1], r: [Math.PI, 0, 0], seg: 5, ao: 0 });   // scalloped valance
  }
  for (const sd of [-1, 1]) { b.box(0.07, 0.07, D + 0.3, IRON, { p: [sd * (hx - 0.1), y1 - 0.34, 0], radius: 0.01 }); b.cyl(0.05, 0.05, 1.1, IRON, { p: [sd * (hx - 0.1), y1 - 0.9, -hz - 0.05], seg: 4 }); }
  b.box(W, 0.06, 0.06, WARM, { p: [0, y1 - 0.05, hz + 0.19], radius: 0.01, ao: 0 });                                                      // a bead of warm light along the front edge
  b.box(0.5, 0.22, 0.04, 0x14161e, { p: [0, y1 - 0.32, hz + 0.18], radius: 0.02, ao: 0 });
  return { geo: b.build() };
}

const SOLIDS = { ledge, beam, platform: pedestal, bounce: awning };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
