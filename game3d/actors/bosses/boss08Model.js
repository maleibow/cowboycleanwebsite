import * as THREE from 'three';
import { Builder } from '../modelKit.js';
import { createToon, makeOutline } from '../../render/materials.js';

// THE EYE, the stage-8 boss (original: a white #ecf0f1 eyeball with a red #e74c3c iris and a black pupil; shut it is a flat black slit with two lash strokes): a huge bloodshot eyeball
// ringed by two lilac eyelids and a skirt of cloud. SHUT (eyelids closed, wrapped in a pearly shield bubble) he is invulnerable; OPEN (lids swung back, iris and pupil staring at you) he is hittable.
// rig.pose({ open (0 shut .. 1 wide), lookX, lookY, charge, shield (0..1), flash, glow, t, scale, sq, shakeX, shakeZ, lean, roll })
const R = 1.5;
const SHIELD_VERT = 'varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }';
const SHIELD_FRAG = 'uniform float uA, uT; uniform vec3 uC1, uC2; varying vec3 vN, vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV))); float band = 0.5 + 0.5 * sin(f * 9.0 - uT * 3.0); vec3 col = mix(uC1, uC2, band) * 1.4; gl_FragColor = vec4(col, (0.1 + pow(f, 1.8) * 0.75) * uA); }';

