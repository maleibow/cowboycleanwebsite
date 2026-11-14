import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { frame, toon, mesh, glowToon, checkpointFlagFor, bossGateFor, arenaFor, fluidDress } from './dressKit.js';

// Set dressing for Toxic Jungle: the overgrown temple street (side section), checkpoint flags, boss gate, arena, mire and river.
const GLYPH = new THREE.Color(0.35, 1.9, 0.9), STONE = [0x5f7a62, 0x536b55, 0x6a8468], MOSS = 0x3f8a44;

// ---------------------------------------------------------------- the temple ruins behind the side-view section (left of the path)
export function jungleRuins(seg, ctx) {
  const g = frame(seg, ctx), rng = ctx.rng, b = new Builder({ boxSeg: 1, ico: true }), glow = new Builder({ boxSeg: 1, ico: true }), fx = -3.4;
  let z = -1;
  for (let i = 0; z > -68; i++) {
    const w = rng.range(7, 11), h = rng.range(4, 7.5), d = rng.range(5, 8), zc = z - w / 2, st = STONE[i % 3];
    if (i % 4 === 3) { z -= 3.5; continue; }                                                                                  // a gap between ruined blocks
    b.box(d, h, w, st, { p: [fx - d / 2 - 0.2, h / 2, zc], radius: 0.1, jitter: 0.05 });
    for (let t = 1; t < h; t += 1.4) b.box(0.14, 0.14, w, 0x4a5a46, { p: [fx - 0.1, t, zc], radius: 0.02, ao: 0 });                // carved courses
    b.box(1.3, 0.5, w + 0.3, 0x92a48a, { p: [fx - 0.45, h + 0.15, zc], radius: 0.08 });                                         // cornice
    for (let k = 0; k < 4; k++) b.sphere(rng.range(0.5, 1.0), MOSS, { p: [fx - rng.range(0.4, d), h + rng.range(0, 0.3), zc + rng.range(-w / 2, w / 2)], s: [1.3, 0.5, 1.3], jitter: 0.06, ao: 0 });
    const gl = Math.floor(w / 2.6);
    for (let k = 0; k < gl; k++) { const gz = zc + (k - (gl - 1) / 2) * 2.6; b.box(0.12, 1.6, 1.1, 0x2a3a2c, { p: [fx - 0.02, h * 0.5, gz], radius: 0.04 }); glow.box(0.06, 1.2, 0.8, GLYPH, { p: [fx + 0.06, h * 0.5, gz], radius: 0.02, ao: 0 }); }   // glowing glyph panels
    for (let k = 0; k < 3; k++) { const vz = zc + rng.range(-w / 2, w / 2), l = rng.range(1.6, h * 0.8); b.cyl(0.05, 0.07, l, 0x2f8f46, { p: [fx + 0.1, h - l / 2, vz], seg: 4, ao: 0 }).sphere(0.16, 0x57c25a, { p: [fx + 0.1, h - l, vz], s: [1, 0.6, 1], ao: 0 }); }
    z -= w + 0.3;
  }
  for (const zz of [-14, -33, -52]) {                                                                                         // great trees breaking through the ruins
    b.cyl(0.9, 1.5, 12, 0x5d4037, { p: [fx - 5.5, 6, zz], seg: 8, jitter: 0.1 }).add(new THREE.IcosahedronGeometry(4.4, 1), 0x1f9a56, { p: [fx - 5.5, 12.5, zz], s: [1.4, 0.7, 1.4], jitter: 0.5, ao: 0.25 });
    for (let k = 0; k < 5; k++) { const a = k * 1.26; b.cone(0.45, 2.2, 0x6a4a32, { p: [fx - 5.5 + Math.cos(a) * 1.6, 0.8, zz + Math.sin(a) * 1.6], r: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9], seg: 4, ao: 0 }); }
  }
  for (const zz of [-20, -49]) {                                                                                              // an idol head each, eyes aglow
    b.box(2.2, 2.6, 2.2, 0x8a9a82, { p: [fx - 1.4, 1.3, zz], radius: 0.25, jitter: 0.06 }).box(1.4, 0.45, 0.5, 0x3a4a3a, { p: [fx - 0.2, 1.1, zz], radius: 0.1 });
    for (const sd of [-1, 1]) glow.box(0.12, 0.34, 0.5, GLYPH, { p: [fx - 0.18, 1.85, zz + sd * 0.55], radius: 0.03, ao: 0 });
  }
  for (const zz of [-4, -27, -42, -62]) b.cyl(0.07, 0.09, 1.4, 0x5c7a2a, { p: [fx + 1.9, 0.7, zz], seg: 5 }).add(new THREE.IcosahedronGeometry(0.5, 0), 0x58d27a, { p: [fx + 1.9, 1.5, zz], s: [1, 0.6, 1], jitter: 0.1, ao: 0 });
  mesh(b, toon(ctx), g, true); mesh(glow, glowToon(0xffffff, 0x38ff9a, 1.1), g);
  return { object: g };
}

