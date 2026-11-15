import * as THREE from 'three';
import { run } from '../core/state.js';
import { events } from '../core/events.js';
import { BOSS_FACTORIES } from '../actors/bosses/index.js';
import { createBossFx, easeOut, clamp01 } from '../actors/bosses/bossKit.js';
import { Builder } from '../actors/modelKit.js';
import { createToon } from '../render/materials.js';
import { warm as warmShaders } from '../render/warm.js';

// The boss encounter as a state machine (PLAN 3.2, 6). Everything after the gate:
//   sealed -> (player reaches the gate) opening -> open -> (player walks into the disc) fight -> victory -> done
// The arena is a disc: the player and every actor are held inside it by confine(). The camera switches to its raised
// `arena` mode and is focused on the disc centre. Beating the boss restores 25 health, washes the whole stage clean
// and ends in the stage-clear tally.  ctx = level context (see world/level.js).
const _fr = { p: new THREE.Vector3(), t: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3() }, _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const HEAL = 25, WASH_TIME = 3.2, CLEAR_DELAY = 4.2, OPEN_TIME = 1.7;

export function createArena(ctx) {
  const L = ctx.layout, A = L.arena, seg = L.arenaSeg, gateSeg = L.segments.find((g) => g.name === 'bossGate');
  const center = { s: A.s, x: A.x, r: A.r }, track = ctx.track, stageBoss = ctx.stageData.boss;
  const bossFx = createBossFx(ctx.scene, track, ctx); ctx.bossFx = bossFx;
  const api = { state: 'sealed', center, seg, boss: null, wash: 0, t: 0, won: false, bossTime: 0, fightT: 0, bossFx };

  // The gate wall leaves the track's static boxes; it becomes a dynamic box so it can be removed when the doors open.
  const wall = gateSeg.boxes.find((b) => b.kind === 'wall');
  if (wall) gateSeg.boxes.splice(gateSeg.boxes.indexOf(wall), 1);
  const seal = { s0: A.s - A.r + 0.2, s1: A.s - A.r + 1.4, x0: -6, x1: 6, y0: 0, y1: 10, kind: 'wall' };
  const sealMesh = new THREE.Mesh(new Builder().box(12, 3.4, 1.6, 0x6b5b7a, { p: [0, 1.7, 0], radius: 0.4, jitter: 0.3 }).box(2.6, 4.2, 1.8, 0x7d6b8e, { p: [-4.2, 2.1, 0], radius: 0.4, jitter: 0.3 }).box(2.6, 4.6, 1.8, 0x7d6b8e, { p: [4.2, 2.3, 0], radius: 0.4, jitter: 0.3 }).build(), createToon({ vertexColors: true }));
  sealMesh.visible = false; sealMesh.castShadow = true; ctx.scene.add(sealMesh);
  const dyn = (b, on) => { const i = track.dyn.indexOf(b); if (on && i < 0) track.dyn.push(b); else if (!on && i >= 0) track.dyn.splice(i, 1); };
  dyn(wall, true);

  const gateDress = () => ctx.scenery.dressed.get(gateSeg);
  const setGate = (k) => { ctx.scenery.gateOpen = k; gateDress()?.setOpen(k); };

  // ---- region rules: the disc, plus the entrance corridor until the way back is sealed
  const sealed = () => api.state === 'fight' || api.state === 'victory' || api.state === 'done';
  api.confine = (o, margin = 0.5) => {
    const dx = o.x - center.x, ds = o.s - center.s, rr = center.r - margin, d2 = ds * ds + dx * dx;
    if (d2 <= rr * rr) return;
    if (!sealed() && o.s < center.s - center.r + 2.5 && ds < 0) { o.x = Math.max(-3.6, Math.min(3.6, o.x)); return; }
    const k = rr / Math.sqrt(d2); o.s = center.s + ds * k; o.x = center.x + dx * k;
    if (o.vs !== undefined) { const n = (ds * o.vs + dx * o.vx) / (Math.sqrt(d2) * 1); if (n > 0) { o.vs -= (ds / Math.sqrt(d2)) * n; o.vx -= (dx / Math.sqrt(d2)) * n; } }
  };
  api.clampPoint = (s, x, margin, out) => {
    const dx = x - center.x, ds = s - center.s, rr = center.r - margin, d = Math.hypot(ds, dx);
    if (d <= rr) { out.s = s; out.x = x; } else { out.s = center.s + (ds / d) * rr; out.x = center.x + (dx / d) * rr; }
    return out;
  };
  api.contains = (o) => Math.hypot(o.s - center.s, o.x - center.x) <= center.r;

  // ---- encounter flow
  const open = () => { api.state = 'opening'; api.t = 0; ctx.hud?.toast('THE GATE OPENS', 0xffd84a); ctx.rig.addTrauma(0.35); };
  const startFight = () => {
    api.state = 'fight'; api.fightT = 0; dyn(seal, true); sealMesh.visible = true; sealMesh.userData.rise = 0;
    sealMesh.position.set(0, -5, 0); sealMesh.matrixAutoUpdate = false;
    const known = new Set(ctx.scene.children);
    api.boss = BOSS_FACTORIES[stageBoss.id](ctx, api, stageBoss);
    // The boss's materials are new programs: compile them in the background and show the boss once they are ready (at most 0.8 s),
    // so the moment it lands is not a frame-long freeze on a phone. Where parallel compile is missing this changes nothing.
    if (ctx.gfx) {
      const fresh = ctx.scene.children.filter((o) => !known.has(o) && o.visible);
      for (const o of fresh) o.visible = false;
      let shown = false; const reveal = () => { if (shown) return; shown = true; for (const o of fresh) o.visible = true; };
      warmShaders(ctx.gfx.renderer, ctx.scene, ctx.rig.camera, 700).then(reveal, reveal);
      setTimeout(reveal, 800);
    }
    api.boss.onDefeated = () => victory();
    ctx.rig.addTrauma(0.4); events.emit('bossFight', { name: api.boss.name });
  };
  const victory = () => {
    api.state = 'victory'; api.t = 0; api.won = true; api.bossTime = api.fightT;
    run.health = Math.min(100, run.health + HEAL); ctx.hud?.toast('STAGE CLEANED!', 0x7fe8ff); ctx.player.model?.anim.victory(true);
    ctx.fx.burst(center.s, 0, 2, 0xffffff, 30, 8, 0.25, true); events.emit('bossDefeated', { name: stageBoss.name });
  };
  const _m = new THREE.Matrix4();
  const placeSeal = (rise) => { // slab rising out of the floor at the corridor mouth
    const f = track.frameAt(seg.s0, _fr), p = track.toWorld(A.s - A.r + 0.8, 0, -4.8 + 4.8 * rise, _v);
    _m.makeBasis(f.r, f.u, _v2.copy(f.t).negate()).setPosition(p); sealMesh.matrix.copy(_m); sealMesh.matrixWorldNeedsUpdate = true;
  };

  api.update = (dt) => {
    const b = ctx.player.body, pl = ctx.player;
    ctx.rig.focus = pl.seg === seg || api.state === 'fight' ? { s: center.s + 3, x: 0, y: 0 } : null;
    switch (api.state) {
      case 'sealed': if (pl.reachedGate) open(); break;
      case 'opening': {
        api.t += dt; const k = easeOut(clamp01(api.t / OPEN_TIME)); setGate(k);
        if (api.t > 0.6) dyn(wall, false);
        if (api.t >= OPEN_TIME) api.state = 'open';
        break;
      }
      case 'open': if (b.s > center.s - center.r + 3.5) startFight(); break;
      case 'fight': {
        api.fightT += dt; sealMesh.userData.rise = Math.min(1, sealMesh.userData.rise + dt * 1.6); placeSeal(easeOut(sealMesh.userData.rise));
        api.confine(b, 0.6); bossFx.update(dt, pl, ctx.combat);
        break;
      }
      case 'victory': {
        api.t += dt; api.wash = easeOut(clamp01(api.t / WASH_TIME)); bossFx.update(dt, pl, ctx.combat);
        if (Math.random() < dt * 14) ctx.fx.burst(center.s + (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, 0.5 + Math.random() * 2, Math.random() > 0.5 ? 0xffffff : 0xbfefff, 3, 2, 0.2, true);
        if (api.t >= CLEAR_DELAY) { api.state = 'done'; events.emit('stageCleared', ctx.level.clearStats()); }
        break;
      }
      case 'done': api.wash = 1; break;
    }
    if (api.state === 'victory' || api.state === 'done') api.confine(b, 0.6);
  };
  api.render = (t) => bossFx.render(t);

  api.reset = () => {
    api.boss?.dispose?.(); api.boss = null; api.state = 'sealed'; api.wash = 0; api.won = false; api.t = 0; api.fightT = 0;
    setGate(0); dyn(wall, true); dyn(seal, false); sealMesh.visible = false; bossFx.clear(); ctx.hud?.hideBoss(); ctx.rig.focus = null; ctx.player.model?.anim.victory(false);
  };
  api.dispose = () => { ctx.scene.remove(sealMesh); bossFx.dispose(); };
  return api;
}
