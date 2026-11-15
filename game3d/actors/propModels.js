import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { createToon } from '../render/materials.js';

// Models for the things the player runs into and picks up: coins, soap crates, power-up bubbles and the stage's
// rolling obstacle. One merged vertex-coloured geometry each, drawn through actors/instanced.js batches.
// Obstacle recipes are keyed by the `obstacle` field in data/stages.js; a stage without a recipe gets the grey-box shape.
export const pickupMaterial = () => createToon({ vertexColors: true, grime: false, rimStrength: 0.8 });
export const coinMaterial = () => createToon({ vertexColors: true, grime: false, emissive: 0xffa800, emissiveIntensity: 0.9, rim: false, tint: false });

export const coinGeo = () => new Builder()
  .cyl(0.3, 0.3, 0.07, 0xffc21a, { seg: 16, r: [0, 0, Math.PI / 2], ao: 0.1 }).cyl(0.2, 0.2, 0.09, 0xffe680, { seg: 16, r: [0, 0, Math.PI / 2], ao: 0 })
  .cyl(0.3, 0.3, 0.1, 0xd99a10, { seg: 16, r: [0, 0, Math.PI / 2], s: [1, 0.55, 1], ao: 0 }).build();

// A soap crate: yellow wooden box, wood bands, a soap label with bubbles. Base at y = 0, 1 m cube.
export const crateGeo = () => new Builder()
  .box(1, 1, 1, 0xf1c40f, { p: [0, 0.5, 0], radius: 0.08 }).box(1.04, 0.14, 1.04, 0x8a5a33, { p: [0, 0.12, 0], radius: 0.03 }).box(1.04, 0.14, 1.04, 0x8a5a33, { p: [0, 0.88, 0], radius: 0.03 })
  .box(0.06, 1.02, 0.06, 0x8a5a33, { p: [0.47, 0.5, 0.47], radius: 0.02 }).box(0.06, 1.02, 0.06, 0x8a5a33, { p: [-0.47, 0.5, 0.47], radius: 0.02 })
  .box(0.62, 0.34, 0.04, 0xffffff, { p: [0, 0.5, 0.52], radius: 0.04, ao: 0 }).sphere(0.1, 0x7fd8ff, { p: [-0.12, 0.5, 0.56], s: [1, 1, 0.4], ao: 0 }).sphere(0.07, 0xff9ad5, { p: [0.14, 0.55, 0.56], s: [1, 1, 0.4], ao: 0 })
  .sphere(0.05, 0xffffff, { p: [0.05, 0.4, 0.57], s: [1, 1, 0.4], ao: 0 }).build();

// Sand pile (original: a yellow #f1c40f heap with #d35400 shading dots). 1.8 m long and wide, 0.9 m tall = its hit box.
export const sandPile = {
  build: () => {
    const b = new Builder().sphere(0.9, 0xf1c40f, { p: [0, 0, 0], jitter: 0.1, ao: 0.12 }).sphere(0.55, 0xf7d84a, { p: [-0.15, 0.2, 0.25], jitter: 0.1, ao: 0 })
      .sphere(0.4, 0xf39c12, { p: [0.4, 0.05, -0.3], jitter: 0.1, ao: 0.05 });
    for (const [x, y, z, r] of [[-0.5, 0.42, 0.45, 0.09], [0.25, 0.62, 0.3, 0.07], [0.62, 0.28, 0.5, 0.1], [-0.2, 0.7, -0.15, 0.08], [0.05, 0.2, 0.82, 0.07], [-0.7, 0.2, -0.3, 0.08]]) b.sphere(r, 0xd35400, { p: [x, y, z], s: [1, 0.6, 1], ao: 0 });
    b.cone(0.07, 0.35, 0xc9a24a, { p: [0.35, 0.82, 0.1], r: [0, 0, 0.5], seg: 4, ao: 0 }).cone(0.06, 0.28, 0xc9a24a, { p: [0.3, 0.78, 0.15], r: [0.3, 0, -0.3], seg: 4, ao: 0 });   // a dry twig caught in it
    return b.build();
  },
  rock: 0.32, dust: true,
};

