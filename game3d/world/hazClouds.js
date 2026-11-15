import * as THREE from 'three';
import { placeMatrix } from './scenery.js';
import { createToon } from '../render/materials.js';
import { events } from '../core/events.js';

// Stage 8 moving clouds. A cloud pad (`clouds` on a segment: { s, x, L, W, move: 'x' | 's' | 'orbit', amp, ampS, period, phase }) is a dynamic collision box (track.dyn, kind 'plank': never a respawn
// point) that drifts about its mean position: sideways ('x'), along the path ('s') or round an ellipse ('orbit'). Whatever stands on it is carried with it. The motion is a pure function of the
// clock, so it can be read from a distance, and every hop is sized so that the gap between two neighbours never exceeds 5.2 m (a full-speed jump clears it).
// Theme geometry: theme.hazards.cloud(colors) = a 4.4 x 4.4 m pad with its flat top at y = 0 (one InstancedMesh, scaled to L x W).
export const CLOUDS = { window: 130, cap: 24, size: 4.4 };
const _m = new THREE.Matrix4(), _c = new THREE.Color();

export function createClouds(ctx, scene, track) {
  const segs = track.segments.filter((g) => g.clouds?.length);
  if (!segs.length) return null;
  const geo = ctx.theme.hazards?.cloud?.(ctx.theme.colors) ?? new THREE.BoxGeometry(CLOUDS.size, 0.4, CLOUDS.size).translate(0, -0.2, 0);
  const mesh = new THREE.InstancedMesh(geo, createToon({ vertexColors: true, grime: false, rimStrength: 0.6 }), CLOUDS.cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.count = 0; scene.add(mesh);
  const list = segs.flatMap((g) => g.clouds.map((c, i) => ({ ...c, seg: g, i, cs: c.s, cx: c.x, box: { s0: c.s - c.L / 2, s1: c.s + c.L / 2, x0: c.x - c.W / 2, x1: c.x + c.W / 2, y0: -0.5, y1: 0, kind: 'plank' }, riding: false })));
  const P = ctx.player, b = P.body, api = { clouds: list, rides: 0 };
  let t = 0;
  for (const c of list) track.dyn.push(c.box);
  const pos = (c, tt) => {   // where the cloud is at clock time tt
    const w = (Math.PI * 2 / c.period) * (tt + c.phase);
    return c.move === 'x' ? [c.s, c.x + c.amp * Math.sin(w)] : c.move === 's' ? [c.s + c.amp * Math.sin(w), c.x] : [c.s + c.ampS * Math.sin(w), c.x + c.amp * Math.cos(w)];
  };
  const place = (c, ns, nx) => { c.cs = ns; c.cx = nx; const q = c.box; q.s0 = ns - c.L / 2; q.s1 = ns + c.L / 2; q.x0 = nx - c.W / 2; q.x1 = nx + c.W / 2; };
  for (const c of list) { const [s, x] = pos(c, 0); place(c, s, x); }

  api.update = (dt) => {
    t += dt;
    for (const c of list) {
      if (Math.abs(c.s - b.s) > CLOUDS.window) continue;
      const [ns, nx] = pos(c, t), ds = ns - c.cs, dx = nx - c.cx, on = b.grounded && b.ground === c.box && !P.dead;
      if (on) { b.s += ds; b.x += dx; if (!c.riding) { c.riding = true; api.rides++; events.emit('cloudRide'); } } else c.riding = false;
      place(c, ns, nx);
    }
  };
  api.render = () => {
    let n = 0;
    for (const c of list) {
      if (Math.abs(c.s - b.s) > CLOUDS.window || n >= CLOUDS.cap) continue;
      placeMatrix(track, c.cs, c.cx, Math.sin(t * 1.7 + c.i * 1.9) * 0.025, 0, c.W / CLOUDS.size, 1, c.L / CLOUDS.size, _m); mesh.setMatrixAt(n, _m); mesh.setColorAt?.(n, _c.setScalar(1)); n++;
    }
    mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };
  api.reset = () => { t = 0; for (const c of list) { const [s, x] = pos(c, 0); place(c, s, x); c.riding = false; } };
  api.dispose = () => { for (const c of list) { const i = track.dyn.indexOf(c.box); if (i >= 0) track.dyn.splice(i, 1); } scene.remove(mesh); mesh.dispose(); mesh.material.dispose(); };
  return api;
}
