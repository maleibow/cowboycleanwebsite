import * as THREE from 'three';
import { Builder } from './modelKit.js';

// Shared part builders for enemy and boss models. Each takes a Builder and adds primitives to it, so a part
// geometry (one InstancedMesh per part, see enemyRender.js) is just a few calls. Conventions: metres, y up,
// the model faces +Z (toward the player and camera), parts that animate are built around their pivot at the origin.
// Later stages reuse these: a slime is a blob + eyes, a bat is a blob + two wings, a roach is a blob + legs.

// Lumpy rounded body with a lighter highlight patch and optional dirt clods.
export function blob(b, { r = 0.5, color = 0x5d4037, hi = 0x795548, p = [0, r, 0], squash = [1, 0.92, 1], jitter = 0.05, clods = 0, clod = color, rng = Math.random } = {}) {
  b.sphere(r, color, { p, s: squash, jitter });
  if (hi != null) b.sphere(r * 0.62, hi, { p: [p[0] - r * 0.14, p[1] + r * 0.2, p[2] + r * 0.18], s: squash, jitter: jitter * 0.6, ao: 0 });
  for (let i = 0; i < clods; i++) {
    const a = (i / clods) * Math.PI * 2 + 0.6, up = 0.3 + 0.5 * ((i * 37) % 10) / 10;
    b.sphere(r * (0.17 + ((i * 13) % 5) * 0.02), clod, { p: [p[0] + Math.cos(a) * r * 0.85 * (1 - up * 0.3), p[1] + r * up * 0.9, p[2] + Math.sin(a) * r * 0.85 * (1 - up * 0.3)], jitter: 0.04 });
  }
  return b;
}

// A pair of eyes (white + pupil) with optional angry brows and a shine. Centre (x=0, y, z=front), spacing `gap`.
export function eyes(b, { y = 0.6, z = 0.4, gap = 0.17, r = 0.1, white = 0xffffff, pupil = 0x111111, pr = 0.5, look = 0.4, brow = 0, browColor = 0x1a1014, shine = true } = {}) {
  for (const s of [-1, 1]) {
    b.sphere(r, white, { p: [s * gap, y, z], s: [1, 1.1, 0.6], ao: 0 });
    b.sphere(r * pr, pupil, { p: [s * gap * (1 - look * 0.15), y - r * 0.05, z + r * 0.4], s: [1, 1.1, 0.5], ao: 0 });
    if (shine) b.sphere(r * 0.2, 0xffffff, { p: [s * gap + r * 0.15, y + r * 0.25, z + r * 0.65], ao: 0 });
    if (brow) b.box(r * 2.2, r * 0.4, r * 0.5, browColor, { p: [s * gap, y + r * 1.25, z + r * 0.15], r: [0, 0, -s * brow], radius: r * 0.1, ao: 0 });
  }
  return b;
}

// A wing as a fan of feathers hanging from its shoulder pivot (origin), pointing +x for side=1, -x for side=-1.
export function wing(b, { side = 1, span = 0.8, chord = 0.3, feathers = 5, color = 0x222222, tip = 0x444444, thick = 0.035 } = {}) {
  for (let i = 0; i < feathers; i++) {
    const u = i / (feathers - 1), len = span * (0.55 + 0.45 * Math.sin(Math.min(1, u * 1.1 + 0.1) * 1.6)), ang = (u - 0.35) * 0.55;
    b.box(len, thick, chord * (0.7 + 0.3 * (1 - u)), i % 2 ? color : tip, { p: [side * len / 2, -0.005 * i, (u - 0.4) * chord * 1.2], r: [0, side * -ang, 0], radius: 0.012, ao: 0.1 });
  }
  b.box(span * 0.35, thick * 2.2, chord * 1.1, color, { p: [side * span * 0.17, 0.01, 0], radius: 0.02 });
  return b;
}

// Leg: thigh then shin as two capsules from hip (origin of the call point) to foot; knee bulges outward by `bend`.
export function leg(b, { hip = [0, 0.3, 0], foot = [0.5, 0, 0], r = 0.035, color = 0x111111, bend = 0.25, up = 0.18 } = {}) {
  const k = [(hip[0] + foot[0]) / 2 + Math.sign(foot[0] - hip[0] || 1) * bend, Math.max(hip[1], foot[1]) + up, (hip[2] + foot[2]) / 2];
  for (const [a, c] of [[hip, k], [k, foot]]) {
    const d = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]), len = d.length(), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), e = new THREE.Euler().setFromQuaternion(q);
    b.capsule(r, Math.max(0.01, len - r * 2), color, { p: [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2], r: [e.x, e.y, e.z], ao: 0.05 });
  }
  b.sphere(r * 1.25, color, { p: k, ao: 0 });
  return b;
}

// Stubby foot / paw pair, for walkers and hoppers.
export const foot = (b, { x = 0.2, y = 0.1, z = 0.05, w = 0.2, h = 0.14, l = 0.3, color = 0x3a261c } = {}) => b.box(w, h, l, color, { p: [x, y, z], radius: h * 0.4, ao: 0.1 });

// A tall rounded ear / horn / spike. tilt = rotation about z (outward lean), colour + optional inner colour.
export function ear(b, { len = 0.5, r = 0.09, color = 0x7f8c8d, inner = null, tilt = 0 } = {}) {
  b.capsule(r, len, color, { p: [0, len / 2 + r, 0], r: [0, 0, tilt], s: [0.8, 1, 0.55] });
  if (inner != null) b.capsule(r * 0.55, len * 0.8, inner, { p: [0, len / 2 + r, r * 0.25], r: [0, 0, tilt], s: [0.8, 1, 0.3], ao: 0 });
  return b;
}
export const spike = (b, { p = [0, 0, 0], r = 0.07, h = 0.25, color = 0xaed6f1, rot = [0, 0, 0], seg = 5 } = {}) => b.cone(r, h, color, { p, r: rot, seg, ao: 0.05 });

// Ring of `n` small chunks around the origin (ice shards, orbiting grit, soap-bubble crowns).
export function ring(b, { n = 4, radius = 0.6, size = 0.1, color = 0xd6f0ff, y = 0 } = {}) {
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; b.add(new THREE.OctahedronGeometry(size, 0), color, { p: [Math.cos(a) * radius, y + Math.sin(i * 2.3) * 0.08, Math.sin(a) * radius], s: [0.7, 1.3, 0.7], r: [0.3, a, 0.2], ao: 0 }); }
  return b;
}
