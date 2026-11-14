import * as THREE from 'three';
import { Builder } from './modelKit.js';
import { createToon } from '../render/materials.js';

// Mecha-Horse (vehicle upgrade): steel body, yellow blanket and muzzle, red crest/tail, blue glow.
// Faces -Z like the hero. The rider's hips sit at `seatY`. Gallop is driven by horse.update().
export const SEAT_Y = 1.02;
const H = { steel: 0x9aa7b5, steelDark: 0x5c6877, yellow: 0xf1c40f, red: 0xe74c3c, dark: 0x1e2430, blue: 0x35b8ff };

export function createHorse({ toon, mk, J }) {
  const group = new THREE.Group(); group.name = 'mechaHorse';
  const glow = createToon({ color: H.blue, emissive: H.blue, emissiveIntensity: 2.8, grime: false, rim: false, tint: false });
  const flame = createToon({ color: 0xff7a1a, emissive: 0xff5a10, emissiveIntensity: 2.6, grime: false, rim: false, tint: false });
  const body = J('horseBody', group, 0, 0.78, 0);
  const neck = J('neck', body, 0, 0.18, -0.62);
  const headJ = J('horseHead', neck, 0, 0.42, -0.1);
  const tailJ = J('horseTail', body, 0, 0.14, 0.78);
  const legs = [], mkLeg = (x, z) => {
    const hip = J('hip', body, x, -0.2, z), knee = J('knee', hip, 0, -0.32, 0);
    mk(new Builder().box(0.2, 0.42, 0.24, H.steel, { p: [0, -0.15, 0] }).cyl(0.1, 0.1, 0.18, H.steelDark, { p: [0, -0.34, 0], r: [0, 0, Math.PI / 2] }), hip);
    mk(new Builder().cyl(0.04, 0.04, 0.38, H.steelDark, { p: [0, -0.15, 0] })                     // piston
      .cyl(0.17, 0.17, 0.12, H.dark, { p: [0, -0.36, 0], r: [0, 0, Math.PI / 2], seg: 12 }).cyl(0.08, 0.08, 0.14, H.yellow, { p: [0, -0.36, 0], r: [0, 0, Math.PI / 2], seg: 8 }), knee);
    legs.push({ hip, knee, z });
    return hip;
  };
  mkLeg(-0.24, -0.5); mkLeg(0.24, -0.5); mkLeg(-0.24, 0.52); mkLeg(0.24, 0.52);

  mk(new Builder()
    .box(0.58, 0.5, 1.4, H.steel, { p: [0, 0, 0], radius: 0.2 }).box(0.5, 0.42, 0.3, H.yellow, { p: [0, 0.0, -0.62], radius: 0.12 })
    .box(0.66, 0.1, 0.9, H.yellow, { p: [0, 0.28, 0.08], radius: 0.04 })                  // saddle blanket
    .box(0.58, 0.12, 0.7, H.steelDark, { p: [0, 0.32, 0.08], radius: 0.05 })               // saddle
    .box(0.5, 0.1, 1.1, H.steelDark, { p: [0, -0.28, 0], radius: 0.04 })
    .cyl(0.09, 0.09, 0.64, H.steelDark, { p: [0, 0.04, 0.8], r: [0, 0, Math.PI / 2], seg: 10 }), body);
  mk(new Builder().box(0.34, 0.7, 0.36, H.steel, { p: [0, 0.22, -0.06], r: [0.45, 0, 0], radius: 0.12 })
    .box(0.1, 0.5, 0.06, H.red, { p: [0, 0.28, 0.14], r: [0.5, 0, 0], radius: 0.03 })
    .cone(0.06, 0.2, H.red, { p: [0, 0.54, 0.12], r: [0.5, 0, 0], seg: 5 }), neck);
  mk(new Builder().box(0.34, 0.36, 0.62, H.steel, { p: [0, 0.02, -0.18], r: [0.3, 0, 0], radius: 0.13 })
    .box(0.3, 0.24, 0.26, H.yellow, { p: [0, -0.1, -0.5], r: [0.3, 0, 0], radius: 0.09 })
    .cone(0.06, 0.22, H.steelDark, { p: [-0.1, 0.2, 0.0], r: [-0.2, 0, 0.2], seg: 5 }).cone(0.06, 0.22, H.steelDark, { p: [0.1, 0.2, 0.0], r: [-0.2, 0, -0.2], seg: 5 })
    .box(0.05, 0.05, 0.1, H.dark, { p: [-0.18, 0.08, -0.3] }).box(0.05, 0.05, 0.1, H.dark, { p: [0.18, 0.08, -0.3] }), headJ);
  mk(new Builder().cone(0.12, 0.8, H.red, { p: [0, -0.2, 0.3], r: [-1.2, 0, 0], seg: 7 }), tailJ, { outline: true });
  // glowing parts (bloom): eyes, belly ring, exhaust flame
  const eyes = new THREE.Mesh(new Builder().box(0.045, 0.045, 0.06, H.blue, { ao: 0, radius: 0.01, p: [-0.185, 0.085, -0.3] }).box(0.045, 0.045, 0.06, H.blue, { ao: 0, radius: 0.01, p: [0.185, 0.085, -0.3] }).build(), glow);
  headJ.add(eyes);
  const belly = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 20), glow); belly.rotation.x = Math.PI / 2; belly.scale.set(0.8, 2.1, 1); belly.position.y = -0.3; body.add(belly);
  const exhaust = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 7), flame); exhaust.rotation.x = -Math.PI / 2; exhaust.position.set(0, 0.04, 1.05); body.add(exhaust);
  // lights under the horse so it reads as a hover-gallop machine
  const api = {
    group, glow, flame,
    update(t, speed, grounded) {
      const gallop = grounded ? Math.min(1, speed / 9) : 0.25, ph = t * (10 + speed * 0.8);
      legs.forEach((l, i) => {
        const phase = ph + (i < 2 ? 0 : Math.PI * 0.75) + (i % 2) * 0.6;
        l.hip.rotation.x = Math.sin(phase) * 0.7 * gallop + (grounded ? 0 : -0.5);
        l.knee.rotation.x = -Math.max(0, Math.sin(phase + 1.2)) * 0.9 * gallop - (grounded ? 0 : 0.4);
      });
      body.position.y = 0.78 + Math.abs(Math.sin(ph)) * 0.07 * gallop;
      body.rotation.x = Math.sin(ph) * 0.035 * gallop;
      neck.rotation.x = Math.sin(ph + 0.8) * 0.08 * gallop;
      tailJ.rotation.x = 0.3 + Math.sin(ph * 0.5) * 0.12; tailJ.rotation.z = Math.sin(ph * 0.7) * 0.15;
      exhaust.scale.set(1, 0.7 + Math.random() * 0.7 * (0.4 + gallop), 1); glow.emissiveIntensity = 2.4 + Math.sin(t * 6) * 0.5;
    },
  };
  return api;
}