export function createBoss08Model() {
  const root = new THREE.Group(); root.name = 'boss8'; root.matrixAutoUpdate = false;
  const body = new THREE.Group(); root.add(body);
  const toon = createToon({ vertexColors: true, grime: false, rimStrength: 1.0 });
  const irisMat = createToon({ color: 0xe74c3c, emissive: 0xff2a2a, emissiveIntensity: 1.2, grime: false, rim: false, tint: false });
  const glowMat = createToon({ vertexColors: true, grime: false, rim: false, tint: false, emissive: 0x606060, emissiveIntensity: 0.4 });
  const mk = (g, parent, mat = toon, outline = true) => { const m = new THREE.Mesh(g.build ? g.build() : g, mat); m.castShadow = true; parent.add(m); if (outline) makeOutline(m, { width: 0.004 }); return m; };
  const J = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const B = () => new Builder({ ico: true });

  // the eyeball (turns to look at the player) with veins, a big iris and pupil on its +z face
  const ball = J(body, 0, 0, 0);
  const eb = B().sphere(R, 0xfff6f6, { p: [0, 0, 0], ao: 0.04, jitter: 0.012 });
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.283, el = 0.5 + (i % 3) * 0.3; eb.cyl(0.018, 0.012, 0.8, 0xe86a7a, { p: [Math.cos(a) * 1.18 * Math.cos(el * 0.6) * 0.96, Math.sin(a) * 1.0, 0.8 + Math.cos(el) * 0.1], r: [0, 0, a + 1.4], seg: 3, ao: 0 }); }   // bloodshot veins
  mk(eb, ball);
  const iris = J(ball, 0, 0, R - 0.04), ib = B().add(new THREE.CylinderGeometry(0.78, 0.78, 0.16, 20).rotateX(Math.PI / 2), 0xe74c3c, { p: [0, 0, 0], ao: 0 }).add(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 18).rotateX(Math.PI / 2), 0xb3221c, { p: [0, 0, 0.02], ao: 0 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; ib.box(0.05, 0.26, 0.05, 0xff8a7a, { p: [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.1], r: [0, 0, a], ao: 0 }); }
  mk(ib, iris, irisMat, false);
  const pupil = J(iris, 0, 0, 0.12); mk(B().add(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16).rotateX(Math.PI / 2), 0x120a14, { p: [0, 0, 0], ao: 0 }).sphere(0.1, 0xffffff, { p: [-0.12, 0.12, 0.08], ao: 0 }), pupil, toon, false);

  // two eyelids: shells just larger than the ball; shut they close into a full sphere with a lash line, open they swing back
  const lidGeo = (top) => new THREE.SphereGeometry(R + 0.1, 22, 12, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2);
  const lidCol = 0xe3d4f6, lidB = (top) => { const g = lidGeo(top); const n = g.attributes.position.count, col = new Float32Array(n * 3), c = new THREE.Color(); for (let i = 0; i < n; i++) { c.set(lidCol).lerp(new THREE.Color(0xffffff), Math.max(0, g.attributes.position.getZ(i)) * 0.15); col.set([c.r, c.g, c.b], i * 3); } g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g; };
  const upper = J(body, 0, 0, 0), lower = J(body, 0, 0, 0); mk(lidB(true), upper); mk(lidB(false), lower);
  const lashes = B(); for (let i = 0; i < 11; i++) { const a = -1.15 + i * 0.23, x = Math.sin(a) * (R + 0.16), z = Math.cos(a) * (R + 0.16); lashes.cone(0.055, 0.5, 0x3a2a5a, { p: [x, -0.02, z], r: [Math.PI / 2 + 0.2, a, 0], seg: 4, ao: 0 }); }
  const crease = B().add(new THREE.TorusGeometry(R + 0.12, 0.035, 4, 30, Math.PI), 0x4a3a7a, { p: [0, 0, 0], r: [0, Math.PI / 2, 0], ao: 0 }); const seam = J(body, 0, 0, 0); mk(lashes, seam, toon, false); mk(crease, seam, toon, false);

  // cloud skirt + little puffball wings
  const skirt = B(); for (const [x, y, z, r, c] of [[0, -1.55, 0, 1.05, 0xffffff], [-1.0, -1.35, 0.2, 0.8, 0xf2ecfa], [1.0, -1.4, 0.0, 0.85, 0xffffff], [0, -1.3, -0.9, 0.8, 0xece4fa], [-0.5, -1.7, 0.6, 0.6, 0xffffff], [0.55, -1.75, 0.5, 0.65, 0xf6f0fc]]) skirt.sphere(r, c, { p: [x, y, z], s: [1.2, 0.8, 1.2], jitter: 0.07, ao: 0.1 });
  mk(skirt, body);
  const wings = [-1, 1].map((sd) => { const w = J(body, sd * 1.65, 0.1, -0.2), wb = B(); for (let i = 0; i < 4; i++) wb.sphere(0.55 - i * 0.07, i % 2 ? 0xffffff : 0xf2ecfa, { p: [sd * (0.3 + i * 0.62), 0.12 * i, -0.05 * i], s: [1.3, 0.8, 0.8], jitter: 0.05, ao: 0.1 }); mk(wb, w); return w; });

  const shieldMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, uniforms: { uA: { value: 1 }, uT: { value: 0 }, uC1: { value: new THREE.Color('#bfe4ff') }, uC2: { value: new THREE.Color('#ffc2f0') } }, vertexShader: SHIELD_VERT, fragmentShader: SHIELD_FRAG });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.3, 24, 14), shieldMat); shield.renderOrder = 3; body.add(shield);
  const sparks = B(); for (let i = 0; i < 6; i++) sparks.cone(0.12, 0.7, new THREE.Color(2.2, 1.9, 0.6), { p: [Math.cos(i * 1.05) * 2.0, Math.sin(i * 1.05) * 1.2, 0.6], r: [Math.PI, 0, i], seg: 4, ao: 0 }); const bolt = mk(sparks, body, glowMat, false);

  return {
    root, body, toon, irisMat, shield,
    pose(p) {
      const sq = p.sq || 1, k = 1 / Math.sqrt(sq), o = p.open ?? 0;
      body.scale.set(k * p.scale, sq * p.scale, k * p.scale); body.rotation.set(p.lean || 0, 0, (p.roll || 0) + Math.sin(p.t * 1.3) * 0.03); body.position.set(p.shakeX || 0, Math.sin(p.t * 1.9) * 0.1, p.shakeZ || 0);
      upper.rotation.x = -o * 1.25; lower.rotation.x = o * 1.25; seam.visible = o < 0.85; seam.rotation.x = 0; seam.scale.setScalar(1);
      ball.rotation.set(-(p.lookY || 0), p.lookX || 0, 0); iris.scale.setScalar(0.9 + 0.2 * (p.charge || 0)); pupil.scale.setScalar(0.7 + 0.8 * o * (1 - 0.5 * (p.charge || 0)));
      irisMat.emissiveIntensity = 0.9 + o * 1.2 + (p.charge || 0) * 2.5 + (p.flash > 0 ? 2 : 0);
      wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(p.t * 5 + i) * 0.22; });
      shield.visible = (p.shield || 0) > 0.02; shieldMat.uniforms.uA.value = (p.shield || 0) * (0.85 + 0.15 * Math.sin(p.t * 18)); shieldMat.uniforms.uT.value = p.t; shield.scale.setScalar(1 + (p.charge || 0) * 0.06 * Math.sin(p.t * 40));
      bolt.visible = (p.charge || 0) > 0.2 && o < 0.5 && Math.sin(p.t * 40) > 0; glowMat.emissiveIntensity = 0.35 + (p.charge || 0) * 0.4;
      toon.emissive.setRGB(p.glow, p.glow * 0.8, p.glow * 0.8); toon.emissiveIntensity = Math.max(p.flash, p.glow);
    },
    dispose() { root.traverse((o) => { o.geometry?.dispose?.(); }); shieldMat.dispose(); },
  };
}
