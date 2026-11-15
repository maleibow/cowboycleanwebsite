import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss06Model } from './boss06Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { clamp01 } from './bossKit.js';
import * as THREE from 'three';

// MAGMA MAW: lobs bombs, sinks into the floor, burrows to the player and erupts (PLAN section 6).
//   emerge (climbs out of the lava ring) -> roar -> slide (toward the player) -> lob (volleys of bombs on marked circles) -> sink -> burrow (a marker follows the player, then locks)
//   -> erupt (a lava pillar on the marker, a jumpable ring, globs raining on marked circles) -> recover (open to fire) -> slide ...
//   phase 2 below half health: rage roar (invulnerable, harmless), faster, bigger volleys, two burrows in a row, more globs, two magmas at the rage.
// Fairness: every bomb and glob has a floor circle for its whole fall (>= 1.1 s); the burrow marker is on the floor >= 1.8 s and LOCKS >= 1.15 s before the eruption (it follows
// the player only before that); while sunk he is invulnerable and cannot hurt anyone; only the pillar (inside the locked circle) and the ring hurt at the eruption.
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;
const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
const rnd = (a, b) => a + Math.random() * (b - a);

export function spawnBoss06(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss6, model = createBoss06Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const K = { state: 'emerge', st: 0, t: 0, phase: 1, dying: false, done: false, passive: true, vis: 0.001, maw: 0, eye: 0, lean: 0, glow: 0, scale: 1, sq: 1, slam: 0, face: 0, shX: 0, shZ: 0,
    volleys: 0, lobs: 0, lobT: 0, burrows: 0, mk: null, locked: false, to: { s: 0, x: 0 }, bubbleT: 0, name: T.name, onDefeated: null, onReady: null };
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss6', A.s + A.r * 0.55, 0, 0, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.grounded = true; e.speed = T.walkSpeed;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const lava = (s, x, n = 18) => { ctx.fx.burst(s, x, 0.4, 0xff7a1a, n, 7, 0.28); ctx.fx.burst(s, x, 0.5, 0xffe36a, 8, 5, 0.14, true); ctx.fx.burst(s, x, 0.4, 0x2a1410, 6, 4, 0.3); };
  const minions = (n) => { for (let i = 0; i < n && ctx.enemies.count < 9; i++) { const a = (i / n) * Math.PI * 2 + 0.5, q = arena.clampPoint(e.s + Math.cos(a) * 4, e.x + Math.sin(a) * 4, 1.2, {}); ctx.enemies.spawn('magma', q.s, q.x, 0, { active: true, tier: 1 }); } };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);
  const lob = () => {   // two bombs thrown over his shoulder: one on the player's spot, the others scattered round it
    const p = K.pattern(), P = ctx.player.body, q = {};
    for (let i = 0; i < p.lobs; i++) { let s = P.s, x = P.x; if (i > 0) { const a = Math.random() * 6.283, d = 2.2 + Math.random() * 3.5; s += Math.cos(a) * d; x += Math.sin(a) * d; } arena.clampPoint(s, x, 1.5, q); fx.strike(q.s, q.x, p.lobR, p.lobDelay, { damage: p.lobDamage, color: 0xff6a20, size: 0.6, height: e.y + 6 }); }
    K.maw = 1; K.slam = 1; K.lobs--; K.lobT = p.every; events.emit('magmaLob');
  };
  const startBurrow = (P) => {
    const p = K.pattern(); K.locked = false; K.to.s = P.s; K.to.x = P.x; arena.clampPoint(K.to.s, K.to.x, 2.4, K.to);
    K.mk = fx.marker(K.to.s, K.to.x, 0, p.eruptR, p.burrow); K.lockAt = p.burrow - p.lock; events.emit('bossLock');
  };

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.flash = 0;
    K.shX = K.shZ = 0; K.lean = 0; K.sq = 1; K.maw = Math.max(0, K.maw - dt * 3); K.slam = Math.max(0, K.slam - dt * 3); K.eye = 0.3 + (K.phase - 1) * 0.4; if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    if (K.state !== 'dying' && K.state !== 'burrow') K.face = turn(K.face, Math.atan2(P.x - e.x, -(P.s - e.s)), Math.min(1, dt * 3));
    switch (K.state) {
      case 'emerge': { // climbs out of the lava ring
        const u = clamp01(K.st / T.intro.emerge); K.vis = Math.max(0.001, u * u * (3 - 2 * u)); K.sq = 1.4 - 0.4 * u; e.s = A.s + A.r * 0.55; e.x = 0;
        if (K.st === dt || Math.random() < dt * 14) lava(e.s + rnd(-2, 2), e.x + rnd(-2, 2), 4);
        if (u >= 1) { K.vis = 1; ctx.combat.shake(0.6); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { K.maw = 1; K.eye = 1; K.shX = Math.sin(K.st * 40) * 0.05; if (K.st >= T.intro.roar) { e.invulnerable = false; K.passive = false; K.onReady?.(); K.volleys = p.volleys; go('slide'); } break; }
      case 'slide': { // lumbers toward the player until in range
        const ds = P.s - e.s, dx = P.x - e.x, d = Math.hypot(ds, dx) || 1;
        if (d > T.lobRange * 0.6) { e.s += (ds / d) * T.walkSpeed * dt; e.x += (dx / d) * T.walkSpeed * dt; K.lean = 0.06; K.sq = 1 + Math.sin(K.st * 6) * 0.02; }
        if (K.st > 0.8 && !rageCheck()) { K.volleys = p.volleys; K.lobs = 1; K.lobT = 0.3; go('lob'); }
        break;
      }
      case 'lob': {
        K.lean = -0.12; K.lobT -= dt;
        if (K.lobs > 0 && K.lobT <= 0) lob();
        else if (K.lobs <= 0) { K.volleys--; if (K.volleys > 0) { K.lobs = 1; K.lobT = p.every; } else if (K.lobT < -0.5 && !rageCheck()) { K.burrows = p.burrows; go('sink'); events.emit('magmaSink'); } }
        break;
      }
      case 'sink': { // melts into the floor, invulnerable and harmless
        const u = clamp01(K.st / p.sink); K.vis = Math.max(0.001, 1 - u * u); K.sq = 1 - 0.7 * u; K.eye = 0.6; e.invulnerable = true; K.passive = true;
        if (Math.random() < dt * 30) lava(e.s + rnd(-1.5, 1.5), e.x + rnd(-1.5, 1.5), 3);
        if (u >= 1) { K.vis = 0.001; startBurrow(P); go('burrow'); }
        break;
      }
      case 'burrow': { // underground: the marker trails the player, then locks
        K.vis = 0.001; if (K.mk && K.st < K.lockAt) { arena.clampPoint(P.s, P.x, 2.4, K.to); K.mk.s += (K.to.s - K.mk.s) * Math.min(1, dt * 5); K.mk.x += (K.to.x - K.mk.x) * Math.min(1, dt * 5); }
        else if (!K.locked) { K.locked = true; if (K.mk) { K.to.s = K.mk.s; K.to.x = K.mk.x; } }
        if (K.mk && Math.random() < dt * 20) lava(K.mk.s + rnd(-p.eruptR, p.eruptR) * 0.6, K.mk.x + rnd(-p.eruptR, p.eruptR) * 0.6, 2);
        if (K.st >= p.burrow) go('erupt');
        break;
      }
      case 'erupt': { // bursts out under the locked marker
        if (K.st === dt) {
          e.s = K.to.s; e.x = K.to.x; K.vis = 1; K.sq = 1.35; K.slam = 1; K.maw = 1; lava(e.s, e.x, 34); ctx.combat.shake(0.9); ctx.rig.kickFov(3); events.emit('magmaErupt');
          const b = ctx.player.body; if (Math.hypot(b.s - e.s, b.x - e.x) < p.eruptR && b.y < 1.8) ctx.combat.damagePlayer(p.eruptDamage);
          fx.shock(e.s, e.x, 0, { speed: p.ring.speed, thick: p.ring.thick, height: p.ring.height, damage: p.ring.damage, maxR: A.r * 2.1 });
          const q = {}; for (let i = 0; i < p.globs; i++) { const a = (i / p.globs) * 6.283 + Math.random(), d = 4 + Math.random() * 6; arena.clampPoint(e.s + Math.cos(a) * d, e.x + Math.sin(a) * d, 1.5, q); fx.strike(q.s, q.x, p.globR, p.globDelay, { damage: p.globDamage, color: 0xff7a20, size: 0.5, height: 12, after: 0.15 + i * 0.18 }); }
        }
        K.sq = lerp(1.35, 1, clamp01(K.st / 0.4)); K.vis = 1;
        if (K.st >= 0.45) { K.burrows--; if (K.burrows > 0) { go('sink'); events.emit('magmaSink'); } else { e.invulnerable = false; K.passive = false; go('recover'); } }
        break;
      }
      case 'recover': { // stunned on the floor: open to fire
        const u = clamp01(K.st / p.recover); K.eye = 0.1; K.lean = 0.18 * (1 - u); K.sq = 0.95 + Math.sin(K.st * 5) * 0.015; K.maw = 0.4;
        if (K.st >= p.recover && !rageCheck()) { K.volleys = p.volleys; K.lobs = 0; go('slide'); }
        break;
      }
      case 'rage': { // phase two: swells and roars, invulnerable and harmless, clears the air
        if (K.st === dt) { K.phase = 2; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.clear(); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.6); events.emit('bossRage', { name: T.name }); e.invulnerable = true; K.passive = true; K.vis = 1; }
        const u = clamp01(K.st / T.rage.time); K.maw = 1; K.eye = 1; K.slam = 0.6 * Math.abs(Math.sin(K.st * 9)); K.glow = 0.3 + 0.2 * Math.sin(K.st * 14); K.shX = Math.sin(K.st * 45) * 0.06;
        if (u >= 1) { K.glow = 0; e.invulnerable = false; K.passive = false; minions(T.p2.minions); K.volleys = T.p2.volleys; go('slide'); }
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 2.8); K.vis = Math.max(0.001, 1 - u * u * 0.9); K.sq = 1 - 0.6 * u; K.glow = Math.min(1.6, u * 1.8); K.maw = 1; K.shX = Math.sin(K.st * 50) * 0.18 * (1 - u * 0.5);
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.07; lava(e.s + rnd(-2, 2), e.x + rnd(-2, 2), 4); }
        if (u >= 1 && !K.done) { K.done = true; for (let i = 0; i < 6; i++) ctx.fx.burst(e.s, e.x, 1.4 + i * 0.3, i % 2 ? 0xffffff : 0xff9a30, 14, 9, 0.24, true); ctx.combat.shake(0.9); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e); }
        break;
      }
    }
    e.y = 0; e.grounded = true;
    if (K.state !== 'dying' && K.state !== 'burrow' && K.state !== 'erupt') arena.confine(e, 2.0);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };

  K.beginDefeat = () => { K.dying = K.passive = true; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha;
    placeMatrix(ctx.track, s, x, 0, K.face, 1, 1, 1, _m); model.root.matrix.copy(_m);
    model.pose({ maw: K.maw, eye: K.eye, vis: K.vis, lean: K.lean, flash: e.hitT > 0 ? 0.7 : 0, glow: K.glow, t: K.t, scale: K.done ? 0.001 : 1, sq: K.sq, shakeX: K.shX, shakeZ: K.shZ, slam: K.slam });
    model.root.visible = !K.done && K.vis > 0.02; model.root.matrixWorldNeedsUpdate = true;
    fx.shadow(s, x, 0, K.vis > 0.05 ? 2.4 * K.vis : 0, 0.45 * K.vis);
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
