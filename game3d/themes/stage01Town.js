import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';
import { createFluid } from '../render/fluids.js';
import { placeMatrix } from '../world/scenery.js';
import { skull } from './stage01Props.js';

// Set dressing for Desert Scrub's special segments: the ghost-town street (side view), checkpoint flags, the
// boss gate, the arena and the quicksand patch. All of it is built in the segment's own frame: x lateral,
// y up, z = -(s - seg.s0), then placed once with the track frame at the segment start (these segments are straight).
// A dresser returns { object, update?(t), dispose?(), ...hooks the level calls (setOpen, activate) }.
const frame = (seg, ctx) => {
  const g = new THREE.Group(); g.matrixAutoUpdate = false;
  g.matrix.copy(placeMatrix(ctx.track, seg.s0, 0, 0)); g.matrixWorldNeedsUpdate = true; return g;
};
const toon = (ctx) => (ctx.api.toonMat ??= createToon({ vertexColors: true }));
const glowMat = (ctx) => (ctx.api.glowMat ??= createToon({ color: 0xffb04a, emissive: 0xff9a30, emissiveIntensity: 2.6, grime: false, rim: false, tint: false }));
const mesh = (b, mat, parent, shadow = false) => { const m = new THREE.Mesh(b.build ? b.build() : b, mat); m.castShadow = shadow; parent.add(m); return m; };

function signTexture(text, bg, fg) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 96); g.strokeStyle = '#2a1408'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 88);
  g.fillStyle = fg; g.font = 'bold 54px Bangers, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 52, 230); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------- ghost town (the side-view section)
