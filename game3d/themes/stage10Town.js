import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createFluid } from '../render/fluids.js';
import { frame, toon, mesh, glowBasic, checkpointFlagFor, bossGateFor, arenaFor, fluidDress } from './dressKit.js';
import { PALE, PALE2, RUBY } from './stage10Props.js';

// Set dressing for the Charcoal Streets: the burnt-out high street (side section), checkpoint flags, the black-iron boss gate with a pale face, the charcoal plaza arena ringed by a ruby moat, the ruby
// canal under every gap, and the long ruby canals that run down both sides of every street (one ribbon of fluid per 120 m chunk). Frame: x lateral, y up, z = -(s - seg.s0).
const B = () => new Builder({ boxSeg: 1, ico: true });
const CH = [0x1c1c22, 0x24242c, 0x2c2c36, 0x18181e], IRON = 0x14141a;
export const RUBY_OV = { glow: 0.9, speed: 0.5, flow: 0.5 };

export function charredStreet(seg, ctx) {
  const g = frame(seg, ctx), rng = ctx.rng, b = B(), glow = B(), fx = -3.4;
  let z = -1;
  for (let i = 0; z > -68; i++) {
    const w = rng.range(6, 9), h = rng.range(5, 10), d = rng.range(4.5, 6.5), zc = z - w / 2;
    if (i % 4 === 3) { z -= 3.8; continue; }                                                                                   // a gap where a building fell
    b.box(d, h, w, CH[i % 4], { p: [fx - d / 2 - 0.2, h / 2, zc], radius: 0.1, jitter: 0.08, ao: 0.32 });
    for (let k = 0; k < 4; k++) b.box(d * 0.3, 0.6 + (k % 3) * 0.5, w / 4 - 0.1, CH[(i + k) % 4], { p: [fx - d / 2 - 0.2 + (k % 2 ? 0.8 : -0.8), h + 0.3 + (k % 3) * 0.2, zc - w / 2 + (k + 0.5) * w / 4], r: [0, 0, (k - 1.5) * 0.06], radius: 0.04, jitter: 0.04, ao: 0.2 });   // a ragged roofline
    const rows = Math.floor(h / 2.2), cols = Math.floor(w / 2.4);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const wz = zc + (c - (cols - 1) / 2) * 2.4, wy = 1.4 + r * 2.1, lit = (r * 5 + c * 3 + i) % 5 < 2; b.box(0.14, 1.1, 0.9, 0x07070a, { p: [fx - 0.1, wy, wz], radius: 0.03 }); if (lit) glow.box(0.06, 0.9, 0.7, (r + c) % 2 ? PALE : PALE2, { p: [fx - 0.06, wy, wz], radius: 0.02, ao: 0 }); }   // pale ghostly windows
    b.box(0.2, 1.6, w * 0.6, IRON, { p: [fx + 0.05, 0.8, zc], radius: 0.03 });                                                      // a boarded shopfront
    z -= w + 0.3;
  }
  for (const zz of [-10, -30, -52]) { b.cyl(0.1, 0.14, 3.4, CH[2], { p: [fx + 1.9, 1.7, zz], r: [0, 0, 0.12], seg: 5 }); glow.sphere(0.13, RUBY, { p: [fx + 2.25, 3.4, zz], s: [1, 0.7, 1], ao: 0 }); }   // bent lamps with ruby bulbs
  for (const zz of [-18, -44]) { b.box(3.8, 1.5, 1.7, CH[0], { p: [fx + 2.4, 0.75, zz], r: [0, 0.25, 0.06], radius: 0.1, jitter: 0.05, ao: 0.3 }).box(2.6, 0.8, 1.5, CH[3], { p: [fx + 2.0, 1.7, zz], r: [0, 0.25, 0.06], radius: 0.1, ao: 0.3 }); glow.box(0.1, 0.34, 1.0, PALE2, { p: [fx + 1.3, 1.7, zz + 0.1], ao: 0 }); }   // a burnt-out bus
  mesh(b, toon(ctx), g, true); mesh(glow, glowBasic(), g);
  return { object: g };
}

export const checkpoint = checkpointFlagFor({ pole: 0x2c2c34, cap: 0xff3a5a, base: 0x14141a, clean: 0xff4a6a, grey: 0x3a3a44, emblem(k) {   // a ruby drop on charcoal
  k.fillStyle = '#14141a'; k.fillRect(0, 0, 128, 80); k.fillStyle = '#e0143c'; k.beginPath(); k.moveTo(64, 10); k.quadraticCurveTo(92, 44, 80, 60); k.quadraticCurveTo(64, 74, 48, 60); k.quadraticCurveTo(36, 44, 64, 10); k.fill();
  k.fillStyle = '#ff9aaa'; k.beginPath(); k.ellipse(58, 50, 5, 9, 0.4, 0, 7); k.fill();
} });
export const bossGate = bossGateFor({ stone: 0x24242c, light: 0x34343e, wall: 0x14141a, door: 0x1c1c22, doorDark: 0x0a0a0e, lamp: 0xff2a50,
  emblem(b, z) {   // a blank pale mask above the arch with two ruby slits, a halo of broken thorns and chains to the piers
    b.sphere(2.0, 0xe8ecf0, { p: [0, 10.8, z + 0.3], s: [1, 1.2, 0.5], ao: 0 });
    for (const sx of [-1, 1]) b.box(0.7, 0.12, 0.15, RUBY, { p: [sx * 0.7, 11.2, z + 0.85], r: [0, 0, -sx * 0.2], ao: 0 });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; b.cone(0.18, 1.1, IRON, { p: [Math.cos(a) * 3.1, 10.8 + Math.sin(a) * 3.1, z + 0.2], r: [0, 0, a - 1.57], seg: 4, ao: 0 }); }
    for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) b.add(new THREE.TorusGeometry(0.16, 0.045, 4, 8), 0x3a3a44, { p: [sx * (1.2 + k * 0.95), 9.3 - k * 0.14, z + 0.9], r: [k % 2 ? Math.PI / 2 : 0, 0, 0], ao: 0 });
  } });

