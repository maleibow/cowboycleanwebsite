import * as THREE from 'three';
import { createRng } from '../core/rng.js';
import { placeMatrix } from './scenery.js';

// Theme-built solids (PLAN 4.2): slide-under gates, ledges, logs, pillars. The theme supplies
//   buildBarrier(rng, width, y0, y1, { depth, index })           -> { geo, sway? }
//   buildSolid(kind, rng, width, y0, y1, { depth, index })        -> same, for 'ledge' | 'beam' | 'platform'
// in the box's own frame (x across, y absolute, z along the track, centred), so the visible shape sits on the hitbox.
// geo is baked into world space here (per-vertex track frame, so long logs follow the path); `sway` parts
// (a hanging sign, a lantern) become pivot groups whose matrix the builder animates: one extra draw call each. Returns null when the theme has no builder (plain box fallback).
export const THEMED_KINDS = new Set(['barrier', 'ledge', 'beam', 'platform']);
const FR = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() };
const _v = new THREE.Vector3();

// Maps local geometry (centred at s = sm, x = xc) onto the track. Returns a new non-indexed geometry (position, normal, color).
function bake(track, geo, sm, xc) {
  const pos = geo.attributes.position, n = pos.count, P = new Float32Array(n * 3);
  let lastZ = NaN;
  for (let i = 0; i < n; i++) {
    const z = pos.getZ(i);
    if (z !== lastZ) { track.frameAt(sm - z, FR); lastZ = z; }
    const x = pos.getX(i) + xc, y = pos.getY(i);
    _v.copy(FR.p).addScaledVector(FR.r, x).addScaledVector(FR.u, y);
    P[i * 3] = _v.x; P[i * 3 + 1] = _v.y; P[i * 3 + 2] = _v.z;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  if (geo.attributes.color) g.setAttribute('color', geo.attributes.color.clone());
  g.computeVertexNormals();   // non-indexed: flat per-triangle normals, so soft-corner primitives read as chunky facets
  return g;
}

// Swaying parts keep their own local frame: vertices relative to the pivot, placed by a matrix each frame.
function local(geo, pivot) {
  const g = geo.clone(); g.translate(-pivot[0], -pivot[1], -pivot[2]); g.computeVertexNormals(); return g;
}

export function buildThemed(track, theme, box, ordinal, seed = 0) {
  const hook = box.kind === 'barrier' ? theme.buildBarrier : theme.buildSolid;
  if (!hook) return null;
  const rng = createRng(((box.s0 * 100) | 0) ^ 0x5eed ^ (ordinal * 7919) ^ seed), W = box.x1 - box.x0, extra = { depth: box.s1 - box.s0, index: ordinal };
  const res = box.kind === 'barrier' ? hook(rng, W, box.y0, box.y1, extra) : hook(box.kind, rng, W, box.y0, box.y1, extra);
  if (!res) return null;
  const sm = (box.s0 + box.s1) / 2, xc = (box.x0 + box.x1) / 2, out = { geo: bake(track, res.geo, sm, xc), sway: [] };
  res.geo.dispose();
  for (const w of res.sway || []) {
    const base = placeMatrix(track, sm - w.pivot[2], xc + w.pivot[0], w.pivot[1], 0, 1, 1, 1, new THREE.Matrix4());
    out.sway.push({ geo: local(w.geo, w.pivot), base, amp: w.amp, speed: w.speed, phase: w.phase });
    w.geo.dispose();
  }
  return out;
}
