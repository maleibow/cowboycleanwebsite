import * as THREE from 'three';
import { placeMatrix } from './scenery.js';
import { createToon } from '../render/materials.js';
import { events } from '../core/events.js';

// Stage 2 vine swings. A vine hangs from the canopy over a river gap too wide to jump. Jump toward its tip and you grab it
// (hands within VINE.grab of the tip), swing forward on an arc, and let go on your own (Jump) or at the top of the swing,
// flung toward the next island. Missing it is a normal pit fall into the sludge. While swinging the player's physics is
// suspended (player.hold, see actors/player.js); the body is placed on the circle of radius L around the anchor.
export const VINE = { L: 5.2, anchorY: 8.6, grab: 2.4, dur: 0.85, thEnd: 0.9, autoVs: 7.5, autoVy: 4, jumpVs: 8.2, jumpVy: 7.5, handY: 1.5, cooldown: 0.9, window: 170 };
const _m = new THREE.Matrix4(), _r = new THREE.Matrix4();
const ease = (u) => u * u * (3 - 2 * u);

export function createVines(ctx, scene, track) {
  const segs = track.segments.filter((g) => g.vines?.length);
  if (!segs.length) return null;
  const geo = ctx.theme.hazards?.vine?.(ctx.theme.colors) ?? new THREE.CylinderGeometry(0.06, 0.06, VINE.L, 5).translate(0, -VINE.L / 2, 0);
  const mat = createToon({ vertexColors: true, grime: false, rimStrength: 0.8 });
  const list = segs.flatMap((g) => g.vines.map((v, i) => {
    const mesh = new THREE.Mesh(geo, mat); mesh.matrixAutoUpdate = false; mesh.frustumCulled = false; mesh.castShadow = false; scene.add(mesh);
    return { s: v.s, x: v.x || 0, rest: v.rest ?? 0.2, ph: i * 1.7 + g.s0, th: 0, cool: 0, mesh, swing: false };
  }));
  const P = ctx.player, b = P.body, api = { list, swings: 0, grabs: 0 };
  let cur = null;

  const release = (v, auto, jumped) => {
    P.hold = null; v.swing = false; v.cool = VINE.cooldown; cur = null;
    b.vs = jumped ? VINE.jumpVs : VINE.autoVs; b.vy = jumped ? VINE.jumpVy : VINE.autoVy; b.grounded = false; b.ground = null; P.jumping = jumped; P.coyote = 0; P.jumpBuf = 0;
    events.emit('vineRelease', jumped);
  };

  const grab = (v) => {
    const th0 = Math.asin(Math.min(0.55, Math.max(-0.8, (b.s - v.s) / VINE.L))), span = Math.max(0.25, (VINE.thEnd - th0) / (VINE.thEnd + 0.35));
    const h = { v, t: 0, th0, dur: VINE.dur * span, step(dt, input) {
      h.t += dt; const u = Math.min(1, h.t / h.dur), th = h.th0 + (VINE.thEnd - h.th0) * ease(u), os = b.s;
      v.th = th; b.s = v.s + VINE.L * Math.sin(th); b.y = VINE.anchorY - VINE.L * Math.cos(th) - VINE.handY; b.x += (v.x - b.x) * Math.min(1, 9 * dt);
      b.vs = (b.s - os) / dt; b.vx = 0; b.vy = 2; b.grounded = false; P.faceS = 1; P.faceX = 0;
      if (P.dead) { P.hold = null; v.swing = false; cur = null; return; }
      if (input.jumpPressed && h.t > 0.2) release(v, false, true); else if (u >= 1) release(v, true, false);
    } };
    P.hold = h; v.swing = true; cur = v; P.sliding = P.ducking = false; b.h = 1.8; b.vy = 0; api.grabs++; events.emit('vineGrab');
  };

  api.update = (dt) => {
    for (const v of list) {
      v.cool = Math.max(0, v.cool - dt);
      if (!v.swing) v.th += (v.rest * 0.5 * Math.sin(ctx.level.time * 1.4 + v.ph) - v.th) * Math.min(1, 6 * dt);
    }
    if (P.hold || P.dead || b.grounded) return;
    for (const v of list) {
      if (v.cool > 0 || Math.abs(b.s - v.s) > 5 || Math.abs(b.x - v.x) > 1.9) continue;
      const ts = v.s + VINE.L * Math.sin(v.th), ty = VINE.anchorY - VINE.L * Math.cos(v.th);
      if (Math.hypot(b.s - ts, b.y + VINE.handY - ty) < VINE.grab) { grab(v); break; }
    }
  };
  api.render = () => {
    const sp = ctx.player.body.s;
    for (const v of list) {
      const on = Math.abs(v.s - sp) < VINE.window; v.mesh.visible = on; if (!on) continue;
      placeMatrix(track, v.s, v.x, VINE.anchorY, 0, 1, 1, 1, _m); v.mesh.matrix.copy(_m.multiply(_r.makeRotationX(v.th))); v.mesh.matrixWorldNeedsUpdate = true;
    }
  };
  api.reset = () => { P.hold = null; cur = null; for (const v of list) { v.swing = false; v.cool = 0; v.th = 0; } };
  api.dispose = () => { for (const v of list) scene.remove(v.mesh); mat.dispose(); };
  return api;
}
