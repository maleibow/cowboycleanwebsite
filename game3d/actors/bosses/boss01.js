import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss01Model } from './boss01Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { rangeRand, easeOut, clamp01 } from './bossKit.js';
import * as THREE from 'three';

// BIG DIRT: leaps across the arena and ground-slams, sending a ring shockwave to jump over (PLAN section 6).
//   drop -> roar -> walk -> windup -> leap -> slam -> stun -> walk ...        (phase 2 below half health: rage roar,
//   faster tempo, a double ring, three minions).  dying -> pop.
// Fairness: the only damage sources are the body (contact, 25), the stomp radius (shown on the floor from the start
// of the windup, about 2 s before landing), the ring (visible, slow, 1 m tall: any jump clears it) and the minions.
// ctx = level context ({ track, scene, player, enemies, combat, fx, bossFx, hud, rig }); arena = world/arena.js.
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;

export function spawnBoss01(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss1, model = createBoss01Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const K = { state: 'drop', st: 0, t: 0, phase: 1, dying: false, done: false, passive: false, sq: 1, arms: 0.4, lean: 0, eye: 0, glow: 0, aura: 0.4, walk: 0, scale: 1,
    shX: 0, shZ: 0, timer: 0, face: 0, from: { s: 0, x: 0 }, to: { s: 0, x: 0 }, pop: 0, bubbleT: 0, name: T.name, onDefeated: null, onReady: null };
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss1', A.s + A.r * 0.35, 0, T.intro.dropHeight, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.grounded = false; e.speed = T.walkSpeed;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const dust = (s, x, n = 16) => { ctx.fx.burst(s, x, 0.3, 0xe8c48c, n, 6, 0.3); ctx.fx.burst(s, x, 0.3, 0xffffff, 6, 4, 0.14, true); };
  const planTarget = (P) => { // where to land: on the player (not tracked afterwards), inside leap range and the arena
    const p = K.pattern(); let ds = P.s - e.s, dx = P.x - e.x; const d = Math.hypot(ds, dx);
    if (d > T.leapRange) { ds *= T.leapRange / d; dx *= T.leapRange / d; }
    arena.clampPoint(e.s + ds, e.x + dx, 2.2, K.to); K.from.s = e.s; K.from.x = e.x;
    fx.marker(K.to.s, K.to.x, 0, T.slamRadius, p.windup + p.air);
  };
  const minions = (n) => {
    for (let i = 0; i < n && ctx.enemies.count < 9; i++) {
      const a = (i / n) * Math.PI * 2 + 0.7, s = e.s + Math.cos(a) * 2.6, x = e.x + Math.sin(a) * 2.6, q = arena.clampPoint(s, x, 1.2, {});
      ctx.enemies.spawn('dirt', q.s, q.x, 0, { active: true, tier: 1 });
    }
  };
  const slam = () => {
    const p = K.pattern(), r = p.ring;
    e.s = K.to.s; e.x = K.to.x; e.y = 0; e.grounded = true; ctx.combat.shake(0.75); ctx.rig.kickFov(2.5); dust(e.s, e.x, 22);
    events.emit('bossSlam');
    for (let i = 0; i < r.count; i++) fx.shock(e.s, e.x, 0, { speed: r.speed, thick: r.thick, height: r.height, damage: r.damage, delay: i * (r.gap || 0), maxR: A.r * 2.1 });
    minions(p.minions); go('stun');
  };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.walk = 0; K.flash = 0;
    if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    const faceTo = Math.atan2(P.x - e.x, -(P.s - e.s)), d = Math.hypot(P.s - e.s, P.x - e.x);
    if (d > 1 && K.state !== 'dying') K.face += Math.atan2(Math.sin(faceTo - K.face), Math.cos(faceTo - K.face)) * Math.min(1, dt * 6);
    K.shX = K.shZ = 0; K.lean = 0; K.aura = 0.4;
    switch (K.state) {
      case 'drop': { // falls out of the sky onto a marker, then lands with a harmless ring
        if (K.st === dt) fx.marker(e.s, e.x, 0, T.slamRadius, T.intro.dropTime);
        const u = clamp01(K.st / T.intro.dropTime); e.y = T.intro.dropHeight * (1 - u * u); K.lean = 0.2; K.sq = 1.1; K.arms = 0.2; K.aura = 0;
        if (u >= 1) { e.y = 0; e.grounded = true; dust(e.s, e.x, 26); ctx.combat.shake(0.9); fx.shock(e.s, e.x, 0, { speed: 9, harmless: true, maxR: A.r * 1.4 }); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { const u = clamp01(K.st / T.intro.roar); K.arms = easeOut(Math.min(1, u * 2)); K.sq = 1 + 0.07 * Math.sin(K.st * 18); K.eye = 0.5; K.shX = Math.sin(K.st * 40) * 0.04;
        if (u >= 1) { e.invulnerable = false; K.onReady?.(); K.timer = rangeRand(p.walk); go('walk'); } break; }
      case 'walk': {
        K.arms = lerp(K.arms, 0.05, 0.2); K.sq = 1 + Math.sin(K.t * 8) * 0.03; K.walk = 1; K.eye = 0.2 + (K.phase - 1) * 0.5; K.lean = 0.08;
        if (d > 3.2) { e.s += ((P.s - e.s) / d) * T.walkSpeed * dt * (K.phase === 2 ? 1.25 : 1); e.x += ((P.x - e.x) / d) * T.walkSpeed * dt * (K.phase === 2 ? 1.25 : 1); arena.confine(e, 1.8); }
        K.timer -= dt; if (K.timer <= 0 && !rageCheck()) { planTarget(P); go('windup'); }
        break;
      }
      case 'windup': { // crouch, arms up, eyes flash: the warning
        const u = clamp01(K.st / p.windup); K.sq = 1 - 0.38 * easeOut(u); K.arms = easeOut(u); K.eye = 0.5 + 0.5 * (Math.sin(K.st * 30) > 0 ? 1 : 0); K.shX = Math.sin(K.st * 55) * 0.05 * u; K.lean = -0.12 * u;
        if (u >= 1) go('leap');
        break;
      }
      case 'leap': {
        const u = clamp01(K.st / p.air); e.s = lerp(K.from.s, K.to.s, u); e.x = lerp(K.from.x, K.to.x, u); e.y = p.peak * 4 * u * (1 - u); e.grounded = false;
        K.sq = 1 + 0.22 * Math.sin(u * Math.PI); K.arms = 1 - u * 1.3; K.lean = 0.25 * (u - 0.4); K.eye = 1; K.aura = 0;
        if (u >= 1) slam();
        break;
      }
      case 'stun': { // dazed: the opening to shoot it
        K.sq = 1 + Math.sin(K.st * 14) * 0.04 - 0.08; K.arms = 0; K.eye = 0.1; K.lean = 0.14; K.shX = Math.sin(K.st * 30) * 0.03;
        if (K.st >= p.stun && !rageCheck()) { K.timer = rangeRand(p.walk); go('walk'); }
        break;
      }
      case 'rage': { // phase two: roar, invulnerable and harmless, clears the air
        if (K.st === dt) { K.phase = 2; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.6); events.emit('bossRage', { name: T.name }); e.invulnerable = true; }
        const u = clamp01(K.st / T.rage.time); K.arms = easeOut(Math.min(1, u * 2)); K.eye = 1; K.sq = 1 + 0.08 * Math.sin(K.st * 24); K.shX = Math.sin(K.st * 45) * 0.06; K.aura = 0.7; K.glow = 0.25 + 0.2 * Math.sin(K.st * 14);
        if (u >= 1) { K.glow = 0; e.invulnerable = false; minions(2); K.timer = rangeRand(K.pattern().walk); go('walk'); }
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 2.6); K.sq = 1 - 0.28 * u + Math.sin(K.st * 30) * 0.04 * (1 - u); K.arms = 0.3 - u * 0.3; K.eye = 0; K.glow = Math.min(1.6, u * 1.8); K.lean = 0.1 * Math.sin(K.st * 6); K.aura = 0.4 * (1 - u);
        K.shX = Math.sin(K.st * 50) * 0.18 * (1 - u * 0.5); K.shZ = Math.cos(K.st * 44) * 0.12 * (1 - u * 0.5);
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.09; ctx.fx.burst(e.s + (Math.random() - 0.5) * 2.4, e.x + (Math.random() - 0.5) * 2.4, 0.6 + Math.random() * 2.4, Math.random() > 0.5 ? 0xbfefff : 0xffffff, 5, 2.4, 0.2, true); }
        if (u >= 1 && !K.done) {
          K.done = true; for (let i = 0; i < 6; i++) ctx.fx.burst(e.s, e.x, 1.4 + i * 0.3, i % 2 ? 0xffffff : 0xffd23a, 14, 9, 0.22, true);
          ctx.combat.shake(0.8); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e);
        }
        break;
      }
    }
    if (K.state !== 'dying') arena.confine(e, 1.6);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };

  K.beginDefeat = () => { K.dying = K.passive = true; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
    const pop = K.done ? 0 : 1, big = K.state === 'dying' ? 1 + 0.06 * Math.sin(K.st * 20) : 1;
    placeMatrix(ctx.track, s, x, y, K.face, 1, 1, 1, _m); model.root.matrix.copy(_m); model.root.matrixWorldNeedsUpdate = true;
    model.pose({ sq: K.sq, arms: K.arms, lean: K.lean, eye: K.eye, glow: K.glow, flash: e.hitT > 0 ? 0.7 : 0, aura: K.aura, t: K.t, walk: K.walk, scale: pop * big, shakeX: K.shX, shakeZ: K.shZ });
    model.root.visible = !K.done; model.root.matrixWorldNeedsUpdate = true;
    fx.shadow(s, x, 0, y > 0.3 ? 1.2 + Math.min(1.6, y * 0.25) : 0, 0.4 - Math.min(0.25, y * 0.04));
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
