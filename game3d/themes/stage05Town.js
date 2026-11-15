import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { frame, toon, mesh, glowToon, glowBasic, checkpointFlagFor, bossGateFor, arenaFor, fluidDress } from './dressKit.js';
import { WARM, GAS, CORAL, TRI } from './stage05Props.js';

// Set dressing for Paris Nights: the café street (side section), checkpoint flags, the opera-house boss gate, the plaza arena and the Seine under every gap.
// Frame: x lateral, y up, z = -(s - seg.s0).
const B = () => new Builder({ boxSeg: 1, ico: true });
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const STONE = 0xcdbfa4, ZINC = 0x6f7f98;

function signTexture(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96); g.strokeStyle = fg; g.lineWidth = 5; g.strokeRect(6, 6, 244, 84);
  g.fillStyle = fg; g.font = 'bold 50px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 52, 220);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SHOPS = [
  { w: 9, h: 10, sign: 'CAFÉ', bg: '#1a2a4a', fg: '#ffe9a8', awn: 0xc0392b }, { w: 7, h: 9, sign: 'BOULANGERIE', bg: '#4a2a1a', fg: '#ffe9a8', awn: 0x2c5aa8 },
  { w: 10, h: 11, sign: 'BRASSERIE', bg: '#14301f', fg: '#f2efe6', awn: 0x1f7a4a }, { w: 7, h: 9.5, sign: 'FLEURS', bg: '#3a1a3a', fg: '#ffb0d0', awn: 0xd18a10 },
  { w: 9, h: 10, sign: 'BISTRO', bg: '#2a1a1a', fg: '#ffd23a', awn: 0xc0392b }, { w: 9, h: 10.5, sign: 'LIBRAIRIE', bg: '#1a2a3a', fg: '#e8f5d0', awn: 0x2c5aa8 },
];
export function cafeStreet(seg, ctx) {
  const g = frame(seg, ctx), fx = -3.4, D = 7, wall = B(), glow = B(), signs = []; let z1 = -2;
  for (const [bi, sh] of SHOPS.entries()) {
    const z0 = z1 - sh.w, zc = (z0 + z1) / 2;
    wall.box(D, sh.h, sh.w, bi % 2 ? tone(STONE, 0.92) : STONE, { p: [fx - D / 2, sh.h / 2, zc], radius: 0.05, ao: 0.25 }).box(1.0, 0.5, sh.w + 0.3, tone(STONE, 1.1), { p: [fx - 0.4, sh.h + 0.1, zc], radius: 0.04 }).box(D - 0.6, 2.4, sh.w - 0.4, ZINC, { p: [fx - D / 2, sh.h + 1.3, zc], radius: 0.05 });
    for (let y = 3.6; y < sh.h; y += 2.1) wall.box(0.05, 0.08, sh.w, tone(STONE, 0.8), { p: [fx + 0.03, y, zc], radius: 0.01, ao: 0 });
    wall.box(0.14, 2.4, 1.5, 0x15161c, { p: [fx + 0.06, 1.2, zc - sh.w * 0.25], radius: 0.03 }); glow.box(0.05, 1.9, 3.4, WARM, { p: [fx + 0.1, 1.3, zc + sh.w * 0.15], radius: 0.03, ao: 0 });   // door + the lit café window
    for (let i = 0; i < Math.floor(sh.w / 2.8); i++) for (let r = 0; r < Math.floor((sh.h - 4.2) / 2.1); r++) { const wz = zc + (i - (Math.floor(sh.w / 2.8) - 1) / 2) * 2.8; wall.box(0.12, 1.3, 0.8, 0x141c2c, { p: [fx + 0.05, 4.4 + r * 2.1, wz], radius: 0.03 }); if ((bi + i + r) % 3 < 2) glow.box(0.05, 1.1, 0.62, WARM, { p: [fx + 0.12, 4.4 + r * 2.1, wz], radius: 0.02, ao: 0 }); wall.box(0.5, 0.06, 1.1, 0x1c2230, { p: [fx + 0.3, 3.7 + r * 2.1, wz], radius: 0.01, ao: 0 }); }   // windows + iron balconies
    const n = Math.floor(sh.w / 0.6);
    for (let i = 0; i < n; i++) wall.box(2.0, 0.1, sh.w / n - 0.02, i % 2 ? 0xf4efe6 : sh.awn, { p: [fx + 1.1, 3.0, z0 + (i + 0.5) * (sh.w / n)], r: [0, 0, 0.22], radius: 0.02, ao: 0 });   // the café awning
    const tex = signTexture(sh.sign, sh.bg, sh.fg), sm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.4, sh.w - 1.5), 1.1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) }));
    sm.rotation.y = Math.PI / 2; sm.position.set(fx + 0.5, 3.9, zc); g.add(sm); signs.push(tex, sm.material, sm.geometry);
    z1 = z0 - 0.4;
  }
  const props = B();
  for (const z of [-5, -17, -29, -42, -55]) { props.cyl(0.3, 0.3, 0.05, 0x2a2e38, { p: [-2.4, 0.76, z], seg: 8 }).cyl(0.04, 0.05, 0.74, 0x1c2230, { p: [-2.4, 0.38, z], seg: 4 }); for (const dz of [-0.6, 0.6]) props.cyl(0.17, 0.17, 0.04, 0xd35400, { p: [-2.4, 0.46, z + dz], seg: 7 }).cyl(0.02, 0.02, 0.44, 0x1c2230, { p: [-2.4, 0.22, z + dz], seg: 3, ao: 0 }); }   // terrace tables
  for (const z of [-11, -35, -50]) { props.cyl(0.06, 0.08, 3.6, 0x1c2230, { p: [-2.2, 1.8, z], seg: 5 }).cyl(0.16, 0.12, 0.2, 0x1c2230, { p: [-2.2, 3.65, z], seg: 6 }); glow.cyl(0.14, 0.1, 0.34, GAS, { p: [-2.2, 3.9, z], seg: 6, ao: 0 }); }   // gas lamps
  mesh(props, toon(ctx), g, true); mesh(glow, glowBasic(), g); mesh(wall, toon(ctx), g, true);
  return { object: g, dispose() { signs.forEach((x) => x.dispose?.()); } };
}

