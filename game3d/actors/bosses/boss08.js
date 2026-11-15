import { BOSS_PATTERNS } from '../../data/bosses.js';
import { createBoss08Model } from './boss08Model.js';
import { placeMatrix } from '../../world/scenery.js';
import { events } from '../../core/events.js';
import { clamp01 } from './bossKit.js';
import * as THREE from 'three';

// THE EYE: a shielded eyeball that can only be hurt while it is open (PLAN section 6).
//   enter (sinks in from the clouds) -> roar -> open (a free window to start) -> shield (invulnerable; storm bolts on marked circles at the player's feet) -> tele (the lids tremble; a laser lane
//   is locked on the floor) -> open (the shield pops; he is hittable and fires down the lane at chest height) -> shield ...
//   phase 2 below half health: rage roar (invulnerable, harmless), five bolts a volley, a three-lane fan, a shorter window, storm clouds at the rage.
// Fairness: every bolt has a circle on the floor for >= 1.0 s before it lands; the lane is on the floor for the whole telegraph (>= 0.85 s) and the rounds only ever fly along it (a slide goes under
// them: they fly at 1.2 m, a jump goes over); while shielded he never touches anyone; the first window after the roar is free (no shots).
const _m = new THREE.Matrix4();
const lerp = (a, b, u) => a + (b - a) * u;
const turn = (from, to, k) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

