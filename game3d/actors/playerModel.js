import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { createToon, makeOutline } from '../render/materials.js';
import { createHorse } from './horseModel.js';
import { createAnimator } from './playerAnim.js';

// Cowboy Clean (PLAN 4.2): merged primitives with vertex colours on a small joint hierarchy. Faces -Z (down the track),
// feet at y = 0, about 1.8 m to the hat top. Black button-up shirt (collar, small buttons), big gold oval belt buckle,
// black bell-bottom jeans flaring over black boots, bare face with blue eyes, long curly hair, cowboy hat, hand-held
// spray gun. No bandana, vest, goggles or tanks; the soap pack is built but hidden until setBackpack(true).
// The black outfit has its own material (lifted emissive, strong rim) and a pale outline so it reads against dusk and shadow.
const C = {
  skin: 0xf2b894, shirt: 0x1a1a22, shirtHi: 0x34343f, pants: 0x181820, pantsHi: 0x2e2e38, boot: 0x121218, bootHi: 0x30303c, sole: 0x07070a,
  belt: 0x4a2c18, buckle: 0xffd23a, buckleDark: 0xb8860b, buckleHi: 0xfff0a0, hat: 0xbb7c44, hatCrown: 0x9a622f, band: 0x2a1a10, hair: 0xf1c40f,
  button: 0xc8cde0, eye: 0xffffff, iris: 0x2f8fe8, brow: 0x6a4a1c, mouth: 0x8a3030,
  tank: 0xf4f6f8, tankBand: 0x3498db, hose: 0x2c3e50, nozzle: 0xecf0f1, dark: 0x1a1218,
};
const GOLD = new THREE.Color(C.buckle), GOLDDK = new THREE.Color(C.buckleDark), GOLDHI = new THREE.Color(C.buckleHi);
const OUTLINE_LIGHT = 0x9a8cb6;   // pale lavender line round the black clothes

