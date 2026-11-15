import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { frame, toon, mesh, glowToon, checkpointFlagFor, bossGateFor, arenaFor, fluidDress } from './dressKit.js';
import { CYAN, MAG, AMBER } from './stage03Props.js';

// Set dressing for Neo-Scrap City: the neon back-alley (side section), checkpoint beacons, the blast-door boss gate, the arena, the acid
// under every gap, and the animated conveyor arrows (they flash amber before a belt reverses). Frame: x lateral, y up, z = -(s - seg.s0).
const B = () => new Builder({ boxSeg: 1, ico: true });
const tone = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

function neonSign(text, c1, c2) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = '#0c0818'; g.fillRect(0, 0, 256, 96); g.strokeStyle = c1; g.lineWidth = 6; g.shadowColor = c1; g.shadowBlur = 14; g.strokeRect(6, 6, 244, 84);
  g.fillStyle = c2; g.shadowColor = c2; g.shadowBlur = 16; g.font = 'bold 54px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 50, 220);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- the neon back-alley behind the side-view section (left of the path)
const SHOPS = [
  { w: 9, h: 6.0, c: 0x3a3358, sign: 'NOODLES', a: '#ff3df0', b: '#fff0ff' }, { w: 7, h: 4.6, c: 0x2e4a5a, sign: 'BOLT BAR', a: '#25ffe6', b: '#e8fffb' },
  { w: 11, h: 7.2, c: 0x4a3358, sign: 'ARCADE', a: '#ffd23a', b: '#fff6c0' }, { w: 7, h: 5.0, c: 0x35405a, sign: 'PAWN', a: '#25ffe6', b: '#e8fffb' },
  { w: 10, h: 6.4, c: 0x58334a, sign: 'SCRAP', a: '#ff3df0', b: '#fff0ff' }, { w: 10, h: 5.6, c: 0x2e3a5a, sign: 'HOTEL', a: '#ffd23a', b: '#fff6c0' },
];
export function neonAlley(seg, ctx) {
  const g = frame(seg, ctx), fx = -3.4, D = 7, wall = B(), glow = B(), signs = [];
  let z1 = -2;
  for (const [bi, sh] of SHOPS.entries()) {
    const z0 = z1 - sh.w, zc = (z0 + z1) / 2, dark = tone(sh.c, 0.7), lit = [CYAN, MAG, AMBER];
    wall.box(D, sh.h, sh.w, sh.c, { p: [fx - D / 2, sh.h / 2, zc], radius: 0.05, ao: 0.25 }).box(0.9, 1.4, sh.w + 0.1, sh.c, { p: [fx - 0.35, sh.h + 0.7, zc], radius: 0.05 }).box(1.1, 0.22, sh.w + 0.3, dark, { p: [fx - 0.35, sh.h + 1.5, zc], radius: 0.04 });
    wall.box(2.0, 0.14, sh.w + 0.2, dark, { p: [fx + 0.95, 3.1, zc], r: [0, 0, 0.06], radius: 0.04 });                                  // awning
    for (const pz of [z0 + 0.4, zc, z1 - 0.4]) wall.box(0.14, 3.0, 0.14, 0x22222c, { p: [fx + 1.85, 1.5, pz], radius: 0.02 });
    for (let y = 0.8; y < sh.h; y += 0.9) wall.box(0.05, 0.05, sh.w, dark, { p: [fx + 0.03, y, zc], radius: 0.01, ao: 0 });
    wall.box(0.12, 2.1, 1.3, 0x14101f, { p: [fx + 0.05, 1.05, zc], radius: 0.03 }); glow.box(0.05, 0.12, 1.5, lit[bi % 3], { p: [fx + 0.09, 2.25, zc], radius: 0.01, ao: 0 });   // door + neon lintel
    const cols = Math.floor(sh.w / 3);
    for (let i = 0; i < cols; i++) { const wz = zc + (i - (cols - 1) / 2) * 3 + 1.2; for (const wy of sh.h > 5.5 ? [2.0, 4.2] : [2.0]) {
      wall.box(0.12, 1.1, 0.95, 0x120e1c, { p: [fx + 0.05, wy, wz], radius: 0.03 });
      if ((bi * 7 + i * 3 + wy) % 5 < 3) glow.box(0.05, 0.9, 0.75, lit[(bi + i) % 3], { p: [fx + 0.13, wy, wz], radius: 0.02, ao: 0 }); } }
    for (let k = 0; k < 4; k++) { const fy = 1.6 + k * 1.3; wall.box(1.2, 0.08, 1.0, 0x6a6a7e, { p: [fx + 0.7, fy, z1 - 1.2], radius: 0.01 }); if (k) wall.box(0.06, 1.3, 0.06, 0x6a6a7e, { p: [fx + 1.25, fy - 0.65, z1 - 0.8], radius: 0.01 }); }   // a fire escape
    wall.box(0.7, 0.7, 0.9, 0x4a4a5a, { p: [fx + 0.4, sh.h + 0.35, zc + 2.5], radius: 0.05 });                                            // rooftop AC unit
    const tex = neonSign(sh.sign, sh.a, sh.b), sm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.5, sh.w - 1), 1.3), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.1, 1.1, 1.1) }));
    sm.rotation.y = Math.PI / 2; sm.position.set(fx + 0.2, sh.h * 0.78, zc); g.add(sm); signs.push(tex, sm.material, sm.geometry);
    z1 = z0 - 0.4;
  }
  const props = B();
  for (const z of [-3, -22, -44, -63]) { props.box(0.9, 0.9, 1.5, 0x2a6a4a, { p: [-2.7, 0.45, z], radius: 0.05 }).box(0.95, 0.12, 1.55, 0x1a4a30, { p: [-2.7, 0.92, z], radius: 0.03 }); }       // dumpsters
  for (const z of [-13, -35, -55]) { props.cyl(0.35, 0.35, 0.9, 0x7a2e8a, { p: [-2.6, 0.45, z], seg: 8 }); props.cyl(0.04, 0.04, 2.6, 0x9aa0b0, { p: [-2.2, 1.3, z + 0.8], seg: 4, ao: 0 }); }
  mesh(props, toon(ctx), g, true); mesh(glow, glowToon(0xffffff, 0xffffff, 0.8), g); mesh(wall, toon(ctx), g, true);
  return { object: g, dispose() { signs.forEach((x) => x.dispose?.()); } };
}

