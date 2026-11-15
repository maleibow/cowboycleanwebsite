import * as THREE from 'three';
import { createToon } from '../render/materials.js';
import { getTexture } from '../render/textures.js';
import { createRng } from '../core/rng.js';
import { WINDOW } from './trackBuilder.js';

// Generic, data-driven scenery for any stage (PLAN 3, 4, 4.1). The theme (themes/stageNN.js) says WHAT is
// scattered and how the terrain is shaped; this module decides WHERE, in track space, so it follows curves
// and climbs. Everything is built per 120 m chunk, only near the player, and disposed behind:
//   terrain ribbon (1 draw call)  +  one InstancedMesh per scatter kind  +  per-segment set dressing.
// Far parallax mesas are a camera-following ring, built once.
// theme = { terrain:{ height(s,x,env), color(s,x,h,env,out) }, scatter:[...], edge, far:[...], dress:{ [segName](seg, ctx) },
//           tumble, ground:{ texture } }   (see themes/stage01.js for the full shape)
export const CHUNK = 120;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export { smooth };

const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _sc = new THREE.Matrix4(), _p = new THREE.Vector3(), _z = new THREE.Vector3(), _c = new THREE.Color();
const FR = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() };

// Matrix that puts an object standing at track-space (s, x, y), upright in the track frame, rotated `yaw`, scaled.
export function placeMatrix(track, s, x, y, yaw = 0, sx = 1, sy = sx, sz = sx, out = _m) {
  const f = track.frameAt(s, FR);
  _p.copy(f.p).addScaledVector(f.r, x).addScaledVector(f.u, y);
  _z.copy(f.t).negate();
  out.makeBasis(f.r, f.u, _z).setPosition(_p);
  _r.makeRotationY(yaw); _sc.makeScale(sx, sy, sz);
  return out.multiply(_r).multiply(_sc);
}