// ---------------------------------------------------------------- checkpoint flag, boss gate, arena
export const checkpoint = checkpointFlagFor({ pole: 0xc9b98a, cap: 0x7dff9a, base: 0x6a4a2e, clean: 0x35e08a, grey: 0x56705e, emblem(k) {
  k.fillStyle = '#d8ffe8'; k.beginPath(); k.arc(64, 42, 24, 0, 7); k.fill(); k.strokeStyle = '#38c47a'; k.lineWidth = 5; k.stroke(); k.fillStyle = '#fff'; k.beginPath(); k.arc(56, 34, 7, 0, 7); k.fill();
} });

export const bossGate = bossGateFor({ stone: 0x6f8a6a, light: 0x8aa684, wall: 0x4e6a50, door: 0x5d4a30, doorDark: 0x2e3a22, lamp: 0x7dff9a,
  emblem(b, z) {   // a leaf-crowned stone face over the arch
    b.box(2.4, 2.0, 1.2, 0x8aa684, { p: [0, 10.1, z], radius: 0.3, jitter: 0.05 }).box(0.7, 0.35, 0.3, 0x1a2a1c, { p: [-0.5, 10.3, z + 0.65], radius: 0.05, ao: 0 }).box(0.7, 0.35, 0.3, 0x1a2a1c, { p: [0.5, 10.3, z + 0.65], radius: 0.05, ao: 0 })
      .box(1.2, 0.3, 0.3, 0x1a2a1c, { p: [0, 9.5, z + 0.65], radius: 0.05, ao: 0 });
    for (let i = 0; i < 5; i++) b.cone(0.25, 1.3, i % 2 ? 0x27ae60 : 0x58d27a, { p: [(i - 2) * 0.55, 11.6, z], r: [0, 0, (i - 2) * -0.3], seg: 4, ao: 0 });
  } });

function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#3a4a5c'; k.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1500; i++) { k.fillStyle = `rgba(${50 + (i % 40)},${70 + (i % 50)},${90 + (i % 40)},.25)`; k.fillRect((i * 97) % 512, (i * 223) % 512, 2 + (i % 6), 2 + (i % 4)); }
  k.strokeStyle = '#1f2c3a'; k.lineWidth = 10; for (const r of [244, 196, 120]) { k.beginPath(); k.arc(256, 256, r, 0, 7); k.stroke(); }
  k.lineWidth = 5; k.strokeStyle = '#6fe8c0'; for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; k.beginPath(); k.moveTo(256 + Math.cos(a) * 126, 256 + Math.sin(a) * 126); k.lineTo(256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); k.stroke(); }
  k.fillStyle = '#a3e635'; k.beginPath(); k.arc(256, 256, 70, 0, 7); k.fill(); k.strokeStyle = '#1f2c3a'; k.lineWidth = 8; k.stroke();
  k.fillStyle = '#c8ffb0'; k.beginPath(); k.arc(238, 240, 20, 0, 7); k.fill(); k.beginPath(); k.arc(278, 272, 12, 0, 7); k.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const arena = arenaFor({ texture: arenaTexture, glow: 0x7dff9a, ring(rim, tor, R, cz, rng) {
  const n = 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.05, 0.05), x = Math.cos(a) * (R + 1.5), z = cz + Math.sin(a) * (R + 1.5);
    if (z > cz + R * 0.75 && Math.abs(x) < 5) continue;
    const h = rng.range(1.8, 3.6), w = rng.range(1.5, 2.6);
    rim.add(new THREE.IcosahedronGeometry(1, 1), i % 2 ? 0x1f9a56 : 0x187a45, { p: [x, h * 0.4, z], s: [w, h, w], r: [0, a, 0], jitter: 0.5 });
    if (i % 5 === 0) { const px = Math.cos(a) * (R + 0.6), pz = cz + Math.sin(a) * (R + 0.6); rim.box(0.8, 4.4, 0.8, 0x7d8f7a, { p: [px, 2.2, pz], radius: 0.1 }); rim.box(1.0, 0.3, 1.0, 0x92a48a, { p: [px, 4.5, pz], radius: 0.06 }); tor.sphere(0.32, 0xffffff, { p: [px, 5.0, pz], s: [1, 1.4, 1], ao: 0 }); }
  }
} });

// ---------------------------------------------------------------- sludge: the river under every gap, the mire patch, the log-bridge pool
export const river = fluidDress({ type: 'sludge', y: -0.8, beam: true, segments: 14, pad: 1.0, overrides: { glow: 0.05, hi: '#a9d44a', foam: '#8fbf3a', shallow: '#5f8a22' } });
export const mire = fluidDress({ type: 'sludge', y: -0.24, over: 'patches', segments: 10, overrides: { deep: '#3a4a1a', shallow: '#7a9a2a', glow: 0.1 } });
