import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { frame, toon, mesh, glowBasic, checkpointFlagFor, bossGateFor, arenaFor, fluidDress } from './dressKit.js';
import { GLOW, WINDOW, STONES } from './stage09Props.js';

// Set dressing for the Haunted Village: the crooked main street (side section), checkpoint flags, the iron cemetery boss gate, the graveyard arena, the black bog under every gap, the stone
// piers of the swinging gates and the glow-stones that mark the path through the lights-out section. Frame: x lateral, y up, z = -(s - seg.s0).
const B = () => new Builder({ boxSeg: 1, ico: true });
const IRON = 0x1c1f24, IRON2 = 0x2a2e34, MOSS = 0x3f5a42;

export function hauntedRow(seg, ctx) {
  const g = frame(seg, ctx), rng = ctx.rng, b = B(), glow = B(), fx = -3.4;
  let z = -1;
  for (let i = 0; z > -68; i++) {
    const w = rng.range(5.5, 8), h = rng.range(3.6, 6), d = rng.range(4.5, 6), zc = z - w / 2, lean = rng.range(-0.07, 0.07);
    if (i % 3 === 2) { z -= 4.5; continue; }                                                                                  // a gap between houses (a fence or a tree stands there)
    b.box(d, h, w, i % 2 ? 0x34343e : 0x3e3e48, { p: [fx - d / 2 - 0.2, h / 2, zc], r: [0, 0, lean], radius: 0.1, jitter: 0.08, ao: 0.28 }).box(d - 0.5, 2.4, w - 0.6, 0x44444e, { p: [fx - d / 2 - 0.4, h + 1.1, zc], r: [0, 0, -lean * 1.4], radius: 0.1, jitter: 0.08, ao: 0.28 });
    b.add(new THREE.ConeGeometry(d * 0.78, 3.0, 4), 0x2a2e36, { p: [fx - d / 2 - 0.4, h + 3.9, zc], r: [0, Math.PI / 4, lean * 2], s: [1, 1, w / d * 0.9], jitter: 0.05, ao: 0.2 });
    for (let k = 0; k < Math.floor(w / 2.4); k++) { const wz = zc + (k - (Math.floor(w / 2.4) - 1) / 2) * 2.4; b.box(0.14, 1.1, 0.8, 0x10141a, { p: [fx - 0.1, h * 0.5, wz], r: [lean, 0, 0], radius: 0.03 }); glow.box(0.06, 0.9, 0.62, k % 2 ? WINDOW : new THREE.Color(0.9, 1.6, 0.9), { p: [fx - 0.06, h * 0.5, wz], radius: 0.02, ao: 0 }); }   // sickly green windows
    if (i % 2 === 0) b.box(0.7, 2.8, 0.7, 0x2a2a32, { p: [fx - d + 0.3, h + 4.2, zc + 0.8], r: [0, 0, 0.12], radius: 0.05 });   // a crooked chimney
    z -= w + 0.3;
  }
  for (const zz of [-8, -26, -47]) for (let k = 0; k < 3; k++) { b.cyl(0.03, 0.03, 1.3, IRON, { p: [fx + 1.6, 0.65, zz - k * 0.28], seg: 4, ao: 0 }).cone(0.05, 0.2, IRON2, { p: [fx + 1.6, 1.4, zz - k * 0.28], seg: 4, ao: 0 }); }   // iron fence bits
  for (const zz of [-15, -39, -61]) { b.cyl(0.07, 0.12, 2.4, IRON, { p: [fx + 1.4, 1.2, zz], seg: 5 }); glow.sphere(0.16, GLOW, { p: [fx + 1.4, 2.6, zz], s: [1, 1.3, 1], ao: 0 }); }   // lamp posts
  for (const zz of [-20, -53]) { for (let q = 0; q < 4; q++) b.cyl(0.06, 0.2, 1.4, 0x2f2620, { p: [fx - 4.5 + q * 0.3, 0.9 + q * 0.9, zz], r: [0.1, 0, 0.3 * (q % 2 ? 1 : -1)], seg: 4, ao: 0.1 }); }   // a dead tree
  mesh(b, toon(ctx), g, true); mesh(glow, glowBasic(), g);
  return { object: g };
}

