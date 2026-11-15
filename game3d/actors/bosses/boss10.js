import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss10Model } from './boss10Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { clamp01 } from './bossKit.js';
import * as THREE from 'three';

// VACANT SAVIOR: a fast figure-of-eight flier that stops to fire fans of ruby lasers and then swoops (PLAN section 6; 300 HP).
//   enter (drops through the ash) -> roar -> weave (the figure of eight; he is hittable all the time) -> aim (he stops; a fan of lanes is locked on the floor) -> fire (pulses of ruby lasers down the lanes)
//   -> weave ... after `volleys` volleys -> rise (a reticle follows the player) -> lock (the dive line is drawn on the floor) -> dive (down the line at speed, shedding acid onto marked circles along it)
//   -> land (phase two: a jumpable wail ring) -> [second swoop in phase two] -> rest (low, still, open to fire) -> weave.
//   phase 2 below half health: rage roar (invulnerable, harmless), faster eight, five-lane fans, two swoops in a row, a ring at each landing, shadow bats at the rage.
// Fairness: every fan is on the floor >= 0.8 s before a round leaves (the direction is locked then; the rounds fly at 1.2 m along it: slide under or jump); the dive line is drawn on the floor
// for >= 1.0 s (the reticle follows you for the first part, then it LOCKS) before he moves, and each acid drop has a marked circle for >= 0.95 s; while he weaves overhead (2.4 m) he cannot touch anyone.
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;
const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;
const TAU = Math.PI * 2;

