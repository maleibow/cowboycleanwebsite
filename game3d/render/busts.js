import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { eyes } from '../actors/partKit.js';
import { createToon, makeOutline } from './materials.js';

// Chest-up 3D busts for the cutscenes: the four speakers of the original `drawPortrait` (cleaningup.html 2835-2931),
// rebuilt from merged primitives. Cowboy Clean follows the standing art rules (PLAN 4.2): black shirt, hat, long curly
// hair, bare face, blue eyes. Each bust faces +z and is about 2 units tall, origin at the bottom of the chest.
// Returns { group, mesh, mat, name }; the stage bobs the group while the character talks.
const SKIN = 0xffccaa, HAIR = 0xe6c15a, HAIR2 = 0xf0cd68;   // Cowboy Clean's curls are blonde

function cowboyClean(b) {
  b.box(1.5, 0.9, 0.8, 0x15151a, { p: [0, 0.35, 0], radius: 0.3 });                        // black shirt, shoulders
  b.box(0.06, 0.7, 0.04, 0x2a2a32, { p: [0, 0.4, 0.4], ao: 0 });                            // button placket: a dark seam, never a white strip
  for (let i = 0; i < 3; i++) b.sphere(0.04, 0xd9d4c8, { p: [0, 0.1 + i * 0.2, 0.43], ao: 0 });  // buttons
  // Bolo tie: a tan leather cord hung in a V from the collar, a silver-ringed turquoise slide, and two tails with silver tips.
  for (const sx of [-1, 1]) {
    b.box(0.05, 0.3, 0.04, 0x9a6a38, { p: [sx * 0.12, 0.74, 0.42], r: [0, 0, sx * 0.4], ao: 0 });              // cord, neck to slide
    b.box(0.05, 0.36, 0.04, 0x9a6a38, { p: [sx * 0.07, 0.4, 0.43], r: [0, 0, sx * -0.06], ao: 0 });            // cord tail
    b.cone(0.035, 0.07, 0xd0d4da, { p: [sx * 0.09, 0.17, 0.43], r: [0, 0, Math.PI + sx * 0.06], ao: 0 });      // silver tip
  }
  b.cyl(0.13, 0.13, 0.05, 0xd0d4da, { p: [0, 0.6, 0.44], r: [Math.PI / 2, 0, 0], seg: 16, ao: 0 });            // slide: silver ring
  b.cyl(0.09, 0.09, 0.06, 0x2fc4c0, { p: [0, 0.6, 0.45], r: [Math.PI / 2, 0, 0], seg: 16, ao: 0 });            // slide: turquoise stone
  b.cyl(0.18, 0.2, 0.3, SKIN, { p: [0, 0.85, 0.02], ao: 0.1 });                            // neck
  b.sphere(0.55, SKIN, { p: [0, 1.4, 0.05], s: [0.92, 1.05, 0.95], jitter: 0.01 });         // head
  eyes(b, { y: 1.44, z: 0.5, gap: 0.2, r: 0.09, pupil: 0x2f6fd6, pr: 0.6, look: 0.3, brow: 0.05 });
  b.box(0.1, 0.05, 0.04, 0xd98a7a, { p: [0, 1.22, 0.52], ao: 0 });                          // smile
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) b.sphere(0.2, HAIR, { p: [sx * (0.5 - i * 0.015), 1.55 - i * 0.2, -0.05 + i * 0.01], jitter: 0.06, ao: 0.1 });   // long curls
  for (let i = 0; i < 6; i++) b.sphere(0.22, HAIR2, { p: [-0.45 + i * 0.18, 1.7, -0.25], jitter: 0.06 });
  // Cowboy hat, not a pilgrim hat: a low crown with a dent pinched into the top, and a brim whose sides curl up.
  b.cyl(0.8, 0.8, 0.05, 0x18181c, { p: [0, 1.8, 0.05], seg: 20, s: [1, 1, 0.8], ao: 0 });  // brim centre
  for (const sx of [-1, 1]) b.box(0.34, 0.05, 0.6, 0x18181c, { p: [sx * 0.85, 1.87, 0.05], r: [0, 0, sx * 0.35], ao: 0 });   // brim sides curl up
  b.cyl(0.38, 0.47, 0.38, 0x1f1f25, { p: [0, 2.0, 0.05], seg: 16 });                          // crown
  b.sphere(0.4, 0x1f1f25, { p: [0, 2.14, 0.05], s: [1, 0.45, 0.95] });                         // rounded top
  b.box(0.1, 0.1, 0.62, 0x121216, { p: [0, 2.28, 0.05], ao: 0 });                              // crease down the middle of the crown
  b.cyl(0.475, 0.475, 0.07, 0xc9a227, { p: [0, 1.88, 0.05], seg: 16, ao: 0 });                // gold hat band
}
function missCowboy(b) {
  b.box(1.4, 0.8, 0.75, 0xe84393, { p: [0, 0.35, 0], radius: 0.3 });                        // pink shirt
  b.cyl(0.17, 0.19, 0.3, SKIN, { p: [0, 0.85, 0.02] });
  b.sphere(0.5, 0xf5d36a, { p: [0, 1.4, -0.12], s: [1.3, 1.25, 1.1], jitter: 0.02 });       // blonde hair, back
  b.sphere(0.5, SKIN, { p: [0, 1.38, 0.05], s: [0.95, 1.05, 0.95] });
  for (const sx of [-1, 1]) b.sphere(0.24, 0xf5d36a, { p: [sx * 0.52, 1.1, -0.05], s: [0.9, 1.9, 0.9], jitter: 0.04 });   // hair falls past the shoulders
  eyes(b, { y: 1.42, z: 0.45, gap: 0.19, r: 0.12, pupil: 0x111111, pr: 0.45, look: 0.2 });
  b.box(0.12, 0.05, 0.04, 0xd45a6a, { p: [0, 1.2, 0.48], ao: 0 });
  b.cone(0.3, 0.45, 0xe84393, { p: [0, 0.74, 0.3], r: [Math.PI, 0, 0], seg: 3, ao: 0 });     // bandana triangle
  b.cyl(0.85, 0.85, 0.06, 0xe84393, { p: [0, 1.82, 0.05], seg: 20, ao: 0 });
  b.cyl(0.38, 0.46, 0.48, 0xd63384, { p: [0, 2.06, 0.05], seg: 16 });
}
function grimeOverlord(b) {
  b.sphere(1.0, 0x4b5320, { p: [0, 1.0, 0], jitter: 0.1, ao: 0.1 });
  b.sphere(0.6, 0x4b5320, { p: [-0.55, 0.5, 0.1], jitter: 0.1 }); b.sphere(0.7, 0x56622a, { p: [0.55, 0.4, 0.15], jitter: 0.1 });
  b.sphere(0.35, 0x3d4519, { p: [-0.3, 1.8, 0], jitter: 0.08 }); b.sphere(0.3, 0x3d4519, { p: [0.4, 1.9, -0.05], jitter: 0.08 });   // lumpy crown
  for (const [x, y, rr, pr] of [[-0.3, 1.1, 0.18, 0.07], [0.3, 1.2, 0.24, 0.1]]) { b.sphere(rr, 0xe74c3c, { p: [x, y, 0.9], ao: 0 }); b.sphere(pr, 0xf1c40f, { p: [x, y, 1.08], ao: 0 }); }
  b.box(0.7, 0.14, 0.12, 0x22260c, { p: [0, 0.7, 0.95], ao: 0 });                           // grin
  b.box(0.4, 0.6, 0.2, 0x3e2723, { p: [0.1, 0.15, 0.95], radius: 0.1, ao: 0 });             // sludge drip
}
function ghost(b) {
  b.box(1.6, 1.0, 0.9, 0x36454f, { p: [0, 0.4, 0], radius: 0.35 });                         // cloak
  b.sphere(0.72, 0x36454f, { p: [0, 1.35, -0.05], s: [1, 1.1, 1] });                        // hood
  b.sphere(0.5, 0xf8f8ff, { p: [0, 1.28, 0.2], s: [0.9, 1.05, 0.7] });                      // pale face
  b.box(0.16, 0.08, 0.06, 0xdc143c, { p: [-0.2, 1.3, 0.52], ao: 0 }); b.box(0.16, 0.08, 0.06, 0xdc143c, { p: [0.2, 1.3, 0.52], ao: 0 });
  b.box(0.12, 0.05, 0.04, 0x8a8a96, { p: [0, 1.08, 0.5], ao: 0 });
}

export const SPEAKERS = { 'Cowboy Clean': cowboyClean, 'Miss Cowboy': missCowboy, 'Grime Overlord': grimeOverlord, Ghost: ghost };
// Name-plate colour per speaker (also used by the dialogue box).
export const SPEAKER_COLOR = { 'Cowboy Clean': '#ffd84a', 'Miss Cowboy': '#ff7ac0', 'Grime Overlord': '#9bd23a', Ghost: '#e8e8ff' };

export function createBust(name) {
  const group = new THREE.Group(), b = new Builder();
  (SPEAKERS[name] || SPEAKERS['Cowboy Clean'])(b);
  const mat = createToon({ vertexColors: true, grime: false, rimBoost: 1.4 });
  const mesh = new THREE.Mesh(b.build(), mat); makeOutline(mesh, { color: 0x2a1420, width: 0.004 });
  group.add(mesh);
  return { group, mesh, mat, name };
}
