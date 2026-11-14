import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Helpers for building characters from merged primitives with vertex colours (PLAN 4).
// const b = new Builder(); b.box(0.3,0.5,0.2, 0xff0000, { p:[0,1,0], r:[0,0.2,0] }); mesh.geometry = b.build();

// Rounded box: BoxGeometry whose corners are pushed onto spheres of radius r, so nothing looks like a raw cube.
export function roundedBox(w, h, d, r = 0.04, seg = 3) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, n = g.attributes.normal;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r, v = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    q.set(THREE.MathUtils.clamp(v.x, -hx, hx), THREE.MathUtils.clamp(v.y, -hy, hy), THREE.MathUtils.clamp(v.z, -hz, hz));
    v.sub(q);
    if (v.lengthSq() > 1e-10) { n.setXYZ(i, ...v.clone().normalize().toArray()); v.normalize().multiplyScalar(r).add(q); p.setXYZ(i, v.x, v.y, v.z); }
  }
  return g;
}
export const sphere = (r, ws = 12, hs = 9) => new THREE.SphereGeometry(r, ws, hs);
export const cyl = (rt, rb, h, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const capsule = (r, len, seg = 5, rad = 8) => new THREE.CapsuleGeometry(r, len, seg, rad);
export const cone = (r, h, seg = 8) => new THREE.ConeGeometry(r, h, seg);

const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };

export class Builder {
  // boxSeg: subdivisions per box face (3 = softly rounded corners; 1 = plain, for background scenery that must stay cheap)
  constructor({ boxSeg = 3 } = {}) { this.parts = []; this.boxSeg = boxSeg; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); }
  // geo: BufferGeometry. opts: p position, r euler, s scale, jitter (vertex noise, metres), ao (bottom darkening 0..1)
  add(geo, color, o = {}) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    const p = o.p || [0, 0, 0], r = o.r || [0, 0, 0], s = o.s || [1, 1, 1];
    this.m.compose(new THREE.Vector3(...p), this.q.setFromEuler(this.e.set(r[0], r[1], r[2])), new THREE.Vector3(...s));
    g.applyMatrix4(this.m);
    const pos = g.attributes.position, nrm = g.attributes.normal, n = pos.count, col = new Float32Array(n * 3), c = new THREE.Color(color);
    g.computeBoundingBox(); const bb = g.boundingBox, hh = Math.max(1e-4, bb.max.y - bb.min.y);
    const jit = o.jitter ?? 0, ao = o.ao ?? 0.22;
    for (let i = 0; i < n; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (jit) { const hx = hash(x, y, z); pos.setXYZ(i, x + (hx - 0.5) * jit, y + (hash(z, x, y) - 0.5) * jit, z + (hash(y, z, x) - 0.5) * jit); }
      const t = (y - bb.min.y) / hh, k = (1 - ao) + ao * t + (hash(x * 3, y * 3, z * 3) - 0.5) * 0.05;   // fake AO + tiny noise
      col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!nrm) g.computeVertexNormals();
    this.parts.push(g);
    return this;
  }
  box(w, h, d, color, o = {}) { return this.add(roundedBox(w, h, d, o.radius ?? Math.min(w, h, d) * 0.28, o.seg ?? this.boxSeg), color, o); }
  sphere(r, color, o = {}) { return this.add(sphere(r), color, o); }
  cyl(rt, rb, h, color, o = {}) { return this.add(cyl(rt, rb, h, o.seg ?? 10), color, o); }
  capsule(r, len, color, o = {}) { return this.add(capsule(r, len), color, o); }
  cone(r, h, color, o = {}) { return this.add(cone(r, h, o.seg ?? 8), color, o); }
  build() {
    const g = mergeGeometries(this.parts, false);
    g.computeBoundingSphere(); this.parts.forEach((p) => p.dispose()); this.parts = [];
    return g;
  }
}

export const lerp = THREE.MathUtils.lerp;
// Critically-damped-ish spring for squash/recoil/etc.: s = { x, v }
export function spring(s, target, k, c, dt) { const a = (target - s.x) * k - s.v * c; s.v += a * dt; s.x += s.v * dt; return s.x; }
