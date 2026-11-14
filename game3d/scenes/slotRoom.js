import * as THREE from 'three';
import { createRoom } from './room.js';
import { Builder } from '../actors/modelKit.js';
import { createToon, makeOutline } from '../render/materials.js';
import { createParticles } from '../render/particles.js';
import { CASINO } from '../data/casino.js';

// The Lucky 7 casino room: a red-carpeted room with one big slot machine. Three reels, each a drum of eight symbol
// cards (colours and 4-letter labels from the original drawCasino). `setReels([a,b,c])` takes reel positions in symbols.
const N = CASINO.symbols.length, R = 0.78, STEP = (Math.PI * 2) / N;
const hdr = (c, k) => new THREE.Color(c).multiplyScalar(k);

function symbolTexture(i) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#ecf0f1'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = CASINO.colors[i]; g.strokeStyle = '#000'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 5; g.font = '44px Bangers, cursive'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = CASINO.symbols[i].substring(0, 4); g.strokeText(label, 64, 68); g.fillText(label, 64, 68);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function createSlotRoom() {
  const room = createRoom({ bg: '#1a0610', fog: { color: '#1a0610', near: 10, far: 28 }, hemi: ['#ffd0d0', '#3a1020', 1.2], look: { shadowTint: '#8a4a6a', rimColor: '#ff9ad0', rimStrength: 0.6 }, grade: { gain: [1.1, 0.95, 0.95], vignette: 0.65 }, fov: 40 });
  const { scene, camera } = room, toon = createToon({ vertexColors: true, grime: false, rimBoost: 0.9 });
  const key = new THREE.PointLight(0xffe0c0, 40, 20, 1.6); key.position.set(0, 4.5, 4.5); scene.add(key);
  const wash = new THREE.PointLight(0xff3a6a, 18, 14, 1.6); wash.position.set(-3, 2, 2); scene.add(wash);

  const b = new Builder({ boxSeg: 2 });
  b.box(30, 0.1, 24, 0x7a1626, { p: [0, -0.05, -4], ao: 0.1 });                                                // carpet
  for (let i = -6; i <= 6; i++) b.box(0.5, 0.11, 24, i % 2 ? 0x6a1220 : 0x8a1c30, { p: [i * 1.2, -0.04, -4], ao: 0 });
  b.box(30, 12, 0.3, 0x3a0c1c, { p: [0, 6, -4.5] });
  for (let i = -6; i <= 6; i++) b.box(0.3, 12, 0.34, 0x5a1a2c, { p: [i * 2, 6, -4.4], ao: 0 });                // wallpaper stripes
  // the machine
  b.box(3.6, 4.6, 1.9, 0xc0392b, { p: [0, 2.3, -1], radius: 0.25 });                                           // cabinet
  b.box(3.8, 0.3, 2.0, 0xe6b22a, { p: [0, 0.15, -1], radius: 0.1 });                                           // base trim
  b.box(3.3, 1.8, 0.2, 0x240a14, { p: [0, 2.35, -0.1], radius: 0.08 });                                        // reel window back
  b.box(3.5, 0.32, 0.5, 0xe6b22a, { p: [0, 3.35, 0.0], radius: 0.1 }); b.box(3.5, 0.32, 0.5, 0xe6b22a, { p: [0, 1.35, 0.0], radius: 0.1 });   // window frame
  b.box(0.32, 2.2, 0.5, 0xe6b22a, { p: [-1.75, 2.35, 0.0], radius: 0.1 }); b.box(0.32, 2.2, 0.5, 0xe6b22a, { p: [1.75, 2.35, 0.0], radius: 0.1 });
  b.box(3.3, 0.7, 1.2, 0x9a2a20, { p: [0, 1.0, 0.1], radius: 0.15 });                                         // coin tray
  b.box(2.2, 0.16, 0.7, 0x1a0a10, { p: [0, 0.9, 0.55], radius: 0.06 });
  b.box(3.6, 1.1, 0.5, 0xe6b22a, { p: [0, 5.1, -0.8], radius: 0.15 });                                         // marquee
  const body = new THREE.Mesh(b.build(), toon); makeOutline(body, { width: 0.003 }); scene.add(body);

  const sign = (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = '#240a14'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#ffd84a'; g.strokeStyle = '#e67e22'; g.lineWidth = 8; g.font = '92px Bangers, cursive'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('LUCKY 7', 256, 70); g.fillText('LUCKY 7', 256, 70); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 0.78), new THREE.MeshBasicMaterial({ map: sign, color: hdr(0xffffff, 1.5), fog: false })); board.position.set(0, 5.1, -0.54); scene.add(board);
  const bulbs = [], bg = new THREE.SphereGeometry(0.09, 8, 6);
  for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: hdr(0xffd84a, 2.4), fog: false })); const u = i / 22, pos = u < 0.36 ? [-1.65 + (u / 0.36) * 3.3, 5.62] : u < 0.5 ? [1.7, 5.62 - ((u - 0.36) / 0.14) * 1.1] : u < 0.86 ? [1.65 - ((u - 0.5) / 0.36) * 3.3, 4.55] : [-1.7, 4.55 + ((u - 0.86) / 0.14) * 1.1]; m.position.set(pos[0], pos[1], -0.5); scene.add(m); bulbs.push(m); }

  // reels
  const tex = Array.from({ length: N }, (_, i) => symbolTexture(i)), cardGeo = new THREE.PlaneGeometry(0.98, 0.98), reels = [];
  const drumGeo = new THREE.CylinderGeometry(R - 0.02, R - 0.02, 0.98, 16); drumGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(); g.position.set((i - 1) * 1.05, 2.35, -0.05); scene.add(g);
    g.add(new THREE.Mesh(drumGeo, new THREE.MeshBasicMaterial({ color: 0xbfc5c8 })));
    for (let k = 0; k < N; k++) {
      const c = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: tex[k] })), th = k * STEP;
      c.position.set(0, Math.sin(th) * R, Math.cos(th) * R); c.rotation.x = -th; c.scale.set(0.92, 0.7, 1); g.add(c);
    }
    reels.push(g);
  }
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.74), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'varying vec2 vUv; void main(){ float e = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y); float line = smoothstep(0.03, 0.0, abs(vUv.y - 0.5)); gl_FragColor = vec4(mix(vec3(1.0, 0.25, 0.2), vec3(0.0), 1.0 - line), (1.0 - e) * 0.8 + line * 0.9); }' }));
  shade.position.set(0, 2.35, 0.48); scene.add(shade);                                                          // the original's dark fade top/bottom + red win line

  // lever
  const lever = new THREE.Group(); lever.position.set(2.0, 2.0, -0.6); scene.add(lever);
  const lb = new Builder({ boxSeg: 1 }).cyl(0.07, 0.07, 1.3, 0xc8ced4, { p: [0, 0.65, 0], seg: 8 }).sphere(0.22, 0xe74c3c, { p: [0, 1.38, 0] }).box(0.2, 0.3, 0.3, 0x606870, { p: [0, 0, 0] });
  lever.add(new THREE.Mesh(lb.build(), toon));
  const fx = createParticles(); scene.add(fx.mesh);

  let leverT = 0, flash = 0;
  const api = { ...room, reels, fx };
  api.setReels = (pos) => { for (let i = 0; i < 3; i++) reels[i].rotation.x = ((pos[i] % N) + N) % N * STEP; };
  api.pull = () => { leverT = 0.5; };
  api.jackpot = () => { flash = 2; for (let i = 0; i < 4; i++) fx.emit('coinBurst', (i - 1.5) * 0.9, 1.0, 0.8, { count: 1.5 }); fx.emit('confetti', 0, 3, 0.6, { count: 2 }); };
  api.update = (dt) => {
    const t = (room.time += dt); leverT = Math.max(0, leverT - dt); flash = Math.max(0, flash - dt);
    lever.rotation.x = Math.sin((1 - leverT / 0.5) * Math.PI) * (leverT > 0 ? 1.1 : 0);
    bulbs.forEach((m, i) => { const on = flash > 0 ? Math.floor(t * 12 + i) % 2 : Math.floor(t * 4 + i) % 3 === 0; m.material.color.copy(hdr(on ? 0xfff2a0 : 0x6a4a10, on ? 3 : 1)); });
    camera.position.set(Math.sin(t * 0.3) * 0.35, 3.1 + Math.sin(t * 0.5) * 0.05, 9.2); camera.lookAt(0, 2.75, 0);
    wash.intensity = 18 + Math.sin(t * 2) * 5 + flash * 16; fx.update(dt, camera);
  };
  return api;
}
