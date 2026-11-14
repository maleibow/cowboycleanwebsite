import * as THREE from 'three';
import { createToon } from '../render/materials.js';
import { getTexture } from '../render/textures.js';
import { createFluid } from '../render/fluids.js';
import { createRng } from '../core/rng.js';
import { Builder } from '../actors/modelKit.js';

// First-pass dressing for stage 1 (full dressing is a later prompt). Straight track along -Z.
// Returns { group, update(t, camZ) }. Everything repeated is an InstancedMesh.
const stage01Haze = 0xe9906e;
export const TRACK_LEN = 460, PATH_W = 4.2;
export const GAPS = [{ z0: -58, z1: -69, depth: 6 }, { z0: -176, z1: -184, depth: 6 }];
export const SAND_PITS = [{ z0: -108, z1: -118, hw: 3.4 }];

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dune = (x, z) => Math.sin(x * 0.11 + z * 0.07) * 0.5 + Math.sin(x * 0.23 - z * 0.13) * 0.3 + Math.sin(z * 0.05 + x * 0.17) * 0.4 + 1.2;
export function groundHeight(x, z) {
  const ax = Math.abs(x);
  let h = smooth(PATH_W + 0.6, PATH_W + 5, ax) * (1.2 + dune(x, z) * 2.4) + smooth(PATH_W + 12, 50, ax) * dune(x * 0.6, z * 0.6) * 5;
  h += Math.sin(z * 0.35) * 0.04 * smooth(PATH_W, 1, ax);                                // gentle path ripples
  for (const g of GAPS) if (z < g.z0 && z > g.z1) h -= g.depth * smooth(PATH_W + 7, PATH_W + 0.2, ax) * smooth(0, 1.3, Math.min(g.z0 - z, z - g.z1));
  for (const p of SAND_PITS) if (z < p.z0 && z > p.z1) h -= 0.45 * smooth(p.hw + 0.8, p.hw - 0.2, ax) * smooth(0, 1.2, Math.min(p.z0 - z, z - p.z1));
  return h;
}

