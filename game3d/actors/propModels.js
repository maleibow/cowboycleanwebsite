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

// Trash can (original: a #95a5a6 tapered can with ribs and a lid): a dented steel can with a loose lid, a banana peel, slid along the road. Unit extents like the sand pile.
export const trashCan = {
  build: () => {
    const b = new Builder().cyl(0.85, 0.7, 0.8, 0x95a5a6, { p: [0, 0.4, 0], seg: 12, jitter: 0.02, ao: 0.15 }).cyl(0.95, 0.9, 0.12, 0xbdc3c7, { p: [0, 0.86, 0], seg: 12, ao: 0.05 }).cyl(0.28, 0.28, 0.1, 0x7f8c8d, { p: [0, 0.96, 0], seg: 8, ao: 0 });
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; b.box(0.07, 0.7, 0.07, 0x7f8c8d, { p: [Math.cos(a) * 0.8, 0.4, Math.sin(a) * 0.8], r: [0, -a, 0], radius: 0.02, ao: 0 }); }
    b.cyl(0.9, 0.9, 0.06, 0x5d6b6c, { p: [0, 0.03, 0], seg: 12, ao: 0 }).sphere(0.2, 0xe8d03a, { p: [0.55, 0.98, 0.3], s: [1.4, 0.3, 0.8], ao: 0, jitter: 0.02 });
    return b.build();
  },
  rock: 0.18, dust: false,
};

// Café chair (original: an orange #d35400 bistro chair drawn as bent wire: four legs, a seat, a curved back): a bentwood bistro chair with a wicker seat, tipped and slid
// toward you. Authored on the sand pile's unit extents (scaled to the 1 x 1 x 0.95 hit box).
export const cafeChair = {
  build: () => {
    const b = new Builder(), OR = 0xd35400, W = 0xe8a050;
    b.cyl(0.78, 0.78, 0.09, W, { p: [0, 0.5, 0], seg: 14, ao: 0.1, jitter: 0.01 }).add(new THREE.TorusGeometry(0.78, 0.07, 5, 16).rotateX(Math.PI / 2), OR, { p: [0, 0.5, 0], ao: 0 });
    for (const [x, z] of [[-0.55, 0.5], [0.55, 0.5], [-0.55, -0.5], [0.55, -0.5]]) b.cyl(0.05, 0.065, 0.55, OR, { p: [x, 0.25, z], r: [z * 0.25, 0, -x * 0.25], seg: 5, ao: 0.05 });   // splayed legs
    b.add(new THREE.TorusGeometry(0.2, 0.05, 5, 12).rotateX(Math.PI / 2), OR, { p: [0, 0.24, 0], s: [3, 1, 3], ao: 0 });                                                      // leg ring
    b.add(new THREE.TorusGeometry(0.6, 0.06, 5, 16, Math.PI), OR, { p: [0, 0.78, -0.55], r: [0, 0, 0], s: [1, 0.55, 1], ao: 0 });                                          // the bentwood back: a loop
    for (const x of [-0.58, 0.58]) b.cyl(0.05, 0.05, 0.62, OR, { p: [x, 0.82, -0.55], seg: 5, ao: 0 });
    b.cyl(0.04, 0.04, 1.0, 0xb34600, { p: [0, 1.0, -0.55], r: [0, 0, Math.PI / 2], seg: 5, ao: 0 });
    return b.build();
  },
  rock: 0.22, dust: false,
};

// Ash pile (original: a grey #7f8c8d heap with lighter #95a5a6 drifts and red/yellow embers): a drift of grey ash with glowing embers and a charred stick, slid along the path.
export const ashPile = {
  build: () => {
    const b = new Builder().sphere(0.9, 0x6a6e72, { p: [0, 0, 0], jitter: 0.12, ao: 0.15 }).sphere(0.55, 0x95a5a6, { p: [-0.2, 0.18, 0.3], jitter: 0.1, ao: 0 }).sphere(0.4, 0x4a4e52, { p: [0.45, 0.05, -0.3], jitter: 0.1, ao: 0.05 });
    for (const [x, y, z, r] of [[-0.5, 0.42, 0.45, 0.1], [0.25, 0.6, 0.3, 0.08], [0.62, 0.28, 0.5, 0.11], [-0.2, 0.7, -0.15, 0.08], [0.05, 0.25, 0.82, 0.09]]) b.sphere(r, new THREE.Color(3, 0.7, 0.15), { p: [x, y, z], s: [1, 0.6, 1], ao: 0 }).sphere(r * 0.45, new THREE.Color(3.4, 2.6, 0.7), { p: [x, y + 0.03, z], s: [1, 0.6, 1], ao: 0 });
    b.cone(0.06, 0.4, 0x1c1414, { p: [0.3, 0.8, 0.1], r: [0, 0, 0.6], seg: 4, ao: 0 });
    return b.build();
  },
  rock: 0.3, dust: true,
};

// Cloud bump (original: a white #ecf0f1 puff with a #bdc3c7 outline, three lobes): a soft white cloud puff with two smaller lobes and a pastel sparkle, rolled toward you.
export const cloudBump = {
  build: () => {
    const b = new Builder().sphere(0.9, 0xffffff, { p: [0, 0, 0], s: [1, 0.85, 1], jitter: 0.07, ao: 0.08 }).sphere(0.55, 0xf2f6ff, { p: [-0.65, -0.1, 0.1], jitter: 0.06, ao: 0.05 }).sphere(0.6, 0xffffff, { p: [0.62, -0.05, -0.1], jitter: 0.06, ao: 0.05 }).sphere(0.45, 0xeef4ff, { p: [0.05, 0.35, 0.3], jitter: 0.05, ao: 0 });
    b.sphere(0.07, new THREE.Color(1.8, 1.7, 1.2), { p: [0.4, 0.6, 0.45], ao: 0 }).sphere(0.06, 0x7fd8ff, { p: [-0.5, 0.35, 0.5], ao: 0 }).sphere(0.06, 0xff9ad5, { p: [0.1, 0.8, 0.1], ao: 0 });
    return b.build();
  },
  rock: 0.12, dust: false,
};

