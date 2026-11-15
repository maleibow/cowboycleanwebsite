import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss09Model } from './boss09Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { clamp01 } from './bossKit.js';
import * as THREE from 'three';

// HOLLOW GHOST: glides after the player loosing homing wisps, then phases out and slips across the arena (PLAN section 6).
//   enter (rises out of the floor) -> roar -> haunt (solid and hittable: drifts after the player, charges a wisp in his lantern, looses it) -> fade (his outline flickers; the spot where he will
//   re-form is marked) -> phase (translucent, invulnerable and harmless; spectral hands burst out of marked circles around the player while he slips to the marked spot) -> appear -> haunt ...
//   phase 2 below half health: rage roar (invulnerable, harmless), three wisps a volley, five bursts, a jumpable wail ring when he re-forms, two ghosts at the rage.
// Fairness: every wisp is announced by a lane on the floor and a swelling flame for >= 0.5 s and is slower than the player (and times out); every burst has a circle on the floor for >= 1.1 s; the
// re-forming spot is marked for the whole fade + phase; while phased he can neither hurt nor be hurt; he never closes inside 3 m of the player.
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;
const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

export function spawnBoss09(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss9, model = createBoss09Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const K = { state: 'enter', st: 0, t: 0, phase: 1, dying: false, done: false, passive: true, vis: 0, charge: 0, mouth: 0, lean: 0, roll: 0, glow: 0, scale: 1, sq: 1, hy: -2.5, face: 0, shX: 0, shZ: 0,
    wispT: 1.0, charging: 0, dir: { s: 1, x: 0 }, dest: { s: 0, x: 0 }, burstsLeft: 0, burstT: 0, bubbleT: 0, name: T.name, onDefeated: null, onReady: null };
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss9', A.s, 0, -2.5, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.grounded = false; e.speed = 0;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const mist = (s, x, n = 16) => { ctx.fx.burst(s, x, 1.2, 0xbfffe0, n, 4, 0.3); ctx.fx.burst(s, x, 1.2, 0x2c3e50, 8, 3, 0.2); ctx.fx.burst(s, x, 1.6, 0xffffff, 4, 3, 0.1, true); };
  const minions = (n) => { for (let i = 0; i < n && ctx.enemies.count < 9; i++) { const a = (i / n) * Math.PI * 2 + 0.5, q = arena.clampPoint(A.s + Math.cos(a) * 5, Math.sin(a) * 5, 1.2, {}); ctx.enemies.spawn('ghost', q.s, q.x, 0, { active: true, tier: 2 }); } };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);
  const aimDir = () => { const P = ctx.player.body, ds = P.s - e.s, dx = P.x - e.x, d = Math.hypot(ds, dx) || 1; return { s: ds / d, x: dx / d, a: Math.atan2(dx, ds), d }; };
  const wisps = () => {   // homing wisps from the lantern, in a fan when there are three
    const p = K.pattern(), D = aimDir(), n = p.wisps;
    for (let i = 0; i < n; i++) { const a = D.a + (n === 1 ? 0 : (i - (n - 1) / 2) * p.fan), us = Math.cos(a), ux = Math.sin(a); ctx.projectiles.fireEnemy('homing', e.s + us * 1.2, e.x + ux * 1.2, e.y + 2.2, us * p.wispSpeed, ux * p.wispSpeed, 0, true); }
    events.emit('wispShot'); K.charging = 0; K.wispT = p.wispEvery; K.mouth = 1;
  };
  const pickDest = () => {   // a spot 5-8 m from the player, away from where he is now, inside the disc
    const P = ctx.player.body; let best = null, bd = -1, q = {};
    for (let k = 0; k < 8; k++) { const a = Math.random() * 6.283, r = 5 + Math.random() * 3; arena.clampPoint(P.s + Math.cos(a) * r, P.x + Math.sin(a) * r, 2.2, q); const d = Math.hypot(q.s - e.s, q.x - e.x); if (d > bd) { bd = d; best = { s: q.s, x: q.x }; } }
    K.dest.s = best.s; K.dest.x = best.x;
  };
  const burst = () => {   // a spectral orb that rises through the floor onto the player's feet (a small offset), marked for the whole rise
    const p = K.pattern(), P = ctx.player.body, q = {}; arena.clampPoint(P.s + (Math.random() - 0.5) * 2.2, P.x + (Math.random() - 0.5) * 2.2, 1.4, q);
    fx.strike(q.s, q.x, p.burstR, p.burstDelay, { damage: p.burstDamage, color: 0x7affb0, size: 0.45, height: -1.6, splash: 'spirit' }); K.burstsLeft--; K.burstT = p.burstEvery; events.emit('spiritCall');
  };

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.flash = 0;
    K.shX = K.shZ = 0; K.mouth = Math.max(0, K.mouth - dt * 3); K.lean = 0; K.roll = 0; K.sq = 1; K.charge = K.charging > 0 ? clamp01(K.charging / p.charge) : 0; if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    if (K.state !== 'dying') K.face = turn(K.face, Math.atan2(P.x - e.x, -(P.s - e.s)), Math.min(1, dt * 3));
    const bob = Math.sin(K.t * 1.8) * 0.12;
    const glide = (ts, tx, sp) => { const ds = ts - e.s, dx = tx - e.x, d = Math.hypot(ds, dx); if (d > 0.05) { const v = Math.min(sp, d * 2.5) * dt; e.s += (ds / d) * v; e.x += (dx / d) * v; } };
    switch (K.state) {
      case 'enter': {
        const u = clamp01(K.st / T.intro.rise); K.vis = u * u; K.hy = lerp(-2.5, T.hoverY, u * u * (3 - 2 * u)); K.mouth = 0.2; K.shX = Math.sin(K.st * 30) * 0.03 * (1 - u);
        if (u < 1 && Math.random() < dt * 14) ctx.fx.burst(e.s + (Math.random() - 0.5) * 2, e.x + (Math.random() - 0.5) * 2, 0.2, 0x7affb0, 3, 2, 0.2);
        if (u >= 1) { ctx.combat.shake(0.5); mist(e.s, e.x, 20); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { K.vis = 1; K.hy = T.hoverY + bob; K.mouth = 1; K.charging = K.st * 0.4; K.shX = Math.sin(K.st * 40) * 0.05; if (K.st >= T.intro.roar) { e.invulnerable = false; K.passive = false; K.charging = 0; K.onReady?.(); K.wispT = 1.2; go('haunt'); } break; }
      case 'haunt': { // solid: follows the player at a distance, charges a wisp, looses it
        K.vis = 1; e.invulnerable = false; K.passive = false; K.hy = T.hoverY + bob;
        const D = aimDir(); if (D.d > T.standoff) glide(P.s - D.s * T.standoff, P.x - D.x * T.standoff, T.drift);
        if (K.charging > 0) { K.charging += dt; K.lean = 0.1; if (K.charging >= p.charge) wisps(); }
        else { K.wispT -= dt; if (K.wispT <= 0 && K.st < p.haunt - 0.8) { K.charging = 0.001; const D2 = aimDir(); K.dir = D2; fx.lane(e.s, e.x, e.s + D2.s * 9, e.x + D2.x * 9, 1.0, p.charge); events.emit('wispCharge'); } }
        if (K.st >= p.haunt && K.charging <= 0 && !rageCheck()) { go('fade'); pickDest(); fx.marker(K.dest.s, K.dest.x, 0, 1.9, p.fade + p.phase + 0.2); events.emit('ghostFade'); }
        break;
      }
      case 'fade': { // the outline flickers: still solid, a warning that he is about to slip away
        K.vis = 0.55 + 0.45 * (Math.sin(K.st * 26) > 0 ? 1 : 0); K.hy = T.hoverY + bob; K.charging = 0; K.shX = Math.sin(K.st * 36) * 0.04;
        if (K.st >= p.fade) { e.invulnerable = true; K.passive = true; K.burstsLeft = p.bursts; K.burstT = 0.3; go('phase'); }
        break;
      }
      case 'phase': { // translucent, invulnerable, harmless: drifts to the marked spot while hands rise from marked circles
        e.invulnerable = true; K.passive = true; K.vis = 0.28 + 0.06 * Math.sin(K.t * 8); K.hy = T.hoverY + 0.3 + bob; glide(K.dest.s, K.dest.x, 6.5);
        K.burstT -= dt; if (K.burstsLeft > 0 && K.burstT <= 0) burst();
        if (K.st >= p.phase && K.burstsLeft <= 0) { mist(e.s, e.x, 14); events.emit('ghostAppear'); if (K.phase === 2 && p.ring) fx.shock(e.s, e.x, 0, { ...p.ring }); go('appear'); }
        break;
      }
      case 'appear': {
        const u = clamp01(K.st / p.appear); K.vis = lerp(0.3, 1, u); K.hy = T.hoverY + bob; K.sq = 1 + (1 - u) * 0.15;
        if (u >= 1 && !rageCheck()) { e.invulnerable = false; K.passive = false; K.wispT = 0.8; K.charging = 0; go('haunt'); }
        break;
      }
      case 'rage': {
        if (K.st === dt) { K.phase = 2; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.clear(); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.6); events.emit('bossRage', { name: T.name }); e.invulnerable = true; K.passive = true; }
        const u = clamp01(K.st / T.rage.time); K.vis = 1; K.hy = T.hoverY + 0.6 * u; K.mouth = 1; K.charging = 0; K.charge = 1; K.glow = 0.2 + 0.15 * Math.sin(K.st * 14); K.shX = Math.sin(K.st * 45) * 0.06;
        if (u >= 1) { K.glow = 0; e.invulnerable = false; K.passive = false; minions(T.p2.minions); K.wispT = 1.0; go('haunt'); }
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 2.8); K.vis = Math.max(0, 1 - u * 0.9); K.hy = lerp(K.hy, 2.0, 0.04); K.roll = Math.sin(K.st * 9) * 0.25 * (1 - u * 0.5); K.glow = Math.min(1.2, u * 1.4); K.mouth = 1; K.shX = Math.sin(K.st * 50) * 0.16 * (1 - u * 0.5);
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.07; ctx.fx.burst(e.s + (Math.random() - 0.5) * 2.5, e.x + (Math.random() - 0.5) * 2.5, 0.6 + Math.random() * 3, Math.random() > 0.5 ? 0xbfffe0 : 0xffffff, 4, 3, 0.2); }
        if (u >= 1 && !K.done) { K.done = true; for (let i = 0; i < 6; i++) ctx.fx.burst(e.s, e.x, 1.0 + i * 0.5, i % 2 ? 0xbfffe0 : 0x7affb0, 14, 8, 0.24, true); ctx.combat.shake(0.8); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e); }
        break;
      }
    }
    e.y = K.hy; e.grounded = false;
    if (K.state !== 'dying' && K.state !== 'enter') arena.confine(e, 1.6);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };

  K.beginDefeat = () => { K.dying = K.passive = true; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha;
    placeMatrix(ctx.track, s, x, y, K.face, 1, 1, 1, _m); model.root.matrix.copy(_m);
    model.pose({ vis: K.vis, charge: K.charge, mouth: K.mouth, lean: K.lean, roll: K.roll, flash: e.hitT > 0 ? 0.7 : 0, glow: K.glow, t: K.t, scale: K.done ? 0.001 : 1, sq: K.sq, shakeX: K.shX, shakeZ: K.shZ });
    model.root.visible = !K.done && K.vis > 0.01; model.root.matrixWorldNeedsUpdate = true;
    fx.shadow(s, x, 0, 1.6 * K.vis, 0.4 * K.vis);
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
