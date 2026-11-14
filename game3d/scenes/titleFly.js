import * as THREE from 'three';
import { grime } from '../render/materials.js';

// The title-screen camera: a slow, swaying fly-through of stage 1 over a `foes: false` level. It bypasses the level's
// camera rig, streams the track / scenery around the camera, and fades to black when the loop wraps back to the start.
const SPEED = 6.5, START = 10, END = 380, HEIGHT = 5.2, LOOK = 17;

export function createTitleFly(world, root, gfx) {
  const fade = document.createElement('div'); fade.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;transition:opacity .7s;pointer-events:none'; root.appendChild(fade);
  const cam = world.camera, T = world.track, pos = new THREE.Vector3(), look = new THREE.Vector3();
  let s = START, t = 0, wrapAt = 0;
  world.player.mesh.visible = false;
  const api = {
    get s() { return s; },
    update(dt) {
      t += dt;
      if (wrapAt) { if (t >= wrapAt) { s = START; wrapAt = 0; fade.style.opacity = 0; } } else { s += SPEED * dt; if (s > END) { wrapAt = t + 0.8; fade.style.opacity = 1; } }
      T.toWorld(s, Math.sin(t * 0.21) * 2.2, HEIGHT + Math.sin(t * 0.33) * 0.7, pos);
      T.toWorld(s + LOOK, Math.sin(t * 0.17 + 1) * 1.4, 1.6, look);
      cam.position.copy(pos); cam.lookAt(look);
      world.player.progress = s + 24;                                   // drives the clean wave ahead of the camera
      world.builder.update(s, t); world.scenery.update(s, t, cam.position, dt);
      world.particles.update(dt, cam); world.wave();
      if (Math.random() < dt * world.theme.ambient.rate) world.particles.emit(world.theme.ambient.preset, pos.x + (Math.random() - 0.5) * 16, pos.y - 2 + Math.random() * 4, pos.z + (Math.random() - 0.5) * 16, { count: 1 });
    },
    render() { world.sky.update(cam, t); world.scenery.far?.update(cam.position); gfx?.post.update(t); },
    dispose() { fade.remove(); },
  };
  return api;
}