// Log (original: a #5d4037 end-on circle with bark ridges and a #795548 core): a fat mossy log lying across the path, rolled end over end.
// Authored on the same unit extents as the sand pile (0.9 half-length, 0.9 tall) and scaled by the obstacle's hit box, so it ends up 2.4 m wide, 1 m tall.
export const log = {
  build: () => {
    const g = new THREE.CylinderGeometry(0.9, 0.9, 1.8, 14).rotateZ(Math.PI / 2);
    const b = new Builder().add(g, 0x5d4037, { p: [0, 0.45, 0], s: [1, 0.5, 1], jitter: 0.02, ao: 0.12 });
    for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.88, 0.88, 0.06, 14).rotateZ(Math.PI / 2), 0xc9a672, { p: [s * 0.9, 0.45, 0], s: [1, 0.5, 1], ao: 0 }).add(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 12).rotateZ(Math.PI / 2), 0x8d6e63, { p: [s * 0.92, 0.45, 0], s: [1, 0.5, 1], ao: 0 });   // cut ends with rings
    for (const x of [-0.45, 0.1, 0.55]) b.add(new THREE.TorusGeometry(0.9, 0.04, 4, 14).rotateY(Math.PI / 2), 0x3e2723, { p: [x, 0.45, 0], s: [1, 0.5, 1], ao: 0 });        // bark ridges
    b.sphere(0.4, 0x3f8a44, { p: [-0.3, 0.88, 0.1], s: [1.4, 0.35, 1.1], ao: 0, jitter: 0.04 }).sphere(0.3, 0x58d27a, { p: [0.4, 0.84, -0.15], s: [1.3, 0.3, 1], ao: 0, jitter: 0.04 });   // moss
    for (const [x, z] of [[0.2, 0.3], [-0.6, -0.2]]) b.cyl(0.03, 0.05, 0.2, 0xe9f6d4, { p: [x, 0.95, z], seg: 4, ao: 0 });
    return b.build();
  },
  rock: 0.1, dust: false,
};

// Barrel (original: a purple #8e44ad drum with lighter bands and a green toxic symbol, rolling): a toxic drum lying on its side that ROLLS toward you.
// Authored centred on its own origin (m.lift raises it by its radius) and squashed on y / z so that after the obstacle's scale (hx .55, h 1.0, hs .55) it is
// a true cylinder 1.1 m long and 1.0 m across; the batch's pitch then turns it about the lateral axis.
export const barrel = {
  build: () => {
    const cyl = (r, len, seg = 14) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2), sy = 0.45 / 0.5, sz = 0.818 / 0.5, S = [1, sy, sz];
    const b = new Builder().add(cyl(1, 1.8), 0x8e44ad, { s: S, jitter: 0.01, ao: 0 });
    for (const x of [-0.62, 0, 0.62]) b.add(cyl(1.04, 0.16), 0xc58ae0, { p: [x, 0, 0], s: S, ao: 0 });                                  // hoops
    for (const sg of [-1, 1]) b.add(cyl(0.96, 0.08), 0x5b2c6f, { p: [sg * 0.9, 0, 0], s: S, ao: 0 });                                   // rims
    b.add(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 14).rotateZ(Math.PI / 2), new THREE.Color(0.5, 3, 0.8), { p: [0.04, 0, 0.0], s: [1, 1.3, 1.6], r: [0, 0, 0], ao: 0 });
    b.cyl(0.08, 0.08, 0.3, 0x2ecc71, { p: [0.0, 0.52, 0], seg: 5, ao: 0 });
    return b.build();
  },
  rock: 0, dust: false, roll: true, lift: 0.45,
};
export const OBSTACLE_MODELS = { sand_pile: sandPile, log, barrel };
