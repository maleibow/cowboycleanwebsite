import * as THREE from 'three';
import { placeMatrix } from './scenery.js';
import { createFluid } from '../render/fluids.js';
import { events } from '../core/events.js';

// Stage 10 set-piece: RISING TIDE. A `tides` entry on a segment ({ s0, s1, s (the first step: it arms when the player passes it), rate, from, max }) is a ruby tide over the whole stretch s0..s1. It sleeps at `from` (below the street) until the player steps
// past `s` (the first step), then climbs at `rate` m/s up to `max`. If the water reaches the player's feet it washes him off (the pit rule: -20 and back to safe ground, player.fall()) and falls 3 m,
// so one mistake is a second chance, never a trap. Leaving the stretch (forwards or back) resets it. The tide is one ruby fluid plane (theme-independent: it is always ruby).
export const TIDE = { fall: 3, width: 40, hit: 0.15, warnLead: 2.0 };
const _m = new THREE.Matrix4();

export function createTide(ctx, scene, track) {
  const list = track.segments.flatMap((g) => (g.tides || []).map((q) => ({ ...q, seg: g })));
  if (!list.length) return null;
  const P = ctx.player, b = P.body, api = { tides: list, drowned: 0, started: 0 };
  for (const q of list) {
    q.level = q.from; q.t = 0; q.on = false;
    q.fluid = createFluid('ruby', { width: TIDE.width, length: q.s1 - q.s0 + 8, segments: 16, overrides: { glow: 1.3, hi: '#ffb0c0', foam: '#ff8aa0', speed: 0.7, flow: 0.7, amp: 0.12 } });
    q.fluid.mesh.matrixAutoUpdate = false; q.fluid.mesh.frustumCulled = false; q.fluid.mesh.visible = false; scene.add(q.fluid.mesh);
  }
  const reset = (q) => { q.level = q.from; q.t = 0; q.on = false; };
  const off = events.on('respawn', () => { for (const q of list) if (q.on && b.s < q.s - 1) reset(q); });

  api.update = (dt) => {
    for (const q of list) {
      const inside = b.s > q.s0 && b.s < q.s1 + 1;
      if (!inside) { if (q.on || q.level !== q.from) reset(q); continue; }
      if (!q.on && b.s > q.s) { q.on = true; api.started++; events.emit('tideRise'); }
      if (!q.on) continue;
      q.t += dt; q.level = Math.min(q.max, q.from + q.rate * q.t);
      if (!P.dead && P.invuln <= 0 && b.grounded && b.y < q.level - TIDE.hit && b.s > q.s0) { api.drowned++; events.emit('tideHit'); ctx.combat.shake(0.4); P.fall(); q.t = Math.max(0, q.t - TIDE.fall / q.rate); q.level = Math.min(q.max, q.from + q.rate * q.t); }
    }
  };
  api.render = (alpha, t) => {
    for (const q of list) {
      const near = Math.abs((q.s0 + q.s1) / 2 - b.s) < 140; q.fluid.mesh.visible = near && (q.on || q.level > q.from + 0.01 || b.s > q.s0 - 40);
      if (!q.fluid.mesh.visible) continue;
      placeMatrix(track, (q.s0 + q.s1) / 2, 0, q.level, 0, 1, 1, 1, _m); q.fluid.mesh.matrix.copy(_m); q.fluid.mesh.matrixWorldNeedsUpdate = true; q.fluid.update(t);
    }
  };
  api.reset = () => { for (const q of list) reset(q); };
  api.dispose = () => { off?.(); for (const q of list) { scene.remove(q.fluid.mesh); q.fluid.mesh.geometry.dispose(); q.fluid.mesh.material.dispose(); } };
  return api;
}