export const checkpoint = checkpointFlagFor({ pole: 0xd8d2c0, cap: 0xffd23a, base: 0x3a3a48, clean: 0x2c5aa8, grey: 0x56607a, emblem(k) {   // a fleur-de-lis on a tricolour band
  k.fillStyle = '#2c5aa8'; k.fillRect(0, 0, 43, 80); k.fillStyle = '#f4efe6'; k.fillRect(43, 0, 42, 80); k.fillStyle = '#c0392b'; k.fillRect(85, 0, 43, 80);
  k.fillStyle = '#ffd23a'; k.beginPath(); k.moveTo(64, 12); k.quadraticCurveTo(80, 34, 64, 50); k.quadraticCurveTo(48, 34, 64, 12); k.fill(); k.beginPath(); k.ellipse(50, 48, 8, 14, 0.9, 0, 7); k.ellipse(78, 48, 8, 14, -0.9, 0, 7); k.fill(); k.fillRect(48, 56, 32, 5); k.fillRect(61, 56, 6, 16);
} });
export const bossGate = bossGateFor({ stone: 0xb8ab90, light: 0xd8ccb0, wall: 0x6f7f98, door: 0x1c2230, doorDark: 0x0f121c, lamp: 0xffc060,
  emblem(b, z) {   // an opera-house pediment: a gilded lyre between two golden statues
    b.box(7.6, 1.2, 1.2, 0xd8ccb0, { p: [0, 10.0, z], radius: 0.1 }).cone(4.2, 2.0, 0xb8ab90, { p: [0, 11.5, z], seg: 3, r: [0, Math.PI / 2, 0] });
    b.cyl(0.07, 0.07, 1.5, 0xe6b422, { p: [-0.5, 10.9, z + 0.7], seg: 4 }).cyl(0.07, 0.07, 1.5, 0xe6b422, { p: [0.5, 10.9, z + 0.7], seg: 4 }).add(new THREE.TorusGeometry(0.75, 0.07, 4, 12, Math.PI), 0xe6b422, { p: [0, 10.9, z + 0.7], r: [0, 0, Math.PI], ao: 0 });
    for (const sx of [-1, 1]) { b.cyl(0.3, 0.4, 1.2, 0xe6b422, { p: [sx * 3.4, 11.3, z], seg: 6 }).sphere(0.3, 0xe6b422, { p: [sx * 3.4, 12.2, z], ao: 0 }); }
  } });

