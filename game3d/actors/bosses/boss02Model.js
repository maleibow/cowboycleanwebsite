import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon, makeOutline } from '../../render/materials.js';

// BIG SLUDGE, the stage-2 boss: a vast wobbling jelly of toxic green with a pale belly, three dark spots, a crown of bubbles and two
// eye stalks topped with big yellow eyes (original: #1e8449 swelling blob, #a9dfbf belly, #117a65 spots, #2ecc71 stalks, #f1c40f eyes).
// rig.pose({ sq, lean, eye, mouth, glow, flash, aura, t, scale, wide, shakeX, shakeZ, melt }):
//   sq = squash (1 normal, <1 crouched, >1 stretched), wide = extra width, mouth = 0..1 open, melt = 0..1 sinking into a puddle.
const C = { body: 0x2fb344, bodyLight: 0x6df05a, belly: 0xe4f7a8, spot: 0x117a65, drip: 0x16703c, eye: 0xf1c40f, mouth: 0x0b2a18, tooth: 0xe8f5d0 };

export function createBoss02Model() {
  const root = new THREE.Group(); root.name = 'boss2'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 1.0 });
  const eyeMat = createToon({ color: 0xffe14a, emissive: 0xffc21a, emissiveIntensity: 2.2, grime: false, rim: false, tint: false });
  const auraMat = new THREE.MeshBasicMaterial({ color: 0x6aff5a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mk = (b, parent, mat = toon, outline = true) => { const m = new THREE.Mesh(b.build(), mat); m.castShadow = true; parent.add(m); if (outline) makeOutline(m, { width: 0.0042 }); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  // the jelly: a big squashed sphere, a lighter dome on top, a pale belly patch, dark spots, drips and floating bubbles
  const t = new Builder().sphere(1.75, C.body, { p: [0, 1.4, 0], s: [1.12, 0.92, 1.05], jitter: 0.1, ao: 0.25 }).sphere(1.2, C.bodyLight, { p: [-0.35, 2.0, 0.1], s: [1, 0.7, 1], jitter: 0.08, ao: 0 })
    .sphere(1.15, C.belly, { p: [0, 1.05, 0.95], s: [1.0, 0.95, 0.5], jitter: 0.05, ao: 0 });
  for (const [x, y, z, r] of [[-1.1, 1.7, 0.9, 0.3], [1.25, 1.3, 0.8, 0.22], [0.6, 2.35, 0.75, 0.26]]) t.sphere(r, C.spot, { p: [x, y, z], s: [1, 1, 0.5], jitter: 0.03, ao: 0 });
  for (const [x, h] of [[-0.9, 0.7], [-0.2, 0.5], [0.7, 0.8], [1.3, 0.45]]) t.capsule(0.15, h, C.drip, { p: [x, 0.25 - h / 2 + 0.2, 1.45 - Math.abs(x) * 0.2], s: [1, 1, 0.8] });
  for (const [x, y, z, r] of [[-1.3, 2.4, -0.2, 0.28], [1.5, 2.0, -0.4, 0.2], [0.2, 2.9, -0.5, 0.22]]) t.sphere(r, 0xbfffd0, { p: [x, y, z], ao: 0 });
  t.cyl(2.3, 2.5, 0.12, C.drip, { p: [0, 0.08, 0], seg: 14, jitter: 0.12, ao: 0 });                // the puddle it sits in
  mk(t, body);
  // face: a downturned mouth that opens for the acid spit
  const mouth = J(body, 0, 1.35, 1.52);
  mk(new Builder().box(1.4, 0.5, 0.18, C.mouth, { p: [0, 0, 0], radius: 0.1, ao: 0 }).cone(0.09, 0.26, C.tooth, { p: [-0.4, 0.2, 0.1], r: [Math.PI, 0, 0], seg: 4, ao: 0 }).cone(0.09, 0.26, C.tooth, { p: [0.0, 0.2, 0.1], r: [Math.PI, 0, 0], seg: 4, ao: 0 }).cone(0.09, 0.26, C.tooth, { p: [0.4, 0.2, 0.1], r: [Math.PI, 0, 0], seg: 4, ao: 0 }), mouth, toon, false);
  // eye stalks: a curved stem, a big yellow eyeball with a black slit pupil and an angry lid
  const stalk = (side) => {
    const g = J(body, side * 0.75, 2.75, 0.2);
    mk(new Builder().capsule(0.17, 0.9, C.bodyLight, { p: [side * 0.05, 0.35, 0], jitter: 0.03 }).sphere(0.55, 0xffffff, { p: [side * 0.1, 1.0, 0.15], jitter: 0.02, ao: 0 })
      .sphere(0.2, 0x0a1a10, { p: [side * 0.08, 1.0, 0.62], s: [0.7, 1.5, 0.5], ao: 0 }).box(0.85, 0.2, 0.55, C.body, { p: [side * 0.1, 1.38, 0.2], r: [0.2, 0, -side * 0.5], radius: 0.06, ao: 0 }), g);
    const eyeB = new Builder().sphere(0.4, 0xffffff, { p: [side * 0.1, 1.0, 0.3], s: [1, 1, 0.9], ao: 0 });
    mk(eyeB, g, eyeMat, false);
    return g;
  };
  const stalkL = stalk(-1), stalkR = stalk(1);
  const aura = new THREE.Mesh(new THREE.CircleGeometry(3.2, 36), auraMat); aura.rotation.x = -Math.PI / 2; aura.position.y = 0.06; root.add(aura);

  return {
    root, body, toon, eyeMat, auraMat,
    pose(p) {
      const sq = Math.max(0.05, p.sq * (1 - 0.8 * (p.melt || 0))), k = 1 / Math.sqrt(sq) * (1 + (p.wide || 0) + 0.9 * (p.melt || 0));
      body.scale.set(k * p.scale, sq * p.scale, k * p.scale); body.rotation.set(p.lean, 0, p.roll || 0); body.position.set(p.shakeX || 0, 0, p.shakeZ || 0);
      mouth.scale.set(1, 0.4 + p.mouth * 2.2, 1); mouth.position.y = 1.35 - p.mouth * 0.12;
      stalkL.rotation.set(Math.sin(p.t * 3) * 0.12, 0, 0.2 + Math.sin(p.t * 2.3) * 0.1 - p.eye * 0.1); stalkR.rotation.set(Math.sin(p.t * 3 + 1) * 0.12, 0, -0.2 + Math.sin(p.t * 2.3 + 1) * 0.1 + p.eye * 0.1);
      const hot = p.eye;
      eyeMat.color.setRGB(1, 0.88 - 0.62 * hot, 0.29 - 0.25 * hot); eyeMat.emissive.copy(eyeMat.color); eyeMat.emissiveIntensity = 1.8 + hot * 2.4 + (p.flash > 0 ? 2 : 0);
      toon.emissive.setRGB(p.glow * 0.7, p.glow, p.glow * 0.3); toon.emissiveIntensity = Math.max(p.flash, p.glow);
      auraMat.opacity = p.aura * (1 - (p.melt || 0)); auraMat.color.setRGB(0.4 + hot * 0.5, 1, 0.35); aura.scale.setScalar(1 + Math.sin(p.t * 3) * 0.06 + hot * 0.15);
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
}
