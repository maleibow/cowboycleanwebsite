import * as THREE from 'three';

// A fixed-capacity InstancedMesh that actors fill every frame in track space. One draw call per batch,
// per-instance colour, no allocation. The mapping to the world follows the track frame, so actors sit
// correctly on curves and climbs.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _d = new THREE.Vector3();
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _c = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);

export function createBatch(scene, track, geometry, material, cap) {
  const mesh = new THREE.InstancedMesh(geometry, material, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
  mesh.setColorAt(0, _c.setHex(0xffffff)); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  let n = 0;
  const b = {
    mesh, cap,
    begin() { n = 0; },
    // Upright instance at (s,x,y), scaled, optionally spun about the up axis by `spin` radians.
    // `pitch` rocks it about its lateral axis (a lump sliding or rolling toward you).
    put(s, x, y, sx, sy, sz, color, spin = 0, pitch = 0) {
      if (n >= cap) return;
      const f = track.frameAt(s);
      _p.copy(f.p).addScaledVector(f.r, x).addScaledVector(f.u, y);
      const c = Math.cos(spin), sn = Math.sin(spin);
      _z.copy(f.t).negate();                                         // local +Z points back down the track
      _x.copy(f.r).multiplyScalar(c).addScaledVector(_z, sn);
      _z.multiplyScalar(c).addScaledVector(f.r, -sn);
      _y.copy(f.u);
      if (pitch) { const cp = Math.cos(pitch), sp = Math.sin(pitch); _d.copy(_y).multiplyScalar(cp).addScaledVector(_z, sp); _z.multiplyScalar(cp).addScaledVector(_y, -sp); _y.copy(_d); }
      _m.makeBasis(_x.multiplyScalar(sx), _y.multiplyScalar(sy), _z.multiplyScalar(sz)).setPosition(_p);
      mesh.setMatrixAt(n, _m); mesh.setColorAt(n, _c.setHex(color)); n++;
    },
    // Instance whose long (Y) axis follows a track-space velocity: bolts, lasers, lassos.
    putDir(s, x, y, vs, vx, vy, r, stretch, color) {
      if (n >= cap) return;
      const f = track.frameAt(s);
      _p.copy(f.p).addScaledVector(f.r, x).addScaledVector(f.u, y);
      _d.set(0, 0, 0).addScaledVector(f.t, vs).addScaledVector(f.r, vx).addScaledVector(f.u, vy);
      if (_d.lengthSq() < 1e-6) _d.copy(f.t); else _d.normalize();
      _q.setFromUnitVectors(UP, _d); _s.set(r, r * stretch, r);
      mesh.setMatrixAt(n, _m.compose(_p, _q, _s)); mesh.setColorAt(n, _c.setHex(color)); n++;
    },
    // `glow` > 1 pushes the colour past white so bloom picks it up (bolts, hot rounds).
    putDirG(s, x, y, vs, vx, vy, sx, sy, sz, color, glow = 1) {
      if (n >= cap) return;
      const f = track.frameAt(s);
      _p.copy(f.p).addScaledVector(f.r, x).addScaledVector(f.u, y);
      _d.set(0, 0, 0).addScaledVector(f.t, vs).addScaledVector(f.r, vx).addScaledVector(f.u, vy);
      if (_d.lengthSq() < 1e-6) _d.copy(f.t); else _d.normalize();
      _q.setFromUnitVectors(UP, _d); _s.set(sx, sy, sz);
      mesh.setMatrixAt(n, _m.compose(_p, _q, _s)); mesh.setColorAt(n, _c.setHex(color).multiplyScalar(glow)); n++;
    },
    // Tumbling instance: its long (Y) axis swings in the vertical plane along the track by `ang` radians (grenade canister).
    putTumble(s, x, y, ang, sx, sy, sz, color) {
      if (n >= cap) return;
      const f = track.frameAt(s);
      _p.copy(f.p).addScaledVector(f.r, x).addScaledVector(f.u, y);
      _q.setFromAxisAngle(f.r, ang); _s.set(sx, sy, sz);
      mesh.setMatrixAt(n, _m.compose(_p, _q, _s)); mesh.setColorAt(n, _c.setHex(color)); n++;
    },
    // Instance facing back down the track (its Z axis toward the camera) and rolled about that axis: the spinning star.
    putFacing(s, x, y, roll, size, color) {
      if (n >= cap) return;
      const f = track.frameAt(s), c = Math.cos(roll), sn = Math.sin(roll);
      _p.copy(f.p).addScaledVector(f.r, x).addScaledVector(f.u, y);
      _x.copy(f.r).multiplyScalar(c).addScaledVector(f.u, sn); _y.copy(f.u).multiplyScalar(c).addScaledVector(f.r, -sn); _z.copy(f.t).negate();
      _m.makeBasis(_x.multiplyScalar(size), _y.multiplyScalar(size), _z.multiplyScalar(size)).setPosition(_p);
      mesh.setMatrixAt(n, _m); mesh.setColorAt(n, _c.setHex(color)); n++;
    },
    end() { mesh.count = n; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true; },
    get count() { return n; },
  };
  return b;
}

// Unit geometries standing on y = 0, 1 tall and 1 wide, so scale = (width, height, depth).
export const shapes = {
  box: () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  flat: () => new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  cyl: () => new THREE.CylinderGeometry(0.5, 0.55, 1, 10).translate(0, 0.5, 0),
  ball: () => new THREE.SphereGeometry(0.5, 10, 8).translate(0, 0.5, 0),
  oct: () => new THREE.OctahedronGeometry(0.5, 0).translate(0, 0.5, 0),
  ico: () => new THREE.IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0),
};
