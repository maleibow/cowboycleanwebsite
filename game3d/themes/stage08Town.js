import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { frame, toon, mesh, glowToon, glowBasic, checkpointFlagFor, bossGateFor, arenaFor, fluidDress } from './dressKit.js';
import { SPARK } from './stage08Props.js';

// Set dressing for Cloud Dream: Slumber Row (the side section: sleepy cloud cottages with nightcap roofs, round windows and floating beds), checkpoint flags, the great
// pearl-eyelid boss gate, the cloud-disc arena with a ring of cumulus and stars, and the soft cloud sea under every gap. Frame: x lateral, y up, z = -(s - seg.s0).
const B = () => new Builder({ boxSeg: 1, ico: true });
const PASTEL = [0xffc2dc, 0xd9c2ff, 0xbfeedd, 0xfff0b8, 0xc2e4ff];
const CAP = [0xff9ac4, 0xb49cf0, 0x8ad8b8, 0xffd36a, 0x8cc4f4];

export function slumberRow(seg, ctx) {
  const g = frame(seg, ctx), rng = ctx.rng, b = B(), glow = B(), fx = -3.4;
  let z = -1;
  for (let i = 0; z > -68; i++) {
    const w = rng.range(6, 8.5), h = rng.range(3.6, 5.2), d = rng.range(4.6, 6), zc = z - w / 2, k = i % 5, cx = fx - d / 2 - 0.2;
    if (i % 4 === 3) { z -= 3.2; continue; }                                                                                       // a gap between cottages
    b.box(d, h, w, 0xfffafd, { p: [cx, h / 2, zc], radius: 0.7, jitter: 0.04, ao: 0.16 });                                       // soft rounded walls
    b.add(new THREE.ConeGeometry(d * 0.78, 3.4, 8), CAP[k], { p: [cx, h + 1.5, zc], r: [0, 0, 0.0], s: [1, 1, w / d], jitter: 0.06, ao: 0.1 });  // a nightcap roof
    b.sphere(0.42, 0xffffff, { p: [cx + 0.7, h + 3.3, zc + w * 0.3], jitter: 0.04, ao: 0 });                                       // its pompom
    b.box(1.6, 0.4, w + 0.6, tone(CAP[k], 0.9), { p: [cx, h + 0.15, zc], radius: 0.15, ao: 0.1 });                                 // the cap's brim
    for (let q = 0; q < 2; q++) { const wz = zc + (q - 0.5) * (w * 0.5); glow.add(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 12).rotateZ(Math.PI / 2), q ? new THREE.Color(1.7, 1.6, 1.1) : new THREE.Color(1.5, 1.35, 1.6), { p: [fx - 0.08, h * 0.6, wz], ao: 0 }); b.add(new THREE.TorusGeometry(0.6, 0.07, 5, 14).rotateY(Math.PI / 2), 0xe6d4f5, { p: [fx - 0.02, h * 0.6, wz], ao: 0 }); }   // round windows
    b.box(0.16, 1.7, 1.0, 0xc9a0e8, { p: [fx - 0.04, 0.85, zc - w * 0.3], radius: 0.06 });                                          // a lilac door
    for (let q = 0; q < 3; q++) b.sphere(0.45 - q * 0.08, 0xffffff, { p: [fx + 0.4, 0.28 + q * 0.12, zc + (q - 1) * 1.8], s: [1.3, 0.7, 1], jitter: 0.04, ao: 0 });   // cloud puffs at the foot
    z -= w + 0.4;
  }
  for (const zz of [-9, -30, -52]) {                                                                                               // floating beds hovering above the street
    const by = 4.0 + (zz % 3) * 0.3; b.box(2.4, 0.3, 1.3, 0xffd9a0, { p: [fx + 0.3, by, zz], radius: 0.06 }).box(2.2, 0.35, 1.1, 0xfff4fa, { p: [fx + 0.3, by + 0.3, zz], radius: 0.15 }).box(0.7, 0.3, 1.0, 0xffc2dc, { p: [fx - 0.7, by + 0.6, zz], radius: 0.14 });
    glow.sphere(0.12, SPARK, { p: [fx + 1.0, by + 1.0, zz], ao: 0 });
  }
  for (const zz of [-5, -21, -38, -56]) { b.cyl(0.07, 0.09, 2.6, 0xf4eefc, { p: [-2.2, 1.3, zz], seg: 5 }); glow.sphere(0.24, SPARK, { p: [-2.2, 2.75, zz], ao: 0 }); }   // dream lamps
  mesh(b, toon(ctx), g, true); mesh(glow, glowBasic(), g);
  return { object: g };
}
function tone(hex, k) { return new THREE.Color(hex).multiplyScalar(k).getHex(); }