export const checkpoint = checkpointFlagFor({ pole: 0x2a2e34, cap: 0x7affb0, base: 0x1c1f24, clean: 0xaaffd0, grey: 0x3a4048, emblem(k) {   // a green candle flame in a lantern
  k.fillStyle = '#10161a'; k.fillRect(0, 0, 128, 80); k.strokeStyle = '#4a525c'; k.lineWidth = 5; k.strokeRect(36, 12, 56, 58);
  k.fillStyle = '#7affb0'; k.beginPath(); k.moveTo(64, 20); k.quadraticCurveTo(80, 40, 72, 56); k.quadraticCurveTo(64, 64, 56, 56); k.quadraticCurveTo(50, 40, 64, 20); k.fill(); k.fillStyle = '#e8fff0'; k.beginPath(); k.ellipse(64, 50, 5, 9, 0, 0, 7); k.fill();
} });
export const bossGate = bossGateFor({ stone: 0x3a3f48, light: 0x4a505a, wall: 0x1c2026, door: 0x1c1f24, doorDark: 0x0e1012, lamp: 0x5aff9a,
  emblem(b, z) {   // a skull above the arch with bat wings and a row of iron spears
    b.sphere(1.9, 0xcfd2c4, { p: [0, 10.9, z + 0.3], s: [1, 1.1, 0.6], ao: 0 }).box(1.5, 0.9, 0.9, 0xb8bbaf, { p: [0, 9.6, z + 0.3], radius: 0.1, ao: 0 });
    for (const sx of [-1, 1]) { b.sphere(0.5, 0x08090a, { p: [sx * 0.7, 11.1, z + 0.85], s: [1, 1.2, 0.4], ao: 0 }); for (let i = 0; i < 4; i++) b.cone(0.16, 3.4 - i * 0.6, 0x14161a, { p: [sx * (2.8 + i * 1.0), 10.4 - i * 0.1, z + 0.1], r: [0, 0, -sx * (1.45 + i * 0.1)], s: [1, 1, 0.3], seg: 3, ao: 0 }); }
    for (let i = 0; i < 9; i++) b.cone(0.14, 0.9, IRON2, { p: [-4.2 + i * 1.05, 9.5, z + 0.2], seg: 4, ao: 0 });
  } });

function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#4a515c'; k.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i++) { k.fillStyle = `rgba(${60 + (i % 40)},${66 + (i % 36)},${74 + (i % 30)},.5)`; k.fillRect((i * 97) % 512, (i * 223) % 512, 2 + (i % 9), 2 + (i % 5)); }
  k.strokeStyle = '#161a20'; k.lineWidth = 3; for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; k.beginPath(); k.moveTo(256 + Math.cos(a) * 60, 256 + Math.sin(a) * 60); k.lineTo(256 + Math.cos(a) * 246, 256 + Math.sin(a) * 246); k.stroke(); }
  for (const r of [60, 120, 180, 240]) { k.beginPath(); k.arc(256, 256, r, 0, 7); k.stroke(); }
  k.strokeStyle = '#4aff8a'; k.shadowColor = '#4aff8a'; k.shadowBlur = 10; k.lineWidth = 4; k.beginPath(); k.arc(256, 256, 100, 0, 7); k.stroke(); k.beginPath(); for (let i = 0; i < 5; i++) { const a = (i * 2 / 5) * 6.283 - 1.57; k.lineTo(256 + Math.cos(a) * 100, 256 + Math.sin(a) * 100); } k.closePath(); k.stroke();   // a rune circle and star
  k.shadowBlur = 0; k.fillStyle = '#10141a'; k.beginPath(); k.arc(256, 256, 30, 0, 7); k.fill(); k.fillStyle = '#4aff8a'; k.beginPath(); k.arc(256, 256, 12, 0, 7); k.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const arena = arenaFor({ texture: arenaTexture, glow: 0x4aff8a, ring(rim, tor, R, cz, rng) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.05, 0.05), x = Math.cos(a) * (R + 1.8), z = cz + Math.sin(a) * (R + 1.8);
    if (z > cz + R * 0.75 && Math.abs(x) < 5) continue;
    if (i % 3 === 0) { rim.box(0.9, rng.range(1.2, 2.0), 0.24, STONES[i % 3], { p: [x, 0.7, z], r: [0.05, a, rng.range(-0.15, 0.15)], radius: 0.08, ao: 0.2 }); rim.sphere(0.4, MOSS, { p: [x, 0.08, z], s: [1.5, 0.3, 1], ao: 0 }); }   // leaning gravestones
    else if (i % 3 === 1) { for (let q = 0; q < 4; q++) rim.cyl(0.05, 0.22, 1.5, 0x2f2620, { p: [x + Math.cos(q * 1.6) * 0.3, 0.9 + q * 0.8, z + Math.sin(q * 1.6) * 0.3], r: [0.1 * q, 0, 0.25 * (q % 2 ? 1 : -1)], seg: 4, ao: 0.1 }); }   // dead trees
    else { const px = Math.cos(a) * (R + 0.7), pz = cz + Math.sin(a) * (R + 0.7); rim.cyl(0.06, 0.1, 2.0, IRON, { p: [px, 1.0, pz], seg: 5 }); tor.sphere(0.2, GLOW, { p: [px, 2.2, pz], s: [1, 1.3, 1], ao: 0 }); }   // iron lamps
  }
} });

