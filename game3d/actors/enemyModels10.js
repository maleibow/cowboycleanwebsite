import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { eyes, wing, spike } from './partKit.js';

// Stage 10 (Charcoal Streets) enemy models, same contract as enemyModels.js. Looks follow the original sprites (cleaningup.html 5419 and 5539): ruby_slime = a crimson (#dc143c) blob with a pink
// (#ff6b81) shine and two white eyes; shadow_bat = a charcoal (#36454f) bat with black round body and head and ragged wings. Here the shadow bat gets glowing ruby eyes and ash trailing from its
// wings; the ruby slime is a glossy crimson jelly with a bright core and drips. (ghosts, embers, zombies and storm clouds come from stages 9, 6 and 8.)
const sin = Math.sin, cos = Math.cos, abs = Math.abs, clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const keep = (p, sy) => { p.sy = sy; const k = 1 / Math.sqrt(sy); p.sx = p.sz = k; };
const bi = () => new Builder({ ico: true });
const RUBYEYE = new THREE.Color(3.4, 0.25, 0.45), CORE = new THREE.Color(2.4, 0.5, 0.7);

export const MODELS10 = {
  // ---- RUBY SLIME: a glossy crimson jelly that wobbles as it shuffles, a bright core showing through, two big wet eyes and ruby drips round the base
  ruby_slime: {
    size: [1.07, 1.07],
    root: (S, p) => { const w = sin(S.t * 8) * S.sp; keep(p, 1 + w * 0.09 + sin(S.t * 4.6) * 0.03 - S.hit * 0.14); p.rz = w * 0.05; },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().sphere(0.5, 0xdc143c, { p: [0, 0.5, 0], s: [1.1, 0.95, 1.05], jitter: 0.04, ao: 0.15 }).sphere(0.3, CORE, { p: [0.05, 0.5, -0.05], ao: 0 }).sphere(0.2, 0xff6b81, { p: [-0.22, 0.78, 0.22], s: [1, 0.6, 0.5], ao: 0 });   // body, a glowing core, a shine
        for (const [x, z] of [[-0.42, 0.2], [0.44, 0.1], [0.02, 0.48], [-0.1, -0.44]]) b.sphere(0.12, 0xb30f30, { p: [x, 0.12, z], s: [1, 0.7, 1], jitter: 0.02, ao: 0 });   // drips
        eyes(b, { y: 0.58, z: 0.42, gap: 0.17, r: 0.13, pr: 0.5, brow: 0.3, look: 0.5 });
        b.box(0.2, 0.05, 0.05, 0x5a0a1c, { p: [0, 0.36, 0.5], radius: 0.015, ao: 0 });
        return b; } },
      { name: 'drops', pose: (S, p) => { p.y = 0.04 * sin(S.t * 6); p.ry = S.t * 1.5; }, build: () => { const b = bi(); for (let i = 0; i < 3; i++) { const a = (i / 3) * 6.283; b.sphere(0.06, 0xff3b5a, { p: [cos(a) * 0.62, 0.7 + (i % 2) * 0.2, sin(a) * 0.62], s: [1, 1.4, 1], ao: 0 }); } return b; } },
    ],
  },

  // ---- SHADOW BAT: a charcoal bat, round black body and head, two ruby eyes that burn in the dark, long ragged wings with ash-grey tips; dives like the bat but trails ash
  shadow_bat: {
    size: [1.28, 0.64],
    root: (S, p) => { p.rx = S.dive ? 0.9 : 0.1; p.rz = clamp(-S.dx * 0.07, -0.6, 0.6); p.y = S.dive ? 0 : sin(S.t * 11) * 0.06; keep(p, 1 - S.hit * 0.1); },
    parts: [
      { name: 'body', pose: () => {}, build: () => {
        const b = bi().sphere(0.22, 0x1a1c20, { p: [0, 0.34, 0], s: [0.9, 1, 1.1], jitter: 0.03, ao: 0.15 }).sphere(0.18, 0x24282e, { p: [0, 0.44, 0.18], jitter: 0.02 }).sphere(0.1, 0x36454f, { p: [0, 0.3, 0.14], s: [1, 1.2, 0.5], ao: 0 });   // a charcoal body and a round head
        for (const s of [-1, 1]) { spike(b, { p: [s * 0.1, 0.64, 0.15], r: 0.06, h: 0.26, color: 0x1a1c20, rot: [0, 0, s * -0.25], seg: 4 }); b.sphere(0.05, RUBYEYE, { p: [s * 0.075, 0.46, 0.33], s: [1, 1.1, 0.6], ao: 0 }); b.cone(0.022, 0.1, 0xe8e8ec, { p: [s * 0.045, 0.3, 0.32], r: [Math.PI, 0, 0], seg: 4, ao: 0 }); }   // horns, glowing eyes, fangs
        b.cone(0.03, 0.18, 0x1a1c20, { p: [0, 0.2, -0.22], r: [-1.2, 0, 0], seg: 4 });
        return b; } },
      { name: 'wingL', pose: (S, p) => { const f = S.dive ? -0.9 : sin(S.t * (S.sp > 0.3 ? 15 : 10)) * 0.95 + 0.1; p.x = -0.12; p.y = 0.4; p.rz = -f; p.ry = S.dive ? 0.5 : 0; }, build: () => wing(new Builder(), { side: -1, span: 0.7, chord: 0.32, feathers: 5, color: 0x2a2e36, tip: 0x5a606c }) },
      { name: 'wingR', pose: (S, p) => { const f = S.dive ? -0.9 : sin(S.t * (S.sp > 0.3 ? 15 : 10)) * 0.95 + 0.1; p.x = 0.12; p.y = 0.4; p.rz = f; p.ry = S.dive ? -0.5 : 0; }, build: () => wing(new Builder(), { side: 1, span: 0.7, chord: 0.32, feathers: 5, color: 0x2a2e36, tip: 0x5a606c }) },
      { name: 'ash', pose: (S, p) => { p.y = 0.1 + abs(sin(S.t * 5)) * 0.08; p.ry = S.t * 2; }, build: () => { const b = bi(); for (let i = 0; i < 4; i++) { const a = (i / 4) * 6.283; b.sphere(0.04, 0x6a6a76, { p: [cos(a) * 0.45, 0.15 + (i % 2) * 0.12, sin(a) * 0.45 - 0.2], s: [1, 0.5, 1], ao: 0 }); } return b; } },
    ],
  },
};
