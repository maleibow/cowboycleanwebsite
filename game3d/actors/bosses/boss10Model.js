import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon, makeOutline } from '../../render/materials.js';

// VACANT SAVIOR, the final boss (original: a tall #36454f charcoal robe, a pale #f8f8ff round face with two short red strokes for eyes and two blinking crimson dots, drawn at 80% opacity):
// a tall charcoal figure in a long torn coat, a smooth blank white mask with two ruby slits, long thin arms that open into a cross when he attacks, a broken halo of ruby thorns behind the head and ash
// drifting off the shoulders. A pale-red outline keeps him readable against the black streets.
// rig.pose({ arms (0 down .. 1 spread), halo, charge, eye, lean, roll, glow, flash, t, scale, sq, shakeX, shakeZ })
const RUBY = new THREE.Color(3.4, 0.25, 0.5), RUBY2 = new THREE.Color(2.2, 0.3, 0.5);
const COAT = 0x1e252c, COAT2 = 0x36454f, COAT3 = 0x2a343c;

export function createBoss10Model() {
  const root = new THREE.Group(); root.name = 'boss10'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 1.4, rimBoost: 1.5 });
  const glowMat = createToon({ vertexColors: true, grime: false, rim: false, tint: false, emissive: 0x501020, emissiveIntensity: 0.6 });
  const mk = (b, parent, mat = toon, outline = false) => { const m = new THREE.Mesh(b.build(), mat); m.castShadow = true; parent.add(m); if (outline) makeOutline(m, { color: 0xff4a6a, width: 0.0055 }); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const B = () => new Builder({ ico: true });

  // the coat: a tall cone with panels and long ragged tails; shoulders
  const coat = B().add(new THREE.ConeGeometry(1.2, 3.0, 12), COAT, { p: [0, 1.5, 0], jitter: 0.05, ao: 0.3 }).add(new THREE.ConeGeometry(0.85, 1.9, 10), COAT2, { p: [0, 1.9, 0.12], jitter: 0.04, ao: 0.2 }).sphere(0.8, COAT3, { p: [0, 2.85, -0.05], s: [1.5, 0.7, 0.95], jitter: 0.04, ao: 0.2 });
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; coat.cone(0.2, 0.8 + (i % 3) * 0.4, i % 2 ? COAT : COAT3, { p: [Math.cos(a) * 1.05, 0.1 - (i % 3) * 0.1, Math.sin(a) * 1.05], r: [Math.PI, 0, 0], seg: 5, ao: 0.2 }); }
  coat.box(0.12, 2.0, 0.08, 0x4a5a64, { p: [0, 1.6, 0.9], r: [0.3, 0, 0], radius: 0.02, ao: 0 });   // a seam down the front
  mk(coat, body, toon, true);
  const head = J(body, 0, 3.55, 0.05);
  mk(B().sphere(0.52, 0xf2f4f8, { p: [0, 0, 0.1], s: [0.92, 1.18, 0.9], ao: 0.06 }).box(0.04, 0.5, 0.04, 0xc8ccd4, { p: [0.12, -0.35, 0.52], r: [0, 0, 0.1], radius: 0.01, ao: 0 }), head, toon, true);   // the blank mask and a tear-track
  const eyes = J(head, 0, 0, 0); mk(B().box(0.3, 0.07, 0.06, RUBY, { p: [-0.2, 0.1, 0.52], r: [0, 0, 0.18], ao: 0 }).box(0.3, 0.07, 0.06, RUBY, { p: [0.2, 0.1, 0.52], r: [0, 0, -0.18], ao: 0 }), eyes, glowMat);
  const dots = J(head, 0, 0, 0); mk(B().sphere(0.04, RUBY2, { p: [-0.15, -0.12, 0.5], ao: 0 }).sphere(0.04, RUBY2, { p: [0.15, -0.12, 0.5], ao: 0 }), dots, glowMat);   // the blinking crimson dots
  // the broken halo: a ring of ruby thorns behind the head, with gaps
  const halo = J(body, 0, 3.6, -0.5); const hb = B(); for (let i = 0; i < 11; i++) { if (i === 3 || i === 7) continue; const a = (i / 11) * 6.283; hb.cone(0.12, 0.8 + (i % 3) * 0.2, RUBY2, { p: [Math.cos(a) * 1.05, Math.sin(a) * 1.05, 0], r: [0, 0, a - 1.57], seg: 4, ao: 0 }); } hb.add(new THREE.TorusGeometry(0.98, 0.04, 4, 30, 5.2), RUBY, { p: [0, 0, 0], r: [0, 0, 0.5], ao: 0 }); mk(hb, halo, glowMat);
  // arms: long, thin, pale hands; shoulders at (+-0.9, 2.85)
  const arms = [-1, 1].map((sd) => { const a = J(body, sd * 0.95, 2.85, 0.05); mk(B().capsule(0.09, 1.5, COAT3, { p: [0, -0.75, 0] }).sphere(0.14, 0xf2f4f8, { p: [0, -1.62, 0.04], s: [1, 1.3, 0.8], ao: 0.05 }), a, toon, true); for (let f = 0; f < 3; f++) mk(B().cone(0.025, 0.34, 0xf2f4f8, { p: [(f - 1) * 0.06, -1.9, 0.06], r: [Math.PI + 0.2, 0, (f - 1) * 0.25], seg: 4, ao: 0 }), a, toon); return a; });
  // drifting ash
  const ash = J(body, 0, 0, 0); const ab = B(); for (let i = 0; i < 9; i++) ab.sphere(0.06, 0x7a7a86, { p: [Math.cos(i * 1.4) * 1.5, 0.6 + (i % 5) * 0.55, Math.sin(i * 1.4) * 1.5], s: [1, 0.5, 1], ao: 0 }); mk(ab, ash, toon);

  return {
    root, body, toon,
    pose(p) {
      const sq = p.sq || 1, k = 1 / Math.sqrt(sq), ar = p.arms || 0, ch = p.charge || 0;
      body.scale.set(k * p.scale, sq * p.scale, k * p.scale); body.rotation.set(p.lean || 0, 0, (p.roll || 0) + Math.sin(p.t * 1.3) * 0.03); body.position.set(p.shakeX || 0, Math.sin(p.t * 2.0) * 0.12, p.shakeZ || 0);
      head.rotation.set(Math.sin(p.t * 1.0) * 0.04, Math.sin(p.t * 0.6) * 0.18, 0); eyes.scale.set(1 + ch * 0.4, 1 + ch, 1); dots.visible = Math.sin(p.t * 6.5) > -0.2;
      arms[0].rotation.set(0.0, 0, 0.2 + ar * 1.25 + Math.sin(p.t * 1.4) * 0.06); arms[1].rotation.set(0.0, 0, -0.2 - ar * 1.25 - Math.sin(p.t * 1.2) * 0.06);
      halo.rotation.z = p.t * (0.4 + (p.halo || 0) * 2.6); halo.scale.setScalar(1 + ch * 0.12 * Math.sin(p.t * 30)); ash.rotation.y = p.t * 0.5;
      glowMat.emissiveIntensity = 0.5 + (p.halo || 0) * 0.8 + ch * 1.2 + (p.flash > 0 ? 1.5 : 0);
      toon.emissive.setRGB(p.glow, p.glow * 0.4, p.glow * 0.5); toon.emissiveIntensity = Math.max(p.flash, p.glow);
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
}