// ---------------------------------------------------------------- the black bog: a murky green sludge with slow bubbles under every gap, bridge and bog patch
const bogOv = { deep: '#071008', shallow: '#2a4a2e', foam: '#7aa86a', hi: '#9affb8', glow: 0.35, speed: 0.14, flow: 0.12, amp: 0.05 };
export const bogGap = fluidDress({ type: 'sludge', y: -0.9, beam: true, segments: 12, pad: 1.0, overrides: bogOv });
export const bogPatch = fluidDress({ type: 'sludge', y: -0.3, over: 'patches', segments: 10, overrides: bogOv });

// ---------------------------------------------------------------- stone piers for the swinging gates (the leaves are the hazard module's)
export function gatePiers(seg, ctx) {
  const g = frame(seg, ctx), b = B(), glow = B();
  for (const q of seg.gates || []) for (const sd of [-1, 1]) {
    const x = sd * (q.w / 2 + 0.55), z = -(q.s - seg.s0);
    b.box(1.0, 4.2, 1.0, STONES[0], { p: [x, 2.1, z], radius: 0.08, jitter: 0.03, ao: 0.2 }).box(1.3, 0.3, 1.3, STONES[2], { p: [x, 4.3, z], radius: 0.05, ao: 0.1 }).box(1.3, 0.3, 1.3, STONES[2], { p: [x, 0.15, z], radius: 0.05, ao: 0.1 });
    b.cone(0.5, 0.9, 0x2a2e34, { p: [x, 4.9, z], seg: 4, ao: 0 }); b.sphere(0.4, MOSS, { p: [x, 0.3, z + 0.5], s: [1.5, 0.4, 1], ao: 0 }); glow.sphere(0.14, GLOW, { p: [x - sd * 0.0, 3.4, z + 0.54], s: [1, 1.3, 1], ao: 0 });
  }
  mesh(b, toon(ctx), g, true); mesh(glow, glowBasic(), g);
  return { object: g };
}

// ---------------------------------------------------------------- lights-out: faint glow-stones along both edges of the path so the way is never invisible; a few wisps hang over the graves
export function glowStones(seg, ctx) {
  const g = frame(seg, ctx), glow = B(), half = ctx.half;
  for (let z = -2; z > -(seg.len - 2); z -= 4.5) for (const sd of [-1, 1]) glow.box(0.5, 0.14, 0.34, new THREE.Color(0.5, 1.5, 0.8), { p: [sd * (half + 0.15), 0.08, z], radius: 0.05, ao: 0 });
  for (let z = -10; z > -(seg.len - 10); z -= 13) for (const sd of [-1, 1]) glow.sphere(0.12, GLOW, { p: [sd * (half + 3.0 + (z % 3)), 1.4 + Math.sin(z) * 0.3, z], s: [1, 1.5, 1], ao: 0 });
  mesh(glow, glowBasic(), g);
  return { object: g };
}
