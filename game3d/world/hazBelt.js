import * as THREE from 'three';
import { placeMatrix } from './scenery.js';
import { createToon } from '../render/materials.js';
import { events } from '../core/events.js';

// Stage 3 conveyor hazards. Belts: a belt box carries `belt` m/s (the player controller adds it to whatever stands on it); the set-piece
// belt reverses every `period` seconds, warning for `warn` seconds first (box.warn = true: the theme's arrows flash; alarm sound).
// Pistons: a crusher over half the belt. Cycle (4.4 s): up -> WARN (1.2 s: its footprint lights up red and flashes, the head shudders, alarm) -> SLAM
// (damage if you stand in the footprint) -> hold down -> rise. Every slam is marked on the belt before it lands, and half the belt is always clear.
// Theme geometry: theme.hazards.piston(colors) = head + hydraulic arm hanging from the origin (head bottom at y = 0, arm up to ~+6).
export const PISTON = { up: 3.4, warnAt: 2.2, slamAt: 3.4, downAt: 3.55, riseAt: 3.95, damage: 20, h: 3.2 };
const _m = new THREE.Matrix4();
const stripeTex = () => {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#ffcc00'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#1a1a1a';
  for (let i = -1; i < 3; i++) { g.beginPath(); g.moveTo(i * 32, 64); g.lineTo(i * 32 + 16, 64); g.lineTo(i * 32 + 48, 0); g.lineTo(i * 32 + 32, 0); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
};

export function createBelts(ctx, scene, track) {
  const segs = track.segments.filter((g) => g.belts?.length || g.pistons?.length);
  if (!segs.length) return null;
  const P = ctx.player, b = P.body, tex = stripeTex();
  const belts = segs.flatMap((g) => (g.belts || []).map((q) => ({ ...q, seg: g, box: g.boxes.find((x) => x.kind === 'conveyor' && Math.abs(x.s0 - q.s0) < 0.01), t: 0, v0: q.v })));
  const geo = ctx.theme.hazards?.piston?.(ctx.theme.colors) ?? new THREE.BoxGeometry(3, 1.2, 2.4).translate(0, 0.6, 0);
  const mat = createToon({ vertexColors: true, grime: false, rimStrength: 0.8 });
  const pistons = segs.flatMap((g) => (g.pistons || []).map((q) => {
    const mesh = new THREE.Mesh(geo, mat); mesh.matrixAutoUpdate = false; mesh.frustumCulled = false; scene.add(mesh);
    const mk = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex.clone(), transparent: true, opacity: 0.0, depthWrite: false, fog: false })); mk.material.map.needsUpdate = true;
    mk.matrixAutoUpdate = false; mk.frustumCulled = false; scene.add(mk);
    return { ...q, seg: g, mesh, mk, t: 0, y: PISTON.up, state: 'up', warned: false, slammed: false, hit: false };
  }));
  const api = { belts, pistons, slams: 0, reversals: 0 };
  const near = (g) => b.s > g.s0 - 25 && b.s < g.s1 + 8;

  api.update = (dt) => {
    for (const q of belts) {
      if (!q.box) continue;
      if (!near(q.seg)) { q.t = 0; q.box.belt = q.v = q.v0; q.box.warn = false; q.warned = false; continue; }
      if (!(b.s > q.s0 - 2 && b.s < q.s1 + 2) && q.t === 0) { q.box.belt = q.v; continue; }   // the clock starts when the player steps on
      q.t += dt;
      if (q.t > q.period - q.warn && !q.warned) { q.warned = true; q.box.warn = true; events.emit('beltWarn'); }
      if (q.t >= q.period) { q.t = 0; q.v = -q.v; q.box.belt = q.v; q.box.warn = false; q.warned = false; api.reversals++; ctx.combat.shake(0.18); events.emit('beltReverse'); }
      q.box.belt = q.v;
    }
    for (const q of pistons) {
      if (!near(q.seg)) { q.state = 'up'; q.y = PISTON.up; q.t = q.phase; continue; }
      q.t += dt; const c = q.t % q.period, was = q.state;
      if (c < PISTON.warnAt) { q.state = 'up'; q.y = PISTON.up; q.warned = false; q.slammed = false; q.hit = false; }
      else if (c < PISTON.slamAt) { q.state = 'warn'; q.y = PISTON.up - 0.12 + Math.sin(c * 40) * 0.07; if (!q.warned) { q.warned = true; events.emit('pistonWarn'); } }
      else if (c < PISTON.downAt) { q.state = 'slam'; q.y = Math.max(0, PISTON.up * (1 - (c - PISTON.slamAt) / (PISTON.downAt - PISTON.slamAt))); }
      else if (c < PISTON.riseAt) { q.state = 'down'; q.y = 0; }
      else { q.state = 'rise'; q.y = PISTON.up * ((c - PISTON.riseAt) / (q.period - PISTON.riseAt)); }
      if (q.state === 'slam' && !q.slammed && q.y < 0.3) {
        q.slammed = true; api.slams++; ctx.combat.shake(0.35); events.emit('pistonSlam'); ctx.particles.emit('hitSpark', ...wp(q.s, (q.x0 + q.x1) / 2, 0.3), { count: 2 });
      }
      // the head is only dangerous while it comes down and sits on the belt, and only inside its marked footprint
      if ((q.state === 'slam' || q.state === 'down') && !q.hit && !P.dead && Math.abs(b.s - q.s) < q.depth / 2 + b.hs && b.x + b.hx > q.x0 && b.x - b.hx < q.x1 && b.y < PISTON.h - 0.3 + q.y) { q.hit = true; ctx.combat.damagePlayer(PISTON.damage); }
    }
  };
  const _w = new THREE.Vector3(); const wp = (s, x, y) => { track.toWorld(s, x, y, _w); return [_w.x, _w.y, _w.z]; };
  api.render = (alpha, t) => {
    for (const q of pistons) {
      const on = Math.abs(q.s - b.s) < 120; q.mesh.visible = q.mk.visible = on; if (!on) continue;
      placeMatrix(track, q.s, (q.x0 + q.x1) / 2, q.y, 0, (q.x1 - q.x0) / 3.6, 1, q.depth / 2.4, _m); q.mesh.matrix.copy(_m); q.mesh.matrixWorldNeedsUpdate = true;
      const hot = q.state === 'warn' ? 0.45 + 0.4 * (Math.sin(t * 24) > 0 ? 1 : 0.2) : q.state === 'slam' || q.state === 'down' ? 0.8 : 0;
      q.mk.material.opacity = hot; q.mk.visible = hot > 0;
      if (hot) { placeMatrix(track, q.s, (q.x0 + q.x1) / 2, 0.06, 0, q.x1 - q.x0, 1, q.depth, _m); q.mk.matrix.copy(_m); q.mk.matrixWorldNeedsUpdate = true; q.mk.material.map.repeat.set((q.x1 - q.x0) / 1.2, q.depth / 1.2); }
    }
  };
  api.reset = () => { for (const q of belts) { q.t = 0; q.v = q.v0; if (q.box) { q.box.belt = q.v0; q.box.warn = false; } q.warned = false; } for (const q of pistons) { q.t = q.phase; q.state = 'up'; q.y = PISTON.up; } };
  api.dispose = () => { for (const q of pistons) { scene.remove(q.mesh); scene.remove(q.mk); q.mk.material.map.dispose(); q.mk.material.dispose(); } mat.dispose(); tex.dispose(); };
  return api;
}
