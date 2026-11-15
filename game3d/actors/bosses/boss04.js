import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss04Model } from './boss04Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { rangeRand, easeOut, clamp01 } from './bossKit.js';
import * as THREE from 'three';

// PIZZA RAT: orbits the arena on his flying pizza box dropping pepperoni bombs, then locks a target and swoops (PLAN section 6).
//   enter (spirals down) -> roar -> orbit (bomb run) -> tele (flies over the target, marker on the floor) -> dive -> recover (grounded, open to fire) -> orbit ...
//   phase 2 below half health: rage roar (invulnerable, harmless), faster orbit and bombs, two swoops in a row, two rats at the first landing.
// Fairness: every bomb has a circle on the floor for its whole fall (1.0-1.15 s); the swoop target is marked from the start of the telegraph until the landing (>= 1.4 s);
// the body only hurts at the swoop landing (inside the marked circle) and while grounded; at hover height (4+ m) it cannot touch anyone.
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;
const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

export function spawnBoss04(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss4, model = createBoss04Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const K = { state: 'enter', st: 0, t: 0, phase: 1, dying: false, done: false, passive: true, sq: 1, lean: 0, roll: 0, eye: 0, glow: 0, rotor: 0.5, hatch: 0, thrust: 0.6, scale: 1, hy: T.intro.startHeight, theta: 0.6, dirn: 1,
    shX: 0, shZ: 0, face: 0, bombsLeft: 0, bombT: 0, swoopsLeft: 0, to: { s: 0, x: 0 }, bubbleT: 0, name: T.name, onDefeated: null, onReady: null };
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss4', A.s + Math.cos(K.theta) * T.orbitR, Math.sin(K.theta) * T.orbitR, T.intro.startHeight, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.grounded = false; e.speed = T.flySpeed;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const dust = (s, x, y, n = 18) => { ctx.fx.burst(s, x, y, 0xe8c48c, n, 6, 0.26); ctx.fx.burst(s, x, y, 0xff7a30, 8, 5, 0.14, true); };
  const minions = (n) => { for (let i = 0; i < n && ctx.enemies.count < 9; i++) { const a = (i / n) * Math.PI * 2 + 0.5, q = arena.clampPoint(e.s + Math.cos(a) * 3.2, e.x + Math.sin(a) * 3.2, 1.2, {}); ctx.enemies.spawn('rat', q.s, q.x, 0, { active: true, tier: 1 }); } };
  const startRun = () => { const p = K.pattern(); K.bombsLeft = p.bombs; K.bombT = 0.6; K.swoopsLeft = p.swoops; };
  const orbitPos = () => { e.s = A.s + Math.cos(K.theta) * T.orbitR; e.x = Math.sin(K.theta) * T.orbitR; };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);
  const drop = () => {
    const p = K.pattern(), q = arena.clampPoint(e.s, e.x, 1.2, {});
    fx.strike(q.s, q.x, p.bombR, p.bombDelay, { damage: T.bombDamage, color: 0xff6a2a, size: 0.55, height: e.y + 0.2 });
    K.hatch = 1; K.bombsLeft--; K.bombT = p.every; events.emit('bossDrop');
  };

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.flash = 0;
    if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    K.shX = K.shZ = 0; K.lean = 0; K.roll = 0; K.sq = 1; K.eye = 0.3 + (K.phase - 1) * 0.4; K.rotor = 0.5; K.thrust = 0.7; K.hatch = Math.max(0, K.hatch - dt * 3);
    const faceTo = Math.atan2(P.x - e.x, -(P.s - e.s)); if (K.state !== 'dying') K.face = turn(K.face, faceTo, Math.min(1, dt * 4));
    const bob = Math.sin(K.t * 2.4) * 0.15;
    switch (K.state) {
      case 'enter': { // spirals down out of the sky
        const u = clamp01(K.st / T.intro.swoopTime), a = K.theta + (1 - u) * 2.2; K.hy = lerp(T.intro.startHeight, T.hoverY, u * u * (3 - 2 * u)); e.s = A.s + Math.cos(a) * T.orbitR; e.x = Math.sin(a) * T.orbitR; K.roll = 0.35 * (1 - u); K.rotor = 1; K.thrust = 1; K.eye = 0;
        if (u >= 1) { ctx.combat.shake(0.6); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { const u = clamp01(K.st / T.intro.roar); K.hy = T.hoverY + bob; orbitPos(); K.eye = 1; K.rotor = 1; K.thrust = 1.3; K.shX = Math.sin(K.st * 40) * 0.05;
        if (u >= 1) { e.invulnerable = false; K.passive = false; K.onReady?.(); startRun(); go('orbit'); } break; }
      case 'orbit': { // circles the arena, bombing
        K.theta += T.orbitSpeed * dt * (K.phase === 2 ? 1.35 : 1) * K.dirn; orbitPos(); K.hy = lerp(K.hy, T.hoverY + bob, 0.12); K.roll = -0.12 * K.dirn; K.lean = 0.06; K.rotor = 0.7;
        if (K.bombsLeft > 0) { K.bombT -= dt; if (K.bombT <= 0) drop(); }
        else { K.bombT -= dt; if (K.bombT <= -0.5 && !rageCheck()) { K.to.s = 0; arena.clampPoint(P.s, P.x, 2.4, K.to); fx.marker(K.to.s, K.to.x, 0, T.swoopR, p.tele + p.dive); events.emit('bossLock'); go('tele'); } }
        break;
      }
      case 'tele': { // flies over the marked spot, rotors screaming
        const ds = K.to.s - e.s, dx = K.to.x - e.x, d = Math.hypot(ds, dx), u = clamp01(K.st / p.tele);
        if (d > 0.2) { const v = Math.min(T.flySpeed, d * 4) * dt; e.s += (ds / d) * v; e.x += (dx / d) * v; K.roll = clamp(-dx * 0.05, -0.3, 0.3); K.lean = 0.12; }
        K.hy = lerp(K.hy, T.hoverY + 1.2, 0.1); K.rotor = 1; K.thrust = 1 + u; K.eye = 0.6 + 0.4 * (Math.sin(K.st * 26) > 0 ? 1 : 0); K.shX = Math.sin(K.st * 55) * 0.06 * u; K.hatch = 0;
        if (u >= 1) { events.emit('bossSwoop'); go('dive'); }
        break;
      }
      case 'dive': {
        const u = clamp01(K.st / p.dive), k = u * u; e.s = lerp(e.s, K.to.s, 0.35); e.x = lerp(e.x, K.to.x, 0.35); K.hy = lerp(T.hoverY + 1.2, 0.3, k); K.lean = 0.7 * u; K.rotor = 1; K.thrust = 2; K.eye = 1;
        if (u >= 1) {
          e.s = K.to.s; e.x = K.to.x; K.hy = 0.3; ctx.combat.shake(0.8); ctx.rig.kickFov(3); dust(e.s, e.x, 0.3, 26); events.emit('bossCrash');
          if (Math.hypot(P.s - e.s, P.x - e.x) < T.swoopR && P.y < 1.6) ctx.combat.damagePlayer(T.swoopDamage);
          if (K.phase === 2 && K.swoopsLeft === p.swoops) minions(p.minions);
          K.swoopsLeft--; go('recover');
        }
        break;
      }
      case 'recover': { // grounded and dazed (or, in phase two between two swoops, only a breath)
        const dur = K.swoopsLeft > 0 ? 0.7 : p.recover, u = clamp01(K.st / dur); K.hy = K.st < dur - 0.5 ? 0.3 + Math.sin(K.st * 30) * 0.03 * (1 - u) : lerp(K.hy, T.hoverY, 0.12); K.rotor = 0.15 + 0.6 * u; K.thrust = 0.25; K.eye = 0.1; K.lean = 0.3 * (1 - u); K.sq = 0.95;
        if (K.st >= dur && !rageCheck()) { if (K.swoopsLeft > 0) { arena.clampPoint(P.s, P.x, 2.4, K.to); fx.marker(K.to.s, K.to.x, 0, T.swoopR, p.tele + p.dive); events.emit('bossLock'); go('tele'); } else { K.theta = Math.atan2(e.x, e.s - A.s); K.dirn = -K.dirn; startRun(); go('orbit'); } }
        break;
      }
      case 'rage': { // phase two: roars, invulnerable and harmless, clears the air
        if (K.st === dt) { K.phase = 2; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.clear(); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.6); events.emit('bossRage', { name: T.name }); e.invulnerable = true; K.passive = true; }
        const u = clamp01(K.st / T.rage.time); K.hy = lerp(K.hy, T.hoverY + 1, 0.1); K.eye = 1; K.rotor = 1; K.thrust = 2; K.shX = Math.sin(K.st * 45) * 0.06; K.glow = 0.25 + 0.2 * Math.sin(K.st * 14); K.hatch = 0.5;
        if (u >= 1) { K.glow = 0; e.invulnerable = false; K.passive = false; minions(2); K.theta = Math.atan2(e.x, e.s - A.s); startRun(); go('orbit'); }
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 2.8); K.hy = lerp(K.hy, 0.2, 0.06); K.roll = Math.sin(K.st * 9) * 0.35 * (1 - u * 0.5); K.lean = 0.25 * u; K.rotor = 0.5 * (1 - u); K.eye = 0; K.glow = Math.min(1.6, u * 1.8); K.thrust = 0.4 * (1 - u); K.shX = Math.sin(K.st * 50) * 0.18 * (1 - u * 0.5); K.shZ = Math.cos(K.st * 44) * 0.12 * (1 - u * 0.5);
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.08; ctx.fx.burst(e.s + (Math.random() - 0.5) * 3, e.x + (Math.random() - 0.5) * 3, 0.6 + Math.random() * 2.2, Math.random() > 0.5 ? 0xff6a2a : 0xf1c40f, 5, 3, 0.18); }
        if (u >= 1 && !K.done) { K.done = true; for (let i = 0; i < 6; i++) ctx.fx.burst(e.s, e.x, 1.4 + i * 0.3, i % 2 ? 0xffffff : 0xf1c40f, 14, 9, 0.24, true); ctx.combat.shake(0.9); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e); }
        break;
      }
    }
    e.y = K.hy; e.grounded = K.hy < 0.5;
    if (K.state !== 'dying' && K.state !== 'enter') arena.confine(e, 1.8);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  K.beginDefeat = () => { K.dying = K.passive = true; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
    placeMatrix(ctx.track, s, x, y + 0.5, K.face, 1, 1, 1, _m); model.root.matrix.copy(_m);
    model.pose({ roll: K.roll, lean: K.lean, rotor: K.rotor, eye: K.eye, hatch: K.hatch, flash: e.hitT > 0 ? 0.7 : 0, glow: K.glow, t: K.t, scale: K.done ? 0 : 1, sq: K.sq, shakeX: K.shX, shakeZ: K.shZ, thrust: K.thrust });
    model.root.visible = !K.done; model.root.matrixWorldNeedsUpdate = true;
    fx.shadow(s, x, 0, 1.7 + Math.min(1.8, y * 0.25), 0.42 - Math.min(0.3, y * 0.05));
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
