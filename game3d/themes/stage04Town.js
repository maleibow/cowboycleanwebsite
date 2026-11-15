import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { frame, toon, mesh, glowToon, glowBasic, checkpointFlagFor, bossGateFor, arenaFor, fluidDress } from './dressKit.js';
import { WARM, AMB, RED, GRN, TEAL, PINK } from './stage04Props.js';
import { createToon } from '../render/materials.js';
import { placeMatrix } from '../world/scenery.js';
import { events } from '../core/events.js';

// Set dressing for New York City: the shopfront street (side section), checkpoint flags, the subway-entrance boss gate, the intersection arena, the flooded
// trench under every gap, the open manholes (shafts + steam) and the crosswalks of the traffic crossing. Frame: x lateral, y up, z = -(s - seg.s0).
const B = () => new Builder({ boxSeg: 1, ico: true });
const SHOPLIT = new THREE.Color(1.05, 0.78, 0.3), WINLIT = new THREE.Color(1.3, 0.95, 0.32);
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

function signTexture(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(5, 5, 246, 86);
  g.fillStyle = fg; g.font = 'bold 54px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 52, 220);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const SHOPS = [
  { w: 8, h: 8.5, c: 0x8a4a3a, sign: 'DELI', bg: '#7a1f1f', fg: '#ffe9a8' }, { w: 7, h: 7.0, c: 0x6a5a58, sign: 'BAGELS', bg: '#2a4a6a', fg: '#ffe9a8' },
  { w: 10, h: 10.5, c: 0x7a4034, sign: 'PIZZA', bg: '#1a1a22', fg: '#ffd23a' }, { w: 7, h: 7.5, c: 0x5a6070, sign: 'BANK', bg: '#1f3a2a', fg: '#e8f5d0' },
  { w: 9, h: 9.5, c: 0x9a5a44, sign: 'BAR', bg: '#2a1a3a', fg: '#ff7ad0' }, { w: 10, h: 8.0, c: 0x6a4a50, sign: 'TAXI', bg: '#e0b020', fg: '#1a1a1a' },
];
export function shopStreet(seg, ctx) {
  const g = frame(seg, ctx), fx = -3.4, D = 7, wall = B(), glow = B(), signs = []; let z1 = -2;
  for (const [bi, sh] of SHOPS.entries()) {
    const z0 = z1 - sh.w, zc = (z0 + z1) / 2, dk = tone(sh.c, 0.7);
    wall.box(D, sh.h, sh.w, sh.c, { p: [fx - D / 2, sh.h / 2, zc], radius: 0.05, ao: 0.25 }).box(1.0, 0.7, sh.w + 0.3, 0xb8b0a0, { p: [fx - 0.4, sh.h + 0.2, zc], radius: 0.04 });
    for (let y = 0.9; y < sh.h; y += 0.85) wall.box(0.05, 0.05, sh.w, dk, { p: [fx + 0.03, y, zc], radius: 0.01, ao: 0 });
    wall.box(0.14, 2.3, 1.4, 0x181420, { p: [fx + 0.06, 1.15, zc - sh.w * 0.2], radius: 0.03 }); glow.box(0.05, 1.9, 3.2, SHOPLIT, { p: [fx + 0.1, 1.3, zc + sh.w * 0.15], radius: 0.03, ao: 0 });   // door + a lit shop window
    for (let i = 0; i < Math.floor(sh.w / 2.6); i++) for (let r = 0; r < Math.floor((sh.h - 3.5) / 1.8); r++) { const wz = zc + (i - (Math.floor(sh.w / 2.6) - 1) / 2) * 2.6; wall.box(0.12, 1.0, 0.8, 0x121828, { p: [fx + 0.05, 3.6 + r * 1.8, wz], radius: 0.03 }); if ((bi + i + r) % 3 < 2) glow.box(0.05, 0.8, 0.62, WINLIT, { p: [fx + 0.12, 3.6 + r * 1.8, wz], radius: 0.02, ao: 0 }); }
    wall.box(2.0, 0.12, sh.w + 0.2, bi % 2 ? 0xc0392b : 0x2a6aa8, { p: [fx + 0.95, 3.0, zc], r: [0, 0, 0.08], radius: 0.03 });                  // awning
    for (let k = 0; k < 4; k++) { wall.box(1.2, 0.07, 1.0, 0x3a4252, { p: [fx + 0.7, 4.5 + k * 1.3, z0 + 1.4], radius: 0.01 }); }                         // fire escape landings
    const tex = signTexture(sh.sign, sh.bg, sh.fg), sm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.2, sh.w - 1.5), 1.2), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.15, 1.15, 1.15) }));
    sm.rotation.y = Math.PI / 2; sm.position.set(fx + 0.5, 3.8, zc); g.add(sm); signs.push(tex, sm.material, sm.geometry);
    z1 = z0 - 0.4;
  }
  const props = B();
  for (const z of [-3.5, -23, -45, -62]) props.cyl(0.18, 0.22, 0.75, 0xc0392b, { p: [-2.7, 0.38, z], seg: 8 }).sphere(0.18, 0xc0392b, { p: [-2.7, 0.8, z], ao: 0 });   // hydrants
  for (const z of [-12, -34, -55]) { props.cyl(0.06, 0.08, 4.4, 0x4a5468, { p: [-2.4, 2.2, z], seg: 5 }).box(0.5, 0.14, 0.3, 0x2a3040, { p: [-2.05, 4.4, z], radius: 0.03 }); glow.box(0.42, 0.08, 0.22, AMB, { p: [-2.05, 4.32, z], radius: 0.02, ao: 0 }); }   // lamps
  mesh(props, toon(ctx), g, true); mesh(glow, glowBasic(), g); mesh(wall, toon(ctx), g, true);
  return { object: g, dispose() { signs.forEach((x) => x.dispose?.()); } };
}