function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#26262e'; k.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1800; i++) { k.fillStyle = `rgba(${44 + (i % 40)},${44 + (i % 36)},${54 + (i % 30)},.5)`; k.fillRect((i * 97) % 512, (i * 223) % 512, 2 + (i % 9), 2 + (i % 5)); }
  k.strokeStyle = '#121218'; k.lineWidth = 3; for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283; k.beginPath(); k.moveTo(256 + Math.cos(a) * 70, 256 + Math.sin(a) * 70); k.lineTo(256 + Math.cos(a) * 246, 256 + Math.sin(a) * 246); k.stroke(); }
  k.strokeStyle = '#ff2a50'; k.shadowColor = '#ff2a50'; k.shadowBlur = 12; k.lineWidth = 4; for (const r of [244, 150, 80]) { k.beginPath(); k.arc(256, 256, r, 0, 7); k.stroke(); }
  for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283; k.beginPath(); k.moveTo(256 + Math.cos(a) * 80, 256 + Math.sin(a) * 80); k.lineTo(256 + Math.cos(a) * 150, 256 + Math.sin(a) * 150); k.stroke(); }   // seven spokes (a broken halo)
  k.shadowBlur = 0; k.fillStyle = '#0a0a0e'; k.beginPath(); k.arc(256, 256, 40, 0, 7); k.fill(); k.fillStyle = '#e0143c'; k.beginPath(); k.arc(256, 256, 14, 0, 7); k.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const arena = arenaFor({ texture: arenaTexture, glow: 0xff2a50,
  extra(g, R, cz) {   // a ruby moat all round the disc, below the rim
    const f = createFluid('ruby', { width: 2 * R + 40, length: 2 * R + 40, segments: 14, overrides: RUBY_OV });
    f.mesh.position.set(0, -1.3, cz); g.add(f.mesh);
    return { update(t) { f.update?.(t); }, dispose() { f.mesh.geometry.dispose(); f.mesh.material.dispose(); }, fluid: f };
  },
  ring(rim, tor, R, cz, rng) {
    const n = 26;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.05, 0.05), x = Math.cos(a) * (R + 1.6), z = cz + Math.sin(a) * (R + 1.6);
      if (z > cz + R * 0.75 && Math.abs(x) < 5) continue;
      if (i % 2 === 0) { const h = rng.range(2.4, 5.5), r = rng.range(0.6, 1.0); rim.cyl(r, r * 1.2, h, CH[i % 4], { p: [x * 1.05, h / 2 - 0.4, cz + (z - cz) * 1.05], r: [rng.range(-0.1, 0.1), 0, rng.range(-0.12, 0.12)], seg: 7, jitter: 0.06, ao: 0.25 }); tor.sphere(0.16, PALE, { p: [x * 1.05, h - 0.3, cz + (z - cz) * 1.05], s: [1, 0.5, 1], ao: 0 }); }   // broken columns with a pale light
      else { const px = Math.cos(a) * (R + 0.7), pz = cz + Math.sin(a) * (R + 0.7); rim.cyl(0.07, 0.1, 1.6, 0x2c2c34, { p: [px, 0.8, pz], seg: 5 }); tor.sphere(0.17, RUBY, { p: [px, 1.75, pz], s: [1, 1.2, 1], ao: 0 }); }   // ruby bollards
    }
    for (let i = 0; i < 48; i++) { const a = (i / 48) * 6.283, x = Math.cos(a) * (R + 0.45), z = cz + Math.sin(a) * (R + 0.45); if (z > cz + R * 0.75 && Math.abs(x) < 5) continue; tor.box(0.9, 0.05, 0.22, i % 2 ? RUBY : new THREE.Color(1.6, 0.2, 0.4), { p: [x, 0.04, z], r: [0, -a, 0], ao: 0 }); }
  } });

// ---------------------------------------------------------------- the canal under every gap, bridge and stepping-stone run
export const canal = fluidDress({ type: 'ruby', y: -0.9, beam: true, segments: 14, pad: 1.0, overrides: RUBY_OV });

// ---------------------------------------------------------------- ruby canals along both sides of the street: one ribbon of fluid per chunk that follows the track's curve (theme.river, world/scenery.js)
export const CANAL = { x0: 11.6, x1: 16.2, y: -1.7, step: 4 };
export function canals(c0, c1, env, ctx) {
  const track = ctx.track, rows = []; for (let s = c0; s <= c1 + 1e-6; s += CANAL.step) rows.push(s);
  const pos = [], uv = [], idx = [], v = new THREE.Vector3(); let k = 0;
  for (const sd of [-1, 1]) { const base = k; for (const s of rows) for (const u of [0, 1]) { track.toWorld(s, sd * (CANAL.x0 + (CANAL.x1 - CANAL.x0) * u), CANAL.y, v); pos.push(v.x, v.y, v.z); uv.push(u, 0.5); k++; } for (let r = 0; r < rows.length - 1; r++) { const a = base + r * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const f = createFluid('ruby', { width: CANAL.x1 - CANAL.x0, length: 4, segments: 1, overrides: RUBY_OV });
  f.mesh.geometry.dispose(); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeBoundingSphere();
  f.mesh.geometry = geo; f.mesh.material.uniforms.uSize.value.set(CANAL.x1 - CANAL.x0, 400); f.mesh.material.side = THREE.DoubleSide; f.mesh.frustumCulled = false;
  return { object: f.mesh, fluids: [f] };
}