export const checkpoint = checkpointFlagFor({ pole: 0xf4eefc, cap: 0xfff0b8, base: 0xd9c2ff, clean: 0xffffff, grey: 0xb4aac8, emblem(k) {   // a crescent moon and a star
  k.fillStyle = '#2a2866'; k.fillRect(0, 0, 128, 80); k.fillStyle = '#fff0b8'; k.beginPath(); k.arc(52, 40, 28, 0, 7); k.fill(); k.fillStyle = '#2a2866'; k.beginPath(); k.arc(64, 34, 24, 0, 7); k.fill();
  k.fillStyle = '#ffffff'; k.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = (i / 10) * 6.283 - 1.57; k.lineTo(96 + Math.cos(a) * r, 28 + Math.sin(a) * r); } k.fill();
} });
export const bossGate = bossGateFor({ stone: 0xf4eefc, light: 0xffffff, wall: 0xd9c2ff, door: 0xc2e4ff, doorDark: 0x8cb4e4, lamp: 0xfff0b8,
  emblem(b, z) {   // a huge sleeping eye above the arch: a white lid with lashes and a closed lilac crease
    b.sphere(2.9, 0xffffff, { p: [0, 11.0, z + 0.3], s: [1.5, 0.75, 0.4], ao: 0 }).sphere(2.7, 0xe9def8, { p: [0, 10.6, z + 0.5], s: [1.5, 0.45, 0.35], ao: 0 });
    for (let i = 0; i < 7; i++) b.cone(0.1, 0.9, 0x5a4a8a, { p: [-2.7 + i * 0.9, 10.2 - Math.abs(i - 3) * 0.12, z + 0.8], r: [Math.PI + (i - 3) * 0.14, 0, 0], seg: 4, ao: 0 });   // lashes
    for (const sx of [-1, 1]) b.sphere(0.9, 0xffffff, { p: [sx * 4.6, 10.0, z + 0.4], s: [1.3, 0.8, 1], jitter: 0.08, ao: 0 });
  } });

function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  const gr = k.createRadialGradient(256, 256, 20, 256, 256, 256); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#f4eefc'); gr.addColorStop(1, '#d9c8f0'); k.fillStyle = gr; k.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { k.fillStyle = `rgba(${200 + (i % 40)},${190 + (i % 40)},${235 + (i % 20)},.22)`; k.beginPath(); k.arc((i * 97) % 512, (i * 223) % 512, 6 + (i % 14), 0, 7); k.fill(); }
  k.strokeStyle = '#c9b4ee'; k.lineWidth = 6; for (const r of [244, 150]) { k.beginPath(); k.arc(256, 256, r, 0, 7); k.stroke(); }
  k.fillStyle = '#fff0b8'; for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; k.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 5 : 13, aa = (j / 10) * 6.283 - 1.57; k.lineTo(256 + Math.cos(a) * 200 + Math.cos(aa) * r, 256 + Math.sin(a) * 200 + Math.sin(aa) * r); } k.fill(); }   // a ring of stars
  k.fillStyle = '#ffffff'; k.beginPath(); k.arc(256, 256, 50, 0, 7); k.fill(); k.fillStyle = '#ffc2dc'; k.beginPath(); k.arc(256, 256, 30, 0, 7); k.fill(); k.fillStyle = '#7a62b8'; k.beginPath(); k.arc(256, 256, 12, 0, 7); k.fill();   // an eye in the middle
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const arena = arenaFor({ texture: arenaTexture, glow: 0xfff0b8, ring(rim, tor, R, cz, rng) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.05, 0.05), x = Math.cos(a) * (R + 1.8), z = cz + Math.sin(a) * (R + 1.8);
    if (z > cz + R * 0.75 && Math.abs(x) < 5) continue;
    if (i % 2 === 0) { const h = rng.range(1.2, 2.6); for (let k = 0; k < 3; k++) rim.sphere(rng.range(0.9, 1.5), k % 2 ? 0xf2ecfa : 0xffffff, { p: [x + rng.range(-0.9, 0.9), h * (0.3 + k * 0.3) - 0.4, z + rng.range(-0.9, 0.9)], s: [1.2, 0.9, 1.2], jitter: 0.08, ao: 0.1 }); }   // cumulus around the rim
    else { const px = Math.cos(a) * (R + 0.7), pz = cz + Math.sin(a) * (R + 0.7); rim.cyl(0.06, 0.1, 2.0, 0xf4eefc, { p: [px, 1.0, pz], seg: 5 }); tor.sphere(0.24, SPARK, { p: [px, 2.1, pz], ao: 0 }); if (i % 4 === 1) tor.add(new THREE.OctahedronGeometry(0.28, 0), new THREE.Color(1.8, 1.6, 0.8), { p: [px, 3.2 + (i % 3) * 0.3, pz], s: [0.8, 1.4, 0.8], ao: 0 }); }   // pearl posts and floating star-gems
  }
} });

// ---------------------------------------------------------------- the cloud sea: a slow milky swirl under every gap and cloud bridge
export const cloudSea = fluidDress({ type: 'water', y: -4.2, beam: true, segments: 12, pad: 1.0, width: 44, overrides: { deep: '#e6d6f6', shallow: '#ffffff', foam: '#ffffff', hi: '#fff4fa', glow: 0.0, speed: 0.12, flow: 0.12, amp: 0.1, scale: 0.28, bands: 3 } });
