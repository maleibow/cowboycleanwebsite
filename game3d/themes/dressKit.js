import * as THREE from 'three';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';
import { createFluid } from '../render/fluids.js';
import { placeMatrix } from '../world/scenery.js';

// Parametric versions of stage 1's set dressing (themes/stage01Town.js), so stages 2-4 re-skin the checkpoint flag, boss gate,
// arena and gap fluid with a small style object instead of copying 100 lines each. Everything is built in the segment's own frame
// (x lateral, y up, z = -(s - seg.s0)); a dresser returns { object, update?, dispose?, fluids?, setOpen?, activate?, reset? }.
export const frame = (seg, ctx) => {
  const g = new THREE.Group(); g.matrixAutoUpdate = false;
  g.matrix.copy(placeMatrix(ctx.track, seg.s0, 0, 0)); g.matrixWorldNeedsUpdate = true; return g;
};
export const toon = (ctx) => (ctx.api.toonMat ??= createToon({ vertexColors: true }));
export const glowToon = (color, emissive, k = 3) => createToon({ color, emissive, emissiveIntensity: k, grime: false, rim: false, tint: false });
// unlit vertex-coloured glow for windows and neon: the colours (above 1.0 for the bloom) come from the geometry
export const glowBasic = () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
export const mesh = (b, mat, parent, shadow = false) => { const m = new THREE.Mesh(b.build ? b.build() : b, mat); m.castShadow = shadow; parent.add(m); return m; };

// ---- checkpoint flag: pole + a cloth that is grey until passed, then fills with colour and waves faster
// style: { pole, cap, base, clean, grey, emblem(ctx2d) }
export const checkpointFlagFor = (style) => (seg, ctx) => {
  const g = frame(seg, ctx), z = -(seg.checkpoint - seg.s0), x = -(ctx.half + 0.9);
  mesh(new Builder().cyl(0.07, 0.09, 4.4, style.pole ?? 0xeeeeee, { p: [x, 2.2, z], seg: 8 }).sphere(0.16, style.cap ?? 0xffd23a, { p: [x, 4.5, z], ao: 0 })
    .box(1.1, 0.35, 1.1, style.base ?? 0x8a5a33, { p: [x, 0.17, z], radius: 0.08 }), toon(ctx), g, true);
  const c = document.createElement('canvas'); c.width = 128; c.height = 80; const k = c.getContext('2d');
  k.fillStyle = '#fff'; k.fillRect(0, 0, 128, 80); style.emblem?.(k);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const cloth = new THREE.PlaneGeometry(1.7, 1.05, 8, 3), grey = new THREE.Color(style.grey ?? 0x6a6a72), clean = new THREE.Color(style.clean ?? 0x35e08a);
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: grey, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(cloth, mat); flag.position.set(x, 3.75, z - 0.85); flag.rotation.y = Math.PI / 2; g.add(flag);
  const base = cloth.attributes.position.array.slice();
  let on = ctx.api.passed?.has(seg.checkpoint) ? 1 : 0, target = on;
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
};

