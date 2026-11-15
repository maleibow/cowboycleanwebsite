import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon } from '../../render/materials.js';

// HOLLOW GHOST, the stage-9 boss (original: a tall dark #2c3e50 robe, a black hood with a pale #ecf0f1 face and two black dot eyes, a brown staff with a grey blade): a tall hooded wraith in a tattered
// slate robe that dissolves into wisps below the knees, a bone-white mask with hollow eyes and a wide mouth, long bony arms, and a gnarled staff topped with a lantern of green flame.
// The whole thing fades (vis 0..1) when he phases; the eyes and the flame stay bright. rig.pose({ vis, charge, mouth, lean, roll, glow, flash, t, scale, sq, shakeX, shakeZ, aim })
const GREEN = new THREE.Color(1.6, 3.6, 2.0), FLAME = new THREE.Color(1.8, 4.0, 2.2);

export function createBoss09Model() {
  const root = new THREE.Group(); root.name = 'boss9'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const mats = [];
  const toon = (o = {}) => { const m = createToon({ vertexColors: true, grime: false, rimStrength: 1.1, transparent: true, ...o }); mats.push(m); return m; };
  const robeMat = toon(), glowMat = toon({ rim: false, tint: false, emissive: 0x405048, emissiveIntensity: 0.5 });
  const mk = (b, parent, mat = robeMat) => { const m = new THREE.Mesh(b.build(), mat); m.castShadow = false; parent.add(m); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const B = () => new Builder({ ico: true });

  // robe: a tall tapered cone with ragged tails, a hunched cape at the shoulders
  const robe = B().add(new THREE.ConeGeometry(1.25, 2.9, 12), 0x4a6178, { p: [0, 1.5, 0], jitter: 0.05, ao: 0.3 }).sphere(0.95, 0x58728a, { p: [0, 2.7, -0.1], s: [1.2, 0.8, 1], jitter: 0.05, ao: 0.2 });
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283; robe.cone(0.22, 0.9 + (i % 3) * 0.35, i % 2 ? 0x3c4f62 : 0x4a6178, { p: [Math.cos(a) * 1.05, 0.15 - (i % 3) * 0.12, Math.sin(a) * 1.05], r: [Math.PI, 0, 0], seg: 5, ao: 0.2 }); }
  mk(robe, body);
  const head = J(body, 0, 3.2, 0.12);
  mk(B().sphere(0.62, 0x222a34, { p: [0, 0.05, -0.08], s: [1, 1.1, 1.05], jitter: 0.03, ao: 0.2 }).add(new THREE.ConeGeometry(0.5, 0.7, 8), 0x222a34, { p: [0, 0.62, -0.28], r: [-0.5, 0, 0], ao: 0.1 }), head);   // the hood with a drooping point
  mk(B().sphere(0.4, 0xecf0f1, { p: [0, 0, 0.26], s: [0.9, 1.15, 0.5], ao: 0.1 }).box(0.34, 0.06, 0.05, 0x3a4048, { p: [0, 0.22, 0.46], radius: 0.01, ao: 0 }), head);   // the pale mask
  const eyeG = J(head, 0, 0, 0); mk(B().sphere(0.11, 0x050708, { p: [-0.16, 0.08, 0.5], s: [1, 1.4, 0.4], ao: 0 }).sphere(0.11, 0x050708, { p: [0.16, 0.08, 0.5], s: [1, 1.4, 0.4], ao: 0 }).sphere(0.12, 0x050708, { p: [0, -0.2, 0.5], s: [0.8, 2.0, 0.4], ao: 0 }), eyeG);
  const pupils = J(head, 0, 0, 0); mk(B().sphere(0.04, GREEN, { p: [-0.16, 0.06, 0.55], ao: 0 }).sphere(0.04, GREEN, { p: [0.16, 0.06, 0.55], ao: 0 }), pupils, glowMat);
  // arms: long and bony, one holding the staff, one reaching out
  const armL = J(body, -0.95, 2.6, 0.1), armR = J(body, 0.95, 2.6, 0.1);
  for (const [arm, sd] of [[armL, -1], [armR, 1]]) { mk(B().capsule(0.11, 1.1, 0x4a6178, { p: [0, -0.55, 0] }).sphere(0.2, 0xd8dcd0, { p: [0, -1.2, 0.05], s: [1, 0.8, 1.2], ao: 0.1 }), arm); for (let f = 0; f < 3; f++) mk(B().cone(0.03, 0.3, 0xd8dcd0, { p: [(f - 1) * 0.07, -1.38, 0.12], r: [Math.PI + 0.3, 0, (f - 1) * 0.3], seg: 4, ao: 0 }), arm); }
  // staff + lantern: held in the right hand, a crooked pole with a hook and a caged green flame
  const staff = J(body, 1.15, 1.5, 0.35);
  mk(B().cyl(0.05, 0.07, 3.6, 0x5d4037, { p: [0, 1.5, 0], r: [0, 0, 0.05], seg: 5, jitter: 0.03 }).add(new THREE.TorusGeometry(0.22, 0.05, 4, 10, Math.PI * 1.3), 0x5d4037, { p: [0.14, 3.4, 0], r: [0, 0, 1.6], ao: 0 }).box(0.22, 0.34, 0.22, 0x1c1f24, { p: [0.28, 3.05, 0], radius: 0.02, ao: 0 }), staff);
  const flame = J(staff, 0.28, 3.05, 0); mk(B().sphere(0.12, FLAME, { p: [0, 0, 0], s: [1, 1.5, 1], ao: 0 }), flame, glowMat);
  const sparks = B(); for (let i = 0; i < 5; i++) sparks.sphere(0.05, GREEN, { p: [Math.cos(i * 1.3) * 1.5, 1.2 + (i % 3) * 0.7, Math.sin(i * 1.3) * 1.5], s: [1, 1.5, 1], ao: 0 }); const orbit = J(body, 0, 0, 0); mk(sparks, orbit, glowMat);

  return {
    root, body, toon: robeMat,
    pose(p) {
      const sq = p.sq || 1, k = 1 / Math.sqrt(sq), v = p.vis ?? 1, ch = p.charge || 0;
      body.scale.set(k * p.scale, sq * p.scale, k * p.scale); body.rotation.set(p.lean || 0, 0, (p.roll || 0) + Math.sin(p.t * 1.4) * 0.04); body.position.set(p.shakeX || 0, Math.sin(p.t * 1.8) * 0.14, p.shakeZ || 0);
      head.rotation.set(Math.sin(p.t * 1.1) * 0.05 + (p.mouth || 0) * 0.12, Math.sin(p.t * 0.7) * 0.2, 0); eyeG.scale.y = 1 + (p.mouth || 0) * 0.7;
      armL.rotation.set(-0.5 - ch * 1.0 - Math.sin(p.t * 2) * 0.1, 0, -0.3); armR.rotation.set(-0.2 - Math.sin(p.t * 1.6) * 0.06, 0, 0.12); staff.rotation.z = -0.05; staff.position.y = 1.5 + ch * 0.2;
      flame.scale.setScalar(1 + ch * 3 + Math.sin(p.t * 20) * 0.15); orbit.rotation.y = p.t * (0.8 + ch * 3); orbit.visible = true;
      for (const m of mats) { m.opacity = Math.max(0.0, v); m.depthWrite = v > 0.9; m.visible = v > 0.01; }
      glowMat.opacity = Math.min(1, 0.3 + 0.7 * v); glowMat.emissiveIntensity = 0.45 + ch * 1.2 + (v < 0.9 ? 0.5 : 0);
      robeMat.emissive.setRGB(p.glow, p.glow * 0.9, p.glow * 0.9); robeMat.emissiveIntensity = Math.max(p.flash, p.glow);
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); for (const m of mats) m.dispose(); },
  };
}
