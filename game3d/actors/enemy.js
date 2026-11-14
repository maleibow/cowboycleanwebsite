import * as THREE from 'three';
import { ENEMIES, ARCH, BOSS_DEFS } from '../data/enemies.js';
import { createModelRenderer } from './enemyRender.js';
import { run, loopHpMul, loopSpeedMul } from '../core/state.js';
import { createBatch, shapes } from './instanced.js';
import { think, groundAt, rndRange } from './enemyAI.js';

// Enemy pool + instanced grey-box rendering (one draw call per archetype shape).
// ctx = { track, player, projectiles, combat }. The archetype behaviours live in enemyAI.js.
const CAP = 96;
// Original: speedMult = 1 + score/8000 + (stageLoop-1)*0.25. Capped at x2 here: the 2D arena was bounded by the screen, a track is not.
export const speedMul = () => Math.min(2, 1 + run.score / 8000 + (loopSpeedMul() - 1));

export function createEnemies(ctx, scene, track) {
  const pool = Array.from({ length: CAP }, () => ({
    on: false, type: '', def: null, arch: '', tier: 1, s: 0, x: 0, y: 0, p0s: 0, p0x: 0, p0y: 0, vs: 0, vx: 0, vy: 0, hs: 0.5, hx: 0.5, h: 1,
    hp: 1, maxHp: 1, hitT: 0, active: false, state: 'walk', t: 0, t2: 0, phase: 0, lane: null, grounded: true, blocked: false, alt: 0, fireCd: 1,
    diveT: 0, aimS: 0, aimX: 0, aimY: 0, edgeX: 0, invulnerable: false, speed: 1, slot: -1, face: 0, ctrl: null,
  }));
  const list = [];
  const lit = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const batches = {}; for (const [name, mk] of Object.entries(shapes)) batches[name] = createBatch(scene, track, mk(), lit, CAP);
  const models = createModelRenderer(scene, track, { shadows: !!ctx.shadows });
  const api = { list, models, get count() { return list.length; }, preload: (types) => types.forEach((t) => models.ensure(t)) };
  const P = () => ctx.player.body;

  // Spawn at track-space position (y = feet). Returns the enemy or null when the pool is full.
  api.spawn = (type, s, x, y, o = {}) => {
    const def = ENEMIES[type] || BOSS_DEFS[type]; if (!def) throw new Error('unknown enemy type ' + type);
    const e = pool.find((q) => !q.on); if (!e) return null;
    e.on = true; e.type = type; e.def = def; e.arch = def.arch; e.tier = o.tier || 1; e.slot = o.slot ?? -1;
    e.s = e.p0s = s; e.x = e.p0x = x; e.y = e.p0y = y; e.vs = e.vx = e.vy = 0;
    e.hx = e.hs = def.w / 2; e.h = def.h; e.maxHp = e.hp = def.hp * loopHpMul(); e.speed = def.speed;
    e.face = 0; e.ctrl = o.ctrl || null; e.hitT = 0; e.active = !!o.active || !!o.ctrl; e.state = 'walk'; e.t = 0; e.phase = Math.random() * 6.28; e.lane = null; e.blocked = false; e.invulnerable = false;
    e.grounded = true; e.alt = def.alt ? rndRange(def.alt[0], def.alt[1]) : 0; e.fireCd = def.fire ? rndRange(0.6, def.fire.every[1]) : 0;
    e.t2 = def.arch === 'flyer' ? rndRange(ARCH.flyer.diveEvery[0], ARCH.flyer.diveEvery[1]) : def.rest ? rndRange(def.rest[0], def.rest[1]) : 0;
    if (def.alt) { e.y += e.alt; e.grounded = false; }
    if (def.climb && o.edgeX !== undefined) { e.state = 'climb'; e.edgeX = o.edgeX; e.x = e.p0x = o.edgeX + Math.sign(o.edgeX) * 0.5; e.y = e.p0y = y - 2.4; e.active = true; }
    list.push(e);
    return e;
  };

  api.remove = (e) => { const i = list.indexOf(e); if (i >= 0) { list[i] = list[list.length - 1]; list.pop(); } e.on = false; };

  const c = { P: null, track, projectiles: null, speedMul: 1 };
  api.update = (dt) => {
    c.P = P(); c.projectiles = ctx.projectiles; c.speedMul = speedMul();
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      e.p0s = e.s; e.p0x = e.x; e.p0y = e.y; e.hitT = Math.max(0, e.hitT - dt);
      think(e, c, dt);
      // quiet despawn: left far behind, or fell into a pit
      if (!e.ctrl && (e.s < c.P.s - 45 || e.y < -8)) api.remove(e);
    }
  };

  // Where would a ground enemy stand at (s,x)? -Infinity if it would be over a pit.
  api.groundAt = (s, x, fromY = 6) => groundAt(track, s, x, fromY, 8);
  api.clear = () => { for (const e of list) { e.on = false; e.ctrl?.dispose?.(e); e.ctrl = null; } list.length = 0; };

  api.render = (alpha) => {
    for (const k in batches) batches[k].begin();
    models.begin(); const P = ctx.player.body;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.ctrl) { e.ctrl.render?.(e, alpha); continue; }              // bosses draw themselves
      if (models.put(e, alpha, P)) continue;                              // modelled types
      const b = batches[ARCH[e.arch].shape];
      const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
      const w = e.hs * 2, pulse = e.active ? 1 : 0.92;
      b.put(s, x, y, w * pulse, e.h * pulse, w * pulse, e.hitT > 0 ? 0xffffff : e.def.color);
    }
    for (const k in batches) batches[k].end();
    models.end();
  };
  return api;
}
