import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss05Model } from './boss05Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { clamp01 } from './bossKit.js';
import * as THREE from 'three';

// THE MIME: teleports around the edge of the arena and fires bursts (PLAN section 6).
//   enter (drops in) -> roar -> aim (a lane on the floor locks onto the player) -> fire (a burst down the lane) -> open (a long window to shoot him) ->
//   vanish -> away (invulnerable; the next spot is marked) -> appear -> aim ...
//   phase 2 below half health: rage roar (invulnerable, harmless), faster bursts, three lanes per burst, two teleports in a row, two mimes at the rage.
// Fairness: every burst runs down a lane drawn on the floor for >= 0.8 s before the first round leaves (the direction is locked then, so walking out of it is enough);
// his arrival spot is marked for >= 1 s before he appears (he is harmless on arrival); while vanished he is invulnerable and cannot touch anyone.
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;
const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

export function spawnBoss05(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss5, model = createBoss05Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const K = { state: 'enter', st: 0, t: 0, phase: 1, dying: false, done: false, passive: true, vis: 1, aim: 0, wave: 0, lean: 0, glow: 0, scale: 1, sq: 1, hy: T.intro.startHeight, face: 0, shX: 0, shZ: 0,
    chain: 0, shotsLeft: 0, shotT: 0, dir: { s: 1, x: 0 }, to: { s: 0, x: 0 }, bubbleT: 0, name: T.name, onDefeated: null, onReady: null };
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss5', A.s - T.edgeR, 0, T.intro.startHeight, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.grounded = false; e.speed = 0;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const puff = (s, x, n = 16) => { ctx.fx.burst(s, x, 1.4, 0xffffff, n, 5, 0.3); ctx.fx.burst(s, x, 1.4, 0x2c3e50, 8, 4, 0.2); };
  const minions = (n) => { for (let i = 0; i < n && ctx.enemies.count < 9; i++) { const a = (i / n) * Math.PI * 2 + 0.5, q = arena.clampPoint(e.s + Math.cos(a) * 3.2, e.x + Math.sin(a) * 3.2, 1.2, {}); ctx.enemies.spawn('mime', q.s, q.x, 0, { active: true, tier: 1 }); } };
  const pickSpot = (P) => {   // a point on the edge ring that is far from the player (and not the one he stands on)
    let best = 0, bd = -1;
    for (let k = 0; k < 6; k++) { const a = Math.random() * 6.283, s = A.s + Math.cos(a) * T.edgeR, x = Math.sin(a) * T.edgeR, d = Math.hypot(P.s - s, P.x - x) + Math.hypot(e.s - s, e.x - x) * 0.4; if (d > bd) { bd = d; best = a; } }
    K.to.s = A.s + Math.cos(best) * T.edgeR; K.to.x = Math.sin(best) * T.edgeR;
  };
  const lanes = () => {   // draw the line(s) of fire from his hand to the player's position at this moment (the direction is locked now)
    const P = ctx.player.body, p = K.pattern(), ds = P.s - e.s, dx = P.x - e.x, d = Math.hypot(ds, dx) || 1, base = Math.atan2(dx, ds);
    K.dirs = []; const n = p.fan ? 3 : 1;
    for (let i = 0; i < n; i++) { const a = base + (n === 1 ? 0 : (i - 1) * p.fan), us = Math.cos(a), ux = Math.sin(a); K.dirs.push({ s: us, x: ux }); fx.lane(e.s, e.x, e.s + us * 26, e.x + ux * 26, T.laneW, p.aim + p.shots * p.every + 0.2); }
    K.face = Math.atan2(dx, -ds); events.emit('bossLock');
  };
  const volley = () => {
    const p = K.pattern();
    for (const d of K.dirs) ctx.projectiles.fireEnemy('bomb', e.s, e.x, e.y + 1.7, d.s * p.speed, d.x * p.speed, 0);
    events.emit('mimeShot'); K.shotsLeft--; K.shotT = p.every;
  };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);
  const next = () => { K.chain++; if (K.chain < K.pattern().teleports) go('vanish'); else { K.chain = 0; go('open'); } };

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.flash = 0;
    K.shX = K.shZ = 0; K.aim = 0; K.wave = 0; K.lean = 0; K.sq = 1; if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    if (K.state !== 'dying' && K.state !== 'away') K.face = turn(K.face, Math.atan2(P.x - e.x, -(P.s - e.s)), Math.min(1, dt * 5));
    switch (K.state) {
      case 'enter': { // drops in at the edge
        const u = clamp01(K.st / T.intro.dropTime); K.hy = lerp(T.intro.startHeight, 0, u * u); K.vis = 1; e.s = A.s - T.edgeR; e.x = 0;
        if (u >= 1) { puff(e.s, e.x, 22); ctx.combat.shake(0.6); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { K.hy = 0; K.wave = 1; K.shX = Math.sin(K.st * 40) * 0.04; if (K.st >= T.intro.roar) { e.invulnerable = false; K.passive = false; K.onReady?.(); K.chain = 0; go('aim'); lanes(); } break; }
      case 'aim': { // arm up: the lane is on the floor, locked
        K.hy = 0; K.aim = clamp01(K.st / 0.3); K.lean = 0.08; K.shotsLeft = p.shots;
        if (K.st >= p.aim && !rageCheck()) { go('fire'); K.shotT = 0; }
        break;
      }
      case 'fire': {
        K.hy = 0; K.aim = 1; K.lean = 0.12; K.shotT -= dt;
        if (K.shotsLeft > 0 && K.shotT <= 0) { volley(); K.sq = 0.96; }
        if (K.shotsLeft <= 0 && K.st > p.shots * p.every + 0.3) { if (!rageCheck()) next(); }
        break;
      }
      case 'open': { // takes a bow and mops his brow, open to fire
        K.hy = 0; K.wave = 0.6; K.sq = 1 + Math.sin(K.st * 5) * 0.015;
        if (K.st >= T.open && !rageCheck()) { K.chain = 0; go('vanish'); }
        break;
      }
      case 'vanish': {
        const u = clamp01(K.st / T.vanish); K.vis = 1 - u; e.invulnerable = true; K.passive = true;
        if (K.st === dt) { puff(e.s, e.x); events.emit('mimeVanish'); pickSpot(P); fx.marker(K.to.s, K.to.x, 0, 1.9, T.vanish + T.appearTele); }
        if (u >= 1) go('away');
        break;
      }
      case 'away': { // gone: the destination ring is the only sign of him
        K.vis = 0; e.s = K.to.s; e.x = K.to.x; K.hy = 0;
        if (K.st >= T.appearTele) { puff(e.s, e.x, 22); events.emit('mimeAppear'); go('appear'); }
        break;
      }
      case 'appear': {
        const u = clamp01(K.st / T.appear); K.vis = u; K.sq = 1 + (1 - u) * 0.3;
        if (u >= 1) { e.invulnerable = false; K.passive = false; K.vis = 1; go('aim'); lanes(); }
        break;
      }
      case 'rage': { // phase two: stamps and rages, invulnerable and harmless, clears the air
        if (K.st === dt) { K.phase = 2; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.clear(); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.6); events.emit('bossRage', { name: T.name }); e.invulnerable = true; K.passive = true; K.vis = 1; }
        const u = clamp01(K.st / T.rage.time); K.hy = 0; K.wave = 1; K.glow = 0.25 + 0.2 * Math.sin(K.st * 14); K.shX = Math.sin(K.st * 45) * 0.06;
        if (u >= 1) { K.glow = 0; e.invulnerable = false; K.passive = false; minions(T.p2.minions); K.chain = 0; go('aim'); lanes(); }
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 2.6); K.hy = 0; K.vis = 1 - u * 0.9; K.lean = 0.3 * u; K.glow = Math.min(1.4, u * 1.6); K.shX = Math.sin(K.st * 50) * 0.18 * (1 - u * 0.5); K.wave = 1;
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.08; ctx.fx.burst(e.s + (Math.random() - 0.5) * 3, e.x + (Math.random() - 0.5) * 3, 0.6 + Math.random() * 2.6, Math.random() > 0.5 ? 0xffffff : 0xc0392b, 5, 3, 0.18); }
        if (u >= 1 && !K.done) { K.done = true; for (let i = 0; i < 6; i++) ctx.fx.burst(e.s, e.x, 1.4 + i * 0.4, i % 2 ? 0xffffff : 0x2c3e50, 14, 9, 0.24, true); ctx.combat.shake(0.9); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e); }
        break;
      }
    }
    e.y = K.hy; e.grounded = K.hy < 0.5;
    if (K.state !== 'dying' && K.state !== 'enter') arena.confine(e, 1.2);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };

  K.beginDefeat = () => { K.dying = K.passive = true; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
    placeMatrix(ctx.track, s, x, y, K.face, 1, 1, 1, _m); model.root.matrix.copy(_m);
    model.pose({ aim: K.aim, vis: K.vis, wave: K.wave, lean: K.lean, flash: e.hitT > 0 ? 0.7 : 0, glow: K.glow, t: K.t, scale: K.done ? 0.001 : 1, sq: K.sq, shakeX: K.shX, shakeZ: K.shZ });
    model.root.visible = !K.done && K.vis > 0.01; model.root.matrixWorldNeedsUpdate = true;
    fx.shadow(s, x, 0, K.vis > 0.05 ? 1.5 * K.vis : 0, 0.4 * K.vis);
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
