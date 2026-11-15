import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon, makeOutline } from '../../render/materials.js';

// THE MIME, the stage-5 boss: a giant street performer with a chalk-white face, a navy-striped shirt, black trousers, white gloves and a black beret with a red band
// (original: #ecf0f1 body with #2c3e50 stripes, a white head with a red mouth line, a black hat with a red band). One arm points when he aims.
// rig.pose({ aim, vis, wave, lean, flash, glow, t, scale, sq, shakeX, shakeZ })   vis 0 = gone (a scale-down to a point), 1 = fully there
const C = { shirt: 0xeef1f4, stripe: 0x2c3e50, face: 0xfdfdfd, hat: 0x15161c, band: 0xc0392b, trousers: 0x15161c, glove: 0xffffff, shoe: 0x0a0a0e, red: 0xc0392b };

export function createBoss05Model() {
  const root = new THREE.Group(); root.name = 'boss5'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 1.0 });
  const eyeMat = createToon({ color: 0x111111, emissive: 0xff2a2a, emissiveIntensity: 0, grime: false, rim: false, tint: false });
  const mk = (b, parent, mat = toon, outline = true) => { const m = new THREE.Mesh(b.build(), mat); m.castShadow = true; parent.add(m); if (outline) makeOutline(m, { width: 0.0042 }); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const B = () => new Builder({ ico: true });

  const torso = B().box(1.5, 1.5, 0.9, C.shirt, { p: [0, 2.3, 0], radius: 0.16, jitter: 0.02, ao: 0.18 });
  for (let i = 0; i < 6; i++) torso.box(1.54, 0.18, 0.94, C.stripe, { p: [0, 1.75 + i * 0.28, 0], radius: 0.04, ao: 0 });
  torso.box(1.5, 0.7, 0.9, C.trousers, { p: [0, 1.25, 0], radius: 0.12 }).box(0.16, 1.5, 0.94, C.red, { p: [-0.45, 2.3, 0], radius: 0.02, ao: 0 }).box(0.16, 1.5, 0.94, C.red, { p: [0.45, 2.3, 0], radius: 0.02, ao: 0 })
    .sphere(0.3, C.red, { p: [0, 3.0, 0.45], s: [1.8, 0.7, 0.7], ao: 0 });                                    // braces + a bow tie
  mk(torso, body);
  for (const s of [-1, 1]) {
    mk(B().capsule(0.26, 0.9, C.trousers, { p: [s * 0.42, 0.62, 0] }).box(0.62, 0.3, 0.95, C.shoe, { p: [s * 0.42, 0.15, 0.17], radius: 0.1 }), body);   // legs + big shoes
  }
  const head = J(body, 0, 3.55, 0);
  const hb = B().sphere(0.78, C.face, { p: [0, 0, 0], s: [0.95, 1.05, 0.95], jitter: 0.012 });
  hb.box(0.42, 0.06, 0.06, C.red, { p: [0, -0.28, 0.72], radius: 0.02, ao: 0 }).sphere(0.1, C.red, { p: [0, -0.1, 0.77], s: [1, 0.8, 0.6], ao: 0 });                              // the red mouth line + a nose
  for (const s of [-1, 1]) { hb.sphere(0.12, 0xff9ab0, { p: [s * 0.5, -0.12, 0.6], s: [1, 0.7, 0.4], ao: 0 }); hb.box(0.4, 0.07, 0.06, 0x15161c, { p: [s * 0.3, 0.42, 0.68], r: [0, 0, -s * 0.35], radius: 0.02, ao: 0 }); }   // cheeks + sad brows
  hb.cyl(0.95, 0.95, 0.1, C.hat, { p: [0.05, 0.68, 0], seg: 12, r: [0, 0, 0.12] }).sphere(0.7, C.hat, { p: [0.12, 0.8, 0], s: [1.1, 0.55, 1.1], ao: 0 }).cyl(0.74, 0.74, 0.14, C.band, { p: [0.04, 0.72, 0], seg: 12, r: [0, 0, 0.12], ao: 0 }).sphere(0.09, C.hat, { p: [0.12, 1.12, 0], ao: 0 });   // beret
  mk(hb, head);
  const eyes = B(); for (const s of [-1, 1]) { eyes.sphere(0.14, 0xffffff, { p: [s * 0.3, 0.12, 0.66], s: [1, 1.1, 0.5], ao: 0 }); }
  mk(eyes, head, toon, false);
  const pup = B(); for (const s of [-1, 1]) pup.sphere(0.07, 0x111111, { p: [s * 0.3, 0.12, 0.76], s: [1, 1.2, 0.4], ao: 0 });
  mk(pup, head, eyeMat, false);
  const arms = [-1, 1].map((s) => { const a = J(body, s * 0.95, 2.9, 0); mk(B().capsule(0.2, 1.0, C.shirt, { p: [0, -0.6, 0] }).sphere(0.28, C.glove, { p: [0, -1.3, 0.02], jitter: 0.02, ao: 0 }).box(0.5, 0.1, 0.5, C.stripe, { p: [0, -0.4, 0], radius: 0.03, ao: 0 }), a); return { g: a, s }; });
  return {
    root, body, toon, eyeMat,
    pose(p) {
      const v = Math.max(0.001, p.vis ?? 1), sq = p.sq || 1;
      body.scale.set(v * p.scale / Math.sqrt(sq), v * p.scale * sq, v * p.scale / Math.sqrt(sq)); body.rotation.set(p.lean || 0, 0, Math.sin(p.t * 1.6) * 0.02); body.position.set(p.shakeX || 0, 0, p.shakeZ || 0);
      head.rotation.set(0.05 + (p.aim || 0) * 0.1, Math.sin(p.t * 1.2) * 0.12, Math.sin(p.t * 0.9) * 0.05);
      const aim = p.aim || 0;   // the right arm points straight at the player, the left rises with it; otherwise they sway like pulling a rope
      arms[1].g.rotation.set(-1.45 * aim + Math.sin(p.t * 2) * 0.1 * (1 - aim), 0, -0.12 - 0.1 * (1 - aim) + (p.wave || 0) * Math.sin(p.t * 9) * 0.5);
      arms[0].g.rotation.set(-0.5 * aim + Math.sin(p.t * 2 + 1) * 0.12 * (1 - aim), 0, 0.12 + 0.2 * aim);
      eyeMat.emissiveIntensity = p.aim * 2 + (p.flash > 0 ? 2 : 0);
      toon.emissive.setRGB(p.glow, p.glow * 0.5, p.glow * 0.5); toon.emissiveIntensity = Math.max(p.flash, p.glow);
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
}