// ---------------------------------------------------------------- checkpoint beacon, boss gate, arena
export const checkpoint = checkpointFlagFor({ pole: 0x9aa0b0, cap: 0x25ffe6, base: 0x2a2a38, clean: 0xff3df0, grey: 0x4a4a5e, emblem(k) {
  k.fillStyle = '#e8fffb'; k.beginPath(); k.arc(64, 42, 24, 0, 7); k.fill(); k.strokeStyle = '#25ffe6'; k.lineWidth = 5; k.stroke(); k.fillStyle = '#fff'; k.beginPath(); k.arc(56, 34, 7, 0, 7); k.fill();
} });

export const bossGate = bossGateFor({ stone: 0x3e4660, light: 0x56607a, wall: 0x2a2a3a, door: 0x4a5068, doorDark: 0x22222c, lamp: 0xff40d0,
  emblem(b, z) {   // a cog with a red eye over the blast door
    b.cyl(1.2, 1.2, 0.5, 0x56607a, { p: [0, 10.2, z], r: [Math.PI / 2, 0, 0], seg: 12 }).sphere(0.55, new THREE.Color(3, 0.15, 0.15), { p: [0, 10.2, z + 0.4], ao: 0 });
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.box(0.4, 0.4, 0.5, 0x56607a, { p: [Math.cos(a) * 1.35, 10.2 + Math.sin(a) * 1.35, z], r: [0, 0, a], radius: 0.03 }); }
    for (let i = 0; i < 7; i++) b.box(0.55, 0.4, 0.1, i % 2 ? 0x1a1a1a : 0xf2c200, { p: [-1.65 + i * 0.55, 8.4, z + 1.12], radius: 0.01, ao: 0 });
  } });

