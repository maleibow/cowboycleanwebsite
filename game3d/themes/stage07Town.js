import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { frame, toon, mesh, glowToon, glowBasic, checkpointFlagFor, bossGateFor, arenaFor, fluidDress } from './dressKit.js';
import { BAND, SPARK } from './stage07Props.js';

// Set dressing for Rainbow Island: the beach village (side section), checkpoint flags, the rainbow-arch boss gate, the flower-ring arena, the turquoise lagoon under every gap and
// the bubbling mud pools. Frame: x lateral, y up, z = -(s - seg.s0).
const B = () => new Builder({ boxSeg: 1, ico: true });
const PASTEL = [0xff9ad5, 0xffe36a, 0x7fd8ff, 0xc9a0ff, 0x9af0b0, 0xffb07a];
const WOOD = 0xb8864a;

function signTexture(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(5, 5, 246, 86);
  g.fillStyle = fg; g.font = 'bold 52px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 52, 220);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const HUTS = [{ w: 7, h: 4.5, c: 0xff9ad5, sign: 'JUICE' }, { w: 8, h: 5.2, c: 0x7fd8ff, sign: 'SURF' }, { w: 6, h: 4.2, c: 0xffe36a, sign: 'ICE CREAM' }, { w: 8, h: 5, c: 0x9af0b0, sign: 'SPLASH' }, { w: 7, h: 4.6, c: 0xc9a0ff, sign: 'KITES' }, { w: 8, h: 5.2, c: 0xffb07a, sign: 'SMOOTHIES' }];
export function beachVillage(seg, ctx) {
  const g = frame(seg, ctx), fx = -3.4, D = 5.5, wall = B(), glow = B(), signs = []; let z1 = -2;
  for (const [i, h] of HUTS.entries()) {
    const z0 = z1 - h.w, zc = (z0 + z1) / 2;
    wall.box(D, h.h, h.w, h.c, { p: [fx - D / 2, h.h / 2, zc], radius: 0.25, ao: 0.2 }).add(new THREE.ConeGeometry(D * 0.95, 2.6, 4), 0xd6a45c, { p: [fx - D / 2, h.h + 1.2, zc], r: [0, Math.PI / 4, 0], s: [1.05, 1, h.w / D * 1.0], ao: 0.1 });   // a thatched pyramid roof
    for (let k = 0; k < 8; k++) wall.box(0.05, 0.05, h.w, 0xffffff, { p: [fx + 0.03, 0.8 + k * 0.5, zc], radius: 0.01, ao: 0 });
    wall.box(0.14, 1.9, 1.3, 0x3a2a1a, { p: [fx + 0.06, 0.95, zc - h.w * 0.25], radius: 0.05 }); glow.box(0.05, 1.2, 2.6, SPARK, { p: [fx + 0.1, 2.2, zc + h.w * 0.15], radius: 0.05, ao: 0 });
    const n = Math.floor(h.w / 0.55); for (let k = 0; k < n; k++) wall.box(1.8, 0.1, h.w / n - 0.02, k % 2 ? 0xffffff : BAND[(i * 2 + k) % 7], { p: [fx + 0.95, 3.0, z0 + (k + 0.5) * (h.w / n)], r: [0, 0, 0.25], radius: 0.02, ao: 0 });   // a striped awning
    const tex = signTexture(h.sign, '#ffffff', '#' + new THREE.Color(h.c).multiplyScalar(0.6).getHexString()), sm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(4.4, h.w - 1.2), 1.0), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    sm.rotation.y = Math.PI / 2; sm.position.set(fx + 0.4, 3.9, zc); g.add(sm); signs.push(tex, sm.material, sm.geometry);
    z1 = z0 - 1.2;
  }
  const props = B();
  for (const z of [-5, -17, -31, -46, -60]) { props.cyl(0.05, 0.05, 2.6, 0xf2efe6, { p: [-2.4, 1.3, z], seg: 4 }); for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.283; props.add(new THREE.ConeGeometry(1.2, 0.5, 3), k % 2 ? 0xffffff : BAND[k % 7], { p: [-2.4, 2.5, z], r: [0, a, 0], s: [1, 1, 0.4], ao: 0 }); } }   // beach parasols
  for (const z of [-11, -26, -40, -55]) props.cyl(0.07, 0.09, 3.2, 0xf2efe6, { p: [-2.2, 1.6, z], seg: 5 }).sphere(0.22, PASTEL[2], { p: [-2.2, 3.3, z], ao: 0 });
  mesh(props, toon(ctx), g, true); mesh(wall, toon(ctx), g, true); mesh(glow, glowBasic(), g);
  return { object: g, dispose() { signs.forEach((x) => x.dispose?.()); } };
}

