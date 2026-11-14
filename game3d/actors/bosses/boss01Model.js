import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon, makeOutline } from '../../render/materials.js';

// BIG DIRT, the stage-1 boss: a towering purple heap of grime with a crown of dirt clods, glowing yellow glare,
// jagged teeth and two huge fists (original: #6c3483 slab, #8e44ad face, #9b59b6 lumps, #f1c40f eyes).
// Returns a rig: { root, pose(p) } where p = { sq, arms, lean, eye, rage, flash, glow, shakeX, shakeZ, scale }.
const C = { body: 0x6c3483, face: 0x8e44ad, lump: 0x9b59b6, drip: 0x5b2c6f, dirt: 0x5d4037, dirtLight: 0x8d6e63, tooth: 0xe8dcc8, mouth: 0x1a0c20 };

export function createBoss01Model() {
  const root = new THREE.Group(); root.name = 'boss1'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 0.9 });
  const eyeMat = createToon({ color: 0xffd23a, emissive: 0xffc21a, emissiveIntensity: 2.4, grime: false, rim: false, tint: false });
  const auraMat = new THREE.MeshBasicMaterial({ color: 0xb05fe0, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mk = (b, parent, mat = toon, outline = true) => { const m = new THREE.Mesh(b.build(), mat); m.castShadow = true; parent.add(m); if (outline) makeOutline(m, { width: 0.0042 }); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  // torso: tapered, wider at the bottom, lumpy
  const t = new Builder()
    .cyl(1.2, 1.65, 2.3, C.body, { p: [0, 1.65, 0], seg: 9, jitter: 0.16 }).sphere(1.15, C.face, { p: [0, 1.55, 0.55], s: [1.0, 1.05, 0.55], jitter: 0.08, ao: 0 })
    .sphere(0.5, C.lump, { p: [-1.0, 1.0, 0.7], jitter: 0.06 }).sphere(0.36, C.lump, { p: [1.05, 2.1, 0.62], jitter: 0.06 }).sphere(0.28, C.lump, { p: [0.5, 0.75, 0.95], jitter: 0.05 })
    .sphere(0.4, C.lump, { p: [-0.7, 2.5, 0.2], jitter: 0.06 });
  for (const [x, h] of [[-0.55, 0.9], [0.2, 0.6], [0.8, 0.75]]) t.capsule(0.13, h, C.drip, { p: [x, 0.95 - h / 2, 1.12], s: [1, 1, 0.8] });            // drips down the front
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, h = 0.5 + (i % 3) * 0.18; t.cone(0.26, h, i % 2 ? C.dirt : C.dirtLight, { p: [Math.cos(a) * 0.72, 2.95 + h * 0.2, Math.sin(a) * 0.72], r: [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3], seg: 5, jitter: 0.06 }); }
  t.cone(0.3, 0.8, C.dirt, { p: [0, 3.25, 0], seg: 6, jitter: 0.08 });
  mk(t, body);
  // face: brows and a mouth full of teeth (the glowing glare is its own emissive mesh below)
  const f = new Builder();
  f.box(1.45, 0.58, 0.2, C.mouth, { p: [0, 1.2, 1.1], radius: 0.12, ao: 0 });
  for (let i = 0; i < 6; i++) { f.cone(0.1, 0.3, C.tooth, { p: [-0.55 + i * 0.22, 1.37, 1.2], r: [Math.PI, 0, 0], seg: 4, ao: 0 }); if (i % 2) f.cone(0.08, 0.22, C.tooth, { p: [-0.55 + i * 0.22 - 0.11, 1.02, 1.2], seg: 4, ao: 0 }); }
  for (const s of [-1, 1]) f.box(0.8, 0.2, 0.22, 0x1a0c20, { p: [s * 0.55, 2.42, 1.08], r: [0, 0, -s * 0.5], radius: 0.05, ao: 0 });   // angry brows
  mk(f, body, toon, false);
  const eyeBuilder = new Builder();
  for (const s of [-1, 1]) { eyeBuilder.add(new THREE.ConeGeometry(0.34, 0.62, 3), 0xffffff, { p: [s * 0.55, 2.04, 1.1], r: [Math.PI / 2, 0, s * (Math.PI / 2 + 0.5)], s: [1, 0.35, 1], ao: 0 }); eyeBuilder.sphere(0.1, 0x1a0c20, { p: [s * 0.45, 2.0, 1.2], ao: 0 }); }
  const eyeMesh = mk(eyeBuilder, body, eyeMat, false);

  // arms: pivot at the shoulder; the fist is a big sphere of clods
  const arm = (side) => {
    const g = J(body, side * 1.55, 2.35, 0.1);
    mk(new Builder().capsule(0.32, 0.9, C.body, { p: [0, -0.55, 0], jitter: 0.06 }).sphere(0.55, C.face, { p: [0, -1.3, 0.05], jitter: 0.08 })
      .sphere(0.2, C.lump, { p: [-0.25, -1.45, 0.4], jitter: 0.04 }).sphere(0.2, C.lump, { p: [0.12, -1.5, 0.45], jitter: 0.04 }).sphere(0.18, C.lump, { p: [0.35, -1.38, 0.35], jitter: 0.04 }), g);
    return g;
  };
  const armL = arm(-1), armR = arm(1);
  const leg = (side) => { const g = J(body, side * 0.8, 0.5, 0.1); mk(new Builder().cyl(0.55, 0.6, 0.7, C.body, { p: [0, -0.15, 0], seg: 8, jitter: 0.06 }).box(0.9, 0.3, 1.1, C.drip, { p: [0, -0.4, 0.2], radius: 0.12 }), g); return g; };
  const legL = leg(-1), legR = leg(1);
  const aura = new THREE.Mesh(new THREE.CircleGeometry(2.7, 36), auraMat); aura.rotation.x = -Math.PI / 2; aura.position.y = 0.06; aura.matrixAutoUpdate = true; root.add(aura);

  const rig = {
    root, body, toon, eyeMat, auraMat,
    // Sets the pose for this frame; the root matrix itself is written by the controller.
    pose(p) {
      const sq = p.sq, k = 1 / Math.sqrt(sq);
      body.scale.set(k * p.scale, sq * p.scale, k * p.scale); body.rotation.set(p.lean, 0, p.roll || 0);
      body.position.set(p.shakeX || 0, 0, p.shakeZ || 0);
      armL.rotation.set(-p.arms * 2.7 + Math.sin(p.t * 2) * 0.05, 0, 0.12 + p.arms * 0.25); armR.rotation.set(-p.arms * 2.7 + Math.sin(p.t * 2 + 1) * 0.05, 0, -0.12 - p.arms * 0.25);
      legL.rotation.x = Math.sin(p.t * 8) * 0.35 * p.walk; legR.rotation.x = -Math.sin(p.t * 8) * 0.35 * p.walk;
      const hot = p.eye; // 0 calm yellow, 1 angry red-orange
      eyeMat.color.setRGB(1, 0.82 - 0.55 * hot, 0.23 - 0.2 * hot); eyeMat.emissive.copy(eyeMat.color); eyeMat.emissiveIntensity = 2 + hot * 2.5 + (p.flash > 0 ? 2 : 0);
      toon.emissive.setRGB(p.glow, p.glow, p.glow * 1.05); toon.emissiveIntensity = Math.max(p.flash, p.glow);
      auraMat.color.setRGB(0.69 + hot * 0.3, 0.37 - hot * 0.2, 0.88 - hot * 0.7); auraMat.opacity = p.aura;
      aura.scale.setScalar(1 + Math.sin(p.t * 3) * 0.06 + hot * 0.15);
    },
    setVisible(v) { root.visible = v; },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
  return rig;
}
