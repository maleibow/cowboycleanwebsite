import * as THREE from 'three';
import { createRoom } from './room.js';
import { Builder } from '../actors/modelKit.js';
import { eyes } from '../actors/partKit.js';
import { createToon, makeOutline } from '../render/materials.js';
import { createParticles } from '../render/particles.js';

// Jerry's Saloon, the store between stages: a warm wooden interior with a bar, a bottle shelf, a piano, tables, a
// chandelier, swinging doors and Jerry polishing a glass. The six upgrade props stand on the counter (the DOM store
// UI sits on top). All geometry is merged primitives with vertex colours (a handful of draw calls).
const W = { plank: [0x9a6a3c, 0x8a5a30, 0xa8763f, 0x7e5028], dark: 0x4a2c18, mid: 0x6b4226, light: 0xb98350, red: 0x8e2b2b, cream: 0xf0e2c0, brass: 0xd9a93a };
const glow = (c, k = 2.2) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), fog: false });

export function createSaloon() {
  const room = createRoom({ bg: '#1c1008', fog: { color: '#2a160a', near: 14, far: 34 }, hemi: ['#ffd9a0', '#3a2010', 1.5], look: { shadowTint: '#8a5a48', rimColor: '#ffb060', rimStrength: 0.55 }, grade: { gain: [1.1, 1.0, 0.88], lift: [0.03, 0.0, 0.0], vignette: 0.6 }, fov: 52 });
  const { scene, camera } = room, toon = createToon({ vertexColors: true, grime: false, rimBoost: 0.8 }), prop = (g, outline = true) => { const m = new THREE.Mesh(g, toon); if (outline) makeOutline(m, { width: 0.003 }); scene.add(m); return m; };
  const b = new Builder({ boxSeg: 1 });
  // floor, walls, beams
  for (let i = 0; i < 24; i++) b.box(0.68, 0.12, 14, W.plank[i % 4], { p: [-8 + i * 0.68 + 0.34, -0.06, -1], ao: 0.1, radius: 0.02 });
  b.box(17, 7, 0.4, W.mid, { p: [0, 3.5, -7], ao: 0.15 });
  for (let i = -8; i <= 8; i++) b.box(0.08, 5.6, 0.1, 0x5a3520, { p: [i * 1, 3.2, -6.75], ao: 0 });
  b.box(0.4, 7, 14, W.mid, { p: [-8.5, 3.5, -1] }); b.box(0.4, 7, 14, W.mid, { p: [8.5, 3.5, -1] });
  b.box(17, 0.5, 14, W.dark, { p: [0, 7, -1] }); b.box(0.5, 6, 0.5, W.dark, { p: [-4.5, 3.2, -6.5] }); b.box(0.5, 6, 0.5, W.dark, { p: [4.5, 3.2, -6.5] });
  b.box(17, 0.4, 0.5, W.dark, { p: [0, 5.2, -6.5] });                                    // rail above the shelves
  // bar: front panel with raised trim, top, brass foot rail
  b.box(10, 1.0, 1.1, W.mid, { p: [0, 0.5, -3], radius: 0.05 }); b.box(10.3, 0.14, 1.4, W.light, { p: [0, 1.08, -3], radius: 0.05 });
  for (let i = -4; i <= 4; i++) b.box(0.7, 0.8, 0.06, W.dark, { p: [i * 1.1, 0.52, -2.43], ao: 0 });
  b.cyl(0.05, 0.05, 10, W.brass, { p: [0, 0.2, -2.3], r: [0, 0, Math.PI / 2], seg: 8, ao: 0 });
  // shelves + bottles behind the bar
  for (const y of [2.4, 3.7]) {
    b.box(9, 0.12, 0.6, W.light, { p: [0, y, -6.4] });
    for (let i = 0; i < 20; i++) { const c = [0x2e8b57, 0x8b4513, 0x2a5fa8, 0xb22222, 0xd9a93a][i % 5], x = -4.3 + i * 0.45 + ((i * 37) % 7) * 0.01; b.cyl(0.11, 0.13, 0.5, c, { p: [x, y + 0.31, -6.4], seg: 8 }); b.cyl(0.04, 0.06, 0.25, c, { p: [x, y + 0.7, -6.4], seg: 6, ao: 0 }); }
  }
  b.box(3.4, 2.2, 0.08, 0x9ad0e0, { p: [0, 3.3, -6.76], ao: 0 });                          // mirror
  // piano (left), stool, two tables with chairs
  b.box(2.4, 1.5, 1.0, 0x2a1a14, { p: [-6.2, 0.75, -4.6], radius: 0.05 }); b.box(2.5, 0.12, 1.3, 0x1a100c, { p: [-6.2, 1.55, -4.6] }); b.box(2.2, 0.1, 0.4, 0xf4f0e6, { p: [-6.2, 1.05, -4.0], ao: 0 });
  for (let i = 0; i < 9; i++) b.box(0.07, 0.09, 0.3, 0x111111, { p: [-7.1 + i * 0.27, 1.12, -4.05], ao: 0 });
  b.cyl(0.3, 0.3, 0.1, W.red, { p: [-6.2, 0.62, -3.2], seg: 10 }); b.cyl(0.05, 0.05, 0.6, W.dark, { p: [-6.2, 0.3, -3.2], seg: 6 });
  for (const tx of [-4.2, 4.6]) {
    b.cyl(0.75, 0.75, 0.08, W.light, { p: [tx, 0.95, 0.4], seg: 14 }); b.cyl(0.08, 0.1, 0.9, W.dark, { p: [tx, 0.45, 0.4], seg: 8 }); b.cyl(0.4, 0.4, 0.06, W.dark, { p: [tx, 0.03, 0.4], seg: 10 });
    for (const [dx, dz] of [[-1.1, 0], [1.1, 0.2], [0, 1.1]]) { b.box(0.55, 0.08, 0.55, W.mid, { p: [tx + dx, 0.55, 0.4 + dz] }); b.box(0.55, 0.6, 0.08, W.mid, { p: [tx + dx, 0.9, 0.4 + dz - 0.25], r: [0, 0, 0] }); for (const [lx, lz] of [[-0.2, -0.2], [0.2, 0.2], [-0.2, 0.2], [0.2, -0.2]]) b.box(0.06, 0.5, 0.06, W.dark, { p: [tx + dx + lx, 0.27, 0.4 + dz + lz], ao: 0 }); }
  }
  b.box(0.1, 0.1, 6, W.dark, { p: [-2.5, 6.2, -1] }); b.box(0.1, 0.1, 6, W.dark, { p: [2.5, 6.2, -1] });
  prop(b.build(), false);

  // chandelier (emissive flames) + warm point lights
  const ch = new Builder({ boxSeg: 1 }); ch.cyl(0.04, 0.04, 1.0, W.brass, { p: [0, 0.5, 0], seg: 6, ao: 0 });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ch.cyl(0.05, 0.05, 0.3, W.cream, { p: [Math.cos(a) * 1.0, -0.15, Math.sin(a) * 1.0], seg: 6, ao: 0 }); }
  const chand = prop(ch.build(), false); chand.position.set(0, 5.6, -1);
  const flames = new THREE.Group(); const fm = glow(0xffc060, 3), fg = new THREE.SphereGeometry(0.1, 8, 6);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, f = new THREE.Mesh(fg, fm); f.position.set(Math.cos(a) * 1.0, 0.15, Math.sin(a) * 1.0); flames.add(f); }
  chand.add(flames); const torus = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.05, 6, 20), toon.clone()); torus.material.vertexColors = false; torus.material.color.set(W.brass); torus.rotation.x = Math.PI / 2; torus.position.y = -0.0; chand.add(torus);
  const lamps = [[0, 5.2, -1, 28], [-5.5, 3.5, -2, 10], [5.5, 3.5, -2, 10]].map(([x, y, z, d], i) => { const l = new THREE.PointLight(0xffb870, i ? 14 : 38, d, 1.6); l.position.set(x, y, z); scene.add(l); return l; });
  for (const x of [-4.8, 4.8]) { const lm = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glow(0xffc880, 3)); lm.position.set(x, 1.4, -3); scene.add(lm); }
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3), glow(0xffd090, 0.9)); win.position.set(8.28, 3.2, -1); win.rotation.y = -Math.PI / 2; scene.add(win);   // dusk light through a side window
  const motes = createParticles(); scene.add(motes.mesh);

  // swinging doors (right-front): two panels hinged at the posts; they flap when someone leaves
  const doors = [-1, 1].map((s) => { const pv = new THREE.Group(), g = new Builder({ boxSeg: 1 }).box(1.0, 1.5, 0.08, W.light, { p: [s * 0.5, 0, 0] }).box(1.0, 0.06, 0.1, W.dark, { p: [s * 0.5, 0.45, 0], ao: 0 }).box(1.0, 0.06, 0.1, W.dark, { p: [s * 0.5, -0.45, 0], ao: 0 }); pv.add(new THREE.Mesh(g.build(), toon)); pv.position.set(6.8 + s * 0.02, 1.0, 3.6); scene.add(pv); return { pv, s }; });
  doors.forEach((d, i) => { d.pv.position.x = 7.2 + (i ? 1 : 0); d.pv.rotation.y = Math.PI / 2; d.pv.position.z = 1.6; });   // a doorway on the right wall, seen edge-on

  // Jerry behind the bar
  const jerry = new THREE.Group(), jb = new Builder({ boxSeg: 2 });
  jb.box(0.95, 1.1, 0.55, 0xf0efe8, { p: [0, 0.55, 0], radius: 0.2 }); jb.box(0.95, 0.75, 0.58, 0x8a2a2a, { p: [0, 0.6, 0.01], radius: 0.18 }); jb.box(0.22, 0.9, 0.05, 0xf0efe8, { p: [0, 0.7, 0.3], ao: 0 });   // shirt + vest
  jb.sphere(0.4, 0xf0c8a0, { p: [0, 1.5, 0.02], s: [1, 1.05, 0.95] }); eyes(jb, { y: 1.55, z: 0.33, gap: 0.14, r: 0.07, pr: 0.6, look: 0.2 });
  jb.box(0.5, 0.09, 0.12, 0x2a1a10, { p: [0, 1.36, 0.38], radius: 0.04, ao: 0 }); for (const sx of [-1, 1]) jb.cone(0.07, 0.3, 0x2a1a10, { p: [sx * 0.3, 1.33, 0.36], r: [0, 0, sx * 1.4], seg: 5, ao: 0 });   // handlebar moustache
  jb.cyl(0.46, 0.5, 0.06, 0x2b2b30, { p: [0, 1.85, 0.02], seg: 14, ao: 0 }); jb.cyl(0.3, 0.34, 0.3, 0x2b2b30, { p: [0, 2.0, 0.02], seg: 12 });   // bowler hat
  const jm = new THREE.Mesh(jb.build(), toon); makeOutline(jm, { width: 0.003 }); jerry.add(jm);
  const arm = new THREE.Group(), ab = new Builder({ boxSeg: 1 }).box(0.2, 0.7, 0.2, 0xf0efe8, { p: [0, -0.3, 0], radius: 0.08 }).sphere(0.11, 0xf0c8a0, { p: [0, -0.7, 0] }).cyl(0.1, 0.07, 0.24, 0xcfe8f0, { p: [0, -0.86, 0], seg: 8, ao: 0 });
  arm.add(new THREE.Mesh(ab.build(), toon)); arm.position.set(0.5, 1.0, 0.25); jerry.add(arm); jerry.position.set(1.4, 0, -4.3); scene.add(jerry);

  // the six item props on the counter, left to right as in the store UI: boots, spring, bullet, lasso, laser gun, mecha-horse
  const props = {}, mk = (id, x, fn) => { const g = new THREE.Group(), pb = new Builder({ boxSeg: 2 }); fn(pb); g.add(new THREE.Mesh(pb.build(), toon)); g.position.set(x, 1.15, -2.7); g.userData.base = g.position.clone(); scene.add(g); props[id] = g; };
  mk('speed', -3.7, (p) => { p.box(0.22, 0.4, 0.28, 0x7a4a24, { p: [0, 0.2, 0], radius: 0.08 }).box(0.22, 0.14, 0.45, 0x6a3c1c, { p: [0, 0.07, 0.1], radius: 0.06 }).box(0.34, 0.06, 0.4, 0xd9a93a, { p: [0, 0.4, 0], radius: 0.02, ao: 0 }); });
  mk('jump', -2.2, (p) => { for (let i = 0; i < 4; i++) p.cyl(0.18, 0.18, 0.06, 0x9aa7b0, { p: [0, 0.08 + i * 0.12, 0], seg: 10, ao: 0 }); p.sphere(0.2, 0xe74c3c, { p: [0, 0.62, 0] }); });
  mk('size', -0.7, (p) => { p.cyl(0.2, 0.2, 0.45, 0xd9a93a, { p: [0, 0.3, 0], seg: 12 }); p.cone(0.2, 0.3, 0xe08a3a, { p: [0, 0.68, 0], seg: 12 }); p.cyl(0.21, 0.21, 0.05, 0x8a6a1a, { p: [0, 0.07, 0], seg: 12, ao: 0 }); });
  mk('lasso', 0.8, (p) => { p.add(new THREE.TorusGeometry(0.3, 0.05, 6, 16), 0xe0c070, { p: [0, 0.32, 0], r: [Math.PI / 2.4, 0, 0], ao: 0 }); p.add(new THREE.TorusGeometry(0.16, 0.04, 6, 12), 0xd9b060, { p: [0.28, 0.12, 0.1], r: [Math.PI / 2, 0.4, 0], ao: 0 }); });
  mk('laser', 2.3, (p) => { p.box(0.5, 0.2, 0.16, 0xc8d0d8, { p: [0, 0.3, 0], radius: 0.06 }).box(0.14, 0.3, 0.14, 0x30343a, { p: [-0.15, 0.1, 0], r: [0, 0, 0.3], radius: 0.04 }).cyl(0.06, 0.06, 0.2, 0xff2bd6, { p: [0.35, 0.3, 0], r: [0, 0, Math.PI / 2], seg: 8, ao: 0 }); });
  mk('vehicle', 3.8, (p) => { p.box(0.5, 0.3, 0.2, 0xaeb6bf, { p: [0, 0.2, 0], radius: 0.08 }).box(0.18, 0.4, 0.2, 0xaeb6bf, { p: [0.28, 0.4, 0], r: [0, 0, -0.3], radius: 0.06 }).box(0.2, 0.16, 0.18, 0xaeb6bf, { p: [0.4, 0.6, 0], radius: 0.05 }).sphere(0.04, 0xff3030, { p: [0.45, 0.62, 0.1], ao: 0 }); for (let i = 0; i < 4; i++) p.box(0.06, 0.22, 0.06, 0x707880, { p: [-0.18 + (i % 2) * 0.36, 0.0, i < 2 ? 0.06 : -0.06], ao: 0 }); });
  const pops = {};

  const api = { ...room, props, motes };
  api.flash = (id) => { pops[id] = 0.5; const g = props[id]; if (g) motes.emit('sparkle', g.position.x, g.position.y + 0.5, g.position.z, { count: 1.5, scale: 1.5 }); };
  api.update = (dt) => {
    const t = (room.time += dt);
    camera.position.set(Math.sin(t * 0.25) * 0.8, 3.0 + Math.sin(t * 0.37) * 0.08, 7.2); camera.lookAt(0, 0.7, -3);   // looks low: the room fills the top half, the store panel the bottom
    chand.rotation.y = t * 0.2; chand.position.y = 5.6 + Math.sin(t * 0.8) * 0.03;
    lamps[0].intensity = 38 + Math.sin(t * 7.3) * 2 + Math.sin(t * 3.1) * 2;
    arm.rotation.z = Math.sin(t * 5) * 0.35 + 0.35; arm.rotation.x = Math.sin(t * 2.5) * 0.2; jerry.position.y = Math.sin(t * 2) * 0.02; jerry.rotation.y = Math.sin(t * 0.6) * 0.15 - 0.1;
    for (const [id, g] of Object.entries(props)) { const p = pops[id] || 0; pops[id] = Math.max(0, p - dt); g.rotation.y = t * 0.8 + p * 12; g.scale.setScalar(1 + Math.sin(Math.min(1, p * 2) * Math.PI) * 0.5); g.position.y = g.userData.base.y + Math.sin(t * 2 + g.position.x) * 0.03 + p * 0.6; }
    for (const d of doors) d.pv.rotation.y = Math.PI / 2 + Math.sin(t * 0.7 + d.s) * 0.08;
    if (Math.random() < dt * 8) motes.emit('mote', (Math.random() - 0.5) * 14, 1 + Math.random() * 4, -4 + Math.random() * 6, { count: 1 });
    motes.update(dt, camera);
  };
  return api;
}
