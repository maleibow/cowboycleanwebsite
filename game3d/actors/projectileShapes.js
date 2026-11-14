import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Ammunition shapes (PLAN 4.2): tiny low-poly geometries with vertex colours and a baked top-light, so they need no lights.
// Every shape points along +Y (the batches orient +Y along the velocity) and is about 2 units long; the instance scale sets
// the real size. Triangle counts are noted: each is under the ~60 budget.
const LIGHT = new THREE.Vector3(0.35, 0.8, 0.5).normalize(), _n = new THREE.Vector3();
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler();

// geo + colour (+ position / rotation / scale) -> shaded, non-indexed, uv-less piece
function part(geo, color, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], shade = 1 } = {}) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.deleteAttribute('uv');
  g.applyMatrix4(M.compose(new THREE.Vector3(...p), Q.setFromEuler(E.set(...r)), new THREE.Vector3(...s)));
  g.computeVertexNormals();
  const nor = g.attributes.normal, n = nor.count, col = new Float32Array(n * 3), c = new THREE.Color(color);
  for (let i = 0; i < n; i++) {
    _n.fromBufferAttribute(nor, i); const k = (0.6 + 0.4 * Math.max(0, _n.dot(LIGHT))) * shade;
    col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.deleteAttribute('normal');
  return g;
}
const merge = (parts) => { const g = mergeGeometries(parts, false); parts.forEach((x) => x.dispose()); return g; };
const cyl = (rt, rb, h, seg, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const dome = (r, seg, rows) => new THREE.SphereGeometry(r, seg, rows, 0, Math.PI * 2, 0, Math.PI / 2);

// soap cartridge: hex body, gold rim, rounded nose (54 tris)
function cartridge() {
  return merge([
    part(cyl(0.5, 0.5, 1.2, 6), 0xdff6ff, { p: [0, -0.2, 0] }),                       // body (closed: 24)
    part(cyl(0.56, 0.56, 0.2, 6, true), 0xffc928, { p: [0, 0.32, 0] }),                // gold rim (12)
    part(dome(0.5, 6, 2), 0xffffff, { p: [0, 0.4, 0] }),                              // rounded nose (18)
  ]);
}
// round: a ball with a hot core (52 tris), tinted per use: red-hot for super, small pale pellets for spread
function hotRound() {
  return merge([
    part(new THREE.SphereGeometry(0.75, 7, 4), 0xffffff, { p: [0, 0.1, 0] }),          // 42; the instance tint makes it red-hot (super) or a pale pellet (spread)
    part(new THREE.SphereGeometry(0.5, 5, 2), 0xffe9b8, { p: [0, 0.55, 0.0], s: [1.1, 0.9, 1.1], shade: 1.3 }),   // hot core (10)
  ]);
}
// homing mini rocket: body, nose cone, three fins, exhaust (about 44 tris; the fins need double-sided drawing)
function rocket() {
  const fin = new THREE.BufferGeometry();
  fin.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0.7, -0.5, 0, 0, -0.1, 0, 0, 0, 0, 0, -0.1, 0, 0.7, -0.5, 0], 3));
  const fins = [0, 1, 2].map((i) => part(fin, 0xff7ad0, { p: [0, -0.5, 0], r: [0, (i * Math.PI * 2) / 3, 0] }));
  return merge([part(cyl(0.38, 0.38, 1.3, 6, true), 0xf2f2f8, { p: [0, -0.1, 0] }), part(new THREE.CircleGeometry(0.38, 6), 0xd0d0da, { p: [0, -0.75, 0], r: [Math.PI / 2, 0, 0] }),
    part(new THREE.ConeGeometry(0.38, 0.7, 6, 1, true), 0xff4d7a, { p: [0, 0.9, 0] }), ...fins, part(new THREE.ConeGeometry(0.28, 0.7, 5, 1, true), 0xffd23a, { p: [0, -1.1, 0], r: [Math.PI, 0, 0], shade: 1.3 })]);
}
// grenade canister: green drum with a band and a fuse cap (46 tris)
function canister() {
  return merge([part(cyl(0.55, 0.55, 1.5, 6), 0x3fbf63), part(cyl(0.6, 0.6, 0.16, 6, true), 0x1f6a36, { p: [0, 0.2, 0] }), part(cyl(0.25, 0.25, 0.3, 5, true), 0xe8e8ee, { p: [0, 0.9, 0] })]);
}
// sheriff star: six points with a gold body, facing +Z; spins about Z (56 tris)
function star() {
  const pos = [], R = 1.0, r = 0.5, T = 0.1, n = 12;
  const ring = (z) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + Math.PI / 2, d = i % 2 ? r : R; return [Math.cos(a) * d, Math.sin(a) * d, z]; });
  const f = ring(T), b = ring(-T);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; pos.push(0, 0, T, ...f[i], ...f[j]); pos.push(0, 0, -T, ...b[j], ...b[i]); pos.push(...f[i], ...b[i], ...b[j], ...f[i], ...b[j], ...f[j]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return merge([part(g, 0xffd23a), part(new THREE.OctahedronGeometry(0.24, 0), 0xfff4b0, { p: [0, 0, T + 0.02], s: [1, 1, 0.5] })]);
}
// laser bolt: a long thin hexagonal needle with pointed ends (24 tris)
function bolt() {
  return merge([part(cyl(0.22, 0.22, 2.4, 6, true), 0xffffff), part(new THREE.ConeGeometry(0.22, 0.7, 6), 0xffffff, { p: [0, 1.55, 0] }), part(new THREE.ConeGeometry(0.22, 0.9, 6), 0xffffff, { p: [0, -1.65, 0], r: [Math.PI, 0, 0], shade: 0.8 })]);
}
// enemy grime glob: a dark lumpy blob with two bumps and a drip (36 tris)
function glob() {
  const ico = new THREE.IcosahedronGeometry(1, 0), pos = ico.attributes.position;
  for (let i = 0; i < pos.count; i++) { const k = 0.82 + 0.34 * Math.abs(Math.sin(pos.getX(i) * 7.3 + pos.getY(i) * 3.1 + pos.getZ(i) * 5.7)); pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k); }
  return merge([part(ico, 0xe0d4dc, { shade: 0.95 }), part(new THREE.OctahedronGeometry(0.45, 0), 0xa89aa4, { p: [0.55, 0.45, 0.2] }), part(new THREE.OctahedronGeometry(0.4, 0), 0xf4ecf0, { p: [-0.45, 0.35, -0.5] }),
    part(new THREE.ConeGeometry(0.28, 0.8, 4), 0x9a8c96, { p: [0, -0.95, 0.1], r: [Math.PI, 0, 0] })]);
}
export const SHAPES = { cart: cartridge, round: hotRound, rocket, canister, star, bolt, glob };
