import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { createToon, makeOutline } from '../render/materials.js';
import { createHorse } from './horseModel.js';
import { createAnimator } from './playerAnim.js';

// Cowboy Clean: merged primitives with vertex colours on a small joint hierarchy.
// Faces -Z (down the track). Feet at y = 0, about 1.8 m to the hat top. Look follows the original
// sprite: white shirt, dark trousers, brown boots + big brown hat, yellow hair, blue spray gun;
// plus the bandana and vest from PLAN 4 and a soap tank on the back (the camera sees his back).
const C = {
  skin: 0xf2b894, shirt: 0xf6f2ea, vest: 0x2597b8, vestTrim: 0xffd23a, pants: 0x44558c, boot: 0x8a5230, sole: 0x3a2414,
  belt: 0x4a2c18, buckle: 0xffd23a, hat: 0xbb7c44, hatCrown: 0x9a622f, band: 0x2a1a10, bandana: 0x2fd6c8, hair: 0xf1c40f,
  tank: 0xf4f6f8, tankBand: 0x3498db, hose: 0x2c3e50, gun: 0xffffff, nozzle: 0xecf0f1, dark: 0x1a1218, glove: 0xc9854e,
};

export function createPlayerModel() {
  const root = new THREE.Group(); root.name = 'player';
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 0.8 });
  const gunMat = createToon({ color: 0x3498db, grime: false, emissive: 0x000000 });
  const glowMat = createToon({ color: 0x34dbcc, emissive: 0x34dbcc, emissiveIntensity: 1.4, grime: false, rim: false, tint: false });
  const meshes = [], outlines = [];
  const mk = (b, parent, o = {}) => {
    const m = new THREE.Mesh(b.build ? b.build() : b, o.mat || toon);
    m.castShadow = o.shadow !== false; m.receiveShadow = false; parent.add(m);
    if (o.outline !== false) outlines.push(makeOutline(m, { width: o.width }));
    meshes.push(m); return m;
  };
  const J = (name, parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };

  // ---- joints ----
  const body = J('body', root);                       // squash & stretch pivot at the feet
  const hips = J('hips', body, 0, 0.74, 0);
  const torso = J('torso', hips, 0, 0.04, 0);
  const head = J('head', torso, 0, 0.5, 0);
  const hat = J('hat', head, 0, 0.1, 0);
  const tail = J('bandanaTail', head, 0, -0.12, 0.2);
  const shL = J('shoulderL', torso, -0.3, 0.42, 0), elL = J('elbowL', shL, 0, -0.27, 0);
  const shR = J('shoulderR', torso, 0.3, 0.42, 0), elR = J('elbowR', shR, 0, -0.27, 0);
  const hipL = J('hipL', hips, -0.13, 0, 0), knL = J('kneeL', hipL, 0, -0.37, 0);
  const hipR = J('hipR', hips, 0.13, 0, 0), knR = J('kneeR', hipR, 0, -0.37, 0);
  const gun = J('gun', elR, 0, -0.26, 0);

  // ---- pelvis + belt ----
  mk(new Builder()
    .box(0.4, 0.2, 0.26, C.pants, { p: [0, -0.04, 0] })
    .box(0.43, 0.07, 0.29, C.belt, { p: [0, 0.07, 0] })
    .box(0.1, 0.075, 0.03, C.buckle, { p: [0, 0.07, -0.15] })
    .box(0.1, 0.16, 0.08, C.belt, { p: [-0.23, -0.05, -0.02] }), hips);

  // ---- torso: shirt, vest, soap tank on the back ----
  const tb = new Builder()
    .box(0.5, 0.52, 0.3, C.shirt, { p: [0, 0.22, 0] })
    .box(0.52, 0.3, 0.32, C.vest, { p: [0, 0.14, 0] })               // vest, lower
    .box(0.19, 0.4, 0.33, C.vest, { p: [-0.155, 0.28, 0] })           // vest panels either side
    .box(0.19, 0.4, 0.33, C.vest, { p: [0.155, 0.28, 0] })
    .box(0.04, 0.46, 0.335, C.vestTrim, { p: [-0.065, 0.26, 0], radius: 0.01 })
    .box(0.04, 0.46, 0.335, C.vestTrim, { p: [0.065, 0.26, 0], radius: 0.01 })
    .box(0.26, 0.1, 0.1, C.shirt, { p: [0, 0.5, -0.12] })              // open collar
    .cyl(0.09, 0.09, 0.4, C.tank, { p: [-0.11, 0.26, 0.26], seg: 12 }) // two soap tanks
    .cyl(0.09, 0.09, 0.4, C.tank, { p: [0.11, 0.26, 0.26], seg: 12 })
    .cyl(0.095, 0.095, 0.08, C.tankBand, { p: [-0.11, 0.26, 0.26], seg: 12 })
    .cyl(0.095, 0.095, 0.08, C.tankBand, { p: [0.11, 0.26, 0.26], seg: 12 })
    .sphere(0.075, C.tankBand, { p: [-0.11, 0.49, 0.26], s: [1, 0.7, 1] })
    .sphere(0.075, C.tankBand, { p: [0.11, 0.49, 0.26], s: [1, 0.7, 1] })
    .box(0.36, 0.05, 0.05, C.belt, { p: [0, 0.1, 0.19] })
    .sphere(0.05, C.shirt, { p: [0, 0.18, 0.34] })                       // a little bubble badge on the tank strap
    .cyl(0.014, 0.014, 0.42, C.hose, { p: [0.2, 0.0, 0.2], r: [0.2, 0, -0.25] });
  mk(tb, torso);

  // ---- head: face, hair, ears; bandana pulled over the nose ----
  const hb = new Builder()
    .sphere(0.215, C.skin, { p: [0, 0.2, 0], s: [1, 1.02, 0.98] })
    .box(0.1, 0.06, 0.05, C.skin, { p: [0, 0.18, -0.2], radius: 0.02 })       // nose
    .box(0.06, 0.06, 0.04, C.skin, { p: [-0.22, 0.2, 0.0] }).box(0.06, 0.06, 0.04, C.skin, { p: [0.22, 0.2, 0.0] })
    .sphere(0.028, C.dark, { p: [-0.085, 0.26, -0.185], s: [0.9, 1.3, 0.5] }).sphere(0.028, C.dark, { p: [0.085, 0.26, -0.185], s: [0.9, 1.3, 0.5] })
    .sphere(0.012, C.shirt, { p: [-0.08, 0.275, -0.205] }).sphere(0.012, C.shirt, { p: [0.09, 0.275, -0.205] })
    .box(0.4, 0.2, 0.33, C.bandana, { p: [0, 0.095, -0.025], radius: 0.07 })     // bandana over the lower face
    .box(0.43, 0.05, 0.36, C.bandana, { p: [0, 0.2, 0.01], radius: 0.02 })        // knot band around the head
    .sphere(0.13, C.hair, { p: [-0.13, 0.22, 0.14] }).sphere(0.13, C.hair, { p: [0.13, 0.22, 0.14] })
    .sphere(0.16, C.hair, { p: [0, 0.16, 0.17] }).sphere(0.1, C.hair, { p: [0, 0.03, 0.2] })
    .sphere(0.07, C.hair, { p: [0.2, 0.17, 0.1] }).sphere(0.07, C.hair, { p: [-0.2, 0.17, 0.1] });
  mk(hb, head);
  // goggle lenses on the hat brim glow (feeds bloom)
  const gb = new Builder().cyl(0.065, 0.065, 0.03, C.bandana, { p: [-0.1, 0.36, -0.3], r: [Math.PI / 2 - 0.3, 0, 0], seg: 14, ao: 0 })
    .cyl(0.065, 0.065, 0.03, C.bandana, { p: [0.1, 0.36, -0.3], r: [Math.PI / 2 - 0.3, 0, 0], seg: 14, ao: 0 });
  mk(gb, head, { mat: glowMat, outline: false, shadow: false });
  // hat: wide brim with a curl, tall crown with a pinch, dark band, goggle strap
  const hatB = new Builder()
    .cyl(0.5, 0.52, 0.045, C.hat, { p: [0, 0.2, 0], seg: 20 })
    .cyl(0.46, 0.5, 0.04, C.hat, { p: [0, 0.22, 0], seg: 20 })
    .box(0.1, 0.07, 0.5, C.hat, { p: [-0.5, 0.245, 0], r: [0, 0, 0.45], radius: 0.03 })     // brim curls up at the sides
    .box(0.1, 0.07, 0.5, C.hat, { p: [0.5, 0.245, 0], r: [0, 0, -0.45], radius: 0.03 })
    .cyl(0.26, 0.3, 0.26, C.hatCrown, { p: [0, 0.36, 0], seg: 16 })
    .cyl(0.2, 0.26, 0.12, C.hatCrown, { p: [0, 0.54, 0], seg: 16 })
    .box(0.16, 0.05, 0.4, C.hat, { p: [0, 0.6, 0], radius: 0.02 })
    .cyl(0.305, 0.31, 0.07, C.band, { p: [0, 0.27, 0], seg: 16 })
    .box(0.07, 0.07, 0.02, C.buckle, { p: [0, 0.27, -0.31], radius: 0.01 });
  hatB.parts.forEach((g) => g.translate(0, 0.08, 0));
  mk(hatB, hat);
  // bandana knot tails (flutter)
  mk(new Builder().box(0.12, 0.22, 0.04, C.bandana, { p: [-0.07, -0.1, 0], r: [0.1, 0, 0.2], radius: 0.015 })
    .box(0.12, 0.26, 0.04, C.bandana, { p: [0.08, -0.12, 0], r: [0.1, 0, -0.25], radius: 0.015 })
    .sphere(0.07, C.bandana, { p: [0, 0.02, -0.01] }), tail);
  tail.position.set(0, 0.2, 0.2);

  // ---- arms ----
  const armUp = (side) => new Builder().capsule(0.075, 0.2, C.shirt, { p: [0, -0.13, 0] })
    .sphere(0.1, C.vest, { p: [0, 0.01, 0], s: [1.1, 0.9, 1.1] });
  mk(armUp(-1), shL); mk(armUp(1), shR);
  const foreArm = (g) => new Builder().capsule(0.065, 0.14, C.shirt, { p: [0, -0.12, 0] })
    .box(0.13, 0.05, 0.13, C.belt, { p: [0, -0.215, 0], radius: 0.02 })
    .sphere(0.075, g, { p: [0, -0.28, 0] });
  mk(foreArm(C.skin), elL); mk(foreArm(C.skin), elR);

  // ---- legs ----
  const thigh = () => new Builder().capsule(0.095, 0.22, C.pants, { p: [0, -0.19, 0] });
  const shin = () => new Builder().capsule(0.085, 0.14, C.pants, { p: [0, -0.15, 0] })
    .cyl(0.115, 0.12, 0.21, C.boot, { p: [0, -0.27, 0] })                                  // boot shaft
    .box(0.17, 0.09, 0.32, C.boot, { p: [0, -0.355, -0.06] })                               // foot
    .box(0.17, 0.04, 0.32, C.sole, { p: [0, -0.4, -0.06], radius: 0.015 })                   // sole
    .box(0.17, 0.05, 0.08, C.sole, { p: [0, -0.375, 0.06], radius: 0.015 });                 // heel
  mk(thigh(), hipL); mk(thigh(), hipR); mk(shin(), knL); mk(shin(), knR);

  // ---- spray gun in the right hand ----
  const gunBody = new Builder().box(0.13, 0.17, 0.42, 0xffffff, { p: [0, 0.0, -0.3], radius: 0.05 })
    .cyl(0.045, 0.05, 0.2, 0xffffff, { p: [0, 0.02, -0.58], r: [Math.PI / 2, 0, 0], seg: 10 });
  const gunTrim = new Builder().cyl(0.035, 0.05, 0.12, C.nozzle, { p: [0, 0.02, -0.72], r: [Math.PI / 2, 0, 0], seg: 10 })
    .box(0.05, 0.12, 0.05, C.dark, { p: [0, -0.14, -0.2], r: [0.3, 0, 0], radius: 0.015 })       // grip
    .box(0.03, 0.08, 0.04, C.nozzle, { p: [0, -0.07, -0.34], radius: 0.01 })                      // trigger guard
    .box(0.06, 0.07, 0.14, C.nozzle, { p: [0, 0.12, -0.28], radius: 0.02 });                      // top rail
  mk(gunBody, gun, { mat: gunMat }); mk(gunTrim, gun);
  const nozzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), glowMat); nozzleGlow.position.set(0, 0.02, -0.79); gun.add(nozzleGlow);
  const muzzle = J('muzzle', gun, 0, 0.02, -0.82);
  gun.position.set(0, -0.3, 0); gun.rotation.x = -Math.PI / 2 + 0.1;  // barrel points forward when the forearm hangs

  const horse = createHorse({ toon, glowMat, mk, J });
  horse.group.visible = false; root.add(horse.group);

  const joints = { root, body, hips, torso, head, hat, tail, shL, elL, shR, elR, hipL, knL, hipR, knR, gun, muzzle };
  const model = {
    group: root, joints, meshes, outlines, horse, mats: { toon, gun: gunMat, glow: glowMat },
    vehicle: false, tint: { sup: false, laser: false },
    // Upgrades & power state that change the look
    setVehicle(on) { model.vehicle = on; horse.group.visible = on; },
    setWeaponTint({ sup = false, laser = false } = {}) {
      gunMat.color.set(sup ? 0xe74c3c : laser ? 0xff00cc : 0x3498db);
      gunMat.emissive.set(sup ? 0xff2a1a : laser ? 0xff00cc : 0x000000); gunMat.emissiveIntensity = sup || laser ? 1.1 : 0;
      glowMat.color.set(laser ? 0xff00cc : 0x34dbcc); glowMat.emissive.copy(glowMat.color);
    },
    setScale(s) { root.scale.setScalar(s); },                       // "size" upgrade
    flash(amount, color = 0xffffff) { toon.emissive.set(color); toon.emissiveIntensity = amount; gunMat.emissiveIntensity = Math.max(gunMat.emissiveIntensity, amount); },
    muzzleWorld(out = new THREE.Vector3()) { root.updateWorldMatrix(true, false); return muzzle.getWorldPosition(out); },
  };
  model.anim = createAnimator(model);
  return model;
}