// ---------------------------------------------------------------- checkpoint flag, subway boss gate, intersection arena
export const checkpoint = checkpointFlagFor({ pole: 0xb8c0d0, cap: 0xffd23a, base: 0x3a4252, clean: 0xffc21a, grey: 0x56607a, emblem(k) {
  k.fillStyle = '#1a1a1a'; for (let i = 0; i < 8; i++) for (let j = 0; j < 5; j++) if ((i + j) % 2) k.fillRect(i * 16, j * 16, 16, 16);
  k.fillStyle = '#fff3a0'; k.beginPath(); k.arc(64, 42, 20, 0, 7); k.fill(); k.strokeStyle = '#1a1a1a'; k.lineWidth = 4; k.stroke();
} });
export const bossGate = bossGateFor({ stone: 0x56607a, light: 0x7a849a, wall: 0x3a4252, door: 0x2a6a4a, doorDark: 0x153a2a, lamp: 0x45ff90,
  emblem(b, z) {   // the subway sign: a big green-lit globe pair and a striped canopy
    for (const sx of [-1, 1]) { b.cyl(0.08, 0.08, 3.4, 0x2a3040, { p: [sx * 2.6, 10.6, z], seg: 5 }); b.sphere(0.6, GRN, { p: [sx * 2.6, 12.4, z], ao: 0 }); }
    b.box(5.4, 1.5, 0.3, 0x14182a, { p: [0, 10.4, z + 0.3], radius: 0.05 }).box(4.6, 0.3, 0.35, GRN, { p: [0, 10.4, z + 0.32], radius: 0.02, ao: 0 });
    for (let i = 0; i < 12; i++) b.box(0.45, 0.14, 1.0, i % 2 ? 0xf2f2f2 : 0xc0392b, { p: [-2.7 + i * 0.5, 9.5, z + 1.1], r: [0.3, 0, 0], radius: 0.01, ao: 0 });
  } });

