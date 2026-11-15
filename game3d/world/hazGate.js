import * as THREE from 'three';
import { placeMatrix } from './scenery.js';
import { createToon } from '../render/materials.js';
import { events } from '../core/events.js';

// Stage 9 swinging cemetery gates. A gate (`gates` on a segment: { s, w, closed, open, phase }) is a pair of iron leaves hinged at the edges of the path. Cycle (about 5.6 s with the defaults):
// CLOSED (a solid wall across the path: wait, or turn back) -> OPENING (0.6 s, the leaves swing back) -> OPEN (the way is clear) -> WARN (0.9 s: still open, the lamp on each pier turns red and the
// hinges creak) -> CLOSING (0.6 s) -> CLOSED. The wall only comes back once nobody is standing in the gateway, so a runner is never trapped or crushed; there is no damage, only a timing wait.
// Theme geometry: theme.hazards.gate(colors) = one leaf hanging from its hinge at the origin, extending +x for half the path (4 m), 3.4 m tall, 0.3 m thick (it is mirrored for the other side).
export const GATE = { opening: 0.6, warn: 0.9, closing: 0.6, h: 3.4, thick: 0.6, clear: 1.5 };
const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _c = new THREE.Color();

export function createGates(ctx, scene, track) {
  const segs = track.segments.filter((g) => g.gates?.length);
  if (!segs.length) return null;
  const geo = ctx.theme.hazards?.gate?.(ctx.theme.colors) ?? new THREE.BoxGeometry(4, 3.4, 0.3).translate(2, 1.7, 0);
  const mesh = new THREE.InstancedMesh(geo, createToon({ vertexColors: true, grime: false, rimStrength: 0.8 }), segs.reduce((n, g) => n + g.gates.length, 0) * 2);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; scene.add(mesh);
  const P = ctx.player, b = P.body, gates = segs.flatMap((g) => g.gates.map((q) => ({ ...q, seg: g, box: { s0: q.s - GATE.thick / 2, s1: q.s + GATE.thick / 2, x0: -q.w / 2, x1: q.w / 2, y0: 0, y1: GATE.h, kind: 'wall' }, state: 'closed', t: q.phase ?? 0, k: 1, on: true, warned: false })));
  const api = { gates, opened: 0, closed: 0 };
  mesh.setColorAt(0, _c.set(0xffffff)); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  const solid = (q, v) => { const i = track.dyn.indexOf(q.box); if (v && i < 0) track.dyn.push(q.box); else if (!v && i >= 0) track.dyn.splice(i, 1); q.on = v; };
  for (const q of gates) solid(q, true);
  const go = (q, st) => { q.state = st; q.t = 0; };

  api.update = (dt) => {
    for (const q of gates) {
      if (Math.abs(q.s - b.s) > 90) continue;
      q.t += dt;
      switch (q.state) {
        case 'closed': q.k = 1; if (q.t >= q.closed) { go(q, 'opening'); solid(q, false); events.emit('gateCreak'); api.opened++; } break;
        case 'opening': q.k = 1 - Math.min(1, q.t / GATE.opening); if (q.t >= GATE.opening) go(q, 'open'); break;
        case 'open': q.k = 0; q.warned = false; if (q.t >= q.open) { go(q, 'warn'); events.emit('gateWarn'); } break;
        case 'warn': q.k = 0; if (q.t >= GATE.warn) go(q, 'closing'); break;
        case 'closing': { const inside = Math.abs(b.s - q.s) < GATE.clear && !P.dead; q.k = Math.min(0.85, q.t / GATE.closing); if (q.t >= GATE.closing && !inside) { q.k = 1; solid(q, true); go(q, 'closed'); api.closed++; ctx.combat.shake(0.12); events.emit('gateSlam'); } else if (q.t >= GATE.closing) q.t = GATE.closing; break; }
      }
    }
  };
  api.render = (alpha, t = 0) => {
    let n = 0;
    for (const q of gates) {
      const on = Math.abs(q.s - b.s) < 140, ang = (1 - q.k) * 1.45;   // leaves swing forward and back about their hinges
      for (const sd of [-1, 1]) {
        if (!on) { mesh.setMatrixAt(n, _m.makeScale(0.0001, 0.0001, 0.0001)); mesh.setColorAt(n++, _c.setRGB(1, 1, 1)); continue; }
        placeMatrix(ctx.track, q.s, sd * q.w / 2, 0, sd > 0 ? Math.PI : 0, 1, 1, 1, _m); _r.makeRotationY(sd > 0 ? -ang : ang); _m.multiply(_r); mesh.setMatrixAt(n, _m); mesh.setColorAt(n, q.state === 'warn' ? _c.setRGB(1 + 2.4 * (0.5 + 0.5 * Math.sin(t * 22)), 0.55, 0.5) : _c.setRGB(1, 1, 1)); n++;   // the +x leaf is the -x leaf turned half a turn (no mirroring: no inside-out faces)
      }
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  };
  api.reset = () => { for (const q of gates) { go(q, 'closed'); q.t = q.phase ?? 0; q.k = 1; solid(q, true); } };
  api.dispose = () => { for (const q of gates) solid(q, false); scene.remove(mesh); mesh.dispose(); mesh.material.dispose(); };
  return api;
}
