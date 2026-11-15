import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createFluid } from '../render/fluids.js';
import { frame, toon, mesh, glowToon, glowBasic, checkpointFlagFor, bossGateFor, arenaFor, fluidDress } from './dressKit.js';
import { LAVA, HOT, RED } from './stage06Props.js';

// Set dressing for Volcano Peak: the abandoned forge town (side section), checkpoint flags, the obsidian jaw boss gate, the cracked arena ringed with lava, and the lava
// river under every gap and bridge. Frame: x lateral, y up, z = -(s - seg.s0).
const B = () => new Builder({ boxSeg: 1, ico: true });
const ROCK = 0x2a2428, ROCKD = 0x1a1618, IRON = 0x2c2a32;

export function forgeTown(seg, ctx) {
  const g = frame(seg, ctx), rng = ctx.rng, b = B(), glow = B(), fx = -3.4;
  let z = -1;
  for (let i = 0; z > -68; i++) {
    const w = rng.range(7, 11), h = rng.range(4.5, 8), d = rng.range(5, 8), zc = z - w / 2;
    if (i % 4 === 3) { z -= 3.5; continue; }                                                                                  // a gap between huts
    b.box(d, h, w, i % 2 ? ROCK : ROCKD, { p: [fx - d / 2 - 0.2, h / 2, zc], radius: 0.12, jitter: 0.08, ao: 0.3 }).box(d + 0.8, 0.5, w + 0.8, IRON, { p: [fx - d / 2 - 0.2, h + 0.2, zc], radius: 0.06 });
    b.add(new THREE.ConeGeometry(d * 0.75, 1.8, 4), 0x3a2a24, { p: [fx - d / 2 - 0.2, h + 1.4, zc], r: [0, Math.PI / 4, 0], ao: 0.1 });             // a rough roof
    for (let k = 0; k < Math.floor(w / 3); k++) { const wz = zc + (k - (Math.floor(w / 3) - 1) / 2) * 3; b.box(0.14, 1.3, 1.0, 0x0a0808, { p: [fx - 0.1, h * 0.55, wz], radius: 0.04 }); glow.box(0.06, 1.0, 0.8, k % 2 ? LAVA : HOT, { p: [fx - 0.04, h * 0.55, wz], radius: 0.03, ao: 0 }); }   // forge-lit windows
    if (i % 2 === 0) { b.cyl(0.5, 0.65, 3.5, IRON, { p: [fx - d + 0.4, h + 2.2, zc], seg: 6 }); for (let k = 0; k < 3; k++) b.sphere(0.5 + k * 0.2, 0x3a3030, { p: [fx - d + 0.4 + k * 0.3, h + 4.5 + k * 1.1, zc], jitter: 0.1, ao: 0 }); }   // a smelter chimney with a smoke trail
    z -= w + 0.3;
  }
  for (const zz of [-8, -26, -47]) { b.box(1.0, 0.5, 0.6, IRON, { p: [fx + 1.9, 0.25, zz], radius: 0.05 }).box(1.3, 0.2, 0.7, 0x4a4650, { p: [fx + 1.9, 0.6, zz], radius: 0.04 }).box(0.5, 0.3, 0.3, IRON, { p: [fx + 1.9, 0.85, zz + 0.4], radius: 0.04 }); glow.box(0.5, 0.06, 0.3, HOT, { p: [fx + 1.9, 0.72, zz], radius: 0.01, ao: 0 }); }   // anvils with a hot bar on each
  for (const zz of [-14, -38, -60]) { b.box(0.14, 1.6, 0.14, IRON, { p: [fx + 1.4, 0.8, zz], radius: 0.02 }); b.box(0.9, 0.9, 0.9, 0x3a2a20, { p: [fx + 2.4, 0.45, zz + 1.0], radius: 0.08 }); glow.sphere(0.2, LAVA, { p: [fx + 1.4, 1.75, zz], ao: 0 }); }
  for (const zz of [-20, -52]) { b.add(new THREE.IcosahedronGeometry(1, 1), ROCK, { p: [fx - 4.5, 1.2, zz], s: [2.4, 2.4, 2.4], jitter: 0.4, ao: 0.3 }); glow.box(2.4, 0.1, 0.08, LAVA, { p: [fx - 4.5, 1.6, zz + 2.2], r: [0, 0.3, 0.2], radius: 0.01, ao: 0 }); }
  mesh(b, toon(ctx), g, true); mesh(glow, glowBasic(), g);
  return { object: g };
}

