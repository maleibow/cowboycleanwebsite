import * as THREE from 'three';
import { placeMatrix } from './scenery.js';
import { createToon } from '../render/materials.js';
import { events } from '../core/events.js';

// Stage 4 traffic crossing. Taxis sweep across the road along x. Each lane has one car on a repeating cycle: it appears outside the corridor (TRAVEL_X from the
// centre line), honks, drives across at `speed`, and waits for the rest of the period. It hits for DAMAGE if the player's body overlaps it below its roof
// (1.5 m: a jump clears it). Theme geometry: theme.hazards.taxi(colors), a car facing +z, 4.2 m long, wheels on y = 0 (rendered as one InstancedMesh).
export const TRAFFIC = { damage: 15, margin: 16, window: 24, cap: 8 };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();

export function createTraffic(ctx, scene, track) {
  const segs = track.segments.filter((g) => g.traffic?.length);
  if (!segs.length) return null;
  const geo = ctx.theme.hazards?.taxi?.(ctx.theme.colors) ?? new THREE.BoxGeometry(1.9, 1.4, 4.2).translate(0, 0.7, 0);
  const mesh = new THREE.InstancedMesh(geo, createToon({ vertexColors: true, grime: false, rimStrength: 0.7 }), TRAFFIC.cap); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
  const half = (segs[0].width || 8) / 2, reach = half + TRAFFIC.margin;
  const cars = segs.flatMap((g) => g.traffic.map((q) => ({ ...q, seg: g, t: q.phase, x: 0, on: false, hit: false, honked: false, travel: (2 * reach) / q.speed })));
  const P = ctx.player, b = P.body, api = { cars, hits: 0, honks: 0 };
  const near = (g) => b.s > g.s0 - TRAFFIC.window && b.s < g.s1 + 6;

  api.update = (dt) => {
    for (const c of cars) {
      if (!near(c.seg)) { c.on = false; c.t = c.phase; continue; }
      c.t += dt; const cyc = c.t % c.period; c.on = cyc < c.travel;
      if (c.on) { c.x = c.dir > 0 ? -reach + c.speed * cyc : reach - c.speed * cyc; if (!c.honked) { c.honked = true; c.hit = false; api.honks++; events.emit('carHorn'); } } else c.honked = false;
      if (c.on && !c.hit && !P.dead && Math.abs(b.s - c.s) < c.hs + b.hs - 0.1 && Math.abs(b.x - c.x) < c.hx + b.hx - 0.1 && b.y < c.h - 0.1) { c.hit = true; api.hits++; ctx.combat.damagePlayer(TRAFFIC.damage); ctx.combat.shake(0.3); events.emit('carHit'); }
    }
  };
  api.render = () => {
    let n = 0; const sp = b.s;
    for (const c of cars) { if (!c.on || Math.abs(c.s - sp) > 120 || n >= TRAFFIC.cap) continue; placeMatrix(track, c.s, c.x, 0, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 1, 1, 1, _m); mesh.setMatrixAt(n++, _m); }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true;
  };
  api.reset = () => { for (const c of cars) { c.t = c.phase; c.on = false; c.hit = false; c.honked = false; } };
  api.dispose = () => { scene.remove(mesh); mesh.dispose(); mesh.material.dispose(); };
  return api;
}