function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#3a404e'; k.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) { k.fillStyle = `rgba(${50 + (i % 40)},${54 + (i % 40)},${66 + (i % 40)},.25)`; k.fillRect((i * 97) % 512, (i * 223) % 512, 2 + (i % 6), 2 + (i % 3)); }
  k.strokeStyle = '#f1c40f'; k.lineWidth = 8; k.setLineDash([26, 22]); for (const r of [238, 150]) { k.beginPath(); k.arc(256, 256, r, 0, 7); k.stroke(); } k.setLineDash([]);
  k.fillStyle = '#e8e8e8'; for (let a = 0; a < 4; a++) for (let i = 0; i < 7; i++) { k.save(); k.translate(256, 256); k.rotate((a * Math.PI) / 2); k.fillRect(-90 + i * 26, 160, 14, 70); k.restore(); }   // crosswalk zebras
  k.fillStyle = '#23262e'; k.beginPath(); k.arc(256, 256, 56, 0, 7); k.fill(); k.strokeStyle = '#6a7080'; k.lineWidth = 6; k.stroke();
  k.strokeStyle = '#6a7080'; k.lineWidth = 3; for (let i = -40; i <= 40; i += 16) { k.beginPath(); k.moveTo(256 + i, 256 - 36); k.lineTo(256 + i, 256 + 36); k.stroke(); k.beginPath(); k.moveTo(256 - 36, 256 + i); k.lineTo(256 + 36, 256 + i); k.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const arena = arenaFor({ texture: arenaTexture, glow: 0xffc040, ring(rim, tor, R, cz, rng) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.04, 0.04), x = Math.cos(a) * (R + 2.2), z = cz + Math.sin(a) * (R + 2.2);
    if (z > cz + R * 0.75 && Math.abs(x) < 5) continue;
    if (i % 3 === 0) { const h = rng.range(7, 13), w = rng.range(4, 6); rim.box(w, h, w, i % 2 ? 0x1a2c54 : 0x132244, { p: [x * 1.25, h / 2, cz + (z - cz) * 1.25], r: [0, -a, 0], radius: 0.05, jitter: 0.02 }); for (let r = 0; r < 4; r++) tor.box(0.5, 0.6, 0.1, WARM, { p: [x * 1.25 - Math.cos(a) * (w / 2 + 0.05), 2 + r * 1.7, cz + (z - cz) * 1.25 - Math.sin(a) * (w / 2 + 0.05)], r: [0, -a + Math.PI / 2, 0], radius: 0.01, ao: 0 }); }
    else if (i % 3 === 1) { rim.box(1.9, 0.8, 4.2, 0xf5c518, { p: [x, 0.7, z], r: [0, -a + Math.PI / 2, 0], radius: 0.14 }).box(1.7, 0.5, 2.0, 0xe0b010, { p: [x, 1.25, z], r: [0, -a + Math.PI / 2, 0], radius: 0.14 }); }       // parked taxis around the intersection
    else { const px = Math.cos(a) * (R + 0.8), pz = cz + Math.sin(a) * (R + 0.8); rim.cyl(0.1, 0.14, 4.6, 0x4a5468, { p: [px, 2.3, pz], seg: 5 }).box(0.9, 0.1, 0.1, 0x4a5468, { p: [px - Math.cos(a) * 0.4, 4.6, pz - Math.sin(a) * 0.4], r: [0, -a, 0], radius: 0.01 }); tor.box(0.4, 0.1, 0.26, AMB, { p: [px - Math.cos(a) * 0.85, 4.5, pz - Math.sin(a) * 0.85], radius: 0.02, ao: 0 }); }
  }
} });

// ---------------------------------------------------------------- the flooded trench under every gap and girder bridge
export const river = fluidDress({ type: 'water', y: -0.7, beam: true, segments: 14, pad: 1.0, overrides: { deep: '#0a1a33', shallow: '#254a82', foam: '#b8d4f0', hi: '#7fb0e8', glow: 0.0 } });