export function createPlayerModel() {
  const root = new THREE.Group(); root.name = 'player';
  const toon = createToon({ vertexColors: true, grime: false });
  const outfit = createToon({ vertexColors: true, grime: false, emissive: 0x10101a, rimBoost: 2.0 });
  const gunMat = createToon({ color: 0x3498db, vertexColors: true, grime: false, emissive: 0x000000 });   // vertex colours x the powerup tint: body, nozzle and grip in ONE mesh
  const glowMat = createToon({ color: 0x34dbcc, emissive: 0x34dbcc, emissiveIntensity: 1.4, grime: false, rim: false, tint: false });
  const meshes = [], outlines = [];
  const mk = (b, parent, o = {}) => {
    const m = new THREE.Mesh(b.build ? b.build() : b, o.mat || toon);
    m.castShadow = o.shadow !== false; m.receiveShadow = false; parent.add(m);
    if (o.outline !== false) outlines.push(makeOutline(m, { width: o.width, color: o.mat === outfit ? OUTLINE_LIGHT : undefined }));
    meshes.push(m); return m;
  };
  const J = (name, parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };

  // ---- joints ----
  const body = J('body', root);                       // squash & stretch pivot at the feet
  const hips = J('hips', body, 0, 0.74, 0);
  const torso = J('torso', hips, 0, 0.04, 0);
  const head = J('head', torso, 0, 0.5, 0);
  const hat = J('hat', head, 0, 0.1, 0);
  const tail = J('hairTail', head, 0, -0.12, 0.2);     // loose curls at the back of the head that swing as he runs
  const shL = J('shoulderL', torso, -0.3, 0.42, 0), elL = J('elbowL', shL, 0, -0.27, 0);
  const shR = J('shoulderR', torso, 0.3, 0.42, 0), elR = J('elbowR', shR, 0, -0.27, 0);
  const hipL = J('hipL', hips, -0.13, 0, 0), knL = J('kneeL', hipL, 0, -0.37, 0);
  const hipR = J('hipR', hips, 0.13, 0, 0), knR = J('kneeR', hipR, 0, -0.37, 0);
  const gun = J('gun', elR, 0, -0.26, 0);

  // ---- pelvis: black jeans, belt, the big gold oval buckle ----
  mk(new Builder().box(0.4, 0.2, 0.26, C.pants, { p: [0, -0.04, 0] })
    .box(0.43, 0.07, 0.29, C.belt, { p: [0, 0.07, 0] })
    .box(0.025, 0.07, 0.3, 0x2a1a10, { p: [-0.15, 0.07, 0], ao: 0 }).box(0.025, 0.07, 0.3, 0x2a1a10, { p: [0.15, 0.07, 0], ao: 0 })
    // the big gold oval buckle: vertex colours above 1.0 make it glow a little (bloom) without its own material or draw call
    .sphere(1, GOLD.clone().multiplyScalar(1.5), { p: [0, 0.07, -0.158], s: [0.135, 0.098, 0.028], ao: 0 })
    .sphere(1, GOLDDK.clone().multiplyScalar(1.35), { p: [0, 0.07, -0.167], s: [0.1, 0.066, 0.028], ao: 0 })
    .sphere(1, GOLD.clone().multiplyScalar(1.7), { p: [0, 0.07, -0.174], s: [0.062, 0.04, 0.028], ao: 0 })
    .sphere(1, GOLDHI.clone().multiplyScalar(1.8), { p: [-0.02, 0.082, -0.184], s: [0.02, 0.012, 0.01], ao: 0 }), hips, { mat: outfit });
  // ---- torso: black button-up shirt with collar, placket, small buttons, pockets ----
  const tb = new Builder().box(0.5, 0.52, 0.3, C.shirt, { p: [0, 0.22, 0] })
    .box(0.055, 0.5, 0.012, C.shirtHi, { p: [0, 0.22, -0.152], radius: 0.004, ao: 0 })        // placket
    .box(0.012, 0.46, 0.012, C.shirtHi, { p: [0, 0.22, 0.152], radius: 0.004, ao: 0 })          // back seam
    .box(0.4, 0.014, 0.012, C.shirtHi, { p: [0, 0.38, 0.152], radius: 0.004, ao: 0 })           // back yoke
    .box(0.28, 0.07, 0.07, C.shirtHi, { p: [0, 0.5, 0.115], radius: 0.02 });                    // collar band at the back of the neck
  for (const sd of [-1, 1]) tb.box(0.15, 0.09, 0.05, C.shirtHi, { p: [sd * 0.085, 0.5, -0.125], r: [0.2, 0, sd * 0.6], radius: 0.015 })   // collar points
    .box(0.12, 0.1, 0.012, C.shirtHi, { p: [sd * 0.13, 0.33, -0.153], radius: 0.006, ao: 0 }).box(0.12, 0.03, 0.016, C.shirt, { p: [sd * 0.13, 0.375, -0.154], radius: 0.006, ao: 0 });   // chest pockets
  for (let i = 0; i < 5; i++) tb.sphere(0.02, C.button, { p: [0, 0.44 - i * 0.1, -0.16], s: [1, 1, 0.55], ao: 0 });
  mk(tb, torso, { mat: outfit });

  // ---- head: bare face, blue eyes, brows, mouth; long curly hair ----
  const hb = new Builder()
    .sphere(0.215, C.skin, { p: [0, 0.2, 0], s: [1, 1.02, 0.98] })
    .box(0.1, 0.06, 0.05, C.skin, { p: [0, 0.18, -0.2], radius: 0.02 })       // nose
    .box(0.06, 0.06, 0.04, C.skin, { p: [-0.22, 0.2, 0.0] }).box(0.06, 0.06, 0.04, C.skin, { p: [0.22, 0.2, 0.0] })   // ears
    .box(0.1, 0.1, 0.1, C.skin, { p: [0, -0.01, -0.02], radius: 0.03 })       // neck
    .box(0.075, 0.016, 0.014, C.mouth, { p: [0, 0.095, -0.205], radius: 0.005, ao: 0 })                              // mouth, with a small smile
    .box(0.03, 0.014, 0.014, C.mouth, { p: [-0.045, 0.104, -0.2], r: [0, 0.3, -0.5], radius: 0.004, ao: 0 }).box(0.03, 0.014, 0.014, C.mouth, { p: [0.045, 0.104, -0.2], r: [0, -0.3, 0.5], radius: 0.004, ao: 0 });
  for (const sd of [-1, 1]) hb.sphere(0.046, C.eye, { p: [sd * 0.088, 0.235, -0.172], s: [1, 1.15, 0.5], ao: 0 })
    .sphere(0.03, C.iris, { p: [sd * 0.088, 0.233, -0.19], s: [1, 1.1, 0.5], ao: 0 })
    .sphere(0.014, C.dark, { p: [sd * 0.088, 0.233, -0.2], s: [1, 1, 0.5], ao: 0 })
    .sphere(0.008, 0xffffff, { p: [sd * 0.098, 0.245, -0.205], ao: 0 })
    .box(0.08, 0.02, 0.02, C.brow, { p: [sd * 0.088, 0.292, -0.183], r: [0, 0, sd * 0.14], radius: 0.006, ao: 0 });  // eyebrows
  hb.sphere(0.13, C.hair, { p: [-0.13, 0.22, 0.14] }).sphere(0.13, C.hair, { p: [0.13, 0.22, 0.14] })
    .sphere(0.16, C.hair, { p: [0, 0.16, 0.17] }).sphere(0.1, C.hair, { p: [0, 0.03, 0.2] })
    .sphere(0.07, C.hair, { p: [0.2, 0.17, 0.1] }).sphere(0.07, C.hair, { p: [-0.2, 0.17, 0.1] });
  mk(hb, head);
  // hat: wide brim with a curl, tall crown with a pinch, dark band (unchanged shape)
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
  // loose curls that swing
  mk(new Builder().sphere(0.085, C.hair, { p: [-0.07, 0.02, 0] }).sphere(0.085, C.hair, { p: [0.07, 0.02, 0.01] }).sphere(0.09, C.hair, { p: [0, -0.07, 0.02] })
    .sphere(0.07, C.hair, { p: [-0.05, -0.15, 0.02] }).sphere(0.065, C.hair, { p: [0.05, -0.16, 0.03] }), tail, { outline: false });
  tail.position.set(0, 0.2, 0.2);

  // ---- arms: black sleeves with a button cuff, bare hands ----
  const armUp = () => new Builder().capsule(0.075, 0.2, C.shirt, { p: [0, -0.13, 0] }).sphere(0.1, C.shirt, { p: [0, 0.01, 0], s: [1.1, 0.9, 1.1] });
  mk(armUp(), shL, { mat: outfit }); mk(armUp(), shR, { mat: outfit });
  const foreArm = () => new Builder().capsule(0.065, 0.14, C.shirt, { p: [0, -0.12, 0] })
    .box(0.14, 0.05, 0.14, C.shirtHi, { p: [0, -0.215, 0], radius: 0.02 }).sphere(0.016, C.button, { p: [0, -0.215, -0.07], ao: 0 })
    .sphere(0.075, C.skin, { p: [0, -0.28, 0] });                                    // bare hand (one mesh with the sleeve: fewer draw calls)
  mk(foreArm(), elL, { mat: outfit }); mk(foreArm(), elR, { mat: outfit });

  // ---- legs: bell-bottom jeans flaring over the boots ----
  const thigh = () => new Builder().capsule(0.095, 0.22, C.pants, { p: [0, -0.19, 0] });
  const shin = () => new Builder().capsule(0.085, 0.14, C.pants, { p: [0, -0.15, 0] })
    .cyl(0.1, 0.2, 0.3, C.pants, { p: [0, -0.24, 0], seg: 12 })                             // the flare
    .cyl(0.2, 0.205, 0.04, C.pantsHi, { p: [0, -0.375, 0], seg: 12, ao: 0 })                 // stitched hem
    .box(0.17, 0.09, 0.4, C.boot, { p: [0, -0.355, -0.1], radius: 0.04 })                    // boot, toe pokes out of the flare
    .box(0.15, 0.04, 0.12, C.bootHi, { p: [0, -0.33, -0.24], radius: 0.015, ao: 0 })         // toe cap
    .box(0.17, 0.04, 0.4, C.sole, { p: [0, -0.4, -0.1], radius: 0.015 });
  mk(thigh(), hipL, { mat: outfit }); mk(thigh(), hipR, { mat: outfit }); mk(shin(), knL, { mat: outfit }); mk(shin(), knR, { mat: outfit });

  // ---- optional soap pack (hidden at the start, a later upgrade turns it on) ----
  const pack = J('pack', torso); pack.visible = false;
  mk(new Builder().cyl(0.09, 0.09, 0.4, C.tank, { p: [-0.11, 0.26, 0.26], seg: 12 }).cyl(0.09, 0.09, 0.4, C.tank, { p: [0.11, 0.26, 0.26], seg: 12 })
    .cyl(0.095, 0.095, 0.08, C.tankBand, { p: [-0.11, 0.26, 0.26], seg: 12 }).cyl(0.095, 0.095, 0.08, C.tankBand, { p: [0.11, 0.26, 0.26], seg: 12 })
    .sphere(0.075, C.tankBand, { p: [-0.11, 0.49, 0.26], s: [1, 0.7, 1] }).sphere(0.075, C.tankBand, { p: [0.11, 0.49, 0.26], s: [1, 0.7, 1] })
    .box(0.36, 0.05, 0.05, C.belt, { p: [0, 0.1, 0.19] }).cyl(0.014, 0.014, 0.42, C.hose, { p: [0.2, 0.0, 0.2], r: [0.2, 0, -0.25] }), pack);

  // ---- spray gun in the right hand ----
  const gunB = new Builder().box(0.13, 0.17, 0.42, 0xffffff, { p: [0, 0.0, -0.3], radius: 0.05 })
    .cyl(0.045, 0.05, 0.2, 0xffffff, { p: [0, 0.02, -0.58], r: [Math.PI / 2, 0, 0], seg: 10 })
    .cyl(0.035, 0.05, 0.12, 0xecf0f1, { p: [0, 0.02, -0.72], r: [Math.PI / 2, 0, 0], seg: 10 })
    .box(0.05, 0.12, 0.05, 0x3a3038, { p: [0, -0.14, -0.2], r: [0.3, 0, 0], radius: 0.015 })       // grip
    .box(0.03, 0.08, 0.04, 0xdfe6ea, { p: [0, -0.07, -0.34], radius: 0.01 })                        // trigger guard
    .box(0.06, 0.07, 0.14, 0xdfe6ea, { p: [0, 0.12, -0.28], radius: 0.02 });                        // top rail
  mk(gunB, gun, { mat: gunMat, outline: false });
  const nozzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), glowMat); nozzleGlow.position.set(0, 0.02, -0.79); gun.add(nozzleGlow);
  const muzzle = J('muzzle', gun, 0, 0.02, -0.82);
  gun.position.set(0, -0.3, 0); gun.rotation.x = -Math.PI / 2 + 0.1;  // barrel points forward when the forearm hangs

  const horse = createHorse({ toon, glowMat, mk, J });
  horse.group.visible = false; root.add(horse.group);

  const joints = { root, body, hips, torso, head, hat, tail, pack, shL, elL, shR, elR, hipL, knL, hipR, knR, gun, muzzle };
  const model = {
    group: root, joints, meshes, outlines, horse, mats: { toon, outfit, gun: gunMat, glow: glowMat },
    vehicle: false, tint: { sup: false, laser: false },
    // Upgrades & power state that change the look
    setVehicle(on) { model.vehicle = on; horse.group.visible = on; },
    setBackpack(on) { pack.visible = !!on; },                      // soap tanks + hose: off by default (later upgrade)
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
