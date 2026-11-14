import * as THREE from 'three';

// The track: a Catmull-Rom centreline with precomputed frames. All gameplay is in track space
// (s along the path, x lateral, y up); toWorld() maps it onto the 3D curve (PLAN 3.1).
// Segments contribute heading change (yaw) and height change (rise); ground boxes stay straight.
const S_MIN = -40, S_TAIL = 60, UP = new THREE.Vector3(0, 1, 0);
const smooth = (u) => u * u * (3 - 2 * u);
const smoothD = (u) => 6 * u * (1 - u);

export function createTrack(layout) {
  const segs = layout.segments, length = layout.length;
  let h = 0;
  for (const g of segs) { g.h0 = h; h += g.yaw; }
  const hEnd = h;

  // 1) integrate a polyline along the segments' heading/slope, 1 m steps; keep every 5th point.
  const ctrl = [];
  let px = 0, py = 0, pz = 0, si = 0, i = 0;
  const at = (s) => { // heading + slope at s
    if (s < 0) return [0, 0];
    if (s >= length) return [hEnd, 0];
    while (segs[si].s1 <= s) si++;
    const g = segs[si], u = (s - g.s0) / g.len;
    return [g.h0 + g.yaw * smooth(u), g.rise * smoothD(u) / g.len];
  };
  ctrl.push(new THREE.Vector3(0, 0, 0));
  for (let s = S_MIN; s < length + S_TAIL; s++, i++) {
    if (s === S_MIN) { si = 0; }
    const [hd, slope] = at(s < 0 ? s : s + 0.5), p = Math.atan(slope), cp = Math.cos(p);
    px += cp * Math.sin(hd); py += Math.sin(p); pz -= cp * Math.cos(hd);
    if (i % 5 === 4) ctrl.push(new THREE.Vector3(px, py, pz));
  }
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
  curve.arcLengthDivisions = ctrl.length * 10;
  const total = curve.getLength(), n = Math.ceil(total), step = total / n;
  const pts = curve.getSpacedPoints(n);

  // 2) frames: position, tangent, right, up per sample
  const N = pts.length, P = new Float32Array(N * 3), T = new Float32Array(N * 3), R = new Float32Array(N * 3), U = new Float32Array(N * 3);
  const t = new THREE.Vector3(), r = new THREE.Vector3(), u = new THREE.Vector3();
  for (let k = 0; k < N; k++) {
    t.subVectors(pts[Math.min(k + 1, N - 1)], pts[Math.max(k - 1, 0)]).normalize();
    r.crossVectors(t, UP).normalize(); u.crossVectors(r, t);
    pts[k].toArray(P, k * 3); t.toArray(T, k * 3); r.toArray(R, k * 3); u.toArray(U, k * 3);
  }

  const frame = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() };
  const lerp3 = (A, k, f, out) => out.set(
    A[k * 3] + (A[k * 3 + 3] - A[k * 3]) * f, A[k * 3 + 1] + (A[k * 3 + 4] - A[k * 3 + 1]) * f, A[k * 3 + 2] + (A[k * 3 + 5] - A[k * 3 + 2]) * f);

  const track = {
    layout, segments: segs, length, checkpoints: layout.checkpoints, slots: layout.slots, gateS: layout.gateS, curve,
    // Frame (point + tangent/right/up) at s. Writes into `out` ({p,t,r,u}); defaults to a shared scratch.
    frameAt(s, out = frame) {
      let f = (s - S_MIN) / step; f = Math.min(Math.max(f, 0), N - 1.0001);
      const k = Math.floor(f); f -= k;
      lerp3(P, k, f, out.p); lerp3(T, k, f, out.t).normalize(); lerp3(R, k, f, out.r).normalize();
      out.u.crossVectors(out.r, out.t);
      return out;
    },
    toWorld(s, x, y, out = new THREE.Vector3()) {
      const f = track.frameAt(s);
      return out.copy(f.p).addScaledVector(f.r, x).addScaledVector(f.u, y);
    },
    tangent(s, out = new THREE.Vector3()) { return out.copy(track.frameAt(s).t); },
    right(s, out = new THREE.Vector3()) { return out.copy(track.frameAt(s).r); },
    up(s, out = new THREE.Vector3()) { return out.copy(track.frameAt(s).u); },

    segmentIndexAt(s) {
      let lo = 0, hi = segs.length - 1;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m].s0 <= s) lo = m; else hi = m - 1; }
      return lo;
    },
    segmentAt(s) { return segs[track.segmentIndexAt(s)]; },

    // Collision boxes of every segment overlapping [sa, sb], appended to `out` (cleared first).
    query(sa, sb, out = []) {
      out.length = 0;
      for (let k = track.segmentIndexAt(sa); k < segs.length && segs[k].s0 <= sb; k++) {
        const bx = segs[k].boxes; for (let j = 0; j < bx.length; j++) out.push(bx[j]);
      }
      return out;
    },
    _q: [],
    // Highest box top within radius r of (s, x); -Infinity if nothing is there (a pit).
    heightUnder(s, x, r = 0.05) {
      const bx = track.query(s - r, s + r, track._q); let top = -Infinity;
      for (let j = 0; j < bx.length; j++) {
        const o = bx[j];
        if (o.s1 > s - r && o.s0 < s + r && o.x1 > x - r && o.x0 < x + r && o.y1 > top) top = o.y1;
      }
      return top;
    },
    // Is there ground close to height y all around (s, x)? Used for "last safe ground".
    supported(s, x, y, r = 1.2) {
      for (const [ds, dx] of [[0, 0], [-r, 0], [r, 0], [0, -0.7], [0, 0.7]]) {
        const top = track.heightUnder(s + ds, x + dx, 0.05);
        if (top === -Infinity || Math.abs(top - y) > 0.5) return false;
      }
      return true;
    },
  };
  return track;
}