export const checkpoint = checkpointFlagFor({ pole: 0xffffff, cap: 0xffe135, base: 0xb8864a, clean: 0xffffff, grey: 0xaab4c8, emblem(k) {   // a rainbow arc
  const cs = ['#ff3b30', '#ff9500', '#ffe135', '#34c759', '#32ade6', '#5856d6', '#af52de']; k.fillStyle = '#bfe8ff'; k.fillRect(0, 0, 128, 80);
  k.lineWidth = 6; cs.forEach((c, i) => { k.strokeStyle = c; k.beginPath(); k.arc(64, 70, 54 - i * 6.5, Math.PI, 0); k.stroke(); });
} });
export const bossGate = bossGateFor({ stone: 0xf4efe6, light: 0xffffff, wall: 0x8ad0a0, door: 0x7fd8ff, doorDark: 0x4a9ac0, lamp: 0xffe36a,
  emblem(b, z) {   // a rainbow rising over the gate with a cloud at each foot
    for (let i = 0; i < 7; i++) b.add(new THREE.TorusGeometry(4.2 - i * 0.34, 0.2, 4, 18, Math.PI), BAND[i], { p: [0, 9.4, z + 0.4], s: [1, 1, 0.5], ao: 0 });
    for (const sx of [-1, 1]) b.sphere(0.9, 0xffffff, { p: [sx * 4.1, 9.7, z + 0.4], s: [1.3, 0.8, 1], jitter: 0.1, ao: 0 }).sphere(0.65, 0xffffff, { p: [sx * 3.3, 9.6, z + 0.6], jitter: 0.1, ao: 0 });
  } });

function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#4cc878'; k.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1600; i++) { k.fillStyle = `rgba(${40 + (i % 40)},${150 + (i % 50)},${80 + (i % 40)},.3)`; k.fillRect((i * 97) % 512, (i * 223) % 512, 2 + (i % 5), 3 + (i % 5)); }
  const cs = ['#ff3b30', '#ff9500', '#ffe135', '#34c759', '#32ade6', '#5856d6', '#af52de']; k.lineWidth = 12; cs.forEach((cc, i) => { k.strokeStyle = cc; k.beginPath(); k.arc(256, 256, 244 - i * 12, 0, 7); k.stroke(); });
  k.fillStyle = '#ffffff'; for (let i = 0; i < 18; i++) { const a = (i / 18) * 6.283; k.beginPath(); k.arc(256 + Math.cos(a) * 130, 256 + Math.sin(a) * 130, 9, 0, 7); k.fill(); k.fillStyle = i % 2 ? '#ffe36a' : '#ff9ad5'; k.beginPath(); k.arc(256 + Math.cos(a) * 130, 256 + Math.sin(a) * 130, 5, 0, 7); k.fill(); k.fillStyle = '#ffffff'; }
  k.fillStyle = '#ffffff'; k.beginPath(); k.arc(256, 256, 50, 0, 7); k.fill(); k.fillStyle = '#bfe8ff'; k.beginPath(); k.arc(256, 256, 34, 0, 7); k.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const arena = arenaFor({ texture: arenaTexture, glow: 0xffe36a, ring(rim, tor, R, cz, rng) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.05, 0.05), x = Math.cos(a) * (R + 1.8), z = cz + Math.sin(a) * (R + 1.8);
    if (z > cz + R * 0.75 && Math.abs(x) < 5) continue;
    if (i % 3 === 0) { const h = rng.range(2.4, 4), r = rng.range(1.0, 1.6); rim.sphere(r, PASTEL[i % 6], { p: [x, h, z], s: [1, 1.4, 1], jitter: 0.06 }); rim.cyl(0.04, 0.04, h * 0.9, 0xf2efe6, { p: [x, h * 0.45, z], seg: 3 }); }          // balloons on strings
    else if (i % 3 === 1) { rim.cyl(0.14, 0.18, 4.4, WOOD, { p: [x, 2.2, z], seg: 6, jitter: 0.03 }); for (let k = 0; k < 5; k++) { const ak = k * 1.26; rim.add(new THREE.ConeGeometry(0.3, 2.2, 4), k % 2 ? 0x2fae5a : 0x3dbb6a, { p: [x + Math.cos(ak) * 0.9, 4.4, z + Math.sin(ak) * 0.9], r: [Math.sin(ak) * 1.2, 0, -Math.cos(ak) * 1.2], s: [1, 1, 0.3], ao: 0 }); } }   // palms
    else { const px = Math.cos(a) * (R + 0.7), pz = cz + Math.sin(a) * (R + 0.7); for (let k = 0; k < 5; k++) rim.cyl(0.2, 0.2, 0.3, k % 2 ? 0xffffff : 0xff4a7a, { p: [px, 0.15 + k * 0.3, pz], seg: 6, ao: 0 }); tor.sphere(0.24, SPARK, { p: [px, 1.75, pz], ao: 0 }); }   // candy posts with glowing orbs
  }
} });

// ---------------------------------------------------------------- turquoise lagoon under every gap and bridge; mud pools over the mud patches
export const lagoon = fluidDress({ type: 'water', y: -0.8, beam: true, segments: 14, pad: 1.0, overrides: { deep: '#0a8ab0', shallow: '#4fe0e0', foam: '#ffffff', hi: '#e8ffff', glow: 0.0, speed: 0.6 } });
export const mud = fluidDress({ type: 'sludge', y: -0.3, over: 'patches', segments: 10, overrides: { deep: '#4a2e1a', shallow: '#8a5a32', foam: '#b88a5a', hi: '#d8aa7a', glow: 0.0, speed: 0.18 } });