// ---- boss gate: an arch with two doors that swing open (world/arena.js calls setOpen(k) 0..1).
// style: { stone, light, wall (the rubble flanks), door, doorDark, lamp: [r,g,b hex], emblem(b, z) adds the crest above the arch, lampMat }
export const bossGateFor = (style) => (seg, ctx) => {
  const g = frame(seg, ctx), z = -39.3, half = ctx.half + 1, S = style;
  const arch = new Builder()
    .box(1.7, 8.4, 2.0, S.stone, { p: [-(half + 0.8), 4.2, z], radius: 0.12, jitter: 0.06 }).box(1.7, 8.4, 2.0, S.stone, { p: [half + 0.8, 4.2, z], radius: 0.12, jitter: 0.06 })
    .box(2 * half + 4.2, 1.5, 2.2, S.light, { p: [0, 7.9, z], radius: 0.15 }).box(2 * half + 5, 0.5, 2.5, S.stone, { p: [0, 8.9, z], radius: 0.1 })
    .box(7, 7, 4, S.wall, { p: [-(half + 6.2), 3.5, z + 0.6], radius: 0.4, jitter: 0.5 }).box(7, 8.5, 4, S.wall, { p: [half + 6.2, 4.2, z + 0.6], radius: 0.4, jitter: 0.5 });
  S.emblem?.(arch, z);
  mesh(arch, toon(ctx), g, true);
  const lampB = new Builder(); for (const side of [-1, 1]) lampB.sphere(0.28, 0xffffff, { p: [side * (half - 0.2), 4.1, z + 1.4], s: [1, 1.5, 1], ao: 0 });
  mesh(lampB, glowToon(S.lamp ?? 0xffb04a, S.lamp ?? 0xff8a20), g);
  const doorW = half, doors = [-1, 1].map((side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * half, 0, z); g.add(pivot);
    const b = new Builder().box(doorW, 6.6, 0.45, S.door, { p: [-side * doorW / 2, 3.3, 0], radius: 0.05 });
    for (let i = 0; i < 5; i++) b.box(0.08, 6.4, 0.5, S.doorDark, { p: [-side * (0.35 + i * (doorW - 0.6) / 4), 3.3, 0], radius: 0.02 });
    b.box(doorW, 0.3, 0.55, S.doorDark, { p: [-side * doorW / 2, 1.4, 0] }).box(doorW, 0.3, 0.55, S.doorDark, { p: [-side * doorW / 2, 5.0, 0] });
    mesh(b, toon(ctx), pivot, true); return { pivot, side };
  });
  let open = 0;
  const gate = { object: g, get open() { return open; }, setOpen(k) { open = k; for (const d of doors) d.pivot.rotation.y = -d.side * k * 1.45; }, update() {} };
  gate.setOpen(ctx.api.gateOpen || 0);
  return gate;
};

// ---- arena: a textured disc ringed by theme props. style: { texture(): CanvasTexture, ring(rim, tor, R, cz, rng) fills Builders (tor = glowing bits) , glow: hex }
export const arenaFor = (style) => (seg, ctx) => {
  const g = frame(seg, ctx), A = seg.arena, R = A.r, cz = -(A.s - seg.s0), tex = style.texture();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R + 0.5, 64), createToon({ map: tex })); disc.rotation.x = -Math.PI / 2; disc.position.set(0, 0.03, cz); disc.receiveShadow = true; g.add(disc);
  const rim = new Builder(), tor = new Builder();
  style.ring(rim, tor, R, cz, ctx.rng);
  mesh(rim, toon(ctx), g, true); mesh(tor, glowToon(style.glow ?? 0xffb04a, style.glow ?? 0xff8a20, 3.2), g);
  const extra = style.extra?.(g, R, cz, ctx);
  return { object: g, update: extra?.update, dispose() { tex.dispose(); extra?.dispose?.(); } };
};

// ---- a river / pool of fluid under every gap in the segment (or over `patches`): the gap fluid of the stage.
// opts: { type, y (surface height), over: 'gaps' | 'patches', pad (extra length), width (default: the corridor + 24 m), overrides }
export const fluidDress = (opts) => (seg, ctx) => {
  const g = new THREE.Group(), fluids = [], list = opts.over === 'patches' ? seg.patches : seg.gaps;
  for (const q of list || []) {
    const w = opts.over === 'patches' ? q.x1 - q.x0 : opts.width ?? 2 * (ctx.half + 10), cx = opts.over === 'patches' ? (q.x0 + q.x1) / 2 : 0;
    const f = createFluid(opts.type, { width: w, length: q.s1 - q.s0 + (opts.pad ?? 0.8), segments: opts.segments ?? 14, overrides: opts.overrides });
    f.mesh.matrixAutoUpdate = false; f.mesh.matrix.copy(placeMatrix(ctx.track, (q.s0 + q.s1) / 2, cx, opts.y ?? -1.2, 0)); g.add(f.mesh); fluids.push(f);
  }
  if (opts.beam) for (const bx of seg.boxes) if (bx.kind === 'beam') {   // a fallen-log bridge: the fluid runs under its whole length
    const f = createFluid(opts.type, { width: 2 * (ctx.half + 10), length: bx.s1 - bx.s0, segments: opts.segments ?? 14, overrides: opts.overrides });
    f.mesh.matrixAutoUpdate = false; f.mesh.matrix.copy(placeMatrix(ctx.track, (bx.s0 + bx.s1) / 2, 0, opts.y ?? -1.2, 0)); g.add(f.mesh); fluids.push(f);
  }
  opts.after?.(seg, ctx, g);
  return { object: g, fluids };
};