const SHOPS = [
  { s: 3, w: 9, h: 5.0, c: 0xb06a48, sign: 'HOTEL', bg: '#7a3f2a' }, { s: 14, w: 7, h: 4.4, c: 0x6e8f9a, sign: 'LAUNDRY', bg: '#3c5f6b' },
  { s: 23, w: 11, h: 6.0, c: 0xc9824a, sign: 'SALOON', bg: '#8a2e2e' }, { s: 36, w: 7, h: 4.6, c: 0x9a7a58, sign: 'BANK', bg: '#4a3a2a' },
  { s: 46, w: 10, h: 5.2, c: 0xa9693f, sign: 'GENERAL STORE', bg: '#5a3a22' }, { s: 58, w: 10, h: 5.6, c: 0x8d6f9a, sign: 'BATHS', bg: '#4a3a78' },
];
export function ghostTown(seg, ctx) {
  const g = frame(seg, ctx), fx = -3.4, D = 7, wood = new Builder({ boxSeg: 1 }), glow = new Builder({ boxSeg: 1 }), signs = [];
  for (const [bi, b] of SHOPS.entries()) {
    const z1 = -b.s, z0 = z1 - b.w, zc = (z0 + z1) / 2, dark = new THREE.Color(b.c).multiplyScalar(0.7).getHex(), trim = 0xf1d9a8;
    wood.box(D, b.h, b.w, b.c, { p: [fx - D / 2, b.h / 2, zc], radius: 0.05 })
      .box(0.9, 1.7, b.w + 0.1, b.c, { p: [fx - 0.35, b.h + 0.85, zc], radius: 0.05 }).box(1.1, 0.25, b.w + 0.3, dark, { p: [fx - 0.35, b.h + 1.75, zc], radius: 0.04 })
      .box(2.0, 0.16, b.w + 0.2, dark, { p: [fx + 0.95, 3.15, zc], r: [0, 0, 0.07], radius: 0.04 }).box(1.9, 0.12, b.w, 0x6a4a30, { p: [fx + 0.95, 0.06, zc], radius: 0.02 });
    for (const pz of [z0 + 0.4, zc, z1 - 0.4]) wood.box(0.16, 3.1, 0.16, 0x5a3a22, { p: [fx + 1.85, 1.55, pz], radius: 0.03 });
    for (let y = 0.7; y < b.h; y += 0.75) wood.box(0.05, 0.05, b.w, dark, { p: [fx + 0.03, y, zc], radius: 0.01, ao: 0 });
    wood.box(0.12, 2.2, 1.2, 0x3a2418, { p: [fx + 0.05, 1.1, zc], radius: 0.03 }).box(0.16, 0.14, 1.5, trim, { p: [fx + 0.06, 2.3, zc], radius: 0.02 });
    const cols = Math.floor(b.w / 3);
    for (let i = 0; i < cols; i++) {
      const wz = zc + (i - (cols - 1) / 2) * 3 + (cols === 1 ? 2.4 : 0) * (i === 0 && cols === 1 ? 1 : 0);
      for (const wy of b.h > 4.8 ? [1.7, 3.9] : [1.8]) {
        const lit = (bi * 7 + i * 3 + wy) % 5 < 1.5;
        wood.box(0.12, 1.0, 0.85, 0x2a1a24, { p: [fx + 0.05, wy, wz], radius: 0.03 }).box(0.16, 0.08, 1.05, trim, { p: [fx + 0.07, wy + 0.55, wz], radius: 0.02 });
        if (lit) glow.box(0.05, 0.8, 0.6, 0xffffff, { p: [fx + 0.14, wy, wz], radius: 0.02, ao: 0 });
        else wood.box(0.06, 0.9, 0.04, 0x6a4a30, { p: [fx + 0.14, wy, wz + 0.15], r: [0, 0, 0.5], radius: 0.01 }); // boarded-up slat
      }
    }
    const tex = signTexture(b.sign, b.bg, '#ffe9a8'), sm = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.5, b.w - 1), 1.2), new THREE.MeshBasicMaterial({ map: tex }));
    sm.rotation.y = Math.PI / 2; sm.position.set(fx + 0.17, b.h + 0.8, zc); g.add(sm); signs.push(tex, sm.material, sm.geometry);
  }
  // water tower, barrels, troughs, hitching posts, a broken wagon wheel: the street's clutter
  const tw = new Builder({ boxSeg: 1 }).cyl(1.5, 1.5, 2.4, 0xa9693f, { p: [0, 6.2, 0], seg: 12 }).cone(1.7, 1.3, 0x6a4a30, { p: [0, 8.05, 0], seg: 12 }).box(0.9, 0.12, 0.12, 0x5a3a22, { p: [0, 5, 0], r: [0, 0.6, 0], radius: 0.02 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tw.box(0.22, 5.2, 0.22, 0x5a3a22, { p: [x, 2.6, z], radius: 0.04 });
  const tower = mesh(tw, toon(ctx), g, true); tower.position.set(-11.5, 0, -40);
  const props = new Builder({ boxSeg: 1 });
  for (const [x, z] of [[-2.7, -2], [-2.5, -13.2], [-2.6, -34.7], [-2.7, -45], [-2.5, -57]]) props.cyl(0.36, 0.4, 0.9, 0x7a4a2a, { p: [x, 0.45, z], seg: 9 }).cyl(0.37, 0.37, 0.07, 0x3a2418, { p: [x, 0.62, z], seg: 9 });
  for (const z of [-21.7, -44.5, -68.8]) props.box(0.5, 0.5, 1.6, 0x4a6a8a, { p: [-2.6, 0.3, z], radius: 0.06 }).box(0.5, 0.12, 1.5, 0x5a8aa8, { p: [-2.6, 0.56, z], radius: 0.03 });
  for (const z of [-12.8, -35.4, -56.6]) props.box(0.1, 1.1, 0.1, 0x5a3a22, { p: [-2.2, 0.55, z - 0.7] }).box(0.1, 1.1, 0.1, 0x5a3a22, { p: [-2.2, 0.55, z + 0.7] }).box(0.1, 0.1, 1.7, 0x6a4a30, { p: [-2.2, 1.0, z] });
  props.add(new THREE.TorusGeometry(0.5, 0.06, 5, 12), 0x5a3a22, { p: [-2.5, 0.5, -29], r: [0, 1.57, 0.2] });
  mesh(props, toon(ctx), g, true);
  mesh(glow, glowMat(ctx), g);
  mesh(wood, toon(ctx), g, true);
  return { object: g, dispose() { signs.forEach((x) => x.dispose?.()); } };
}

// ---------------------------------------------------------------- checkpoint flag
export function checkpointFlag(seg, ctx) {
  const g = frame(seg, ctx), z = -(seg.checkpoint - seg.s0), x = -(ctx.half + 0.9);
  mesh(new Builder().cyl(0.07, 0.09, 4.4, 0xeeeeee, { p: [x, 2.2, z], seg: 8 }).sphere(0.16, 0xffd23a, { p: [x, 4.5, z], ao: 0 })
    .box(1.1, 0.35, 1.1, 0x8a5a33, { p: [x, 0.17, z], radius: 0.08 }), toon(ctx), g, true);
  const c = document.createElement('canvas'); c.width = 128; c.height = 80; const k = c.getContext('2d');
  k.fillStyle = '#fff'; k.fillRect(0, 0, 128, 80); k.fillStyle = '#d8f4ff'; k.beginPath(); k.arc(64, 42, 24, 0, 7); k.fill();
  k.strokeStyle = '#7fd8ff'; k.lineWidth = 5; k.stroke(); k.fillStyle = '#fff'; k.beginPath(); k.arc(56, 34, 7, 0, 7); k.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const cloth = new THREE.PlaneGeometry(1.7, 1.05, 8, 3), mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x6a6a72, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(cloth, mat); flag.position.set(x, 3.75, z - 0.85); flag.rotation.y = Math.PI / 2; g.add(flag);
  const base = cloth.attributes.position.array.slice(), clean = new THREE.Color(0x35e08a), grey = new THREE.Color(0x6a6a72);
  let on = ctx.api.passed?.has(seg.checkpoint) ? 1 : 0, target = on;     // a rebuilt chunk keeps a passed flag lit
  return {
    object: g, seg, get active() { return target === 1; }, activate() { target = 1; }, reset() { target = 0; on = 0; },
    update(t) {
      on += (target - on) * 0.08; mat.color.copy(grey).lerp(clean, on);
      const p = cloth.attributes.position, amp = 0.05 + 0.12 * on;
      for (let i = 0; i < p.count; i++) { const u = (base[i * 3] + 0.85) / 1.7; p.setZ(i, Math.sin(t * (3 + 3 * on) - u * 5) * amp * u); }
      p.needsUpdate = true;
    },
    dispose() { tex.dispose(); cloth.dispose(); mat.dispose(); },
  };
}

// ---------------------------------------------------------------- boss gate: stone arch with two doors that swing open
export function bossGate(seg, ctx) {
  const g = frame(seg, ctx), z = -39.3, half = ctx.half + 1, stone = 0x6b5b7a, light = 0x8d7aa0;
  const arch = new Builder()
    .box(1.7, 8.4, 2.0, stone, { p: [-(half + 0.8), 4.2, z], radius: 0.12, jitter: 0.06 }).box(1.7, 8.4, 2.0, stone, { p: [half + 0.8, 4.2, z], radius: 0.12, jitter: 0.06 })
    .box(2 * half + 4.2, 1.5, 2.2, light, { p: [0, 7.9, z], radius: 0.15 }).box(2 * half + 5, 0.5, 2.5, stone, { p: [0, 8.9, z], radius: 0.1 })
    .box(7, 7, 4, 0x5a4a6a, { p: [-(half + 6.2), 3.5, z + 0.6], radius: 0.4, jitter: 0.5 }).box(7, 8.5, 4, 0x5a4a6a, { p: [half + 6.2, 4.2, z + 0.6], radius: 0.4, jitter: 0.5 })
    .sphere(0.55, 0xf3ead8, { p: [0, 9.6, z], s: [1, 0.9, 0.9], ao: 0 }).box(0.5, 0.4, 0.4, 0xf3ead8, { p: [0, 9.15, z + 0.05], radius: 0.1, ao: 0 })
    .sphere(0.14, 0x1a1014, { p: [-0.2, 9.65, z + 0.45], ao: 0 }).sphere(0.14, 0x1a1014, { p: [0.2, 9.65, z + 0.45], ao: 0 });
  for (const side of [-1, 1]) arch.cyl(0.07, 0.1, 1.3, 0x3a2418, { p: [side * (half - 0.2), 3.2, z + 1.4], seg: 6 });
  mesh(arch, toon(ctx), g, true);
  for (const side of [-1, 1]) mesh(new Builder().sphere(0.28, 0xffffff, { p: [side * (half - 0.2), 4.1, z + 1.4], s: [1, 1.5, 1], ao: 0 }), createToon({ color: 0xffb04a, emissive: 0xff8a20, emissiveIntensity: 3, grime: false, rim: false, tint: false }), g);
  const doorW = half, doors = [-1, 1].map((side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * half, 0, z); g.add(pivot);
    const b = new Builder().box(doorW, 6.6, 0.45, 0x6a4a30, { p: [-side * doorW / 2, 3.3, 0], radius: 0.05 });
    for (let i = 0; i < 5; i++) b.box(0.08, 6.4, 0.5, 0x4a3020, { p: [-side * (0.35 + i * (doorW - 0.6) / 4), 3.3, 0], radius: 0.02 });
    b.box(doorW, 0.3, 0.55, 0x2a1a24, { p: [-side * doorW / 2, 1.4, 0] }).box(doorW, 0.3, 0.55, 0x2a1a24, { p: [-side * doorW / 2, 5.0, 0] });
    mesh(b, toon(ctx), pivot, true); return { pivot, side };
  });
  let open = 0;
  const gate = { object: g, get open() { return open; }, setOpen(k) { open = k; for (const d of doors) d.pivot.rotation.y = -d.side * k * 1.45; }, update() {} };
  gate.setOpen(ctx.api.gateOpen || 0);   // a rebuilt chunk keeps the doors as the fight left them
  return gate;
}

