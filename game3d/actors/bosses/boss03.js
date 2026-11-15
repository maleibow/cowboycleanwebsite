import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss03Model } from './boss03Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { rangeRand, easeOut, clamp01 } from './bossKit.js';
import * as THREE from 'three';

// TRASH KING: hovers at the arena rim, locks a charge lane on the floor, then runs it (PLAN section 6).
//   drop (crane cable) -> roar -> hover -> tele (lane shown, revving) -> charge -> crash -> (hover -> tele ... charges) -> stun -> hover ...
//   phase 2 below half health: rage roar (invulnerable, harmless), shorter telegraph, three charges in a row, junk rains on marked circles at each crash, two slags.
// Fairness: the only damage sources are the body (contact, 25: while charging it only ever travels inside the lane), the junk circles (marked for 2+ s), the minions.
// The lane is locked when the telegraph starts and stays on the floor until the boss has passed (1.1-1.5 s of warning, chevrons point the way).
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;

export function spawnBoss03(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss3, model = createBoss03Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const K = { state: 'drop', st: 0, t: 0, phase: 1, dying: false, done: false, passive: true, sq: 1, lean: 0, roll: 0, eye: 0, glow: 0, thrust: 0.7, claws: 0.2, cable: 1, scale: 1, charge: 0, hy: T.intro.dropHeight,
    shX: 0, shZ: 0, timer: 0, face: 0, dir: { s: 0, x: 0 }, to: { s: 0, x: 0 }, post: { s: 0, x: 0 }, remain: 0, bubbleT: 0, trailT: 0, name: T.name, onDefeated: null, onReady: null };
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss3', A.s + A.r * 0.3, 0, T.intro.dropHeight, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.grounded = false; e.speed = T.driftSpeed;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const sparks = (s, x, y, n = 12) => { ctx.fx.burst(s, x, y, 0xffb040, n, 7, 0.14); ctx.fx.burst(s, x, y, 0x4ff4ff, Math.ceil(n / 3), 5, 0.1, true); };
  const minions = (n) => { for (let i = 0; i < n && ctx.enemies.count < 9; i++) { const a = (i / n) * Math.PI * 2 + 0.4, q = arena.clampPoint(e.s + Math.cos(a) * 3.2, e.x + Math.sin(a) * 3.2, 1.2, {}); ctx.enemies.spawn('slag', q.s, q.x, 0, { active: true, tier: 1 }); } };
  const pickPost = (P) => {   // the rim opposite the player
    let ds = A.s - P.s, dx = A.x - P.x, d = Math.hypot(ds, dx); if (d < 3) { const a = Math.random() * 6.283; ds = Math.cos(a); dx = Math.sin(a); d = 1; }
    arena.clampPoint(A.s + (ds / d) * (A.r - 3.4), A.x + (dx / d) * (A.r - 3.4), 2.0, K.post);
  };
  const planLane = (P) => {   // from the boss through the player's position to the far rim; locked now
    let ds = P.s - e.s, dx = P.x - e.x, d = Math.hypot(ds, dx); if (d < 1) { ds = A.s - e.s; dx = A.x - e.x; d = Math.hypot(ds, dx) || 1; }
    ds /= d; dx /= d; const r = A.r - 2.0, ps = e.s - A.s, px = e.x - A.x, b = ds * ps + dx * px, c = ps * ps + px * px - r * r, t = Math.max(6, -b + Math.sqrt(Math.max(0, b * b - c)));
    K.dir.s = ds; K.dir.x = dx; K.to.s = e.s + ds * t; K.to.x = e.x + dx * t; K.remain = t;
    fx.lane(e.s, e.x, K.to.s, K.to.x, T.laneW, K.pattern().tele); events.emit('bossSiren');
  };
  const rain = (P) => {
    const p = K.pattern().rain; if (!p) return; const q = {};
    for (let i = 0; i < p.count; i++) { let s = P.s, x = P.x; if (i) { const a = Math.random() * 6.283, d = 2.5 + Math.random() * 4.5; s += Math.cos(a) * d; x += Math.sin(a) * d; } arena.clampPoint(s, x, 1.6, q); fx.strike(q.s, q.x, p.r, rangeRand(p.delay), { damage: p.damage, color: 0xffa030, size: 0.55, splash: 'junk', after: i * p.gap }); }
  };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.flash = 0;
    if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    const d = Math.hypot(P.s - e.s, P.x - e.x);
    if (K.state !== 'tele' && K.state !== 'charge' && K.state !== 'dying' && d > 1) K.face += Math.atan2(Math.sin(Math.atan2(P.x - e.x, -(P.s - e.s)) - K.face), Math.cos(Math.atan2(P.x - e.x, -(P.s - e.s)) - K.face)) * Math.min(1, dt * 5);
    K.shX = K.shZ = 0; K.lean = 0; K.roll = 0; K.sq = 1; K.eye = 0.3 + (K.phase - 1) * 0.4; K.thrust = 0.8; K.claws = 0.15; K.cable = 0;
    const bob = Math.sin(K.t * 2.3) * 0.12;
    switch (K.state) {
      case 'drop': { // lowered from the crane on its cable; landing spot already shown, harmless
        if (K.st === dt) fx.marker(e.s, e.x, 0, 2.6, T.intro.dropTime);
        const u = clamp01(K.st / T.intro.dropTime); K.hy = lerp(T.intro.dropHeight, T.hoverY, u * u * (3 - 2 * u)); K.cable = 1; K.thrust = 0.3; K.eye = 0; K.lean = 0.08; K.sq = 1.04;
        if (u >= 1) { ctx.combat.shake(0.9); sparks(e.s, e.x, 0.3, 24); fx.shock(e.s, e.x, 0, { speed: 9, harmless: true, maxR: A.r * 1.4 }); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { const u = clamp01(K.st / T.intro.roar); K.hy = T.hoverY + bob; K.claws = easeOut(Math.min(1, u * 2)); K.eye = 1; K.thrust = 1.3; K.shX = Math.sin(K.st * 40) * 0.05; if (K.st < dt * 2) events.emit('bossSiren');
        if (u >= 1) { e.invulnerable = false; K.passive = false; K.onReady?.(); K.charge = 0; K.timer = rangeRand(p.hover); pickPost(P); go('hover'); } break; }
      case 'hover': { // drifts to the rim opposite the player, bobbing
        K.hy = lerp(K.hy, T.hoverY + bob, 0.12); const ds = K.post.s - e.s, dx = K.post.x - e.x, dd = Math.hypot(ds, dx);
        if (dd > 0.4) { const v = Math.min(T.driftSpeed * (K.phase === 2 ? 1.3 : 1), dd * 3) * dt; e.s += (ds / dd) * v; e.x += (dx / dd) * v; }
        K.lean = 0.05; K.timer -= dt; if (K.timer <= 0 && !rageCheck()) { planLane(P); go('tele'); }
        break;
      }
      case 'tele': { // revs on the spot, crouched, facing down the lane
        const u = clamp01(K.st / p.tele); K.face += Math.atan2(Math.sin(Math.atan2(K.dir.x, -K.dir.s) - K.face), Math.cos(Math.atan2(K.dir.x, -K.dir.s) - K.face)) * Math.min(1, dt * 10);
        K.hy = lerp(K.hy, 0.35, 0.18); K.sq = 1 - 0.1 * easeOut(u); K.thrust = 1.0 + 1.0 * u; K.eye = 0.6 + 0.4 * (Math.sin(K.st * 28) > 0 ? 1 : 0); K.claws = 0.6 * u; K.shX = Math.sin(K.st * 60) * 0.07 * u; K.lean = -0.1 * u;
        if (u >= 1) { events.emit('bossCharge'); go('charge'); }
        break;
      }
      case 'charge': {
        const step = Math.min(K.remain, p.speed * dt); e.s += K.dir.s * step; e.x += K.dir.x * step; K.remain -= step; K.hy = 0.3; K.thrust = 2.2; K.lean = 0.2; K.eye = 1; K.claws = 0.9;
        K.trailT -= dt; if (K.trailT <= 0) { K.trailT = 0.05; sparks(e.s - K.dir.s * 1.5, e.x - K.dir.x * 1.5, 0.2, 5); }
        if (K.remain <= 0.01) { ctx.combat.shake(0.85); ctx.rig.kickFov(3); sparks(e.s, e.x, 1.2, 30); events.emit('bossCrash'); K.charge++; rain(P); if (K.phase === 2 && K.charge >= p.charges) minions(p.minions); go('crash'); }
        break;
      }
      case 'crash': { const u = clamp01(K.st / 0.7); K.hy = 0.3 + 0.15 * Math.sin(K.st * 30) * (1 - u); K.thrust = 0.6; K.eye = 0.2; K.lean = 0.22 * (1 - u); K.shX = Math.sin(K.st * 50) * 0.1 * (1 - u); K.sq = 0.92 + 0.08 * u;
        if (u >= 1 && !rageCheck()) { if (K.charge >= p.charges) { K.charge = 0; go('stun'); } else { K.timer = rangeRand(p.hover) * 0.6; pickPost(P); go('hover'); } } break; }
      case 'stun': { // dazed on the floor, sparking: the opening to shoot it
        K.hy = lerp(K.hy, 0.12, 0.2); K.thrust = 0.25; K.eye = 0.05; K.lean = 0.16; K.shX = Math.sin(K.st * 30) * 0.03; K.claws = 0; K.sq = 0.95;
        if (Math.random() < dt * 14) ctx.fx.burst(e.s + (Math.random() - 0.5) * 2.5, e.x + (Math.random() - 0.5) * 2.5, 1.5 + Math.random() * 1.5, 0xffb040, 2, 3, 0.1);
        if (K.st >= p.stun && !rageCheck()) { K.timer = rangeRand(p.hover); pickPost(P); go('hover'); }
        break;
      }
      case 'rage': { // phase two: roars, invulnerable and harmless, clears the air
        if (K.st === dt) { K.phase = 2; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.clear(); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.6); events.emit('bossRage', { name: T.name }); events.emit('bossSiren'); e.invulnerable = true; K.passive = true; }
        const u = clamp01(K.st / T.rage.time); K.hy = lerp(K.hy, T.hoverY + 0.4, 0.15); K.claws = easeOut(Math.min(1, u * 2)); K.eye = 1; K.thrust = 2.0; K.shX = Math.sin(K.st * 45) * 0.07; K.glow = 0.25 + 0.2 * Math.sin(K.st * 14);
        if (u >= 1) { K.glow = 0; e.invulnerable = false; K.passive = false; minions(2); K.charge = 0; K.timer = rangeRand(K.pattern().hover); pickPost(P); go('hover'); }
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 2.8); K.hy = lerp(K.hy, 0.05, 0.1); K.sq = 1 - 0.18 * u + Math.sin(K.st * 30) * 0.05 * (1 - u); K.eye = 0; K.glow = Math.min(1.6, u * 1.8); K.thrust = 0.3 * (1 - u); K.lean = 0.2 * Math.sin(K.st * 7) * (1 - u); K.shX = Math.sin(K.st * 50) * 0.2 * (1 - u * 0.5); K.shZ = Math.cos(K.st * 44) * 0.12 * (1 - u * 0.5);
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.07; sparks(e.s + (Math.random() - 0.5) * 3, e.x + (Math.random() - 0.5) * 3, 0.8 + Math.random() * 2.4, 6); }
        if (u >= 1 && !K.done) { K.done = true; for (let i = 0; i < 6; i++) { ctx.fx.burst(e.s, e.x, 1.4 + i * 0.3, i % 2 ? 0xffffff : 0xffb040, 14, 9, 0.24, true); } ctx.combat.shake(0.9); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e); }
        break;
      }
    }
    e.y = K.hy; e.grounded = K.hy < 0.2;
    if (K.state !== 'dying') arena.confine(e, 1.9);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };

  K.beginDefeat = () => { K.dying = K.passive = true; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
    placeMatrix(ctx.track, s, x, y, K.face, 1, 1, 1, _m); model.root.matrix.copy(_m);
    model.pose({ sq: K.sq, lean: K.lean, roll: K.roll, thrust: K.thrust, eye: K.eye, glow: K.glow, flash: e.hitT > 0 ? 0.7 : 0, t: K.t, scale: K.done ? 0 : 1, claws: K.claws, cable: K.cable, shakeX: K.shX, shakeZ: K.shZ });
    model.root.visible = !K.done; model.root.matrixWorldNeedsUpdate = true;
    fx.shadow(s, x, 0, 1.8 + Math.min(1.6, y * 0.4), 0.42 - Math.min(0.28, y * 0.06));
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
