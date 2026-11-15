import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon, makeOutline } from '../../render/materials.js';

// TRASH KING, the stage-3 boss: a hovering garbage-compactor tyrant. A steel hull with a rust-red crushing jaw and a heap of junk on its back,
// one huge glowing red eye in a dome, hydraulic claws, four cyan hover jets and neon strips (original: #7f8c8d slab, #95a5a6 panels, #2c3e50 base, #e74c3c band,
// a #c0392b / #ff0000 eye on top). rig.pose({ sq, lean, roll, thrust, eye, glow, flash, t, scale, claws, cable, shakeX, shakeZ }).
const NEON = { cyan: new THREE.Color(0.25, 2.8, 2.5), mag: new THREE.Color(2.9, 0.25, 2.1), amber: new THREE.Color(3, 1.7, 0.4) };
const C = { hull: 0x7f8c8d, hullLight: 0x95a5a6, hullDark: 0x2c3e50, red: 0xc0392b, rust: 0x8a4a32, iron: 0x22222c, tooth: 0xe8dcc8 };

export function createBoss03Model() {
  const root = new THREE.Group(); root.name = 'boss3'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 1.0 });
  const eyeMat = createToon({ color: 0xff2a1a, emissive: 0xff1a0a, emissiveIntensity: 2.6, grime: false, rim: false, tint: false });
  const jetMat = new THREE.MeshBasicMaterial({ color: 0x4ff4ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mk = (b, parent, mat = toon, outline = true) => { const m = new THREE.Mesh(b.build(), mat); m.castShadow = true; parent.add(m); if (outline) makeOutline(m, { width: 0.0042 }); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const B = () => new Builder({ ico: true });

  // hull: layered slabs with panel lines, a rust-red jaw bar across the front, neon strips, rivets
  const h = B().box(3.4, 1.5, 2.5, C.hull, { p: [0, 1.5, 0], radius: 0.12, jitter: 0.03, ao: 0.25 }).box(3.5, 0.55, 2.6, C.hullDark, { p: [0, 0.62, 0], radius: 0.1 })
    .box(3.0, 0.5, 2.2, C.hullLight, { p: [0, 2.5, -0.1], radius: 0.1 }).box(3.52, 0.28, 0.2, C.red, { p: [0, 1.25, 1.28], radius: 0.04, ao: 0 });
  for (let i = 0; i < 6; i++) h.box(0.1, 1.2, 0.06, 0x6a7879, { p: [-1.4 + i * 0.56, 1.55, 1.27], radius: 0.01, ao: 0 });
  for (let i = 0; i < 12; i++) h.box(0.12, 0.28, 0.1, i % 2 ? 0x1a1a1a : 0xf2c200, { p: [-1.65 + i * 0.3, 0.48, 1.33], radius: 0.005, ao: 0 });               // hazard stripe along the jaw
  for (let i = 0; i < 8; i++) h.cone(0.12, 0.4, C.tooth, { p: [-1.5 + i * 0.43, 0.3, 1.36], r: [Math.PI, 0, 0], seg: 4, ao: 0 });                                // crusher teeth
  for (const [x, y] of [[-1.5, 2.0], [1.5, 2.0], [-1.5, 1.0], [1.5, 1.0]]) h.sphere(0.07, 0xc8ccd8, { p: [x, y, 1.27], s: [1, 1, 0.5], ao: 0 });
  // the junk heap on its back: a dented bin, cans, tyres, a washing-machine door, bags
  h.box(1.7, 0.9, 1.4, 0x5d6b6c, { p: [-0.7, 3.2, -0.5], r: [0, 0.2, 0.1], radius: 0.08 }).box(1.0, 0.7, 1.0, C.rust, { p: [0.9, 3.0, -0.6], r: [0.1, -0.3, -0.15], radius: 0.06, jitter: 0.04 });
  h.add(new THREE.TorusGeometry(0.42, 0.17, 5, 9), 0x1c1c22, { p: [0.2, 3.5, -0.9], r: [1.2, 0.4, 0], ao: 0 }).add(new THREE.TorusGeometry(0.34, 0.15, 5, 9), 0x1c1c22, { p: [-1.1, 3.8, -0.6], r: [0.6, 1.1, 0], ao: 0 });
  for (const [x, z, c] of [[-0.2, -0.2, 0xc0392b], [0.4, -1.0, 0x2a7aa8], [1.3, -0.2, 0xd4a017], [-1.4, -1.1, 0x7a3a9a]]) h.cyl(0.2, 0.2, 0.55, c, { p: [x, 3.7, z], r: [0.4, 0, x * 0.3], seg: 7 });
  h.sphere(0.45, 0x2e5a3a, { p: [0.4, 3.35, 0.3], s: [1.1, 0.85, 1], jitter: 0.07 }).sphere(0.35, 0x3a4a5a, { p: [-1.5, 3.4, 0.4], s: [1, 0.8, 1], jitter: 0.07 });
  mk(h, body);
  const glow = B().box(3.46, 0.07, 0.07, NEON.mag, { p: [0, 2.2, 1.27], radius: 0.01, ao: 0 }).box(3.46, 0.07, 0.07, NEON.cyan, { p: [0, 0.86, 1.3], radius: 0.01, ao: 0 }).box(0.07, 1.0, 0.07, NEON.amber, { p: [-1.7, 1.55, 1.28], radius: 0.01, ao: 0 }).box(0.07, 1.0, 0.07, NEON.amber, { p: [1.7, 1.55, 1.28], radius: 0.01, ao: 0 });
  mk(glow, body, toon, false);
  // the eye: a dome with a black rim and a huge red lens
  const eyeG = J(body, 0, 2.0, 1.1);
  mk(B().add(new THREE.TorusGeometry(0.62, 0.13, 6, 14), 0x15151a, { p: [0, 0, 0.1], ao: 0 }).sphere(0.7, 0x15151a, { p: [0, 0, -0.1], s: [1, 1, 0.6] }), eyeG);
  mk(B().sphere(0.5, 0xffffff, { p: [0, 0, 0.18], s: [1, 1, 0.6], ao: 0 }), eyeG, eyeMat, false);
  mk(B().sphere(0.17, 0x1a0000, { p: [0, 0, 0.42], s: [1, 1.6, 0.4], ao: 0 }), eyeG, toon, false);
  // claws: hydraulic arms from both sides ending in pincers
  const claw = (sd) => {
    const g = J(body, sd * 1.95, 1.4, 0.3);
    mk(B().box(0.4, 0.4, 1.3, C.hullDark, { p: [sd * 0.2, 0, 0.5], radius: 0.06 }).cyl(0.14, 0.14, 1.1, 0x9aa0b0, { p: [sd * 0.2, 0.3, 0.5], r: [Math.PI / 2, 0, 0], seg: 6 }), g);
    const pin = J(g, sd * 0.2, 0, 1.2); mk(B().cone(0.2, 0.9, C.hullLight, { p: [sd * 0.18, 0, 0.35], r: [Math.PI / 2, 0, sd * 0.3], seg: 4 }).cone(0.2, 0.9, C.hullLight, { p: [-sd * 0.18, 0, 0.35], r: [Math.PI / 2, 0, -sd * 0.3], seg: 4 }), pin);
    return { g, pin };
  };
  const clawL = claw(-1), clawR = claw(1);
  // hover jets: a housing with a cyan flame cone that flares with thrust
  const jets = [];
  for (const [x, z] of [[-1.35, 0.8], [1.35, 0.8], [-1.35, -0.8], [1.35, -0.8]]) {
    const g = J(body, x, 0.35, z); mk(B().cyl(0.3, 0.38, 0.35, C.iron, { p: [0, 0, 0], seg: 8 }).cyl(0.2, 0.2, 0.08, NEON.cyan, { p: [0, -0.18, 0], seg: 8, ao: 0 }), g);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 8, 1, true).translate(0, -0.55, 0), jetMat); f.position.y = -0.18; g.add(f); jets.push(f);
  }
  // crane cable for the intro drop
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 40, 5).translate(0, 20, 0), createToon({ color: 0x20202a, grime: false })); cable.position.set(0, 3.6, -0.2); body.add(cable);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 30), new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.05; root.add(shadow);

  return {
    root, body, toon, eyeMat,
    pose(p) {
      const sq = p.sq, k = 1 / Math.sqrt(sq);
      body.scale.set(k * p.scale, sq * p.scale, k * p.scale); body.rotation.set(p.lean, 0, p.roll || 0); body.position.set(p.shakeX || 0, 0, p.shakeZ || 0);
      clawL.pin.rotation.y = 0.3 + p.claws * 0.6; clawR.pin.rotation.y = -0.3 - p.claws * 0.6; clawL.g.rotation.y = -p.claws * 0.4; clawR.g.rotation.y = p.claws * 0.4;
      jets.forEach((f, i) => { const fl = Math.max(0.15, p.thrust * (0.85 + 0.25 * Math.sin(p.t * 40 + i * 2))); f.scale.set(1, fl, 1); });
      jetMat.opacity = Math.min(1, 0.4 + p.thrust * 0.5);
      eyeMat.color.setRGB(1, 0.16 + 0.55 * (1 - p.eye) * 0.4, 0.1); eyeMat.emissive.copy(eyeMat.color); eyeMat.emissiveIntensity = 1.6 + p.eye * 3 + (p.flash > 0 ? 2 : 0);
      toon.emissive.setRGB(p.glow, p.glow * 0.5, p.glow * 0.2); toon.emissiveIntensity = Math.max(p.flash, p.glow);
      cable.visible = p.cable > 0; cable.scale.y = Math.max(0.01, p.cable);
      shadow.material.opacity = p.eye > 0.5 ? 0.0 : 0;
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
}
