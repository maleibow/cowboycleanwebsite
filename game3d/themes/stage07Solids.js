import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { BAND, SPARK } from './stage07Props.js';

// Stage 7 walkable solids (same frame as stage07Gates.js; walkable top exactly y1, footprint exactly W x D):
//   ledge     a soft white CLOUD BUMP (the slide's obstacles, low) or a mossy tropical shelf with flowers (side section / tall)
//   beam      a RAINBOW BRIDGE across a gap: seven coloured stripes along its length, cloud puffs at the ends
//   platform  a jellybean pad: a pastel pillar with a candy-striped skirt and a glowing top ring
//   slide     the RAINBOW SLIDE ribbon: seven stripes with white sparkle lines and cloud-wisp edges (long: split every 2 m so it follows the track's curve)
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const B = () => new Builder({ boxSeg: 1, ico: true });
const PASTEL = [0xff9ad5, 0xffe36a, 0x7fd8ff, 0xc9a0ff, 0x9af0b0, 0xffb07a];

function cloudBump(rng, W, y0, y1, D) {   // top = y1 is flat enough to stand on
  const b = B(), H = y1 - y0;
  for (const [x, z, r, c] of [[0, 0, 1, 0xffffff], [-0.34, 0.1, 0.8, 0xf2f6ff], [0.34, -0.1, 0.85, 0xffffff]]) b.add(new THREE.SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), c, { p: [x * W / 2, y0, z * D / 2], s: [W / 2 * r * 0.85, H * 0.96 * Math.min(1, r + 0.2), D / 2 * r * 0.85], jitter: 0.05, ao: 0.1 });
  b.box(W * 0.62, 0.08, D * 0.62, 0xffffff, { p: [0, y1 - 0.04, 0], radius: 0.03, ao: 0 });
  b.sphere(0.12, SPARK, { p: [W * 0.25, y1 + 0.06, 0], ao: 0 }).sphere(0.1, PASTEL[2], { p: [-W * 0.2, y1 + 0.03, D * 0.15], ao: 0 });
  return { geo: b.build() };
}
function shelf(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2;
  b.box(W - 0.1, H - 0.1, D - 0.1, 0xb8864a, { p: [0, (y0 + y1) / 2 - 0.05, 0], ao: 0.2 }).box(W, 0.16, D, 0x3dbb6a, { p: [0, y1 - 0.08, 0], radius: 0.04, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.9); i++) for (const sd of [-1, 1]) b.sphere(0.16, PASTEL[(i + (sd > 0 ? 3 : 0)) % 6], { p: [sd * (hx - 0.1), y1 - 0.02, -hz + 0.5 + i * 0.9], s: [1, 0.7, 1], ao: 0 });
  return { geo: b.build() };
}
const ledge = (rng, W, y0, y1, D) => (y1 - y0 < 1.4 && D < 3 ? cloudBump(rng, W, y0, y1, D) : shelf(rng, W, y0, y1, D));

function beam(rng, W, y0, y1, D) {   // a rainbow bridge: stripes along its length
  const b = B(), hz = D / 2;
  for (let i = 0; i < 7; i++) b.add(new THREE.BoxGeometry(W / 7 - 0.01, 0.3, D, 1, 1, Math.max(1, Math.ceil(D / 3))), BAND[i], { p: [-W / 2 + (i + 0.5) * (W / 7), y1 - 0.15, 0], ao: 0.04 });
  for (const sd of [-1, 1]) b.box(0.08, 0.06, D, SPARK, { p: [sd * (W / 2 - 0.04), y1 - 0.01, 0], radius: 0.01, ao: 0 });
  for (const z of [-hz + 0.6, hz - 0.6]) for (const sd of [-1, 1]) b.sphere(0.5, 0xffffff, { p: [sd * (W / 2 + 0.1), y1 - 0.45, z], s: [1.2, 0.8, 1.2], jitter: 0.06, ao: 0 });
  for (let z = -hz + 3; z < hz - 1; z += rng.range(4, 6)) b.sphere(0.4, 0xffffff, { p: [rng.sign() * (W / 2 + 0.05), y1 - 0.5, z], s: [1.1, 0.7, 1.1], jitter: 0.06, ao: 0 });   // tufts of cloud under the span
  return { geo: b.build() };
}
function pad(rng, W, y0, y1, D) {
  const b = B(), H = y1 - y0, hx = W / 2, hz = D / 2, c = rng.pick(PASTEL);
  b.box(W, H - 0.2, D, c, { p: [0, (y0 + y1) / 2 - 0.1, 0], radius: 0.18, jitter: 0.02, ao: 0.2 }).box(W + 0.1, 0.22, D + 0.1, tone(c, 1.15), { p: [0, y1 - 0.11, 0], radius: 0.1, ao: 0 });
  for (let i = 0; i < Math.round(D / 0.7); i++) for (const sd of [-1, 1]) b.box(0.05, H - 0.4, 0.34, i % 2 ? 0xffffff : tone(c, 0.7), { p: [sd * (hx + 0.005), (y0 + y1) / 2 - 0.1, -hz + 0.4 + i * 0.7], radius: 0.005, ao: 0 });
  for (const sd of [-1, 1]) b.box(0.08, 0.05, D, SPARK, { p: [sd * (hx - 0.1), y1 - 0.01, 0], radius: 0.005, ao: 0 });
  return { geo: b.build() };
}
function slide(rng, W, y0, y1, D) {
  const b = B(), n = Math.ceil(D / 2);
  for (let i = 0; i < 7; i++) b.add(new THREE.BoxGeometry(W / 7 - 0.005, 0.4, D, 1, 1, n), BAND[i], { p: [-W / 2 + (i + 0.5) * (W / 7), y1 - 0.2, 0], ao: 0.03 });
  for (const x of [-W / 2 + W / 7 * 2, W / 2 - W / 7 * 2]) b.add(new THREE.BoxGeometry(0.1, 0.02, D, 1, 1, n), SPARK, { p: [x, y1 + 0.001, 0], ao: 0 });
  for (const sd of [-1, 1]) for (let z = -D / 2 + 1; z < D / 2; z += 2.2) b.sphere(0.45, 0xffffff, { p: [sd * (W / 2 + 0.2), y1 - 0.2, z], s: [1.1, 0.7, 1.3], jitter: 0.06, ao: 0 });   // cloud wisps along both edges
  return { geo: b.build() };
}
const SOLIDS = { ledge, beam, platform: pad, slide };
export function buildSolid(kind, rng, W, y0, y1, { depth = 1 } = {}) { return SOLIDS[kind]?.(rng, W, y0, y1, depth) ?? null; }
