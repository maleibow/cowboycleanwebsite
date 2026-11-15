import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon, makeOutline } from '../../render/materials.js';

// PIZZA RAT, the stage-4 boss: a giant olive-furred sewer rat with huge yellow eyes and an orange scarf, piloting a flying pizza-box drone with four caged rotors, a
// giant slice standing up behind him and a bomb bay full of pepperoni (original: #4b5320 olive body, #e67e22 orange and #7f8c8d grey blobs, #f1c40f eyes).
// rig.pose({ roll, lean, rotor, eye, hatch, flash, glow, t, scale, sq, shakeX, shakeZ, thrust })
const C = { fur: 0x4b5320, furLight: 0x6b7a34, belly: 0x9aa58a, ear: 0xffb3c8, box: 0xd8b078, boxDark: 0xa8804a, red: 0xc0392b, cheese: 0xf1c40f, crust: 0xe67e22, pepp: 0xc0392b, scarf: 0xe67e22, steel: 0x7f8c8d, iron: 0x22222c, tooth: 0xf3ead8 };

export function createBoss04Model() {
  const root = new THREE.Group(); root.name = 'boss4'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 1.0 });
  const eyeMat = createToon({ color: 0xffe14a, emissive: 0xffc21a, emissiveIntensity: 2.2, grime: false, rim: false, tint: false });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const mk = (b, parent, mat = toon, outline = true) => { const m = new THREE.Mesh(b.build(), mat); m.castShadow = true; parent.add(m); if (outline) makeOutline(m, { width: 0.0042 }); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const B = () => new Builder({ ico: true });

  // the pizza-box drone: cardboard deck with a red band and a cheese-yellow logo, an open lid at the back
  const deck = B().box(3.2, 0.42, 3.0, C.box, { p: [0, 0, 0], radius: 0.06, jitter: 0.02, ao: 0.2 }).box(3.3, 0.14, 3.1, C.boxDark, { p: [0, 0.2, 0], radius: 0.03, ao: 0 }).box(3.22, 0.12, 3.02, C.red, { p: [0, -0.02, 0], radius: 0.02, ao: 0 });
  deck.cyl(0.55, 0.55, 0.05, C.cheese, { p: [0, 0.24, 0.3], seg: 14, ao: 0 }).cyl(0.35, 0.35, 0.06, C.red, { p: [0, 0.26, 0.3], seg: 10, ao: 0 });
  for (const sx of [-1, 1]) deck.box(0.3, 0.2, 0.3, C.steel, { p: [sx * 1.45, -0.28, 1.2], radius: 0.04 }).cyl(0.18, 0.18, 0.1, C.cheese, { p: [sx * 1.45, -0.42, 1.2], seg: 8, ao: 0 });
  mk(deck, body);
  const lid = J(body, 0, 0.2, -1.5); mk(B().box(3.2, 0.1, 1.9, C.box, { p: [0, 0, -0.95], radius: 0.04 }).box(3.2, 0.06, 0.14, C.red, { p: [0, 0.05, -1.7], radius: 0.01, ao: 0 }), lid); lid.rotation.x = -1.35;
  // the giant slice standing up behind the rat: cheese triangle, crust on top, pepperoni
  const slice = J(body, 0, 0.3, -1.35); slice.rotation.x = -0.12;
  mk(B().add(new THREE.CylinderGeometry(1.5, 1.5, 0.28, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), C.cheese, { p: [0, 1.5, 0], jitter: 0.03, ao: 0.1 }).box(2.9, 0.5, 0.38, C.crust, { p: [0, 2.9, 0], radius: 0.18, jitter: 0.02, ao: 0 }).cyl(0.34, 0.34, 0.09, C.pepp, { p: [-0.5, 2.1, 0.17], r: [Math.PI / 2, 0, 0], seg: 10, ao: 0 }).cyl(0.4, 0.4, 0.09, C.pepp, { p: [0.45, 1.6, 0.17], r: [Math.PI / 2, 0, 0], seg: 10, ao: 0 }).cyl(0.3, 0.3, 0.09, C.pepp, { p: [0.0, 0.9, 0.17], r: [Math.PI / 2, 0, 0], seg: 10, ao: 0 })
    .capsule(0.12, 0.7, 0xffd84a, { p: [-0.9, 1.0, 0.17] }).capsule(0.1, 0.5, 0xffd84a, { p: [1.0, 1.3, 0.17] }), slice);
  // rotors: four arms with cages and spinning blades
  const rotors = [];
  for (const [x, z] of [[-2.1, 1.7], [2.1, 1.7], [-2.1, -1.5], [2.1, -1.5]]) {
    const arm = B().cyl(0.09, 0.09, Math.hypot(x, z) - 0.9, C.steel, { p: [x / 2, 0.1, z / 2], r: [Math.PI / 2, 0, -Math.atan2(x, z)], seg: 5 });
    mk(arm, body, toon, false);
    const g = J(body, x, 0.4, z); mk(B().add(new THREE.TorusGeometry(0.78, 0.07, 4, 14).rotateX(Math.PI / 2), C.iron, { ao: 0 }).cyl(0.14, 0.14, 0.2, C.iron, { p: [0, -0.05, 0], seg: 6 }), g);
    const bl = J(g, 0, 0.1, 0); mk(B().box(1.4, 0.04, 0.2, 0xcfd8dc, { p: [0, 0, 0], radius: 0.02, ao: 0 }).box(0.2, 0.04, 1.4, 0xcfd8dc, { p: [0, 0, 0], radius: 0.02, ao: 0 }), bl, toon, false); rotors.push(bl);
  }
  // the rat: sitting at the front of the deck
  const rat = J(body, 0, 0.3, 0.55);
  mk(B().sphere(0.78, C.fur, { p: [0, 0.95, -0.1], s: [1, 1.05, 0.9], jitter: 0.05, ao: 0.2 }).sphere(0.52, C.belly, { p: [0, 0.85, 0.38], s: [1, 1, 0.55], ao: 0 })
    .sphere(0.28, C.furLight, { p: [-0.65, 1.3, 0.05], ao: 0 }).sphere(0.26, C.crust, { p: [0.62, 1.55, 0.1], s: [1, 0.8, 1], jitter: 0.03, ao: 0 }), rat);        // body, belly, shoulder patches (grey/orange blobs of the original)
  const head = J(rat, 0, 1.95, 0.1);
  mk(B().sphere(0.62, C.fur, { p: [0, 0, 0], s: [1, 0.95, 1.05], jitter: 0.04 }).sphere(0.3, C.belly, { p: [0, -0.2, 0.62], s: [1, 0.8, 1.2], ao: 0 }).sphere(0.12, C.ear, { p: [0, -0.1, 0.92], ao: 0 })
    .cone(0.05, 0.3, C.tooth, { p: [-0.09, -0.46, 0.8], r: [Math.PI, 0, 0], seg: 4, ao: 0 }).cone(0.05, 0.3, C.tooth, { p: [0.09, -0.46, 0.8], r: [Math.PI, 0, 0], seg: 4, ao: 0 })
    .sphere(0.34, C.fur, { p: [-0.58, 0.55, -0.1], s: [1, 1.15, 0.5], ao: 0 }).sphere(0.22, C.ear, { p: [-0.58, 0.55, 0.0], s: [1, 1.15, 0.4], ao: 0 }).sphere(0.34, C.fur, { p: [0.58, 0.55, -0.1], s: [1, 1.15, 0.5], ao: 0 }).sphere(0.22, C.ear, { p: [0.58, 0.55, 0.0], s: [1, 1.15, 0.4], ao: 0 })
    .box(0.9, 0.03, 0.03, 0xd8d8d8, { p: [-0.55, -0.15, 0.85], r: [0, 0, 0.2], ao: 0 }).box(0.9, 0.03, 0.03, 0xd8d8d8, { p: [0.55, -0.15, 0.85], r: [0, 0, -0.2], ao: 0 }), head);
  const eyeB = B(); for (const s of [-1, 1]) eyeB.sphere(0.27, 0xffffff, { p: [s * 0.27, 0.15, 0.5], s: [1, 1.1, 0.7], ao: 0 });
  mk(eyeB, head, eyeMat, false);
  const pupils = B(); for (const s of [-1, 1]) { pupils.sphere(0.1, 0x120a00, { p: [s * 0.27, 0.15, 0.67], s: [0.6, 1.6, 0.4], ao: 0 }); pupils.box(0.6, 0.12, 0.14, C.fur, { p: [s * 0.27, 0.45, 0.55], r: [0, 0, -s * 0.45], radius: 0.03, ao: 0 }); }
  mk(pupils, head, toon, false);
  const scarf = J(rat, 0, 1.45, 0.1); mk(B().add(new THREE.TorusGeometry(0.58, 0.14, 5, 12).rotateX(Math.PI / 2), C.scarf, { ao: 0 }), scarf);
  const tail1 = J(scarf, 0.5, -0.1, -0.5); mk(B().box(0.2, 0.08, 1.4, C.scarf, { p: [0, 0, -0.7], radius: 0.03, ao: 0 }), tail1);
  for (const s of [-1, 1]) { const arm = J(rat, s * 0.7, 1.15, 0.2); mk(B().capsule(0.17, 0.7, C.fur, { p: [0, 0, 0.35], r: [Math.PI / 2, 0, 0] }).sphere(0.2, C.belly, { p: [0, 0, 0.78], ao: 0 }), arm); arm.rotation.x = 0.2; }
  const tail = J(body, 0, 0.1, -1.3), segs = [];
  { let parent = tail; for (let i = 0; i < 4; i++) { const g = J(parent, 0, 0, -0.55); mk(B().cyl(0.09 - i * 0.012, 0.1 - i * 0.012, 0.62, C.ear, { p: [0, 0, 0], r: [Math.PI / 2, 0, 0], seg: 5, ao: 0 }), g); segs.push(g); parent = g; } }
  // bomb bay under the deck: two hatches and a pepperoni bomb that drops
  const hatchL = J(body, -0.7, -0.25, 0), hatchR = J(body, 0.7, -0.25, 0);
  mk(B().box(0.7, 0.06, 1.2, C.steel, { p: [0.35, 0, 0], radius: 0.01 }), hatchL); mk(B().box(0.7, 0.06, 1.2, C.steel, { p: [-0.35, 0, 0], radius: 0.01 }), hatchR);
  const bomb = J(body, 0, -0.4, 0.1); mk(B().sphere(0.36, C.pepp, { jitter: 0.03 }).sphere(0.1, 0xffd84a, { p: [0, 0.38, 0], ao: 0 }).cyl(0.02, 0.02, 0.25, 0x15151a, { p: [0, 0.55, 0], seg: 3, ao: 0 }), bomb);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 10, 1, true).translate(0, -0.6, 0), flameMat); flame.position.set(0, -0.3, 0); body.add(flame);

  return {
    root, body, toon, eyeMat,
    pose(p) {
      const sq = p.sq || 1, k = 1 / Math.sqrt(sq);
      body.scale.set(k * p.scale, sq * p.scale, k * p.scale); body.rotation.set(p.lean, 0, p.roll || 0); body.position.set(p.shakeX || 0, 0, p.shakeZ || 0);
      rotors.forEach((r, i) => { r.rotation.y = p.t * (6 + 36 * p.rotor) * (i % 2 ? 1 : -1); });
      head.rotation.set(Math.sin(p.t * 1.7) * 0.05 + p.eye * 0.1, Math.sin(p.t * 1.1) * 0.15, 0); scarf.rotation.y = Math.sin(p.t * 3) * 0.1; tail1.rotation.set(0.1 * Math.sin(p.t * 7), 0.3 * Math.sin(p.t * 6), 0);
      segs.forEach((g, i) => { g.rotation.set(0.1 * Math.sin(p.t * 2 - i), 0.4 * Math.sin(p.t * 3 - i * 0.8), 0); });
      hatchL.rotation.z = p.hatch * 1.3; hatchR.rotation.z = -p.hatch * 1.3; bomb.visible = p.hatch < 0.9; bomb.position.y = -0.4 - p.hatch * 0.1;
      slice.rotation.x = -0.12 + Math.sin(p.t * 2) * 0.03; lid.rotation.x = -1.35 + Math.sin(p.t * 5) * 0.03 * p.rotor;
      flame.scale.set(1, Math.max(0.15, p.thrust * (0.85 + 0.2 * Math.sin(p.t * 38))), 1); flameMat.opacity = Math.min(1, 0.3 + p.thrust * 0.5);
      eyeMat.color.setRGB(1, 0.88 - 0.62 * p.eye, 0.29 - 0.25 * p.eye); eyeMat.emissive.copy(eyeMat.color); eyeMat.emissiveIntensity = 1.8 + p.eye * 2.4 + (p.flash > 0 ? 2 : 0);
      toon.emissive.setRGB(p.glow, p.glow * 0.6, p.glow * 0.2); toon.emissiveIntensity = Math.max(p.flash, p.glow);
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
}