function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#4c5476'; k.fillRect(0, 0, 512, 512);
  k.strokeStyle = 'rgba(170,180,230,.3)'; k.lineWidth = 2; for (let i = 0; i <= 512; i += 32) { k.beginPath(); k.moveTo(i, 0); k.lineTo(i, 512); k.stroke(); k.beginPath(); k.moveTo(0, i); k.lineTo(512, i); k.stroke(); }
  for (let i = 0; i < 900; i++) { k.fillStyle = `rgba(${70 + (i % 50)},${70 + (i % 40)},${100 + (i % 50)},.2)`; k.fillRect((i * 97) % 512, (i * 223) % 512, 2 + (i % 5), 2 + (i % 3)); }
  k.lineWidth = 16; for (let i = 0; i < 48; i++) { const a0 = (i / 48) * 6.283, a1 = ((i + 1) / 48) * 6.283; k.strokeStyle = i % 2 ? '#f2c200' : '#1a1a1a'; k.beginPath(); k.arc(256, 256, 238, a0, a1); k.stroke(); }
  k.strokeStyle = '#25ffe6'; k.lineWidth = 5; for (const r of [190, 130]) { k.beginPath(); k.arc(256, 256, r, 0, 7); k.stroke(); }
  k.fillStyle = '#12101c'; k.beginPath(); k.arc(256, 256, 70, 0, 7); k.fill(); k.strokeStyle = '#ff3df0'; k.lineWidth = 8; k.stroke();
  k.fillStyle = '#ff3df0'; for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.283; k.fillRect(256 + Math.cos(a) * 92 - 9, 256 + Math.sin(a) * 92 - 4, 18, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export const arena = arenaFor({ texture: arenaTexture, glow: 0xff40d0, ring(rim, tor, R, cz, rng) {
  const n = 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.05, 0.05), x = Math.cos(a) * (R + 1.6), z = cz + Math.sin(a) * (R + 1.6);
    if (z > cz + R * 0.75 && Math.abs(x) < 5) continue;
    const h = rng.range(1.8, 3.8), w = rng.range(1.5, 2.6);
    rim.add(new THREE.IcosahedronGeometry(1, 1), i % 2 ? 0x6a3a2a : 0x4a4a5e, { p: [x, h * 0.4, z], s: [w, h, w * 0.9], r: [0, a, 0], jitter: 0.5 });
    if (i % 3 === 0) rim.box(w * 0.9, 0.3, w * 0.6, 0xb5412a, { p: [x, h * 0.9, z], r: [0.2, a, 0.3], radius: 0.04 });
    if (i % 5 === 0) { const px = Math.cos(a) * (R + 0.6), pz = cz + Math.sin(a) * (R + 0.6); rim.cyl(0.25, 0.3, 5.6, 0x56607a, { p: [px, 2.8, pz], seg: 6 }).box(1.4, 0.9, 0.2, 0x15112a, { p: [px, 5.6, pz], r: [0, -a + Math.PI / 2, 0], radius: 0.03 }); tor.box(1.2, 0.14, 0.24, i % 2 ? MAG : CYAN, { p: [px, 5.8, pz], r: [0, -a + Math.PI / 2, 0], radius: 0.01, ao: 0 }).box(1.2, 0.14, 0.24, AMBER, { p: [px, 5.4, pz], r: [0, -a + Math.PI / 2, 0], radius: 0.01, ao: 0 }); }
  }
} });

// ---------------------------------------------------------------- acid under every gap and log-bridge pipe
export const river = fluidDress({ type: 'acid', y: -0.55, beam: true, segments: 14, pad: 1.0, overrides: { glow: 0.5 } });

// ---------------------------------------------------------------- conveyor arrows: a scrolling chevron strip over every belt; it flashes amber before a reversal
const chevrons = (dir, key) => {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d'); g.clearRect(0, 0, 128, 128);
  g.strokeStyle = key; g.lineWidth = 12; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const y of [28, 92]) { g.beginPath(); g.moveTo(32, y + 22 * dir); g.lineTo(64, y - 22 * dir); g.lineTo(96, y + 22 * dir); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
};
export function beltDress(seg, ctx) {
  const g = frame(seg, ctx), items = [], texs = [chevrons(1, '#25ffe6'), chevrons(-1, '#25ffe6')];   // texture v grows toward -z (down the track): dir=1 chevrons point forward
  for (const bx of seg.boxes) if (bx.kind === 'conveyor') {
    const L = bx.s1 - bx.s0, W = bx.x1 - bx.x0 - 1.0, mat = new THREE.MeshBasicMaterial({ map: texs[0], transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.1, 1.1, 1.1), opacity: 0.8, fog: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, L).rotateX(-Math.PI / 2), mat); m.position.set(0, bx.y1 + 0.03, -(bx.s0 - seg.s0) - L / 2); m.renderOrder = 2; g.add(m); items.push({ bx, mat, W, L, off: 0 });
  }
  return { object: g, update(t, s, dt = 1 / 60) {
    for (const it of items) {
      const v = it.bx.belt || 0, dir = v >= 0 ? 0 : 1; it.mat.map = texs[dir]; it.off = (it.off + v * dt / 3.4) % 1;
      texs[dir].repeat.set(Math.max(1, Math.round(it.W / 1.6)), it.L / 1.6); texs[dir].offset.y = -it.off * 1.0;
      it.mat.color.setRGB(...(it.bx.warn && Math.sin(t * 26) > 0 ? [3, 1.6, 0.3] : [1.1, 1.1, 1.1]));
    }
  }, dispose() { texs.forEach((x) => x.dispose()); items.forEach((it) => { it.mat.dispose(); }); } };
}
