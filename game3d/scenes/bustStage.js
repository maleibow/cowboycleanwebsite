import * as THREE from 'three';
import { createRoom, gradientTexture } from './room.js';
import { createBust } from '../render/busts.js';
import { createParticles } from '../render/particles.js';

// The cutscene set: a dark stage with a warm spotlight and two podiums. Heroes (Cowboy Clean, Miss Cowboy) stand on the
// left looking right, villains (Grime Overlord, Ghost) on the right looking left. The speaker steps forward and talks
// (the bust bobs while the typewriter runs); the last speaker from the other side stays behind, dimmed.
const SIDE = { 'Cowboy Clean': -1, 'Miss Cowboy': -1, 'Grime Overlord': 1, Ghost: 1 };
const SLOT_X = 1.75;

export function createBustStage() {
  const room = createRoom({ bg: '#1a0f26', fog: { color: '#1a0f26', near: 14, far: 40 }, hemi: ['#ffe9d0', '#4a2a50', 1.3], fov: 38 });
  const { scene, camera } = room;
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshBasicMaterial({ map: gradientTexture([[0, '#3a1f52'], [0.55, '#7a3a5a'], [1, '#e08a52']]), fog: false }));
  back.position.set(0, 3.5, -9); scene.add(back);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshBasicMaterial({ color: 0x120a18 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.9; scene.add(floor);
  const key = new THREE.DirectionalLight('#fff0d8', 2.2); key.position.set(-3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight('#ff9ad0', 1.4); rim.position.set(4, 3, -4); scene.add(rim);
  const particles = createParticles(); scene.add(particles.mesh);

  const busts = {}, slots = { [-1]: null, 1: null };
  for (const n of Object.keys(SIDE)) { const b = createBust(n); b.group.visible = false; b.pos = { x: SIDE[n] * 4, k: 0 }; scene.add(b.group); busts[n] = b; }
  camera.position.set(0, 1.6, 8.6); camera.lookAt(0, 0.35, 0);   // looks low so the busts sit in the upper half, above the dialogue box

  const api = { ...room, busts, talking: false, speaker: null, particles };
  api.setSpeaker = (name) => {
    const b = busts[name]; if (!b) return; const side = SIDE[name];
    if (slots[side] && slots[side] !== b) slots[side].group.visible = false;    // someone else of this side steps out
    if (slots[side] !== b) { b.pos.x = side * 4.2; b.group.visible = true; slots[side] = b; }
    api.speaker = b;
  };
  api.clear = () => { for (const k of [-1, 1]) slots[k] = null; for (const b of Object.values(busts)) b.group.visible = false; api.speaker = null; };
  // Victory line-up: both heroes front and centre, confetti.
  api.lineup = () => { api.clear(); for (const n of ['Cowboy Clean', 'Miss Cowboy']) { const b = busts[n]; b.group.visible = true; b.pos.x = SIDE[n] * 1.2; slots[SIDE[n]] = b; } api.speaker = null; api.cheer = true; };
  api.update = (dt) => {
    room.time += dt; const t = room.time;
    for (const [side, b] of Object.entries(slots)) {
      if (!b) continue; const active = b === api.speaker || api.cheer, target = api.cheer ? b.pos.x : (active ? side * SLOT_X : side * (SLOT_X + 0.9));
      b.pos.x += (target - b.pos.x) * Math.min(1, 9 * dt);
      const g = b.group, bob = active && (api.talking || api.cheer) ? Math.abs(Math.sin(t * (api.cheer ? 7 : 13))) * 0.06 : Math.sin(t * 1.6) * 0.012;
      g.position.set(b.pos.x, -0.9 + bob + (api.cheer ? Math.abs(Math.sin(t * 5 + side)) * 0.25 : 0), active ? 0 : -1.2);
      g.rotation.y = -Number(side) * 0.45 + Math.sin(t * 0.9) * 0.04; g.rotation.z = active && api.talking ? Math.sin(t * 9) * 0.025 : 0;
      const sc = active ? 1.15 : 0.9; g.scale.setScalar(g.scale.x + (sc - g.scale.x) * Math.min(1, 8 * dt));
      const dim = active ? 1 : 0.4; b.mat.color.setScalar(b.mat.color.r + (dim - b.mat.color.r) * Math.min(1, 8 * dt));
    }
    if (api.cheer && Math.random() < dt * 3) particles.emit('confetti', (Math.random() - 0.5) * 5, 3, 0, { count: 1 });
    particles.update(dt, camera);
  };
  api.render = () => {};
  return api;
}
