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
export const OBSTACLE_MODELS = { sand_pile: sandPile };