export function createScenery(track, theme, { quality, scene, seed = 1, lampMaterial = null } = {}) {
  const dens = quality?.tier?.density ?? 1;
  const group = new THREE.Group(); group.name = 'scenery'; scene.add(group);
  const half = (track.layout.segments[0]?.width || 8) / 2;
  const chunks = new Map(), dressed = new Map();
  const api = { group, chunks, dressed, built: 0, disposed: 0, far: null, passed: new Set(), gateOpen: 0 };
  const groundMat = createToon({ vertexColors: true, map: theme.ground?.texture ? getTexture(theme.ground.texture.type, theme.ground.texture) : null });

  // Shared geometry, built once per stage from the theme's recipes.
  const scatter = (theme.scatter || []).map((sc) => ({ ...sc, geo: sc.build(theme.colors), mat: createToon({ vertexColors: true }) }));
  const edge = theme.edge ? theme.edge.build(theme.colors) : null;
  const edgeMats = edge ? { post: createToon({ vertexColors: true }), lamp: lampMaterial || createToon({ color: 0xffa640, emissive: 0xff8a20, emissiveIntensity: 3.2, grime: false, rim: false, tint: false }) } : null;
  const ctx = { track, theme, scene, half, rng: null, api, terrain: null, material: groundMat, createToon, getTexture };

  // ---- environment lists for a chunk: gaps / flat zones / patches the terrain function reacts to
  const envFor = (s0, s1) => {
    const env = { half, gaps: [], patches: [], zones: [], s0, s1 };
    for (const g of track.segments) {
      if (g.s1 < s0 - 8 || g.s0 > s1 + 8) continue;
      for (const q of g.gaps) env.gaps.push(q);
      for (const q of g.patches || []) env.patches.push(q);
      if (g.mode === 'side') env.zones.push({ s0: g.s0, s1: g.s1, flat: true });
      if (g.arena) env.zones.push({ s0: g.s0, s1: g.s1, flat: true, arena: g.arena });
    }
    return env;
  };
  const nearGap = (env, s, pad) => env.gaps.some((q) => s > q.s0 - pad && s < q.s1 + pad);

  // ---- terrain ribbon ----
  const XS = [-30, -24, -19, -15, -12, -10, -8.5, -7.2, -6.2, -5.4, -4.8, -4.3, -3.9, 3.9, 4.3, 4.8, 5.4, 6.2, 7.2, 8.5, 10, 12, 15, 19, 24, 30];
  const buildGround = (c0, c1, env) => {
    const rows = [], step = 2;
    for (let s = c0; s <= c1 + 1e-6; s += step) rows.push(s);
    for (const q of env.gaps) for (const s of [q.s0 - 0.02, q.s0 + 0.02, q.s1 - 0.02, q.s1 + 0.02]) if (s > c0 && s < c1) rows.push(s);
    rows.sort((a, b) => a - b);
    const nx = XS.length, pos = new Float32Array(rows.length * nx * 3), col = new Float32Array(rows.length * nx * 3), uv = new Float32Array(rows.length * nx * 2);
    const idx = [], v = new THREE.Vector3();
    rows.forEach((s, i) => XS.forEach((x, j) => {
      const h = theme.terrain.height(s, x, env), k = i * nx + j;
      track.toWorld(s, x, h, v); pos[k * 3] = v.x; pos[k * 3 + 1] = v.y; pos[k * 3 + 2] = v.z;
      theme.terrain.color(s, x, h, env, _c); col[k * 3] = _c.r; col[k * 3 + 1] = _c.g; col[k * 3 + 2] = _c.b;
      uv[k * 2] = x * 0.09; uv[k * 2 + 1] = s * 0.09;
    }));
    for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < nx - 1; j++) {
      const a = i * nx + j, b = a + 1, c = a + nx, d = c + 1;
      if (XS[j] < 0 && XS[j + 1] > 0) continue;
      idx.push(a, b, c, b, d, c);
    }
    // centre strip (x from the last negative column to the first positive one) is covered by the path: bridge it so gaps show their floor
    const jn = XS.findIndex((x) => x > 0) - 1;
    for (let i = 0; i < rows.length - 1; i++) { const a = i * nx + jn, b = a + 1, c = a + nx, d = c + 1; idx.push(a, b, c, b, d, c); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, groundMat); m.receiveShadow = true; m.name = 'ground'; return m;
  };

  // ---- instanced scatter for a chunk ----
  const buildScatter = (ci, c0, c1, env, rng, out) => {
    for (const sc of scatter) {
      const n = Math.round(sc.perChunk * dens * (CHUNK / 120)), inst = [];
      for (let i = 0; i < n; i++) {
        const s = rng.range(c0, c1), x = rng.sign() * rng.range(sc.band[0], sc.band[1]);
        if (sc.avoidGaps !== false && nearGap(env, s, 5) && Math.abs(x) < 22) continue;
        if (env.zones.some((z) => z.flat && s > z.s0 - 4 && s < z.s1 + 4 && Math.abs(x) < (z.arena ? 40 : 11))) continue;
        if (env.patches.some((q) => s > q.s0 - 2 && s < q.s1 + 2 && Math.abs(x) < half + 3)) continue;
        const y = theme.terrain.height(s, x, env) + (sc.lift || 0), k = rng.range(sc.scale[0], sc.scale[1]);
        inst.push([s, x, y, rng.range(0, 6.28), k * (sc.stretch ? rng.range(...sc.stretch) : 1), k, rng.range(0.88, 1)]);
      }
      if (!inst.length) continue;
      const mesh = new THREE.InstancedMesh(sc.geo, sc.mat, inst.length);
      inst.forEach((q, i) => { mesh.setMatrixAt(i, placeMatrix(track, q[0], q[1], q[2], q[3], q[5], q[4], q[5])); mesh.setColorAt(i, _c.setRGB(q[6], q[6] * rng.range(0.94, 1), q[6] * rng.range(0.9, 1))); });
      mesh.castShadow = !!sc.shadow && !!quality?.tier?.shadowMap; mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.name = 'scatter:' + sc.key;
      out.add(mesh);
    }
  };

  // ---- edge posts + lanterns along both sides of the path ----
  const buildEdge = (c0, c1, env, out) => {
    if (!edge) return;
    const sp = theme.edge.spacing, list = [];
    for (let s = Math.ceil(c0 / sp) * sp; s < c1; s += sp) {
      if (nearGap(env, s, 3) || env.zones.some((z) => z.flat && !z.arena && s > z.s0 - 2 && s < z.s1 + 2) || env.patches.some((q) => s > q.s0 - 3 && s < q.s1 + 3)) continue;
      const seg = track.segmentAt(s); if (seg.mode === 'arena' || seg.name === 'bossGate') continue;
      for (const side of [-1, 1]) list.push([s, side * (half + theme.edge.offset), side]);
    }
    if (!list.length) return;
    const pm = new THREE.InstancedMesh(edge.post, edgeMats.post, list.length), lm = new THREE.InstancedMesh(edge.lamp, edgeMats.lamp, list.length);
    list.forEach(([s, x, side], i) => {
      const y = theme.terrain.height(s, x, env) + 0.02;
      pm.setMatrixAt(i, placeMatrix(track, s, x, y, side * 0.1)); lm.setMatrixAt(i, placeMatrix(track, s, x, y + theme.edge.lampHeight, 0));
    });
    pm.castShadow = !!quality?.tier?.shadowMap; pm.instanceMatrix.needsUpdate = lm.instanceMatrix.needsUpdate = true; pm.computeBoundingSphere(); lm.computeBoundingSphere();
    out.add(pm, lm);
  };

  const buildChunk = (ci) => {
    const c0 = ci * CHUNK, c1 = c0 + CHUNK, env = envFor(c0 - 4, c1 + 4), rng = createRng(seed * 7919 + ci * 104729 + 13);
    const g = new THREE.Group(); g.name = 'chunk' + ci; ctx.rng = rng;
    g.add(buildGround(c0, c1 + 2, env));
    buildScatter(ci, c0, c1, env, rng, g); buildEdge(c0, c1, env, g);
    const fluids = [];
    for (const seg of track.segments) { // per-segment dressing belongs to the chunk holding the segment start
      if (seg.s0 < c0 || seg.s0 >= c1) continue;
      const d = theme.dress?.[seg.name]?.(seg, ctx, env); if (!d) continue;
      g.add(d.object); dressed.set(seg, d); if (d.fluids) fluids.push(...d.fluids);
    }
    g.userData = { fluids, ci }; group.add(g); chunks.set(ci, g); api.built++;
  };
  const disposeChunk = (ci) => {
    const g = chunks.get(ci); group.remove(g);
    g.traverse((o) => { if (o.isInstancedMesh) o.dispose?.(); if (o.geometry && o.name === 'ground') o.geometry.dispose(); });
    for (const [seg, d] of [...dressed]) if (g.children.includes(d.object)) { dressed.delete(seg); d.dispose?.(); }
    chunks.delete(ci); api.disposed++;
  };

  // ---- far parallax mesas (camera-following rings) ----
  if (theme.far) { api.far = theme.far.build(theme.colors, createRng(seed + 5)); api.far.group.traverse((o) => { o.frustumCulled = false; }); scene.add(api.far.group); }

  // ---- tumbleweeds: a few rolling bushes that blow across the valley near the player ----
  if (theme.tumble) {
    const T = theme.tumble, n = Math.round(T.count * dens), geo = T.build(theme.colors), rng = createRng(seed + 77), env0 = { half, gaps: [], patches: [], zones: [] };
    const mesh = new THREE.InstancedMesh(geo, createToon({ vertexColors: true, grime: false }), n); mesh.frustumCulled = false; scene.add(mesh);
    const W = Array.from({ length: n }, () => ({ s: -999, x: 0, vx: 0, r: 0.6, spin: 0, ph: 0 }));
    const respawn = (w, s0) => { w.s = s0 + rng.range(6, 90); w.x = rng.sign() * rng.range(5, 24); w.vx = -Math.sign(w.x) * rng.range(1.5, 4); w.r = rng.range(0.45, 0.9); w.ph = rng.range(0, 6); };
    api.tumble = {
      mesh, dispose() { scene.remove(mesh); mesh.dispose(); },
      update(s, t, dt = 1 / 60) {
        W.forEach((w, i) => {
          if (w.s < s - 12 || w.s > s + 110) respawn(w, s);
          w.x += w.vx * dt; w.s -= Math.abs(w.vx) * 0.0 * dt; w.spin += (w.vx / w.r) * dt;
          const seg = track.segmentAt(w.s), inGap = seg.gaps.some((q) => w.s > q.s0 - 1 && w.s < q.s1 + 1) && Math.abs(w.x) < 20;
          const hop = Math.abs(Math.sin(t * 2.4 + w.ph)) * 0.35, y = theme.terrain.height(w.s, w.x, env0) + w.r * 0.9 + hop;
          placeMatrix(track, w.s, w.x, y, 0, inGap ? 0.001 : w.r, inGap ? 0.001 : w.r, w.r);
          _r.makeRotationZ(w.spin); _m.multiply(_r); mesh.setMatrixAt(i, _m);
        });
        mesh.instanceMatrix.needsUpdate = true;
      },
    };
  }

  api.update = (s, t, camPos, dt) => {
    const lo = Math.floor((s - WINDOW.behind) / CHUNK), hi = Math.floor((s + WINDOW.ahead) / CHUNK);
    for (let ci = Math.max(0, lo); ci <= Math.min(hi, Math.floor(track.length / CHUNK)); ci++) if (!chunks.has(ci)) buildChunk(ci);
    for (const ci of [...chunks.keys()]) if (ci < lo - 0 || ci > hi) disposeChunk(ci);
    for (const g of chunks.values()) for (const f of g.userData.fluids) f.update(t);
    for (const d of dressed.values()) d.update?.(t, s, dt);
    api.far?.update(camPos, t);
    api.tumble?.update(s, t, dt);
  };
  api.buildAll = () => { for (let ci = 0; ci <= Math.floor(track.length / CHUNK); ci++) if (!chunks.has(ci)) buildChunk(ci); };
  api.dispose = () => { api.tumble?.dispose(); for (const ci of [...chunks.keys()]) disposeChunk(ci); scene.remove(group); if (api.far) scene.remove(api.far.group); };
  api.ctx = ctx;
  return api;
}
