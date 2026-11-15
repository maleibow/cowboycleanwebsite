import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss02Model } from './boss02Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { rangeRand, easeOut, clamp01 } from './bossKit.js';
import * as THREE from 'three';

// BIG SLUDGE: hops at the player in a series, then rains acid on marked circles (PLAN section 6).
//   emerge -> roar -> idle -> windup -> leap -> splat -> (idle ... hops) -> spit -> rain -> rest -> idle ...
//   phase 2 below half health: rage roar (invulnerable, harmless), faster, landings send a ring, more rain, two slimes per series.  dying -> melt.
// Fairness: the damage sources are the landing (a disc on the floor from the start of the windup, ~1.7 s before the landing), every acid
// circle (marked from the moment the boss rears back, 2+ s before it lands), the ring (1 m tall: any jump clears it) and the minions.
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;

export function spawnBoss02(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss2, model = createBoss02Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const K = { state: 'emerge', st: 0, t: 0, phase: 1, dying: false, done: false, passive: true, sq: 0.1, lean: 0, eye: 0, glow: 0, aura: 0.3, mouth: 0, wide: 0, melt: 0, scale: 1, hopsLeft: 0, rainT: 0,
    shX: 0, shZ: 0, timer: 0, from: { s: 0, x: 0 }, to: { s: 0, x: 0 }, bubbleT: 0, name: T.name, onDefeated: null, onReady: null };
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss2', A.s + A.r * 0.3, 0, 0, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.speed = T.walkSpeed;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const goo = (s, x, n = 16) => { ctx.fx.burst(s, x, 0.3, 0x3fd06a, n, 6, 0.28); ctx.fx.burst(s, x, 0.3, 0xbfffd0, 6, 4, 0.14, true); };
  const planHop = (P) => {   // land on the player (not tracked afterwards), within hop range and the arena
    const p = K.pattern(); let ds = P.s - e.s, dx = P.x - e.x; const d = Math.hypot(ds, dx);
    if (d > T.hopRange) { ds *= T.hopRange / d; dx *= T.hopRange / d; }
    arena.clampPoint(e.s + ds, e.x + dx, 2.4, K.to); K.from.s = e.s; K.from.x = e.x;
    fx.marker(K.to.s, K.to.x, 0, T.splatR, p.windup + p.air);
  };
  const minions = (n) => {
    for (let i = 0; i < n && ctx.enemies.count < 9; i++) {
      const a = (i / n) * Math.PI * 2 + 0.9, q = arena.clampPoint(e.s + Math.cos(a) * 3, e.x + Math.sin(a) * 3, 1.2, {});
      ctx.enemies.spawn('slime', q.s, q.x, 0, { active: true, tier: 1 });
    }
  };
  const land = () => {
    const p = K.pattern(), P = ctx.player.body;
    e.s = K.to.s; e.x = K.to.x; e.y = 0; e.grounded = true; ctx.combat.shake(0.6); ctx.rig.kickFov(2); goo(e.s, e.x, 24);
    events.emit('bossHop');
    if (Math.hypot(P.s - e.s, P.x - e.x) < T.splatR - 0.2 && P.y < 1.4) ctx.combat.damagePlayer(T.stompDamage);
    if (p.ring) fx.shock(e.s, e.x, 0, { speed: p.ring.speed, thick: p.ring.thick, height: p.ring.height, damage: p.ring.damage, maxR: A.r * 2.1 });
    K.hopsLeft--; if (K.hopsLeft <= 0 && p.minions) minions(p.minions);
    go('splat');
  };
  const rain = () => {    // mark every circle now; they fall one after another
    const p = K.pattern().rain, P = ctx.player.body, q = {};
    for (let i = 0; i < p.count; i++) {
      let s = P.s, x = P.x;
      if (i > 0) { const a = Math.random() * 6.283, d = 2.5 + Math.random() * 4.5; s += Math.cos(a) * d; x += Math.sin(a) * d; }
      arena.clampPoint(s, x, 1.6, q);
      fx.strike(q.s, q.x, p.r, rangeRand(p.delay), { damage: p.damage, color: 0x9bff3a, size: 0.55, after: p.windup + i * p.gap });
    }
    K.rainT = p.windup + p.delay[1] + (p.count - 1) * p.gap + 0.5;
  };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.flash = 0;
    if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    K.shX = K.shZ = 0; K.lean = 0; K.aura = 0.3 + (K.phase - 1) * 0.15; K.mouth = 0; K.wide = 0; K.eye = (K.phase - 1) * 0.5;
    switch (K.state) {
      case 'emerge': { // bursts up out of a bubbling pool in the middle of the arena, harmless
        if (K.st === dt) { fx.marker(e.s, e.x, 0, 3, T.intro.emerge); events.emit('bossEmerge'); }
        const u = clamp01(K.st / T.intro.emerge); K.sq = 0.1 + 0.9 * easeOut(u); K.wide = 0.5 * (1 - u); K.aura = 0; K.shX = Math.sin(K.st * 40) * 0.05 * (1 - u);
        if (Math.random() < dt * 20) ctx.fx.burst(e.s + (Math.random() - 0.5) * 3, e.x + (Math.random() - 0.5) * 3, 0.2, 0x7dff9a, 3, 3, 0.16, true);
        if (u >= 1) { goo(e.s, e.x, 26); ctx.combat.shake(0.9); fx.shock(e.s, e.x, 0, { speed: 9, harmless: true, maxR: A.r * 1.4 }); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { const u = clamp01(K.st / T.intro.roar); K.sq = 1 + 0.08 * Math.sin(K.st * 18); K.mouth = easeOut(Math.min(1, u * 2)); K.eye = 0.5; K.shX = Math.sin(K.st * 40) * 0.05;
        if (u >= 1) { e.invulnerable = false; K.passive = false; K.onReady?.(); K.hopsLeft = 0; K.series = false; K.timer = rangeRand(p.idle); go('idle'); } break; }
      case 'idle': { // oozes toward the player
        const d = Math.hypot(P.s - e.s, P.x - e.x); K.sq = 1 + Math.sin(K.t * 5) * 0.05; K.lean = 0.05;
        if (d > 3.4) { e.s += ((P.s - e.s) / d) * T.walkSpeed * dt * (K.phase === 2 ? 1.3 : 1); e.x += ((P.x - e.x) / d) * T.walkSpeed * dt * (K.phase === 2 ? 1.3 : 1); }
        K.timer -= dt;
        if (K.timer <= 0 && !rageCheck()) {
          if (!K.series) { K.series = true; K.hopsLeft = Math.round(rangeRand(p.hops)); }
          if (K.hopsLeft > 0) { planHop(P); go('windup'); } else { K.series = false; rain(); go('spit'); events.emit('bossSpit'); }
        }
        break;
      }
      case 'windup': { const u = clamp01(K.st / p.windup); K.sq = 1 - 0.4 * easeOut(u); K.wide = 0.25 * u; K.eye = 0.5 + 0.5 * (Math.sin(K.st * 30) > 0 ? 1 : 0); K.shX = Math.sin(K.st * 55) * 0.05 * u; K.lean = -0.1 * u; if (u >= 1) go('leap'); break; }
      case 'leap': {
        const u = clamp01(K.st / p.air); e.s = lerp(K.from.s, K.to.s, u); e.x = lerp(K.from.x, K.to.x, u); e.y = p.peak * 4 * u * (1 - u); e.grounded = false;
        K.sq = 1 + 0.3 * Math.sin(u * Math.PI); K.lean = 0.25 * (u - 0.4); K.eye = 1; K.aura = 0;
        if (u >= 1) land();
        break;
      }
      case 'splat': { const u = clamp01(K.st / 0.4); K.sq = 0.7 + 0.3 * easeOut(u); K.wide = 0.3 * (1 - u); if (u >= 1 && !rageCheck()) { K.timer = rangeRand(p.idle); go('idle'); } break; }
      case 'spit': { // rears back and balloons: the circles are already marked on the floor
        const u = clamp01(K.st / p.rain.windup); K.sq = 1 + 0.28 * easeOut(u); K.lean = -0.28 * u; K.mouth = easeOut(u); K.eye = 0.6 + 0.4 * Math.sin(K.st * 20) ** 2; K.shX = Math.sin(K.st * 50) * 0.04 * u;
        if (K.st >= p.rain.windup) go('rain');
        break;
      }
      case 'rain': { // spews: the globs fall; the boss stays open to fire
        K.sq = 1.1 - 0.12 * clamp01(K.st / 0.5); K.lean = -0.18; K.mouth = 0.7 * (1 - clamp01(K.st / (K.rainT - p.rain.windup)));
        if (K.st >= K.rainT - p.rain.windup) { if (!rageCheck()) go('rest'); }
        break;
      }
      case 'rest': { K.sq = 0.92 + Math.sin(K.st * 6) * 0.03; K.eye = 0.1; K.lean = 0.12; if (K.st >= p.rest && !rageCheck()) { K.hopsLeft = 0; K.series = false; K.timer = rangeRand(p.idle); go('idle'); } break; }
      case 'rage': { // phase two: swells and roars, invulnerable and harmless, clears the air
        if (K.st === dt) { K.phase = 2; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.clear(); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.6); events.emit('bossRage', { name: T.name }); e.invulnerable = true; K.passive = true; }
        const u = clamp01(K.st / T.rage.time); K.sq = 1 + 0.12 * Math.sin(K.st * 24); K.wide = 0.2 * u; K.mouth = easeOut(Math.min(1, u * 2)); K.eye = 1; K.shX = Math.sin(K.st * 45) * 0.07; K.aura = 0.8; K.glow = 0.25 + 0.2 * Math.sin(K.st * 14);
        if (u >= 1) { K.glow = 0; e.invulnerable = false; minions(2); K.passive = false; K.hopsLeft = 0; K.series = false; K.timer = rangeRand(K.pattern().idle); go('idle'); }
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 2.6); K.melt = u; K.sq = 1 - 0.1 * u + Math.sin(K.st * 30) * 0.05 * (1 - u); K.eye = 0; K.glow = Math.min(1.4, u * 1.6); K.aura = 0.3 * (1 - u); K.shX = Math.sin(K.st * 50) * 0.15 * (1 - u * 0.5); K.mouth = 0.6 * (1 - u);
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.08; ctx.fx.burst(e.s + (Math.random() - 0.5) * 3, e.x + (Math.random() - 0.5) * 3, 0.5 + Math.random() * (2 - u * 1.4), Math.random() > 0.5 ? 0xbfffd0 : 0x7dff9a, 5, 2.4, 0.2, true); }
        if (u >= 1 && !K.done) {
          K.done = true; for (let i = 0; i < 6; i++) ctx.fx.burst(e.s, e.x, 0.6 + i * 0.25, i % 2 ? 0xffffff : 0x7dff9a, 14, 9, 0.22, true);
          ctx.combat.shake(0.8); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e);
        }
        break;
      }
    }
    if (K.state !== 'dying') arena.confine(e, 1.8);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };

  K.beginDefeat = () => { K.dying = K.passive = true; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
    placeMatrix(ctx.track, s, x, y, 0, 1, 1, 1, _m); model.root.matrix.copy(_m);
    model.pose({ sq: K.sq, lean: K.lean, eye: K.eye, mouth: K.mouth, glow: K.glow, flash: e.hitT > 0 ? 0.7 : 0, aura: K.aura, t: K.t, scale: K.done ? 0 : 1, wide: K.wide, melt: K.melt, shakeX: K.shX, shakeZ: K.shZ });
    model.root.visible = !K.done; model.root.matrixWorldNeedsUpdate = true;
    fx.shadow(s, x, 0, y > 0.3 ? 1.6 + Math.min(1.6, y * 0.25) : 0, 0.4 - Math.min(0.25, y * 0.04));
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