function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#4a5064'; k.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 22) for (let x = (y / 22) % 2 ? 0 : 11; x < 512; x += 22) { k.fillStyle = `rgb(${70 + ((x * 7 + y * 3) % 34)},${76 + ((x * 5 + y) % 30)},${96 + ((x + y * 5) % 30)})`; k.fillRect(x + 1, y + 1, 19, 19); }   // cobbles
  k.strokeStyle = '#c9a84a'; k.lineWidth = 6; for (const r of [240, 170, 96]) { k.beginPath(); k.arc(256, 256, r, 0, 7); k.stroke(); }
  k.strokeStyle = '#e8e0cc'; k.lineWidth = 4; for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283; k.beginPath(); k.moveTo(256 + Math.cos(a) * 100, 256 + Math.sin(a) * 100); k.lineTo(256 + Math.cos(a) * 166, 256 + Math.sin(a) * 166); k.stroke(); }
  k.fillStyle = '#1c2a44'; k.beginPath(); k.arc(256, 256, 62, 0, 7); k.fill(); k.strokeStyle = '#c9a84a'; k.lineWidth = 8; k.stroke(); k.fillStyle = '#6fb8e8'; k.beginPath(); k.arc(256, 256, 46, 0, 7); k.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const arena = arenaFor({ texture: arenaTexture, glow: 0xffc060, ring(rim, tor, R, cz, rng) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.04, 0.04), x = Math.cos(a) * (R + 2.4), z = cz + Math.sin(a) * (R + 2.4);
    if (z > cz + R * 0.75 && Math.abs(x) < 5) continue;
    if (i % 3 === 0) { const h = rng.range(9, 14), w = rng.range(5, 7); rim.box(w, h, w, i % 2 ? STONE : tone(STONE, 0.88), { p: [x * 1.2, h / 2, cz + (z - cz) * 1.2], r: [0, -a, 0], radius: 0.05, jitter: 0.02 }).box(w - 0.6, 2.4, w - 0.6, ZINC, { p: [x * 1.2, h + 1.2, cz + (z - cz) * 1.2], r: [0, -a, 0], radius: 0.05 }); for (let r = 0; r < 3; r++) tor.box(0.55, 1.0, 0.1, WARM, { p: [x * 1.2 - Math.cos(a) * (w / 2 + 0.05), 3 + r * 2.4, cz + (z - cz) * 1.2 - Math.sin(a) * (w / 2 + 0.05)], r: [0, -a + Math.PI / 2, 0], radius: 0.01, ao: 0 }); }
    else if (i % 3 === 1) { const px = Math.cos(a) * (R + 1.2), pz = cz + Math.sin(a) * (R + 1.2); rim.cyl(0.2, 0.28, 1.0, tone(STONE, 0.9), { p: [px, 0.5, pz], seg: 7 }).sphere(0.28, tone(STONE, 1.05), { p: [px, 1.15, pz], ao: 0 }); }       // stone bollards
    else { const px = Math.cos(a) * (R + 0.8), pz = cz + Math.sin(a) * (R + 0.8); rim.cyl(0.07, 0.11, 3.8, 0x1c2230, { p: [px, 1.9, pz], seg: 5 }); tor.cyl(0.16, 0.11, 0.34, GAS, { p: [px, 4.0, pz], seg: 6, ao: 0 }); }   // gas lamps
  }
} });

// ---------------------------------------------------------------- the Seine: a dark, lamp-glittering river under every gap and awning run
export const river = fluidDress({ type: 'water', y: -0.9, beam: true, segments: 14, pad: 1.0, overrides: { deep: '#0a1226', shallow: '#244470', foam: '#8a7a5a', hi: '#a8905a', glow: 0.0, speed: 0.35 } });