// ---------------------------------------------------------------- arena: a sandstone disc ringed by boulders and torches
function arenaTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const k = c.getContext('2d');
  k.fillStyle = '#d9a566'; k.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) { k.fillStyle = `rgba(${150 + (i % 60)},${95 + (i % 40)},60,.18)`; k.fillRect((i * 97) % 512, (i * 223) % 512, 2 + (i % 5), 2 + (i % 3)); }
  k.strokeStyle = '#8a4a34'; k.lineWidth = 10; for (const r of [244, 196, 120]) { k.beginPath(); k.arc(256, 256, r, 0, 7); k.stroke(); }
  k.lineWidth = 5; k.strokeStyle = '#a65f3e'; for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.283; k.beginPath(); k.moveTo(256 + Math.cos(a) * 124, 256 + Math.sin(a) * 124); k.lineTo(256 + Math.cos(a) * 192, 256 + Math.sin(a) * 192); k.stroke(); }
  k.fillStyle = '#f0c46a'; k.beginPath(); k.arc(256, 256, 70, 0, 7); k.fill(); k.strokeStyle = '#8a4a34'; k.lineWidth = 8; k.stroke();
  k.fillStyle = '#fff'; k.beginPath(); k.arc(238, 240, 20, 0, 7); k.fill(); k.beginPath(); k.arc(278, 272, 12, 0, 7); k.fill(); // a soap bubble, of course
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function arenaDress(seg, ctx) {
  const g = frame(seg, ctx), A = seg.arena, R = A.r, cz = -(A.s - seg.s0), tex = arenaTexture();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R + 0.5, 64), createToon({ map: tex })); disc.rotation.x = -Math.PI / 2; disc.position.set(0, 0.03, cz); disc.receiveShadow = true; g.add(disc);
  const rim = new Builder(), tor = new Builder(), rng = ctx.rng, n = 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.05, 0.05), x = Math.cos(a) * (R + 1.5), z = cz + Math.sin(a) * (R + 1.5), nearMouth = z > cz + R * 0.75 && Math.abs(x) < 5;
    if (nearMouth) continue;
    const h = rng.range(1.6, 3.2), w = rng.range(1.4, 2.4);
    rim.add(new THREE.IcosahedronGeometry(1, 1), i % 2 ? 0xc0452d : 0x9a3a2e, { p: [x, h * 0.35, z], s: [w, h, w], r: [0, a, 0], jitter: 0.5 });
    if (i % 5 === 0) { rim.box(0.7, 4.6, 0.7, 0x6b5b7a, { p: [Math.cos(a) * (R + 0.6), 2.3, cz + Math.sin(a) * (R + 0.6)], radius: 0.1 }); tor.sphere(0.3, 0xffffff, { p: [Math.cos(a) * (R + 0.6), 4.9, cz + Math.sin(a) * (R + 0.6)], s: [1, 1.5, 1], ao: 0 }); }
  }
  mesh(rim, toon(ctx), g, true); mesh(tor, createToon({ color: 0xffb04a, emissive: 0xff8a20, emissiveIntensity: 3.2, grime: false, rim: false, tint: false }), g);
  return { object: g, dispose() { tex.dispose(); } };
}

// ---------------------------------------------------------------- quicksand patch: animated fluid + warning skulls
export function quicksandPatch(seg, ctx) {
  const g = new THREE.Group(), fluids = [], geo = skull(ctx.theme.colors), m = createToon({ vertexColors: true });
  for (const p of seg.patches) {
    const f = createFluid('quicksand', { width: p.x1 - p.x0, length: p.s1 - p.s0, segments: 10 });
    f.mesh.matrixAutoUpdate = false; f.mesh.matrix.copy(placeMatrix(ctx.track, (p.s0 + p.s1) / 2, (p.x0 + p.x1) / 2, -0.24, 0)); g.add(f.mesh); fluids.push(f);
    for (const [s, side, yaw] of [[p.s0 - 0.8, Math.sign(p.x0 + p.x1) || 1, 0.3], [p.s1 + 0.8, -(Math.sign(p.x0 + p.x1) || 1), -0.3]]) {
      const o = new THREE.Mesh(geo, m); o.matrixAutoUpdate = false; o.matrix.copy(placeMatrix(ctx.track, s, side * (ctx.half + 0.5), 0, yaw)); g.add(o);
    }
  }
  return { object: g, fluids };
}
