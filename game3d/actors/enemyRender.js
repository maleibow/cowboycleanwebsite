import * as THREE from 'three';
import { MODELS } from './enemyModels.js';
import { createToon, smoothNormals, instancedOutlineMaterial } from '../render/materials.js';
import { placeMatrix } from '../world/scenery.js';

// Draws enemies from their procedural models (enemyModels.js): one InstancedMesh per part per type, plus an
// inverted-hull outline mesh sharing the same instance matrices. Types without a model return false from put()
// and fall back to the grey-box batches in enemy.js. Allocation-free per frame.
const _R = new THREE.Matrix4(), _root = new THREE.Matrix4(), _part = new THREE.Matrix4(), _M = new THREE.Matrix4();
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _c = new THREE.Color();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const S = { t: 0, sp: 0, dx: 0, air: false, vy: 0, squash: 0, dive: false, hit: 0 };
const pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 };
const reset = (p) => { p.x = p.y = p.z = p.rx = p.ry = p.rz = 0; p.sx = p.sy = p.sz = 1; return p; };
const toMatrix = (p, out) => out.compose(_p.set(p.x, p.y, p.z), _q.setFromEuler(_e.set(p.rx, p.ry, p.rz)), _s.set(p.sx, p.sy, p.sz));

export function createModelRenderer(scene, track, { cap = 48, shadows = false, outline = true } = {}) {
  const kits = new Map(), material = createToon({ vertexColors: true, grime: false, rimStrength: 0.7 });
  const api = { kits, has: (t) => !!MODELS[t], drawCalls: 0 };

  api.ensure = (type) => {
    let k = kits.get(type); if (k) return k;
    const def = MODELS[type]; if (!def) return null;
    k = { def, n: 0, parts: def.parts.map((part) => {
      const geo = part.build().build(), mesh = new THREE.InstancedMesh(geo, material, cap);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; mesh.castShadow = shadows; mesh.name = `enemy:${type}:${part.name}`;
      mesh.setColorAt(0, _c.set(0xffffff)); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
      let line = null;
      if (outline) { smoothNormals(geo); line = new THREE.InstancedMesh(geo, instancedOutlineMaterial(), cap); line.instanceMatrix = mesh.instanceMatrix; line.frustumCulled = false; line.count = 0; scene.add(line); }
      return { part, mesh, line };
    }) };
    kits.set(type, k); return k;
  };

  api.begin = () => { for (const k of kits.values()) k.n = 0; };

  // e = enemy record, P = player body. Returns false when `e.type` has no model.
  api.put = (e, alpha, P) => {
    const k = kits.get(e.type) || api.ensure(e.type); if (!k || k.n >= cap) return !!k;
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
    const mv = Math.hypot(e.s - e.p0s, e.x - e.p0x) * 60, d = Math.hypot(P.s - s, P.x - x);
    if (d > 0.8) e.face += wrap(Math.atan2(P.x - x, -(P.s - s)) - e.face) * 0.12;       // turn to face the player
    S.t = e.t + e.phase; S.sp = e.active ? clamp(mv / Math.max(1, e.def.speed * 0.8), 0, 1) : 0; S.dx = (e.x - e.p0x) * 60; S.air = !e.grounded; S.vy = e.vy;
    S.squash = e.grounded && e.def.rest && e.t2 < 0.22 ? 1 - e.t2 / 0.22 : 0; S.dive = e.state === 'dive'; S.hit = clamp(e.hitT * 20, 0, 1);
    const def = k.def, sc = (e.def.w / def.size[0] + e.def.h / def.size[1]) / 2;
    placeMatrix(track, s, x, y, e.face, sc, sc, sc, _R);
    def.root ? toMatrix(def.root(S, reset(pose)) || pose, _root) : _root.identity();
    _R.multiply(_root);
    const i = k.n++, flash = S.hit > 0 ? 3 : 1;
    for (const { part, mesh } of k.parts) {
      reset(pose); part.pose(S, pose); _M.multiplyMatrices(_R, toMatrix(pose, _part));
      mesh.setMatrixAt(i, _M); mesh.setColorAt(i, _c.setRGB(flash, flash, flash));
    }
    return true;
  };

  api.end = () => {
    api.drawCalls = 0;
    for (const k of kits.values()) for (const { mesh, line } of k.parts) {
      mesh.count = k.n; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      if (line) line.count = k.n; api.drawCalls += k.n ? (line ? 2 : 1) : 0;
    }
  };
  api.dispose = () => { for (const k of kits.values()) for (const { mesh, line } of k.parts) { scene.remove(mesh); mesh.geometry.dispose(); if (line) scene.remove(line); } kits.clear(); };
  return api;
}