export function spawnBoss10(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss10, model = createBoss10Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const K = { state: 'enter', st: 0, t: 0, phase: 1, dying: false, done: false, passive: true, arms: 0, halo: 0, charge: 0, lean: 0, roll: 0, glow: 0, scale: 1, sq: 1, hy: T.intro.startHeight, face: 0, shX: 0, shZ: 0,
    th: 0, volleyT: 0, volleysLeft: 0, pulsesLeft: 0, pulseT: 0, dirs: [], swoopsLeft: 0, from: { s: 0, x: 0 }, to: { s: 0, x: 0 }, diveT: 0, diveDur: 1, bubbleT: 0, name: T.name, onDefeated: null, onReady: null };
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss10', A.s, 0, T.intro.startHeight, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.grounded = false; e.speed = 0;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const ash = (s, x, y, n = 14) => { ctx.fx.burst(s, x, y, 0x7a7a86, n, 5, 0.3); ctx.fx.burst(s, x, y, 0xff4a6a, 6, 4, 0.14, true); };
  const minions = (n) => { for (let i = 0; i < n && ctx.enemies.count < 9; i++) { const a = (i / n) * Math.PI * 2 + 0.5, q = arena.clampPoint(A.s + Math.cos(a) * 5, Math.sin(a) * 5, 1.2, {}); ctx.enemies.spawn('shadow_bat', q.s, q.x, 0, { active: true, tier: 1 }); } };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);
  const pathAt = (th, out) => { out.s = A.s + T.pathB * Math.sin(2 * th); out.x = T.pathA * Math.sin(th); return out; };
  const lanes = () => {   // lock a fan of lanes on the floor from where he hangs to where the player is now
    const P = ctx.player.body, p = K.pattern(), ds = P.s - e.s, dx = P.x - e.x, base = Math.atan2(dx, ds), n = p.lanes;
    K.dirs = [];
    for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * p.fan, us = Math.cos(a), ux = Math.sin(a); K.dirs.push({ s: us, x: ux }); fx.lane(e.s, e.x, e.s + us * 26, e.x + ux * 26, T.laneW, p.tele + p.pulses * p.pulseEvery + 0.3); }
    K.face = Math.atan2(dx, -ds); events.emit('bossLock');
  };
  const pulse = () => { const p = K.pattern(); for (const d of K.dirs) ctx.projectiles.fireEnemy('ruby_laser', e.s + d.s * 1.3, e.x + d.x * 1.3, Math.max(1.1, e.y + 0.4), d.s * p.laserSpeed, d.x * p.laserSpeed, 0); events.emit('savior'); K.pulsesLeft--; K.pulseT = p.pulseEvery; K.sq = 0.97; };
  const lockSwoop = () => {   // the reticle freezes here: draw the dive line and mark the acid that will fall along it
    const P = ctx.player.body, p = K.pattern(), q = {}; arena.clampPoint(P.s, P.x, 1.4, q); K.from.s = e.s; K.from.x = e.x; K.to.s = q.s; K.to.x = q.x;
    const ds = K.to.s - K.from.s, dx = K.to.x - K.from.x, d = Math.hypot(ds, dx) || 1; K.diveDur = Math.max(0.4, d / p.swoopSpeed); K.dirD = { s: ds / d, x: dx / d };
    fx.lane(K.from.s, K.from.x, K.to.s + K.dirD.s * 2, K.to.x + K.dirD.x * 2, 2.2, p.lock + K.diveDur + 0.3); fx.marker(K.to.s, K.to.x, 0, 1.8, p.lock + K.diveDur + 0.3); events.emit('bossLock');
    for (let i = 0; i < p.drips; i++) { const u = (i + 1) / (p.drips + 1), q2 = {}; arena.clampPoint(lerp(K.from.s, K.to.s, u), lerp(K.from.x, K.to.x, u) + (i % 2 ? 1.6 : -1.6), 1.2, q2); fx.strike(q2.s, q2.x, p.dripR, p.dripDelay + p.lock + u * K.diveDur, { damage: p.dripDamage, color: 0xff2a50, size: 0.4, height: 14 }); }
  };
  const nextAfterLanding = () => { K.swoopsLeft--; if (K.swoopsLeft > 0) go('rise'); else go('rest'); };

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.flash = 0;
    K.shX = K.shZ = 0; K.charge = 0; K.lean = 0; K.roll = 0; K.sq = 1; K.halo = K.state === 'weave' ? 0.3 : K.halo; if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    if (K.state !== 'dying' && K.state !== 'dive') K.face = turn(K.face, Math.atan2(P.x - e.x, -(P.s - e.s)), Math.min(1, dt * 4));
    const bob = Math.sin(K.t * 2.0) * 0.15;
    switch (K.state) {
      case 'enter': {
        const u = clamp01(K.st / T.intro.dropTime); K.hy = lerp(T.intro.startHeight, T.hoverY, u * u * (3 - 2 * u)); e.s = A.s; e.x = 0; K.arms = 1 - u * 0.5; K.halo = 0.5;
        if (u >= 1) { ctx.combat.shake(0.7); ash(e.s, e.x, 1.5, 22); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { K.hy = T.hoverY + bob; K.arms = 1; K.halo = 1; K.charge = 0.7; K.shX = Math.sin(K.st * 40) * 0.05; if (K.st >= T.intro.roar) { e.invulnerable = false; K.passive = false; K.onReady?.(); K.th = 0; K.volleysLeft = p.volleys; K.volleyT = p.volleyEvery; go('weave'); } break; }
      case 'weave': { // the figure of eight, fast; he is hittable the whole time
        K.th += (TAU / p.period) * dt; const q = {}; pathAt(K.th, q); const ds = q.s - e.s, dx = q.x - e.x, d = Math.hypot(ds, dx); const v = Math.min(d * 6, 16) * dt; if (d > 0.01) { e.s += (ds / d) * Math.min(v, d); e.x += (dx / d) * Math.min(v, d); }
        K.hy = T.hoverY + Math.sin(K.th * 2) * 0.4 + bob * 0.3; K.arms = 0.25; K.roll = -0.18 * Math.cos(K.th); K.lean = 0.08;
        K.volleyT -= dt;
        if (K.volleysLeft > 0 && K.volleyT <= 0 && !rageCheck()) { go('aim'); lanes(); K.pulsesLeft = p.pulses; K.pulseT = 0; events.emit('saviorAim'); }
        else if (K.volleysLeft <= 0 && K.st >= p.weave && !rageCheck()) { K.swoopsLeft = p.swoops; go('rise'); }
        break;
      }
      case 'aim': { K.hy = lerp(K.hy, T.hoverY + 0.2, 0.1) + bob * 0.1; K.arms = clamp01(K.st / 0.3); K.charge = clamp01(K.st / p.tele); K.halo = 1; K.shX = Math.sin(K.st * 35) * 0.04 * K.charge; if (K.st >= p.tele) go('fire'); break; }
      case 'fire': {
        K.hy = T.hoverY + 0.2 + bob * 0.1; K.arms = 1; K.halo = 1; K.pulseT -= dt; if (K.pulsesLeft > 0 && K.pulseT <= 0) pulse();
        if (K.pulsesLeft <= 0 && K.st > p.pulses * p.pulseEvery + 0.35) { K.volleysLeft--; K.volleyT = p.volleyEvery; go('weave'); }
        break;
      }
      case 'rise': { // up, arms wide: a reticle follows the player on the floor
        K.hy = lerp(K.hy, T.hoverY + 1.4, 0.12); K.arms = 1; K.halo = 1; K.charge = clamp01(K.st / p.track); K.shX = Math.sin(K.st * 30) * 0.03;
        if (K.st < p.track) { const b = ctx.player.body; if (Math.floor(K.st * 20) !== Math.floor((K.st - dt) * 20)) fx.marker(b.s, b.x, 0, 1.6, 0.16); }
        if (K.st === dt) events.emit('saviorAim');
        if (K.st >= p.track) { lockSwoop(); go('lock'); }
        break;
      }
      case 'lock': { K.hy = T.hoverY + 1.4; K.arms = 1; K.halo = 1; K.charge = 1; K.shX = Math.sin(K.st * 40) * 0.05; if (K.st >= p.lock) { K.diveT = 0; events.emit('saviorDive'); go('dive'); } break; }
      case 'dive': {
        K.diveT += dt; const u = clamp01(K.diveT / K.diveDur); e.s = lerp(K.from.s, K.to.s, u); e.x = lerp(K.from.x, K.to.x, u); K.hy = lerp(T.hoverY + 1.4, 1.0, u * u); K.face = Math.atan2(K.dirD.x, -K.dirD.s); K.lean = 0.5; K.arms = 0; K.halo = 1; K.charge = 1;
        if (u >= 1) { ctx.combat.shake(0.5); ash(e.s, e.x, 0.5, 18); if (K.phase === 2 && p.ring) fx.shock(e.s, e.x, 0, { ...p.ring }); events.emit('saviorLand'); go('land'); }
        break;
      }
      case 'land': { K.hy = lerp(K.hy, T.restY + 0.3, 0.2); K.sq = 0.92 + 0.08 * clamp01(K.st / 0.4); K.arms = 0.5; if (K.st >= 0.5 && !rageCheck()) nextAfterLanding(); break; }
      case 'rest': { // low and still, worn out: open to fire
        K.hy = lerp(K.hy, T.restY, 0.1) + bob * 0.05; K.arms = 0.1; K.halo = 0.1; K.sq = 1.02 + Math.sin(K.st * 4) * 0.02;
        if (K.st >= p.rest && !rageCheck()) { K.volleysLeft = p.volleys; K.volleyT = p.volleyEvery * 0.6; go('weave'); }
        break;
      }
      case 'rage': {
        if (K.st === dt) { K.phase = 2; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.clear(); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.7); events.emit('bossRage', { name: T.name }); e.invulnerable = true; K.passive = true; }
        const u = clamp01(K.st / T.rage.time); K.hy = lerp(K.hy, T.hoverY + 0.8, 0.1); K.arms = 1; K.halo = 1; K.charge = 1; K.glow = 0.25 + 0.2 * Math.sin(K.st * 14); K.shX = Math.sin(K.st * 45) * 0.06;
        if (u >= 1) { K.glow = 0; e.invulnerable = false; K.passive = false; minions(T.p2.minions); K.volleysLeft = T.p2.volleys; K.volleyT = T.p2.volleyEvery; go('weave'); }
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 3.0); K.hy = lerp(K.hy, 1.2, 0.05); K.arms = 1; K.halo = 1; K.roll = Math.sin(K.st * 9) * 0.3 * (1 - u * 0.5); K.glow = Math.min(1.5, u * 1.7); K.shX = Math.sin(K.st * 50) * 0.18 * (1 - u * 0.5);
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.07; ctx.fx.burst(e.s + (Math.random() - 0.5) * 3, e.x + (Math.random() - 0.5) * 3, 0.6 + Math.random() * 3, Math.random() > 0.5 ? 0xff4a6a : 0xffffff, 4, 3, 0.2); }
        if (u >= 1 && !K.done) { K.done = true; for (let i = 0; i < 7; i++) ctx.fx.burst(e.s, e.x, 1.0 + i * 0.4, i % 2 ? 0xff4a6a : 0xffffff, 16, 9, 0.26, true); ctx.combat.shake(1.0); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e); }
        break;
      }
    }
    e.y = K.hy; e.grounded = K.hy < 0.5;
    if (K.state !== 'dying' && K.state !== 'enter') arena.confine(e, 1.4);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };

  K.beginDefeat = () => { K.dying = K.passive = true; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
    placeMatrix(ctx.track, s, x, y, K.face, 1, 1, 1, _m); model.root.matrix.copy(_m);
    model.pose({ arms: K.arms, halo: K.halo, charge: K.charge, eye: 1, lean: K.lean, roll: K.roll, flash: e.hitT > 0 ? 0.7 : 0, glow: K.glow, t: K.t, scale: K.done ? 0.001 : 1, sq: K.sq, shakeX: K.shX, shakeZ: K.shZ });
    model.root.visible = !K.done; model.root.matrixWorldNeedsUpdate = true;
    fx.shadow(s, x, 0, 1.5 + Math.min(1.5, y * 0.25), 0.4 - Math.min(0.26, y * 0.05));
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