// Sleeping sheep (original: a white #ecf0f1 wool ball with three wool bumps, a #34495e head, a closed eye and floating Zs): a plump woolly ball, dark face with a shut eye, rolled toward you
// still fast asleep. Same unit extents as the cloud bump.
export const sleepSheep = {
  build: () => {
    const b = new Builder().sphere(0.8, 0xfaf6ee, { p: [0, 0.05, 0], jitter: 0.07, ao: 0.1 });
    for (const [x, y, z] of [[-0.3, 0.55, 0.1], [0.05, 0.68, -0.1], [0.4, 0.5, 0.15], [-0.5, 0.15, -0.35], [0.5, 0.0, -0.4]]) b.sphere(0.34, 0xffffff, { p: [x, y, z], jitter: 0.06, ao: 0.05 });
    b.sphere(0.34, 0x34495e, { p: [-0.1, 0.12, 0.78], s: [1, 1, 0.9], jitter: 0.03, ao: 0.1 }).box(0.2, 0.04, 0.03, 0xecf0f1, { p: [-0.1, 0.16, 1.05], r: [0, 0, 0.15], radius: 0.01, ao: 0 });   // shut eye
    for (const [x, c] of [[-0.38, 0x2a3a4e], [0.18, 0x2a3a4e]]) b.cone(0.1, 0.3, c, { p: [x, 0.3, 0.8], r: [0, 0, x * 1.2], seg: 5, ao: 0 });                                  // floppy ears
    for (const [x, y, z, k] of [[0.5, 0.95, 0.4, 0.14], [0.68, 1.2, 0.36, 0.1]]) b.box(k, 0.03, 0.03, new THREE.Color(1.5, 1.6, 2.0), { p: [x, y, z], radius: 0.005, ao: 0 }).box(0.03, 0.03, k, new THREE.Color(1.5, 1.6, 2.0), { p: [x, y, z], radius: 0.005, ao: 0 });   // Zs
    return b.build();
  },
  rock: 0.1, dust: false,
};

// Gravestone (original: a grey #95a5a6 slab with a rounded top and a cross, edged #34495e): a stubby rounded headstone with a carved cross and a tuft of moss, tumbled down the path on its back.
// Same unit extents as the others (0.6 half-width, 1.0 tall).
export const gravestone = {
  build: () => {
    const b = new Builder().box(1.2, 0.7, 0.5, 0x95a5a6, { p: [0, -0.15, 0], radius: 0.1, jitter: 0.02, ao: 0.15 }).add(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 14, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), 0xa7b5b6, { p: [0, 0.2, 0], ao: 0.08 });
    b.box(0.12, 0.62, 0.06, 0x34495e, { p: [0, 0.12, 0.27], radius: 0.01, ao: 0 }).box(0.4, 0.1, 0.06, 0x34495e, { p: [0, 0.3, 0.27], radius: 0.01, ao: 0 });
    b.sphere(0.2, 0x3f5a42, { p: [-0.35, -0.5, 0.2], s: [1.5, 0.45, 1], jitter: 0.03, ao: 0 }).sphere(0.16, 0x3f5a42, { p: [0.42, 0.52, -0.1], s: [1.4, 0.4, 1], jitter: 0.03, ao: 0 });
    return b.build();
  },
  rock: 0.12, dust: false,
};

// Coal pile (original: a dark #2c3e50 heap with a lighter #34495e shoulder and grey #7f8c8d highlights): a lumpy heap of black coal with glinting facets and a ruby ember or two,
// rolled toward you. Same unit extents as the sand pile (0.95 half-width, 0.9 tall).
export const coalPile = {
  build: () => {
    const b = new Builder();
    for (const [x, y, z, r, c] of [[0, 0, 0, 0.9, 0x1c1f26], [-0.3, 0.2, 0.2, 0.55, 0x2c3e50], [0.4, 0.05, -0.3, 0.45, 0x242831], [0.1, 0.4, 0.1, 0.4, 0x34495e]]) b.add(new THREE.IcosahedronGeometry(r, 0), c, { p: [x, y, z], s: [1.15, 0.85, 1], jitter: 0.08, ao: 0.12 });
    for (const [x, y, z] of [[-0.35, 0.5, 0.45], [0.3, 0.55, 0.3], [-0.1, 0.35, 0.7], [0.55, 0.2, 0.55]]) b.box(0.16, 0.12, 0.14, 0x7f8c8d, { p: [x, y, z], r: [0.4, 0.6, 0.3], radius: 0.01, ao: 0 });
    b.sphere(0.07, new THREE.Color(3.0, 0.35, 0.3), { p: [0.15, 0.62, 0.4], s: [1, 0.6, 1], ao: 0 }).sphere(0.05, new THREE.Color(3.0, 0.5, 0.2), { p: [-0.5, 0.3, 0.2], s: [1, 0.6, 1], ao: 0 });
    return b.build();
  },
  rock: 0.3, dust: true,
};
export const OBSTACLE_MODELS = { sand_pile: sandPile, log, barrel, trash_can: trashCan, cafe_chair: cafeChair, ash_pile: ashPile, cloud_bump: cloudBump, sleep_sheep: sleepSheep, gravestone, coal_pile: coalPile };
