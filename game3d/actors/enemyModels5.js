import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { eyes, wing, foot } from './partKit.js';

// Stage 5 (Paris Nights) enemy models, same contract as enemyModels.js. Looks follow the original sprites (cleaningup.html 6130-6200):
// mime = a white-faced street performer in a navy-striped shirt and a black beret, gargoyle = a grey stone imp with bat wings, horns and one red eye.
// (The stage's bats reuse stage 2's bat.)
const sin = Math.sin, abs = Math.abs, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };
const bi = () => new Builder({ ico: true });
const REDEYE = new THREE.Color(3, 0.25, 0.2);

export const MODELS5 = {
  // ---- MIME: a tall pale performer, striped shirt, black trousers and white gloves; a small tragic face under a black beret. Walks like he is leaning into a wind.
  mime: {
    size: [0.86, 1.5],
    root: (S, p) => { const w = sin(S.t * 7) * S.sp; p.y = abs(w) * 0.05; p.rz = w * 0.07; p.rx = 0.08 * S.sp; keep(p, 1 - S.hit * 0.1); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().box(0.5, 0.62, 0.32, 0xeef1f4, { p: [0, 0.98, 0], radius: 0.07, jitter: 0.01, ao: 0.18 });
        for (let i = 0; i < 5; i++) b.box(0.52, 0.07, 0.34, 0x2c3e50, { p: [0, 0.76 + i * 0.12, 0], radius: 0.02, ao: 0 });                          // navy stripes
        b.box(0.54, 0.34, 0.34, 0x15161c, { p: [0, 0.52, 0], radius: 0.06 })                                                                         // trousers
          .box(0.06, 0.52, 0.34, 0xc0392b, { p: [-0.17, 1.0, 0.0], radius: 0.01, ao: 0 }).box(0.06, 0.52, 0.34, 0xc0392b, { p: [0.17, 1.0, 0.0], radius: 0.01, ao: 0 });   // red braces
        b.sphere(0.13, 0xc0392b, { p: [0, 1.32, 0.12], s: [1.7, 0.7, 0.7], ao: 0 });                                                                   // a little bow tie
        return b; } },
      { name: 'head', pose: (S, p) => { p.y = 1.52; p.rz = sin(S.t * 3) * 0.06; p.rx = 0.05; },
        build: () => {
          const b = bi().sphere(0.26, 0xfdfdfd, { p: [0, 0, 0], s: [0.95, 1.05, 0.95], jitter: 0.01 }).sphere(0.04, 0xc0392b, { p: [0, -0.09, 0.24], s: [1.8, 0.7, 0.5], ao: 0 });
          eyes(b, { y: 0.05, z: 0.21, gap: 0.1, r: 0.045, pr: 0.6, brow: -0.35, look: 0.2 });
          for (const s of [-1, 1]) { b.sphere(0.04, 0xff9ab0, { p: [s * 0.17, -0.06, 0.2], s: [1, 0.7, 0.4], ao: 0 }); b.box(0.014, 0.1, 0.014, 0x15161c, { p: [s * 0.1, -0.06, 0.255], radius: 0.004, ao: 0 }); }   // rosy cheeks + a painted tear
          b.cyl(0.3, 0.3, 0.07, 0x15161c, { p: [0.02, 0.22, 0], r: [0.0, 0, 0.1], seg: 10 }).sphere(0.22, 0x15161c, { p: [0.04, 0.27, 0], s: [1, 0.5, 1], ao: 0 }).sphere(0.04, 0x15161c, { p: [0.04, 0.38, 0], ao: 0 });   // the beret
          return b; } },
      { name: 'armL', pose: (S, p) => { p.x = -0.34; p.y = 1.2; p.rx = sin(S.t * 7) * S.sp * 0.7 - 0.3; }, build: () => bi().capsule(0.07, 0.5, 0xeef1f4, { p: [0, -0.3, 0] }).sphere(0.1, 0xffffff, { p: [0, -0.66, 0.02], jitter: 0.01, ao: 0 }) },
      { name: 'armR', pose: (S, p) => { p.x = 0.34; p.y = 1.2; p.rx = -sin(S.t * 7) * S.sp * 0.7 - 0.5; }, build: () => bi().capsule(0.07, 0.5, 0xeef1f4, { p: [0, -0.3, 0] }).sphere(0.1, 0xffffff, { p: [0, -0.66, 0.02], jitter: 0.01, ao: 0 }) },
      { name: 'legs', pose: (S, p) => { p.y = abs(sin(S.t * 7)) * 0.03 * S.sp; }, build: () => { const b = bi(); for (const s of [-1, 1]) { b.capsule(0.09, 0.3, 0x15161c, { p: [s * 0.14, 0.26, 0] }); foot(b, { x: s * 0.14, y: 0.07, z: 0.07, w: 0.2, h: 0.14, l: 0.34, color: 0x0a0a0e }); } return b; } },
    ],
  },

  // ---- GARGOYLE: a chunky stone imp: grey body, a big head with two horns, a glowing red eye, bat wings that beat slowly, claws tucked up. Dives like the vulture.
  gargoyle: {
    size: [1.29, 1.07],
    root: (S, p) => { p.rx = S.dive ? 0.8 : 0.12; p.rz = clamp(-S.dx * 0.05, -0.4, 0.4); p.y = sin(S.t * 5) * 0.06; keep(p, 1 - S.hit * 0.1); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().sphere(0.3, 0x95a5a6, { p: [0, 0.5, -0.02], s: [1, 1.15, 0.9], jitter: 0.04, ao: 0.2 }).sphere(0.2, 0xaab6b8, { p: [0, 0.42, 0.18], s: [1, 1.1, 0.5], ao: 0 })
          .sphere(0.26, 0x7f8c8d, { p: [0, 0.92, 0.06], s: [1.1, 0.95, 1], jitter: 0.04 }).sphere(0.12, 0x7f8c8d, { p: [0, 0.84, 0.3], s: [1, 0.7, 0.9], ao: 0 });   // body, belly, head, snout
        b.cone(0.07, 0.3, 0x5f6c6d, { p: [-0.16, 1.22, 0.02], r: [0, 0, 0.35], seg: 5 }).cone(0.07, 0.3, 0x5f6c6d, { p: [0.16, 1.22, 0.02], r: [0, 0, -0.35], seg: 5 });   // horns
        b.sphere(0.075, REDEYE, { p: [-0.1, 0.95, 0.28], s: [1, 1.1, 0.6], ao: 0 }).sphere(0.075, 0x2a2e30, { p: [0.1, 0.95, 0.28], s: [1, 1.1, 0.6], ao: 0 });         // one red eye (the original has one), one dead socket
        b.box(0.16, 0.04, 0.04, 0x2a2e30, { p: [-0.1, 1.04, 0.3], r: [0, 0, 0.4], radius: 0.01, ao: 0 }).box(0.16, 0.04, 0.04, 0x2a2e30, { p: [0.1, 1.04, 0.3], r: [0, 0, -0.4], radius: 0.01, ao: 0 });
        for (const s of [-1, 1]) { b.cone(0.03, 0.1, 0xe8e0d0, { p: [s * 0.06, 0.76, 0.34], r: [Math.PI, 0, 0], seg: 4, ao: 0 }); b.capsule(0.05, 0.2, 0x7f8c8d, { p: [s * 0.2, 0.3, 0.14], r: [0.5, 0, s * 0.3] }); b.cone(0.03, 0.1, 0x2a2e30, { p: [s * 0.23, 0.18, 0.26], r: [1.2, 0, 0], seg: 4, ao: 0 }); }   // fangs, tucked claws
        b.cone(0.06, 0.3, 0x7f8c8d, { p: [0, 0.2, -0.32], r: [-2.2, 0, 0], seg: 4 });                                                                                      // a stone tail
        return b; } },
      { name: 'wingL', pose: (S, p) => { const f = S.dive ? -1.0 : sin(S.t * (S.sp > 0.3 ? 8 : 5)) * 0.8 + 0.15; p.x = -0.2; p.y = 0.7; p.rz = -f; p.ry = S.dive ? 0.4 : 0; }, build: () => wing(new Builder(), { side: -1, span: 0.8, chord: 0.4, feathers: 4, color: 0x7f8c8d, tip: 0x5f6c6d }) },
      { name: 'wingR', pose: (S, p) => { const f = S.dive ? -1.0 : sin(S.t * (S.sp > 0.3 ? 8 : 5)) * 0.8 + 0.15; p.x = 0.2; p.y = 0.7; p.rz = f; p.ry = S.dive ? -0.4 : 0; }, build: () => wing(new Builder(), { side: 1, span: 0.8, chord: 0.4, feathers: 4, color: 0x7f8c8d, tip: 0x5f6c6d }) },
    ],
  },
};
