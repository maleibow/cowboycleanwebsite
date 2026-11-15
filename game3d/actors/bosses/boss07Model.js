import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon, makeOutline } from '../../render/materials.js';

// DOUBLE RAINBOW, the stage-7 boss: a fat grey-white thundercloud (original: #bdc3c7 body, #e74c3c eyes, a blue streak) with furious red eyes, a toothy zig-zag mouth and a double
// rainbow arching behind him like a halo. He floats on a tuft of rain. The beam he trails is made by the controller (boss07.js).
// rig.pose({ eye, mouth, charge, lean, roll, flash, glow, t, scale, sq, shakeX, shakeZ })
const BAND = [0xff3b30, 0xff9500, 0xffe135, 0x34c759, 0x32ade6, 0x5856d6, 0xaf52de];
const RED = new THREE.Color(3.2, 0.3, 0.2);

export function createBoss07Model() {
  const root = new THREE.Group(); root.name = 'boss7'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 1.0 });
  const eyeMat = createToon({ color: 0xff3b30, emissive: 0xff2a1a, emissiveIntensity: 1.6, grime: false, rim: false, tint: false });
  const glowMat = createToon({ vertexColors: true, grime: false, rim: false, tint: false, emissive: 0x606060, emissiveIntensity: 0.4 });
  const mk = (b, parent, mat = toon, outline = true) => { const m = new THREE.Mesh(b.build(), mat); m.castShadow = true; parent.add(m); if (outline) makeOutline(m, { width: 0.0042 }); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const B = () => new Builder({ ico: true });

  const cloud = B();
  for (const [x, y, z, r, c] of [[0, 1.3, 0, 1.5, 0xe4e8ec], [-1.4, 1.0, 0.1, 1.05, 0xbdc3c7], [1.45, 1.05, -0.1, 1.1, 0xc9cfd4], [-0.7, 2.0, -0.2, 1.0, 0xd5dade], [0.8, 2.1, 0, 1.05, 0xbdc3c7], [0, 0.55, 0.3, 1.0, 0xaeb5bb], [-1.9, 0.5, -0.1, 0.7, 0xaeb5bb], [1.9, 0.55, 0, 0.75, 0xa6adb4]]) cloud.sphere(r, c, { p: [x, y, z], s: [1.12, 0.92, 1], jitter: 0.1, ao: 0.18 });
  const lightning = B(); lightning.cone(0.2, 0.9, 0xffe135, { p: [-1.4, -0.2, 0.9], r: [Math.PI, 0, 0.3], seg: 4, ao: 0 });
  mk(cloud, body);
  const face = J(body, 0, 1.3, 1.35);
  const eyeB = B(); for (const s of [-1, 1]) eyeB.sphere(0.34, 0xffffff, { p: [s * 0.55, 0.2, 0], s: [1, 1.1, 0.55], ao: 0 });
  mk(eyeB, face, toon, false);
  const iris = B(); for (const s of [-1, 1]) { iris.sphere(0.17, 0xff3b30, { p: [s * 0.55, 0.18, 0.2], s: [1, 1.2, 0.5], ao: 0 }); iris.box(0.8, 0.17, 0.1, 0x6a7078, { p: [s * 0.55, 0.62, 0.1], r: [0, 0, -s * 0.4], radius: 0.04, ao: 0 }); }
  mk(iris, face, eyeMat, false);
  const mouth = J(face, 0, -0.4, 0.05);
  mk(B().box(1.2, 0.34, 0.2, 0x3a1a22, { p: [0, 0, 0], radius: 0.06, ao: 0 }), mouth, toon, false);
  const teeth = B(); for (let i = 0; i < 6; i++) teeth.cone(0.1, 0.26, 0xffffff, { p: [-0.5 + i * 0.2, 0.17 - (i % 2) * 0.0, 0.1], r: [Math.PI * (i % 2), 0, 0], seg: 4, ao: 0 }); mk(teeth, mouth, toon, false);
  // the double rainbow halo: two sets of seven stacked arcs behind the cloud, the outer one in reverse order
  const halo = J(body, 0, 0.4, -1.3);
  const hb = B(); for (let i = 0; i < 7; i++) { hb.add(new THREE.TorusGeometry(3.6 - i * 0.2, 0.12, 4, 22, Math.PI), BAND[i], { p: [0, 0, 0], s: [1, 1, 0.35], ao: 0 }); hb.add(new THREE.TorusGeometry(4.9 - i * 0.2, 0.1, 4, 22, Math.PI), BAND[6 - i], { p: [0, 0, 0], s: [1, 1, 0.3], ao: 0 }); }
  mk(hb, halo, glowMat, false);
  const rain = B(); for (let i = 0; i < 6; i++) rain.cyl(0.03, 0.03, 0.9 + (i % 3) * 0.4, 0x7fd8ff, { p: [-1.5 + i * 0.6, -0.4 - (i % 3) * 0.2, 0.2], seg: 3, ao: 0 }); mk(rain, body, glowMat, false);
  const lt = mk(lightning, body, glowMat, false);

  return {
    root, body, toon, eyeMat,
    pose(p) {
      const sq = p.sq || 1, k = 1 / Math.sqrt(sq); body.scale.set(k * p.scale, sq * p.scale, k * p.scale); body.rotation.set(p.lean || 0, 0, (p.roll || 0) + Math.sin(p.t * 1.5) * 0.03); body.position.set(p.shakeX || 0, Math.sin(p.t * 2.2) * 0.1, p.shakeZ || 0);
      face.rotation.y = Math.sin(p.t * 1.2) * 0.1; mouth.scale.y = 1 + (p.mouth || 0) * 2.2; halo.rotation.z = Math.sin(p.t * 0.8) * 0.04; halo.scale.setScalar(1 + (p.charge || 0) * 0.08 * Math.sin(p.t * 30));
      lt.visible = (p.charge || 0) > 0.2 && Math.sin(p.t * 40) > 0; eyeMat.emissiveIntensity = 1.4 + (p.eye || 0) * 2 + (p.flash > 0 ? 2 : 0); glowMat.emissiveIntensity = 0.35 + (p.charge || 0) * 0.35;
      toon.emissive.setRGB(p.glow, p.glow * 0.8, p.glow * 0.8); toon.emissiveIntensity = Math.max(p.flash, p.glow);
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); },
  };
}
