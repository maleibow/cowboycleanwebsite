import * as THREE from 'three';

// Swept ground meshes per segment, and a windowed builder that keeps geometry only for the part of
// the track near the player (PLAN 4.1): built ~150 m ahead, disposed ~30 m behind. One merged
// vertex-coloured geometry (one draw call) per segment; no art yet, flat-coloured boxes.
export const WINDOW = { ahead: 150, behind: 30 };
const SLOT_COLORS = { enemy: 0xd33c3c, pickup: 0xf2c230, obstacle: 0xe58a2f, door: 0xb05fe0 };
const SHADE = { top: 1, side: 0.68, end: 0.8, bottom: 0.45 };

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3();
const mix = (hex, k) => { const c = new THREE.Color(hex); return c.multiplyScalar(k); };

// Accumulates quads; flips winding so each face's normal agrees with `hint`.
function makeSink() {
  const pos = [], col = [], idx = [];
  return {
    pos, col, idx,
    quad(a, b, c, d, hint, color) {
      _n.subVectors(b, a).cross(_c.subVectors(c, a));
      if (_n.dot(hint) < 0) { const t = b; b = d; d = t; }
      const base = pos.length / 3;
      for (const v of [a, b, c, d]) { pos.push(v.x, v.y, v.z); col.push(color.r, color.g, color.b); }
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    },
  };
}

// A box in track space swept along the centreline: top, both side skirts, end caps, bottom if floating.
const hh = (a, b) => { const t = Math.sin(a * 127.1 + b * 311.7) * 43758.5; return t - Math.floor(t); };
function addBox(track, sink, box, hex, style = {}) {
  if (box.kind === 'hidden') return;   // collision only (the arena floor is drawn by the theme)
  const n = Math.max(1, Math.ceil((box.s1 - box.s0) / 2)), F = [];
  for (let i = 0; i <= n; i++) {
    const f = track.frameAt(box.s0 + ((box.s1 - box.s0) * i) / n);
    F.push({ p: f.p.clone(), r: f.r.clone(), u: f.u.clone(), t: f.t.clone() });
  }
  const P = (i, x, y) => new THREE.Vector3().copy(F[i].p).addScaledVector(F[i].r, x).addScaledVector(F[i].u, y);
  const hint = new THREE.Vector3(), floating = box.y0 > 0.01 && box.kind !== 'ground' && box.kind !== 'platform';
  for (let i = 0; i < n; i++) {
    const k = i % 2 ? 0.97 : 1.03; // faint checker so speed reads on flat ground
    const top = mix(hex, SHADE.top * k), side = mix(hex, SHADE.side * k);
    const cols = Math.max(1, Math.round((box.x1 - box.x0) / 1.1)), noise = style.noise ?? 0;   // top face in cells: colour noise + wheel ruts
    hint.copy(F[i].u);
    for (let j = 0; j < cols; j++) {
      const xa = box.x0 + ((box.x1 - box.x0) * j) / cols, xb = box.x0 + ((box.x1 - box.x0) * (j + 1)) / cols, xm = (xa + xb) / 2;
      let kk = 1 + (hh(Math.floor(box.s0 + i * 2), j + box.x0) - 0.5) * 2 * noise;
      if (style.rut && box.kind === 'ground' && Math.abs(Math.abs(xm) - style.rutX) < 0.45) kk *= 1 - style.rut;
      if (style.edge && (j === 0 || j === cols - 1) && cols > 2) kk *= style.edge;                 // kerb stones along both edges
      sink.quad(P(i, xa, box.y1), P(i, xb, box.y1), P(i + 1, xb, box.y1), P(i + 1, xa, box.y1), hint, top.clone().multiplyScalar(kk));
    }
    sink.quad(P(i, box.x0, box.y1), P(i, box.x0, box.y0), P(i + 1, box.x0, box.y0), P(i + 1, box.x0, box.y1), hint.copy(F[i].r).negate(), side);
    sink.quad(P(i, box.x1, box.y1), P(i, box.x1, box.y0), P(i + 1, box.x1, box.y0), P(i + 1, box.x1, box.y1), hint.copy(F[i].r), side);
    if (floating) sink.quad(P(i, box.x0, box.y0), P(i, box.x1, box.y0), P(i + 1, box.x1, box.y0), P(i + 1, box.x0, box.y0), hint.copy(F[i].u).negate(), mix(hex, SHADE.bottom));
  }
  const end = mix(hex, SHADE.end);
  sink.quad(P(0, box.x0, box.y0), P(0, box.x1, box.y0), P(0, box.x1, box.y1), P(0, box.x0, box.y1), hint.copy(F[0].t).negate(), end);
  sink.quad(P(n, box.x0, box.y0), P(n, box.x1, box.y0), P(n, box.x1, box.y1), P(n, box.x0, box.y1), hint.copy(F[n].t), end);
}

export function buildSegmentGeometry(track, seg, palette, showSlots = true, style = {}) {
  const sink = makeSink();
  for (const box of seg.boxes) addBox(track, sink, box, palette[box.kind] ?? palette.ground, style);
  for (const d of seg.deco) addBox(track, sink, d, d.color);
  if (showSlots) for (const sl of seg.slots) {
    const hex = sl.kind === 'pickup' && sl.role === 'item' ? 0xffffff : SLOT_COLORS[sl.kind] ?? 0xff00ff;
    const base = sl.kind === 'pickup' ? sl.y - 0.15 : sl.y;
    addBox(track, sink, { s0: sl.s - 0.3, s1: sl.s + 0.3, x0: sl.x - 0.3, x1: sl.x + 0.3, y0: base, y1: base + (sl.kind === 'pickup' ? 0.3 : 0.7), kind: 'marker' }, hex);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(sink.pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(sink.col, 3));
  g.setIndex(sink.idx);
  g.computeVertexNormals(); // vertices are unshared per face, so normals stay flat
  g.computeBoundingSphere();
  return g;
}

export function createTrackBuilder(track, scene, { palette, showSlots = true, shadows = false, material: themeMaterial = null, style = {} } = {}) {
  const material = themeMaterial || new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  const live = new Map(); // segment index -> Mesh
  const api = { live, built: 0, disposed: 0, material };
  api.update = (s) => {
    const segs = track.segments;
    for (let i = 0; i < segs.length; i++) {
      const g = segs[i], want = g.s1 > s - WINDOW.behind && g.s0 < s + WINDOW.ahead, mesh = live.get(i);
      if (want && !mesh) {
        const m = new THREE.Mesh(buildSegmentGeometry(track, g, palette, showSlots, style), material);
        m.castShadow = m.receiveShadow = shadows; m.frustumCulled = true; m.name = `seg${i}:${g.name}`;
        scene.add(m); live.set(i, m); api.built++;
      } else if (!want && mesh) {
        scene.remove(mesh); mesh.geometry.dispose(); live.delete(i); api.disposed++;
      }
    }
  };
  api.invalidate = (i) => { const m = live.get(i); if (m) { scene.remove(m); m.geometry.dispose(); live.delete(i); } };   // rebuilt on the next update (e.g. the gate wall opened)
  api.dispose = () => { for (const m of live.values()) { scene.remove(m); m.geometry.dispose(); } live.clear(); material.dispose(); };
  return api;
}