export function spawnBoss08(ctx, arena, stageBoss = {}) {
  const T = BOSS_PATTERNS.boss8, model = createBoss08Model(), fx = ctx.bossFx, A = arena.center;
  ctx.scene.add(model.root);
  const phaseAt = stageBoss.phaseAt ?? 0.5;
  const K = { state: 'enter', st: 0, t: 0, phase: 1, dying: false, done: false, passive: true, open: 0, shield: 1, charge: 0, glow: 0, scale: 1, sq: 1, hy: T.intro.startHeight, face: 0, shX: 0, shZ: 0, lean: 0, roll: 0,
    th: 0, boltsLeft: 0, boltT: 0, shotsLeft: 0, shotT: 0, dirs: [], free: false, bubbleT: 0, name: T.name, onDefeated: null, onReady: null };
  K.pattern = () => (K.phase === 1 ? T.p1 : T.p2);

  const e = ctx.enemies.spawn('boss8', A.s, 0, T.intro.startHeight, { ctrl: K });
  e.hs = T.size.hs; e.hx = T.size.hx; e.h = T.size.h; e.invulnerable = true; e.grounded = false; e.speed = 0;
  K.enemy = e;

  const go = (state) => { K.state = state; K.st = 0; };
  const spark = (n = 14) => { ctx.fx.burst(e.s, e.x, e.y + 1.5, 0xffffff, n, 6, 0.26); ctx.fx.burst(e.s, e.x, e.y + 1.5, 0xc2e4ff, 8, 5, 0.18, true); };
  const minions = (n) => { for (let i = 0; i < n && ctx.enemies.count < 9; i++) { const a = (i / n) * Math.PI * 2 + 0.5, q = arena.clampPoint(A.s + Math.cos(a) * 5, Math.sin(a) * 5, 1.2, {}); ctx.enemies.spawn('storm_cloud', q.s, q.x, 0, { active: true, tier: 1 }); } };
  const rageCheck = () => (K.phase === 1 && e.hp <= e.maxHp * phaseAt ? (go('rage'), true) : false);
  const bolt = () => {   // one storm bolt on the player's feet (a small offset keeps it from being a free hit), marked for the whole fall
    const p = K.pattern(), P = ctx.player.body, q = {}; arena.clampPoint(P.s + (Math.random() - 0.5) * 2.4, P.x + (Math.random() - 0.5) * 2.4, 1.4, q);
    fx.strike(q.s, q.x, p.boltR, p.boltDelay, { damage: p.boltDamage, color: 0xffe14a, size: 0.5, height: 20 });
    K.boltsLeft--; K.boltT = p.every; K.charge = 1; events.emit('boltCall');
  };
  const lanes = () => {   // lock the line(s) of fire on the floor: from the eye to the player's position now
    const P = ctx.player.body, p = K.pattern(), ds = P.s - e.s, dx = P.x - e.x, base = Math.atan2(dx, ds), n = p.fan ? 3 : 1;
    K.dirs = [];
    for (let i = 0; i < n; i++) { const a = base + (n === 1 ? 0 : (i - 1) * p.fan), us = Math.cos(a), ux = Math.sin(a); K.dirs.push({ s: us, x: ux }); fx.lane(e.s, e.x, e.s + us * 26, e.x + ux * 26, T.laneW, p.tele + p.shots * p.shotEvery + 0.3); }
    K.face = Math.atan2(dx, -ds); events.emit('bossLock');
  };
  const volley = () => {
    const p = K.pattern();
    for (const d of K.dirs) ctx.projectiles.fireEnemy('laser', e.s + d.s * 1.2, e.x + d.x * 1.2, e.y + 0.3, d.s * p.shotSpeed, d.x * p.shotSpeed, 0);
    events.emit('eyeShot'); K.shotsLeft--; K.shotT = p.shotEvery; K.sq = 0.96;
  };

  K.update = (_e, c, dt) => {
    const P = c.P, p = K.pattern(); K.st += dt; K.t += dt; K.flash = 0;
    K.shX = K.shZ = 0; K.charge = Math.max(0, K.charge - dt * 3); K.lean = 0; K.roll = 0; K.sq = 1; if (K.state !== 'rage' && K.state !== 'dying') K.glow = 0;
    if (K.state !== 'dying') K.face = turn(K.face, Math.atan2(P.x - e.x, -(P.s - e.s)), Math.min(1, dt * 3));
    K.th += dt * T.orbitSpeed;
    const orbit = (k = 1) => { const ts = A.s + Math.cos(K.th) * T.orbitR * 0.7, tx = Math.sin(K.th * 1.3) * T.orbitR, ds = ts - e.s, dx = tx - e.x, d = Math.hypot(ds, dx); if (d > 0.05) { const v = Math.min(3.5 * k, d * 2) * dt; e.s += (ds / d) * v; e.x += (dx / d) * v; } };
    const bob = Math.sin(K.t * 1.9) * 0.12;
    switch (K.state) {
      case 'enter': {
        const u = clamp01(K.st / T.intro.dropTime); K.hy = lerp(T.intro.startHeight, T.shieldY, u * u * (3 - 2 * u)); e.s = A.s; e.x = 0; K.open = 0; K.shield = 1; K.roll = 0.3 * (1 - u);
        if (u >= 1) { ctx.combat.shake(0.6); spark(20); events.emit('bossIntro', { name: T.name, line: stageBoss.intro }); go('roar'); }
        break;
      }
      case 'roar': { K.hy = T.shieldY + bob; K.shield = 1 - clamp01((K.st - 0.7) / 0.5); K.open = clamp01((K.st - 0.6) / 0.6); K.charge = 0.6; K.shX = Math.sin(K.st * 40) * 0.05;
        if (K.st >= T.intro.roar) { e.invulnerable = false; K.passive = false; K.onReady?.(); K.free = true; events.emit('eyeOpen'); go('open'); } break; }
      case 'open': { // the shield is down and the eye is wide open: shoot it
        e.invulnerable = false; K.shield = 0; K.open = clamp01(K.st / 0.25); K.hy = lerp(K.hy, T.openY, 0.12) + bob * 0.2; orbit(0.4); K.sq = 1 + Math.sin(K.st * 6) * 0.015;
        if (K.shotsLeft > 0 && !K.free) { K.shotT -= dt; if (K.shotT <= 0) volley(); }
        const len = K.free ? p.open * 0.8 : p.open;
        if (K.st >= len && (K.free || K.shotsLeft <= 0) && !rageCheck()) { K.free = false; e.invulnerable = true; K.passive = false; events.emit('eyeShut'); go('shield'); K.boltsLeft = p.bolts; K.boltT = 0.5; }
        break;
      }
      case 'shield': { // eyelids shut, bubble up, invulnerable: calls down bolts on the player's position
        e.invulnerable = true; K.shield = clamp01(K.st / 0.3); K.open = 1 - clamp01(K.st / 0.3); K.hy = lerp(K.hy, T.shieldY, 0.1) + bob * 0.3; orbit(1);
        K.boltT -= dt; if (K.boltsLeft > 0 && K.boltT <= 0) bolt();
        if (K.st >= p.shield && K.boltsLeft <= 0 && !rageCheck()) { go('tele'); lanes(); events.emit('eyeCharge'); }
        break;
      }
      case 'tele': { // the lids tremble, the bubble shimmers, the lane is on the floor: a warning, then the shield pops
        e.invulnerable = true; K.shield = 1; K.open = 0.08 * Math.abs(Math.sin(K.st * 18)); K.charge = clamp01(K.st / p.tele); K.hy = lerp(K.hy, T.shieldY - 0.3, 0.1); K.shX = Math.sin(K.st * 35) * 0.05 * K.charge;
        if (K.st >= p.tele) { spark(16); ctx.combat.shake(0.3); K.shotsLeft = p.shots; K.shotT = 0; e.invulnerable = false; K.free = false; events.emit('eyeOpen'); go('open'); }
        break;
      }
      case 'rage': {
        if (K.st === dt) { K.phase = 2; ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); fx.clear(); fx.shock(e.s, e.x, 0, { speed: 10, harmless: true, maxR: A.r * 1.4 }); ctx.combat.shake(0.6); events.emit('bossRage', { name: T.name }); e.invulnerable = true; K.passive = true; }
        const u = clamp01(K.st / T.rage.time); K.hy = lerp(K.hy, T.shieldY + 0.8, 0.1); K.open = 1; K.shield = 1; K.charge = 1; K.glow = 0.25 + 0.2 * Math.sin(K.st * 14); K.shX = Math.sin(K.st * 45) * 0.06;
        if (u >= 1) { K.glow = 0; K.passive = false; e.invulnerable = false; minions(T.p2.minions); K.free = true; K.shotsLeft = 0; events.emit('eyeOpen'); go('open'); }   // worn out by the roar: a free window, then the harder cycle
        break;
      }
      case 'dying': {
        const u = clamp01(K.st / 2.8); K.hy = lerp(K.hy, 1.2, 0.05); K.open = 0.6 + 0.4 * Math.sin(K.st * 12); K.shield = 0; K.roll = Math.sin(K.st * 9) * 0.3 * (1 - u * 0.5); K.glow = Math.min(1.5, u * 1.7); K.shX = Math.sin(K.st * 50) * 0.18 * (1 - u * 0.5);
        K.bubbleT -= dt; if (K.bubbleT <= 0 && !K.done) { K.bubbleT = 0.07; ctx.fx.burst(e.s + (Math.random() - 0.5) * 3, e.x + (Math.random() - 0.5) * 3, 0.6 + Math.random() * 2.6, Math.random() > 0.5 ? 0xffffff : 0xffc2dc, 4, 3, 0.2); }
        if (u >= 1 && !K.done) { K.done = true; for (let i = 0; i < 6; i++) ctx.fx.burst(e.s, e.x, 1.2 + i * 0.4, [0xffffff, 0xffc2dc, 0xc2e4ff, 0xfff0b8, 0xd9c2ff, 0xbfeedd][i], 14, 9, 0.24, true); ctx.combat.shake(0.9); K.onDefeated?.(e); ctx.enemies.remove(e); K.dispose(e); }
        break;
      }
    }
    e.y = K.hy; e.grounded = false;
    if (K.state !== 'dying' && K.state !== 'enter') arena.confine(e, 1.6);
    if (K.state !== 'dying') ctx.hud?.showBoss(T.name, Math.max(0, e.hp), e.maxHp);
  };

  K.beginDefeat = () => { K.dying = K.passive = true; e.invulnerable = true; go('dying'); fx.clear(); ctx.hud?.hideBoss(); ctx.projectiles.clearEnemyShots?.(e.s, e.x, 40); for (const q of [...ctx.enemies.list]) if (q !== e) ctx.combat.killEnemy(q); };

  K.render = (_e, alpha) => {
    const s = e.p0s + (e.s - e.p0s) * alpha, x = e.p0x + (e.x - e.p0x) * alpha, y = e.p0y + (e.y - e.p0y) * alpha, P = ctx.player.body;
    placeMatrix(ctx.track, s, x, y + 1.5, K.face, 1, 1, 1, _m); model.root.matrix.copy(_m);
    const lx = Math.max(-0.5, Math.min(0.5, Math.sin(K.t * 0.8) * 0.18)), ly = Math.max(-0.4, Math.min(0.2, -0.05 * (y + 1.5 - (P.y + 1))));
    model.pose({ open: K.open, shield: K.shield, lookX: lx, lookY: ly, charge: K.charge, flash: e.hitT > 0 ? 0.7 : 0, glow: K.glow, t: K.t, scale: K.done ? 0.001 : 1, sq: K.sq, shakeX: K.shX, shakeZ: K.shZ, lean: K.lean, roll: K.roll });
    model.root.visible = !K.done; model.root.matrixWorldNeedsUpdate = true;
    fx.shadow(s, x, 0, 1.6 + Math.min(1.8, y * 0.25), 0.4 - Math.min(0.28, y * 0.05));
  };
  K.dispose = () => { ctx.scene.remove(model.root); model.dispose(); fx.shadow(0, 0, 0, 0, 0); };
  K.hpFraction = () => Math.max(0, e.hp) / e.maxHp;
  return K;
}
