import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon, makeOutline } from '../../render/materials.js';

// MAGMA MAW, the stage-6 boss: a hulking volcanic golem. A slate-grey crust (#2c3e50 in the original) split by orange lava seams (#e67e22), a dark head (#34495e) with a yellow
// glowing eye bar (#f1c40f) and an orange-lit maw, huge fists, a crater on the back that spits sparks. It sinks into the floor by flattening and shrinking to nothing.
// rig.pose({ maw, eye, vis, lean, flash, glow, t, scale, sq, shakeX, shakeZ, slam })
const C = { crust: 0x34495e, crustDark: 0x1f2a38, crustLit: 0x4a6078, lava: new THREE.Color(3.2, 1.3, 0.2), hot: new THREE.Color(3.4, 2.4, 0.6), eye: new THREE.Color(3.4, 3.0, 0.4), tooth: 0xe8dcc0 };

export function createBoss06Model() {
  const root = new THREE.Group(); root.name = 'boss6'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 1.0 });
  const mk = (b, parent, mat = toon, outline = true) => { const m = new THREE.Mesh(b.build(), mat); m.castShadow = true; parent.add(m); if (outline) makeOutline(m, { width: 0.0042 }); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const B = () => new Builder({ ico: true });

  const torso = B().add(new THREE.CylinderGeometry(1.5, 2.1, 2.6, 8), C.crust, { p: [0, 1.7, 0], jitter: 0.12, ao: 0.25 }).sphere(1.2, C.crustDark, { p: [0, 3.0, -0.2], s: [1.5, 0.8, 1.1], jitter: 0.1 });
  for (const [x, y, z, a] of [[-0.7, 2.4, 1.25, 0.7], [0.6, 1.6, 1.5, -0.5], [-0.4, 1.0, 1.7, 0.3], [0.9, 2.5, 1.0, -0.9]]) torso.box(0.14, 1.1, 0.1, C.lava, { p: [x, y, z], r: [0, 0, a], radius: 0.02, ao: 0 });   // lava seams
  torso.sphere(0.55, C.lava, { p: [0, 1.9, 1.5], s: [1, 1, 0.5], ao: 0 });
  for (const s of [-1, 1]) torso.sphere(0.9, C.crustLit, { p: [s * 1.8, 2.9, 0], s: [1, 0.8, 1], jitter: 0.12 });                                   // shoulder boulders
  torso.cyl(0.8, 1.0, 0.5, C.crustDark, { p: [0, 3.4, -1.0], seg: 8 }).cyl(0.6, 0.6, 0.08, C.lava, { p: [0, 3.68, -1.0], seg: 8, ao: 0 });         // the crater on his back
  mk(torso, body);
  const head = J(body, 0, 3.7, 0.5);
  mk(B().sphere(1.0, 0x34495e, { s: [1.15, 0.9, 1], jitter: 0.08 }).box(1.9, 0.2, 0.5, C.crustDark, { p: [0, 0.35, 0.8], radius: 0.06 }).cone(0.2, 0.7, C.crustDark, { p: [-0.7, 0.9, 0], r: [0, 0, 0.5], seg: 5 }).cone(0.2, 0.7, C.crustDark, { p: [0.7, 0.9, 0], r: [0, 0, -0.5], seg: 5 }), head);
  const eyeB = B().box(1.4, 0.2, 0.2, C.eye, { p: [0, 0.2, 0.9], radius: 0.05, ao: 0 }); mk(eyeB, head, createToon({ vertexColors: true, grime: false, rim: false, tint: false, emissive: 0xffd040, emissiveIntensity: 0.9 }), false);
  const jaw = J(head, 0, -0.25, 0.4);
  mk(B().box(1.5, 0.35, 1.2, 0x2a3644, { p: [0, -0.2, 0.3], radius: 0.1 }).box(1.2, 0.2, 0.9, C.lava, { p: [0, 0.0, 0.3], radius: 0.05, ao: 0 }), jaw);
  for (let i = 0; i < 5; i++) mk(B().cone(0.12, 0.4, C.tooth, { p: [-0.55 + i * 0.275, 0.2, 0.8], seg: 4, ao: 0 }).cone(0.1, 0.3, C.tooth, { p: [-0.55 + i * 0.275, -0.05, 0.85], r: [Math.PI, 0, 0], seg: 4, ao: 0 }), jaw, toon, false);
  const arms = [-1, 1].map((s) => { const a = J(body, s * 2.0, 2.7, 0.1); mk(B().capsule(0.5, 1.3, C.crust, { p: [0, -0.9, 0] }).sphere(0.8, C.crustLit, { p: [0, -2.0, 0.1], jitter: 0.1 }).sphere(0.3, C.lava, { p: [0, -2.0, 0.8], ao: 0 }), a); return { g: a, s }; });
  for (const s of [-1, 1]) mk(B().box(1.1, 1.0, 1.2, C.crustDark, { p: [s * 0.9, 0.5, 0], radius: 0.2, jitter: 0.06 }), body);
  return {
    root, body, toon,
    pose(p) {
      const v = Math.max(0.001, p.vis ?? 1), sq = p.sq || 1;
      body.scale.set(v * p.scale / Math.sqrt(sq), (v * p.scale) * sq, v * p.scale / Math.sqrt(sq)); body.rotation.set(p.lean || 0, 0, Math.sin(p.t * 1.3) * 0.015); body.position.set(p.shakeX || 0, 0, p.shakeZ || 0);
      head.rotation.set((p.eye || 0) * 0.1 + Math.sin(p.t * 1.1) * 0.03, Math.sin(p.t * 0.9) * 0.1, 0);
      jaw.rotation.x = (p.maw || 0) * 0.7;
      arms[0].g.rotation.set(-0.2 + Math.sin(p.t * 2) * 0.05 - (p.slam || 0) * 1.6, 0, 0.15); arms[1].g.rotation.set(-0.2 + Math.sin(p.t * 2 + 1) * 0.05 - (p.slam || 0) * 1.6, 0, -0.15);
      toon.emissive.setRGB(p.glow, p.glow * 0.4, p.glow * 0.1); toon.emissiveIntensity = Math.max(p.flash, p.glow);
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
}
