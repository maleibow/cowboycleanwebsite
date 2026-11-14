import * as THREE from 'three';
import { run } from '../core/state.js';
import { events } from '../core/events.js';
import { PROJ, GUN, BOMB, LASSO, POWERUPS, px } from '../data/weapons.js';

// The player's gun: heat/overheat, rate of fire, every powerup variant, aim-assist, bombs, shield and the
// lasso upgrade. Heat numbers are the original's (cleaningup.html 3330-3350, 3399-3460). ctx = { player,
// projectiles, enemies, combat, hud, rig }.
const EPS = 1e-5, TIMED = ['super', 'spread', 'fourway', 'homing', 'grenade', 'spin'];
const GUN_COLOR = { normal: 0x3498db, super: 0xff3a2a, laser: 0xff2bd6, charcoal: 0xdc143c, homing: 0xe056fd, grenade: 0x2ecc71, spin: 0xf1c40f };

export function createWeapon(ctx) {
  const w = {
    heat: 0, overheated: false, cd: 0, bombCd: 0, lassoCd: 0, shield: false, time: 0,
    timers: { super: 0, spread: 0, fourway: 0, homing: 0, grenade: 0, spin: 0 },
    face: { s: 1, x: 0 }, shots: 0, lastKind: 'normal',
  };
  const T = w.timers, F = w.face;

  // ---- visuals: the hero's own hand-held spray gun (playerModel.js) changes colour with the powerup and glows with heat; plus the shield bubble
  const gm = ctx.player.model.mats.gun, glow = ctx.player.model.mats.glow;
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.25, depthWrite: false }));
  bubble.position.y = 0.9; bubble.visible = false;
  ctx.player.mesh.add(bubble);

  w.kind = () => {
    let k = run.stage === 10 ? 'charcoal' : 'normal';
    if (T.super > 0) k = 'super';
    if (run.upgrades.laser && k === 'normal') k = 'laser';
    if (T.homing > 0) k = 'homing'; if (T.grenade > 0) k = 'grenade'; if (T.spin > 0) k = 'spin';
    return k;
  };

  w.reset = () => { w.heat = 0; w.overheated = false; w.cd = w.bombCd = w.lassoCd = 0; w.shield = false; for (const k of TIMED) T[k] = 0; };

  w.give = (type) => {
    const d = POWERUPS[type]; if (!d) return;
    if (type === 'health') run.health = Math.min(100, run.health + d.heal);
    else if (type === 'shield') w.shield = true;
    else if (type === 'bomb_refill') run.bombs = Math.min(9, run.bombs + 1);
    else T[type] = d.time;
    ctx.hud?.toast(d.label, d.color);
  };
  w.giveAll = () => { for (const k of Object.keys(POWERUPS)) w.give(k); };

  // Nearest living enemy inside the 30 deg / 30 m aim cone (PLAN 5). Height is unconstrained so flyers are hit.
  const pickTarget = (b) => {
    let best = null, bd = GUN.aimRange; const cosC = Math.cos(GUN.aimCone), list = ctx.enemies.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (e.hp <= 0 || e.invulnerable) continue;
      const ds = e.s - b.s, dx = e.x - b.x, d = Math.hypot(ds, dx);
      if (d < 0.6 || d > bd) continue;
      if ((ds * F.s + dx * F.x) / d < cosC) continue;
      bd = d; best = e;
    }
    return best;
  };

  const emit = (kind, ds, dx, dy, sp, ms, mx, my, bonus) => {
    const n = Math.hypot(ds, dx, dy) || 1, k = sp / n;
    if (kind === 'spin') { const p = ctx.projectiles.fire('spin', ms, mx, my, 0, 0, 0, bonus); if (p) p.ang = Math.atan2(dx, ds); return !!p; } // spirals out from the facing
    const p = ctx.projectiles.fire(kind, ms, mx, my, ds * k, dx * k, dy * k, bonus);
    if (p && T.spread > 0) p.variant = 'spread';       // drawn as small pellets
    return !!p;
  };
  const rot = (ds, dx, a) => [ds * Math.cos(a) - dx * Math.sin(a), ds * Math.sin(a) + dx * Math.cos(a)];

  w.shoot = () => {
    const b = ctx.player.body, kind = w.kind(), d = PROJ[kind], bonus = run.upgrades.size * 2;
    const ms = b.s + F.s * 0.7, mx = b.x + F.x * 0.7, my = b.y + b.h * 0.62;
    const tgt = kind === 'spin' ? null : pickTarget(b);
    let ds = F.s, dx = F.x, dy = 0;
    if (tgt) { // aim-assist: bend the shot toward the target's centre
      const ts = tgt.s - ms, tx = tgt.x - mx, ty = tgt.y + tgt.h * 0.5 - my, tl = Math.hypot(ts, tx, ty) || 1, a = GUN.aimStrength;
      ds = ds * (1 - a) + (ts / tl) * a; dx = dx * (1 - a) + (tx / tl) * a; dy = dy * (1 - a) + (ty / tl) * a;
    }
    if (kind !== 'charcoal' && kind !== 'grenade' && kind !== 'spin') { // original spread jitter
      const j = (Math.random() - 0.5) * 2 * GUN.jitter * (tgt ? 0.5 : 1); [ds, dx] = rot(ds, dx, j);
    }
    const sp = d.speed;
    if (T.spread > 0) { // forward + two streams at +/-0.2 rad
      emit(kind, ds, dx, dy, sp, ms, mx, my, bonus);
      for (const a of [-GUN.spreadAngle, GUN.spreadAngle]) { const [rs, rx] = rot(ds, dx, a); emit(kind, rs, rx, dy, sp, ms, mx, my, bonus); }
    } else if (T.fourway > 0) { // four directions around the player (original lines past 3460 not readable: assumed cardinal)
      const s4 = Math.max(GUN.fourwayMinSpeed, sp);
      emit(kind, ds, dx, dy, s4, ms, mx, my, bonus);
      for (let q = 1; q < 4; q++) { const [rs, rx] = rot(F.s, F.x, q * Math.PI / 2); emit(kind, rs, rx, 0, s4, b.s + rs * 0.7, b.x + rx * 0.7, my, bonus); }
    } else emit(kind, ds, dx, dy, sp, ms, mx, my, bonus);
    if (kind === 'super' && !b.grounded) { b.vs -= F.s * GUN.superRecoil; b.vx -= F.x * GUN.superRecoil; }
    w.shots++; w.lastKind = kind; events.emit('shoot', kind);
    return kind;
  };

  const lasso = (b) => {
    const lx = b.s - F.s * px(15), lz = b.x - F.x * px(15), ly = b.y + b.h + 0.4 + Math.sin(w.time * 6) * 0.1 + (run.upgrades.vehicle ? LASSO.vehicleLift : 0);
    let best = null, bd = LASSO.range; const list = ctx.enemies.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (e.hp <= 0) continue;
      const d = Math.hypot(e.s - lx, e.x - lz, e.y + e.h / 2 - ly); if (d < bd) { bd = d; best = e; }
    }
    if (!best) return;
    const ts = best.s - lx, tx = best.x - lz, ty = best.y + best.h / 2 - ly, l = Math.hypot(ts, tx, ty) || 1, sp = PROJ.lasso.speed;
    ctx.projectiles.fire('lasso', lx, lz, ly, (ts / l) * sp, (tx / l) * sp, (ty / l) * sp, run.upgrades.size * 2, best);
    w.lassoCd = LASSO.cooldown;
  };

  w.update = (dt, input) => {
    const pl = ctx.player, b = pl.body; w.time += dt;
    const il = Math.hypot(pl.intentS || 0, pl.intentX || 0);
    if (il > 0.2) { F.s = pl.intentS / il; F.x = pl.intentX / il; }
    for (const k of TIMED) if (T[k] > 0) T[k] = Math.max(0, T[k] - dt);

    const sup = T.super > 0, rate = sup ? GUN.rate.super : run.upgrades.laser ? GUN.rate.laser : GUN.rate.normal;
    if (input.spray && w.cd <= EPS && !w.overheated) {
      w.shoot(); w.cd = rate;
      w.heat += sup ? GUN.heatShot.super : GUN.heatShot.normal;
      if (w.heat >= GUN.maxHeat) { w.heat = GUN.maxHeat; w.overheated = true; events.emit('overheat'); ctx.hud?.toast('OVERHEAT', 0xff5a3a); ctx.rig?.addTrauma(0.15); }
    } else {
      w.heat -= (w.overheated ? GUN.coolOverheated : GUN.coolPerSec) * dt;
      if (w.heat <= 0) { w.heat = 0; w.overheated = false; }
    }
    if (w.cd > 0) w.cd -= dt;

    if (input.bombPressed && w.bombCd <= 0 && run.bombs > 0) { run.bombs--; w.bombCd = BOMB.cooldown; ctx.combat.bomb(); }
    if (w.bombCd > 0) w.bombCd -= dt;

    if (run.upgrades.lasso) { w.lassoCd -= dt; if (w.lassoCd <= 0) lasso(b); }
  };

  w.render = () => {
    const kind = w.kind(); gm.color.setHex(GUN_COLOR[kind]);
    if (w.overheated) { gm.emissive.setHex(0xff2000); gm.emissiveIntensity = 0.6 + 0.4 * Math.sin(w.time * 25); gm.color.setHex(0x992211); }
    else { const h = w.heat / 100; gm.emissive.setRGB(0.3 * h + (kind === 'normal' ? 0 : 0.6), 0.1 * (1 - h) * (kind === 'normal' ? 0 : 1), 0.1 * (1 - h) * (kind === 'normal' ? 0 : 1)); gm.emissiveIntensity = 0.4 + 1.2 * h; }   // glows toward red as it heats
    glow.color.setHex(PROJ[kind].color); glow.emissive.setHex(PROJ[kind].color);
    bubble.visible = w.shield; if (w.shield) bubble.material.opacity = 0.2 + 0.08 * Math.sin(w.time * 5);
  };
  return w;
}