export function buildStage01(C, quality, { rng = createRng(1001) } = {}) {
  const group = new THREE.Group(); group.name = 'stage01';
  const col = (c) => new THREE.Color(c);

  // ---- ground: displaced heightfield with vertex colours + speckle texture ----
  const dens = quality.tier.density ?? 1, lowTier = dens < 1;
  const W = 150, nx = lowTier ? 56 : 72, nz = lowTier ? 190 : 230;
  const gg = new THREE.PlaneGeometry(W, TRACK_LEN + 40, nx, nz); gg.rotateX(-Math.PI / 2); gg.translate(0, 0, -TRACK_LEN / 2 + 20);
  const gp = gg.attributes.position, gc = new Float32Array(gp.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const x = gp.getX(i), z = gp.getZ(i), h = groundHeight(x, z), ax = Math.abs(x); gp.setY(i, h);
    const n = 0.5 + 0.5 * Math.sin(x * 0.9 + z * 0.4) * Math.sin(z * 0.7 - x * 0.3);
    if (ax < PATH_W) { tmp.set(C.sandLight).lerp(col(C.sandLight).offsetHSL(0, 0, -0.06), n * 0.5); const rut = Math.max(0, 1 - Math.abs(ax - 1.5) / 0.45); tmp.lerp(col(C.rut), rut * 0.8); }
    else if (ax < PATH_W + 1.2) tmp.set(C.kerb).lerp(col(C.sandDark), n * 0.5);
    else { tmp.set(C.sand).lerp(col(C.sandDark), Math.min(1, h / 7) * 0.8 + n * 0.15); tmp.lerp(col(C.redRockLit), smooth(14, 60, ax) * 0.45); }
    let depth = 0; for (const g of GAPS) if (z < g.z0 + 1 && z > g.z1 - 1) depth = Math.max(depth, -h);
    if (depth > 0.4) tmp.lerp(col(0x4a1f3a), Math.min(1, depth / 5) * 0.9);                       // canyon shadow
    for (const p of SAND_PITS) if (z < p.z0 && z > p.z1 && ax < p.hw) tmp.set(0xd7a05a);
    gc[i * 3] = tmp.r; gc[i * 3 + 1] = tmp.g; gc[i * 3 + 2] = tmp.b;
  }
  gg.setAttribute('color', new THREE.BufferAttribute(gc, 3)); gg.computeVertexNormals();
  const gmat = createToon({ vertexColors: true, map: getTexture('speckle', { size: 128, a: '#ffffff', b: '#f0d8bc', c: '#ffffff', d: '#d9b48c', density: 4, repeat: [14, 56] }) });
  const ground = new THREE.Mesh(gg, gmat); ground.receiveShadow = true; ground.name = 'ground'; group.add(ground);
  // pit bottoms + quicksand
  const fluids = [];
  for (const g of GAPS) {
    const f = createFluid('sludge', { width: 22, length: g.z0 - g.z1 + 2, segments: 12, overrides: { deep: '#3a1a30', shallow: '#7a2f4a', foam: '#ff9a52', hi: '#ffb070', glow: 0.0 } });
    f.mesh.position.set(0, -g.depth + 0.4, (g.z0 + g.z1) / 2); group.add(f.mesh); fluids.push(f);
  }
  for (const p of SAND_PITS) {
    const f = createFluid('quicksand', { width: p.hw * 2, length: p.z0 - p.z1, segments: 8 });
    f.mesh.position.set(0, -0.36, (p.z0 + p.z1) / 2); group.add(f.mesh); fluids.push(f);
  }

  // ---- scatter helper: instanced mesh of a merged geometry, with per-instance colour tint ----
  const mkInst = (geo, n, placer, { shadow = false, mat } = {}) => {
    const m = new THREE.InstancedMesh(geo, mat || createToon({ vertexColors: true }), n), d = new THREE.Object3D();
    let k = 0;
    for (let i = 0; i < n; i++) {
      if (!placer(d, i, rng)) continue;
      d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, tmp.setHSL(rng.range(-0.02, 0.02) + 0.0, 0, 1).setRGB(1 - rng.next() * 0.12, 1 - rng.next() * 0.12, 1 - rng.next() * 0.12)); k++;
    }
    m.count = k; m.castShadow = shadow; m.receiveShadow = false; m.instanceMatrix.needsUpdate = true; group.add(m); return m;
  };
  const sideX = (min, max) => rng.sign() * rng.range(min, max);
  const place = (min, max, yOff = 0) => (d) => {
    const x = sideX(min, max), z = rng.range(15, -TRACK_LEN + 10);
    if (GAPS.some((g) => z < g.z0 + 4 && z > g.z1 - 4) && Math.abs(x) < 9) return false;
    d.position.set(x, groundHeight(x, z) + yOff, z); d.rotation.set(0, rng.range(0, 6.28), 0); return true;
  };

  // saguaro cacti
  const cap = (r, l, c, o) => cb.add(new THREE.CapsuleGeometry(r, l, 2, 7), c, o);
  const cb = new Builder(); cap(0.32, 2.6, C.cactus, { p: [0, 1.6, 0], jitter: 0.04 }); cap(0.26, 0.9, C.cactus, { p: [-0.78, 1.9, 0] });
  cap(0.22, 0.5, C.cactus, { p: [-0.55, 1.45, 0], r: [0, 0, 1.57] }); cap(0.24, 0.8, C.cactus, { p: [0.75, 2.5, 0] }); cap(0.2, 0.45, C.cactus, { p: [0.5, 2.0, 0], r: [0, 0, 1.57] });
  cb
    .box(0.07, 3.4, 0.07, C.cactusLight, { p: [0, 1.7, -0.3], radius: 0.02, ao: 0 }).sphere(0.12, 0xff6fa5, { p: [0, 3.3, 0], ao: 0 });
  mkInst(cb.build(), Math.round(44 * dens), (d) => { if (!place(7, 46)(d)) return false; d.scale.setScalar(rng.range(0.8, 1.7)); return true; }, { shadow: true });
  // rocks
  const rb = new Builder().add(new THREE.IcosahedronGeometry(0.8, 1), C.redRock, { p: [0, 0.3, 0], s: [1.3, 0.8, 1], jitter: 0.25 })
    .add(new THREE.IcosahedronGeometry(0.45, 1), C.redRockLit, { p: [0.8, 0.15, 0.3], jitter: 0.2 });
  mkInst(rb.build(), Math.round(80 * dens), (d) => { if (!place(6, 60, -0.1)(d)) return false; d.scale.set(rng.range(0.6, 2.4), rng.range(0.6, 2.2), rng.range(0.6, 2.4)); return true; }, { shadow: true });
  // dry bushes
  const bb = new Builder(); for (let i = 0; i < 6; i++) bb.cone(0.12, 0.7, C.bush, { p: [Math.sin(i) * 0.18, 0.3, Math.cos(i) * 0.18], r: [Math.cos(i) * 0.5, 0, Math.sin(i) * 0.5], seg: 5 });
  mkInst(bb.build(), Math.round(150 * dens), (d) => { if (!place(4.9, 30)(d)) return false; d.scale.setScalar(rng.range(0.7, 1.5)); return true; });
  // fence posts with glowing lanterns along both path edges + rails
  const posts = [], lantern = new Builder().box(0.2, 0.26, 0.2, 0xffffff, { p: [0, 0, 0], radius: 0.05, ao: 0 });
  const postGeo = new Builder().box(0.2, 1.3, 0.2, C.wood, { p: [0, 0.65, 0], jitter: 0.03 }).box(0.7, 0.1, 0.1, C.woodDark, { p: [0, 1.0, 0] }).box(0.6, 0.08, 0.08, C.wood, { p: [0, 0.6, 0] }).build();
  const nPost = 36, lamp = new THREE.InstancedMesh(lantern.build(), createToon({ color: 0xffa640, emissive: 0xff8a20, emissiveIntensity: 3.2, grime: false, rim: false, tint: false }), nPost);
  const pm = new THREE.InstancedMesh(postGeo, createToon({ vertexColors: true }), nPost), o = new THREE.Object3D();
  for (let i = 0; i < nPost; i++) {
    const side = i % 2 ? 1 : -1, z = 6 - Math.floor(i / 2) * 25, x = side * (PATH_W + 1.6);
    if (GAPS.some((g) => z < g.z0 + 3 && z > g.z1 - 3)) { o.scale.setScalar(0); } else o.scale.setScalar(1);
    o.position.set(x, groundHeight(x, z), z); o.rotation.y = side * 0.1; o.updateMatrix(); pm.setMatrixAt(i, o.matrix);
    o.position.y += 1.5; o.rotation.set(0, 0, 0); o.updateMatrix(); lamp.setMatrixAt(i, o.matrix);
  }
  pm.castShadow = true; group.add(pm, lamp);
  // soap crates and coin arcs on the path
  const crateGeo = new Builder().box(1, 1, 1, 0xf1c40f, { p: [0, 0.5, 0], radius: 0.08 }).box(1.04, 0.14, 1.04, C.wood, { p: [0, 0.12, 0], radius: 0.03 })
    .box(1.04, 0.14, 1.04, C.wood, { p: [0, 0.88, 0], radius: 0.03 }).sphere(0.22, 0xffffff, { p: [0, 0.52, -0.5], s: [1, 1, 0.3], ao: 0 })
    .sphere(0.1, 0x7fd8ff, { p: [0.18, 0.7, -0.52], s: [1, 1, 0.3], ao: 0 }).build();
  const crates = new THREE.InstancedMesh(crateGeo, createToon({ vertexColors: true }), 12); const cz = [-20, -26, -38, -88, -96, -130, -142, -150, -210, -230, -255, -270];
  cz.forEach((z, i) => { o.position.set(((i * 37) % 5 - 2) * 0.9, groundHeight(0, z), z); o.rotation.set(0, (i % 3 - 1) * 0.2, 0); o.scale.setScalar(0.9 + (i % 2) * 0.2); o.updateMatrix(); crates.setMatrixAt(i, o.matrix); });
  crates.castShadow = true; group.add(crates);
  const coinGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.07, 14); coinGeo.rotateX(Math.PI / 2);
  const COINS = 36, coins = new THREE.InstancedMesh(coinGeo, createToon({ color: 0xffc21a, emissive: 0xffa800, emissiveIntensity: 1.5, grime: false, rim: false }), COINS);
  const coinBase = []; for (let i = 0; i < COINS; i++) { const arc = Math.floor(i / 9), k = i % 9; coinBase.push([Math.sin(arc * 2 + k) * 0.0 + (arc % 2 ? 1.2 : -1.2), 1.0 + Math.sin((k / 8) * Math.PI) * 1.6, -14 - arc * 28 - k * 1.6]); }
  group.add(coins);

  // ---- distant silhouette scenery: 3 parallax layers that follow the camera ----
  const bd = new THREE.Group(); group.add(bd);
  const farMat = (c) => createToon({ color: c, vertexColors: true, grime: false, fog: false, rim: false });
  const hazeC = new THREE.Color(stage01Haze);
  const layer = (n, dist, spread, hMin, hMax, base, strata, haze) => {
    const geo = new Builder();
    for (let i = 0; i < n; i++) {
      const x = (i / n - 0.5) * spread * 2 + rng.range(-12, 12), h = rng.range(hMin, hMax), w = rng.range(14, 32), z = rng.range(-12, 12), k = rng.range(0.55, 0.9);
      const rr = [1, 0.95, 0.88, 0.82, 0.7]; const bh = h / 4;
      for (let b = 0; b < 4; b++) geo.add(new THREE.CylinderGeometry(w * rr[b + 1], w * rr[b], bh + 0.2, 6, 1, b === 3), b % 2 ? strata : base, { p: [x, -2 + bh * (b + 0.5), z], s: [1, 1, k], jitter: 0.9, ao: 0.3 });
      geo.add(new THREE.CylinderGeometry(w * 0.66, w * 0.7, 0.6, 7), strata, { p: [x, -2 + h + 0.2, z], s: [1, 1, k], ao: 0 });
    }
    const g = geo.build(), c = g.attributes.color, pp = g.attributes.position, t = new THREE.Color();
    for (let i = 0; i < c.count; i++) { t.setRGB(c.getX(i), c.getY(i), c.getZ(i)).lerp(hazeC, haze * (1 - Math.min(1, Math.max(0, (pp.getY(i) + 2) / hMax))) + haze * 0.25); c.setXYZ(i, t.r, t.g, t.b); }
    const m = new THREE.Mesh(g, farMat(0xffffff)); m.userData = { dist }; m.frustumCulled = false; bd.add(m); return m;
  };
  layer(13, 330, 520, 40, 85, 0x6b3f86, 0x8a5aa6, 0.5); layer(12, 250, 420, 30, 60, 0xa04a74, 0xc2607e, 0.38); layer(11, 190, 330, 22, 44, 0xbf4f30, 0xe27a3e, 0.24);
  bd.children.forEach((m) => { m.position.y = -3; });
  // sun-facing rim: tint the far layers with the fog so they melt into the horizon
  const layers = bd.children;

  const dummy = new THREE.Object3D();
  return {
    group, fluids, layers,
    update(t, camPos) {
      for (const f of fluids) f.update(t);
      for (let i = 0; i < COINS; i++) {
        const b = coinBase[i]; dummy.position.set(b[0], b[1] + Math.sin(t * 3 + i) * 0.06, b[2]); dummy.rotation.set(0, t * 2.4 + i * 0.5, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); coins.setMatrixAt(i, dummy.matrix);
      }
      coins.instanceMatrix.needsUpdate = true;
      layers.forEach((m, i) => { m.position.set(camPos.x * 0.9, -3 - i * 0, camPos.z - m.userData.dist); });
    },
  };
}
