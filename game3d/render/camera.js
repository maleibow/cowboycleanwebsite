import * as THREE from 'three';
import { reducedMotion } from '../core/settings.js';

// Camera rig with four modes (PLAN 3.2). Everything is computed in track space relative to an
// anchor that only ever advances, then mapped to the world, so it follows curves and climbs.
// Per-mode offsets are blended exponentially (~1 s). Hooks: addTrauma() shake, kickFov().
export const CAM_MODES = {
  //            ds=behind(s) dy=above dx=lateral | look s,x,y | fov
  behind: { ds: -7,  dy: 4,   dx: 0,   ls: 6,   lx: 0,  ly: 1.2, fov: 62 },
  side:   { ds: 1,   dy: 2.4, dx: 13,  ls: 1.5, lx: 0,  ly: 1.3, fov: 50 }, // +x = right of the path: forward reads left-to-right
  toward: { ds: 10,  dy: 4.2, dx: 0,   ls: -1,  lx: 0,  ly: 1.2, fov: 62 },
  arena:  { ds: -20, dy: 18,  dx: 0,   ls: -1,  lx: 0,  ly: 0,   fov: 56 }, // anchor = arena centre (rig.focus): the camera hangs over the entrance and sees the whole disc
};
const KEYS = ['ds', 'dy', 'dx', 'ls', 'lx', 'ly', 'fov'];
const BLEND = 3.0;      // 1/s: ~95% of a mode change in 1 s
const CLEARANCE = 1.1;  // metres kept above any ground / solid under the camera

export function createCameraRig(track, { aspect = 16 / 9 } = {}) {
  const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 400);
  const o = { ...CAM_MODES.behind };                     // current blended offsets
  const rig = {
    camera, mode: 'behind', forced: null, focus: null, weights: { sideW: 0, towardW: 0, arenaW: 0 }, // focus = {s,x,y}: the anchor tracks this instead of the player (boss arena)
   
    anchor: { s: 0, x: 0, y: 0 }, trauma: 0, fovKick: 0, minClearance: Infinity, clearance: Infinity,
  };
  const A = rig.anchor;
  const pos = { prev: new THREE.Vector3(), cur: new THREE.Vector3() }, look = { prev: new THREE.Vector3(), cur: new THREE.Vector3() };
  const _p = new THREE.Vector3(), _l = new THREE.Vector3();
  let t = 0, first = true;

  // Shake tuning: sources add with diminishing returns (a swarm of kills no longer pins the camera at maximum), the sum is capped
  // below a full shake except for boss moments, and reduced motion removes it altogether (also the FOV kick).
  rig.addTrauma = (a) => { if (reducedMotion()) return; rig.trauma = Math.min(a >= 0.5 ? 1 : 0.7, rig.trauma + a * (1 - rig.trauma * 0.6)); };
  rig.kickFov = (deg) => { if (!reducedMotion()) rig.fovKick += Math.min(deg, 3); };
  rig.setMode = (m) => { rig.forced = m; };   // m = null returns control to the segment
  rig.reset = (pose) => { A.s = pose.s; A.x = pose.x; A.y = pose.y; rig.minClearance = Infinity; };

  rig.update = (dt, player) => {
    t += dt;
    const b = player.body, mode = rig.forced || player.seg.mode;
    rig.mode = mode;
    const goal = CAM_MODES[mode] || CAM_MODES.behind;
    const kb = 1 - Math.exp(-BLEND * dt);
    for (const k of KEYS) o[k] += (goal[k] - o[k]) * kb;
    const ww = rig.weights; // blend weights the player reads to flip controls with the view
    ww.sideW += ((mode === 'side' ? 1 : 0) - ww.sideW) * kb;
    ww.towardW += ((mode === 'toward' ? 1 : 0) - ww.towardW) * kb;
    ww.arenaW += ((mode === 'arena' ? 1 : 0) - ww.arenaW) * kb;

    if (first) { A.s = b.s; A.x = b.x; A.y = b.y; first = false; for (const k of KEYS) o[k] = goal[k]; }
    // Anchor: advances with the player, never goes backward; lateral/vertical follow loosely.
    if (rig.focus) { const k = Math.min(1, 3 * dt); A.s += (rig.focus.s - A.s) * k; A.x += (rig.focus.x - A.x) * k; A.y += (rig.focus.y - A.y) * k; }
    else {
      if (b.s > A.s) A.s += (b.s - A.s) * Math.min(1, 14 * dt);
      A.x += (b.x - A.x) * Math.min(1, 5 * dt);
      A.y += (Math.max(b.y, -1) - A.y) * Math.min(1, 3 * dt);
    }

    // Desired position / look target in track space. Side and arena use an absolute lateral offset;
    // behind/toward follow the player's x loosely.
    const sideLike = Math.max(ww.sideW, ww.arenaW);
    const cx = o.dx + (1 - sideLike) * A.x * 0.55;
    let cs = A.s + o.ds, cy = A.y + o.dy;
    const lx = o.lx + (1 - sideLike) * A.x * 0.5, ls = A.s + o.ls, ly = A.y + o.ly;

    // Never clip the ground or a solid: lift above whatever is under (and around) the camera.
    const under = track.heightUnder(cs, cx, 0.8);
    if (under !== -Infinity) cy = Math.max(cy, under + CLEARANCE);
    rig.clearance = under === -Infinity ? Infinity : cy - under;
    if (rig.clearance < rig.minClearance) rig.minClearance = rig.clearance;

    pos.prev.copy(pos.cur); look.prev.copy(look.cur);
    track.toWorld(cs, cx, cy, pos.cur); track.toWorld(ls, lx, ly, look.cur);
    if (first || pos.prev.lengthSq() === 0) { pos.prev.copy(pos.cur); look.prev.copy(look.cur); }

    // Trauma shake (offset applied in render) and FOV: mode + speed + kick.
    rig.trauma = Math.max(0, rig.trauma - dt * 1.6); rig.fovKick *= Math.exp(-6 * dt);
    const speedFov = 4 * Math.min(1.3, Math.abs(b.vs) / player.maxSpeed());
    rig.fovTarget = o.fov + speedFov + rig.fovKick;
  };

  rig.render = (alpha) => {
    _p.lerpVectors(pos.prev, pos.cur, alpha); _l.lerpVectors(look.prev, look.cur, alpha);
    if (rig.trauma > 0) { // cheap smooth noise, scaled by trauma^2
      const a = rig.trauma * rig.trauma, n = (k) => Math.sin(t * k) + Math.sin(t * k * 2.3 + 1.7) * 0.5;
      _p.x += n(31) * 0.28 * a; _p.y += n(37) * 0.24 * a; _p.z += n(43) * 0.28 * a;
    }
    camera.position.copy(_p); camera.up.set(0, 1, 0); camera.lookAt(_l);
    if (rig.trauma > 0) camera.rotateZ(Math.sin(t * 29) * 0.02 * rig.trauma * rig.trauma);
    if (Math.abs(camera.fov - rig.fovTarget) > 0.01) { camera.fov += (rig.fovTarget - camera.fov) * 0.2; camera.updateProjectionMatrix(); }
  };
  return rig;
}
