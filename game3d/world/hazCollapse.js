import * as THREE from 'three';
import { placeMatrix } from './scenery.js';
import { createToon } from '../render/materials.js';
import { events } from '../core/events.js';

// Stage 6 collapsing bridge. A bridge is a row of planks (`planks` on a segment: { s0, s1, x0, x1 }) over lava. Each plank is a dynamic collision box (track.dyn). Standing on a
// plank (or touching it) starts its fuse: it shakes and glows for COLLAPSE.fuse seconds (a second and a half of warning in the chase's slow bridge, `fuse` per plank), then falls into the lava.
// Planks come back when the player is far away or respawns. Geometry: theme.hazards.plank(colors) = one plank, 2.4 m long and 4 m wide, top at y = 0 (rendered as one InstancedMesh).
export const COLLAPSE = { fuse: 0.55, fall: 1.2, window: 110, cap: 64 };
const _m = new THREE.Matrix4();

export function createCollapse(ctx, scene, track) {
  const segs = track.segments.filter((g) => g.planks?.length);
  if (!segs.length) return null;
  const geo = ctx.theme.hazards?.plank?.(ctx.theme.colors) ?? new THREE.BoxGeometry(4, 0.3, 2.4).translate(0, -0.15, 0);
  const mesh = new THREE.InstancedMesh(geo, createToon({ vertexColors: true, grime: false, rimStrength: 0.7, emissive: 0xff5a10, emissiveIntensity: 0 }), COLLAPSE.cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
  const planks = segs.flatMap((g) => g.planks.map((p, i) => ({ ...p, seg: g, i, state: 'ok', t: 0, fuse: p.fuse ?? COLLAPSE.fuse, ph: i * 1.3, box: { s0: p.s0, s1: p.s1, x0: p.x0, x1: p.x1, y0: -0.3, y1: 0, kind: 'plank' } })));
  const P = ctx.player, b = P.body, api = { planks, collapsed: 0 };
  const on = (p, v) => { const i = track.dyn.indexOf(p.box); if (v && i < 0) track.dyn.push(p.box); else if (!v && i >= 0) track.dyn.splice(i, 1); };
  for (const p of planks) on(p, true);
  const restore = (p) => { p.state = 'ok'; p.t = 0; on(p, true); };
  const off = events.on('respawn', () => { for (const p of planks) if (p.state !== 'ok') restore(p); });

  api.update = (dt) => {
    for (const p of planks) {
      if (p.state === 'ok') {
        if (b.grounded && b.ground === p.box && !P.dead) { p.state = 'fuse'; p.t = 0; }
        else if (Math.abs(b.s - (p.s0 + p.s1) / 2) > COLLAPSE.window) continue;
      }
      if (p.state === 'fuse') { p.t += dt; if (p.t >= p.fuse) { p.state = 'fall'; p.t = 0; on(p, false); api.collapsed++; events.emit('plankFall'); } }
      else if (p.state === 'fall') { p.t += dt; if (p.t > COLLAPSE.fall) p.state = 'gone'; }
      else if (p.state === 'gone' && Math.abs(b.s - (p.s0 + p.s1) / 2) > 45) restore(p);
    }
  };
  api.render = (alpha, t) => {
    let n = 0; const sp = b.s;
    for (const p of planks) {
      if (p.state === 'gone' || Math.abs((p.s0 + p.s1) / 2 - sp) > 130 || n >= COLLAPSE.cap) continue;
      const cs = (p.s0 + p.s1) / 2, cx = (p.x0 + p.x1) / 2; let y = 0, tilt = 0, sc = 1;
      if (p.state === 'fuse') { y = Math.sin(t * 60 + p.ph) * 0.03 * (p.t / p.fuse); tilt = Math.sin(t * 45 + p.ph) * 0.03; }
      else if (p.state === 'fall') { const u = p.t; y = -u * u * 9; tilt = u * (p.i % 2 ? 1.4 : -1.2); sc = Math.max(0, 1 - u * 0.5); }
      placeMatrix(track, cs, cx, y, 0, sc, sc, sc, _m); if (tilt) _m.multiply(_rz.makeRotationZ(tilt)); mesh.setMatrixAt(n, _m);
      mesh.setColorAt?.(n, _c.setScalar(p.state === 'fuse' ? 1 + 2.2 * (p.t / p.fuse) * (0.6 + 0.4 * Math.sin(t * 30)) : 1)); n++;
    }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  api.reset = () => { for (const p of planks) if (p.state !== 'ok') restore(p); };
  api.dispose = () => { off?.(); for (const p of planks) on(p, false); scene.remove(mesh); mesh.dispose(); mesh.material.dispose(); };
  return api;
}
const _rz = new THREE.Matrix4(), _c = new THREE.Color();