export const checkpoint = checkpointFlagFor({ pole: 0x6a6670, cap: 0xff8a20, base: 0x1c1a20, clean: 0xff6a20, grey: 0x4a3a3a, emblem(k) {   // a flame
  k.fillStyle = '#2a1410'; k.fillRect(0, 0, 128, 80); k.fillStyle = '#ff9a20'; k.beginPath(); k.moveTo(64, 8); k.quadraticCurveTo(92, 36, 80, 60); k.quadraticCurveTo(64, 74, 48, 60); k.quadraticCurveTo(36, 40, 56, 26); k.quadraticCurveTo(58, 40, 64, 8); k.fill();
  k.fillStyle = '#ffe36a'; k.beginPath(); k.moveTo(64, 34); k.quadraticCurveTo(76, 50, 68, 62); k.quadraticCurveTo(58, 66, 56, 54); k.quadraticCurveTo(62, 48, 64, 34); k.fill();
} });
export const bossGate = bossGateFor({ stone: 0x2a2428, light: 0x4a424a, wall: 0x1a1618, door: 0x1c1a20, doorDark: 0x0a0808, lamp: 0xff7a20,
  emblem(b, z) {   // a skull-like maw of obsidian teeth above the arch, with a molten gap between the jaws
    b.box(6.8, 1.3, 1.3, 0x14121c, { p: [0, 10.0, z + 0.1], radius: 0.12 });
    for (let i = 0; i < 9; i++) b.cone(0.34, 1.3 + (i % 3) * 0.4, 0x14121c, { p: [-3.2 + i * 0.8, 11.1 + (i % 3) * 0.15, z + 0.2], r: [0, 0, 0], seg: 4, ao: 0.1 });
    for (const sx of [-1, 1]) b.cone(0.5, 2.2, 0x14121c, { p: [sx * 3.9, 11.4, z], r: [0, 0, -sx * 0.3], seg: 4 });
  } });

function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#1c1618'; k.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i++) { k.fillStyle = `rgba(${30 + (i % 30)},${24 + (i % 24)},${28 + (i % 24)},.35)`; k.fillRect((i * 97) % 512, (i * 223) % 512, 2 + (i % 8), 2 + (i % 4)); }
  k.strokeStyle = '#ff7a20'; k.lineCap = 'round';
  for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.283 + (i % 3) * 0.1; let x = 256 + Math.cos(a) * 60, y = 256 + Math.sin(a) * 60; k.lineWidth = 3 + (i % 3) * 2; k.beginPath(); k.moveTo(x, y); for (let s = 0; s < 6; s++) { x += Math.cos(a + Math.sin(s * 2 + i) * 0.6) * 34; y += Math.sin(a + Math.cos(s * 3 + i) * 0.6) * 34; k.lineTo(x, y); } k.stroke(); }   // glowing cracks
  k.lineWidth = 8; k.strokeStyle = '#4a2a20'; for (const r of [244, 120]) { k.beginPath(); k.arc(256, 256, r, 0, 7); k.stroke(); }
  k.fillStyle = '#ff6a10'; k.beginPath(); k.arc(256, 256, 38, 0, 7); k.fill(); k.fillStyle = '#ffd23a'; k.beginPath(); k.arc(256, 256, 20, 0, 7); k.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const arena = arenaFor({ texture: arenaTexture, glow: 0xff7a20,
  extra(g, R, cz) {   // the lava ring: a river of lava all round the disc, below the rim, where the boss sinks
    const f = createFluid('lava', { width: 2 * R + 40, length: 2 * R + 40, segments: 14, overrides: { glow: 0.75, hi: '#ffb040', foam: '#ff8a20' } });
    f.mesh.position.set(0, -1.3, cz); g.add(f.mesh);
    return { update(t) { f.update?.(t); }, dispose() { f.mesh.geometry.dispose(); f.mesh.material.dispose(); }, fluid: f };
  },
  ring(rim, tor, R, cz, rng) {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.05, 0.05), x = Math.cos(a) * (R + 1.6), z = cz + Math.sin(a) * (R + 1.6);
      if (z > cz + R * 0.75 && Math.abs(x) < 5) continue;
      if (i % 2 === 0) { const h = rng.range(2.5, 6), r = rng.range(0.8, 1.3); rim.cyl(r, r * 1.2, h, i % 4 ? ROCK : ROCKD, { p: [x * 1.05, h / 2 - 0.4, cz + (z - cz) * 1.05], seg: 6, jitter: 0.05 }); tor.cyl(r * 0.9, r * 0.9, 0.1, LAVA, { p: [x * 1.05, h - 0.35, cz + (z - cz) * 1.05], seg: 6, ao: 0 }); }
      else { const px = Math.cos(a) * (R + 0.7), pz = cz + Math.sin(a) * (R + 0.7); rim.cyl(0.07, 0.1, 1.5, IRON, { p: [px, 0.75, pz], seg: 5 }).cyl(0.32, 0.2, 0.26, IRON, { p: [px, 1.58, pz], seg: 7 }); tor.cone(0.26, 0.7, HOT, { p: [px, 1.95, pz], seg: 5, ao: 0 }); }
    }
    for (let i = 0; i < 48; i++) { const a = (i / 48) * 6.283, x = Math.cos(a) * (R + 0.45), z = cz + Math.sin(a) * (R + 0.45); if (z > cz + R * 0.75 && Math.abs(x) < 5) continue; tor.box(0.9, 0.05, 0.22, i % 2 ? LAVA : HOT, { p: [x, 0.03, z], r: [0, -a, 0], radius: 0.01, ao: 0 }); }   // a glowing lip all round the rim
  } });

// ---------------------------------------------------------------- lava: a river under every gap, the collapsing bridge and the chase's gaps
export const river = fluidDress({ type: 'lava', y: -0.9, beam: true, segments: 14, pad: 1.0, overrides: { glow: 0.75, hi: '#ffb040', foam: '#ff8a20' } });