// ---------------------------------------------------------------- open manholes: a dark shaft, a steel rim, the cover lying beside it, steam rising
export function manholes(seg, ctx) {
  const g = new THREE.Group(), holes = seg.holes || [], geo = new THREE.CylinderGeometry(1, 1, 2.6, 16, 1, true).translate(0, -1.3, 0), mat = new THREE.MeshBasicMaterial({ color: 0x0b0e18, side: THREE.BackSide }), glowMat = new THREE.MeshBasicMaterial({ color: 0x1a3a55 });
  const rimB = B(), items = [];
  for (const h of holes) {
    const cx = (h.x0 + h.x1) / 2, cs = (h.s0 + h.s1) / 2;
    const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; m.matrix.copy(placeMatrix(ctx.track, cs, cx, 0, 0, 1.2, 1, (h.s1 - h.s0) / 2)); g.add(m);
    const d = new THREE.Mesh(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2), glowMat); d.matrixAutoUpdate = false; d.matrix.copy(placeMatrix(ctx.track, cs, cx, -2.4, 0, 1.2, 1, (h.s1 - h.s0) / 2)); g.add(d);
    items.push({ s: cs, x: cx, ls: (h.s1 - h.s0) / 2 });
  }
  const rg = new THREE.Group(); rg.matrixAutoUpdate = false; g.add(rg);
  for (const it of items) { const q = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.09, 5, 18).rotateX(Math.PI / 2), createToon({ color: 0x6a7080, grime: false })); q.matrixAutoUpdate = false; q.matrix.copy(placeMatrix(ctx.track, it.s, it.x, 0.03, 0, 1.2, 1, it.ls)); rg.add(q);
    const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.1, 12), createToon({ color: 0x4a5060, grime: false })); cover.matrixAutoUpdate = false; cover.matrix.copy(placeMatrix(ctx.track, it.s + 0.4, it.x + (it.x > 0 ? -2.2 : 2.2), 0.06, 0.3)); rg.add(cover); }
  let tick = 0;
  return { object: g, update(t, s, dt = 1 / 60) {
    tick -= dt; if (tick > 0 || !items.length || Math.abs(items[0].s - s) > 40) return; tick = 0.4;
    for (const it of items) { const p = ctx.track.toWorld(it.s, it.x, 0.2); ctx.emit?.('steam', p.x, p.y, p.z, { count: 1.2, scale: 1.6 }); }
    if (Math.abs(items[0].s - s) < 22) events.emit('manholeSteam');
  }, items, dispose() { geo.dispose(); mat.dispose(); glowMat.dispose(); } };
}

// ---------------------------------------------------------------- crosswalk zebras at each taxi lane
export function crossing(seg, ctx) {
  const g = frame(seg, ctx), b = B(), lights = B();
  for (const q of seg.traffic || []) {
    const z = -(q.s - seg.s0);
    for (let i = 0; i < 9; i++) b.box(0.5, 0.012, 1.7, 0xe8e8e8, { p: [-3.6 + i * 0.9, 0.012, z], radius: 0.003, ao: 0 });
    for (const sd of [-1, 1]) { b.cyl(0.07, 0.1, 4.2, 0x3a4252, { p: [sd * (ctx.half + 1.4), 2.1, z + 1.4], seg: 5 }).box(0.34, 0.9, 0.3, 0x14182a, { p: [sd * (ctx.half + 1.4), 4.2, z + 1.4], radius: 0.04 }); lights.sphere(0.1, RED, { p: [sd * (ctx.half + 1.4), 4.5, z + 1.2], s: [1, 1, 0.6], ao: 0 }); }
  }
  mesh(b, toon(ctx), g); mesh(lights, glowToon(0xffffff, 0xff3020, 1.4), g);
  return { object: g };
}
