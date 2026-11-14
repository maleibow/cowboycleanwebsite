import * as THREE from 'three';
import { PROJ, DRAG_PER_SEC, RANGE_MUL, HIT, fr, pxs, pxa } from '../data/weapons.js';
import { createBatch } from './instanced.js';

// Pooled projectiles in track space (s, x, y). Player shots (every powerup variant) and enemy shots.
// ctx = { track, scene, enemies, pickups, combat, fx, player } -- wired by the level after construction.
const PCAP = 320, ECAP = 96, HOMING_SEEK = PROJ.homing.seekRange;
const ENEMY_STYLE = { // colours + stretch; speeds come from the shooter
  bomb: { color: 0x8d6e63, r: 0.2, stretch: 1 }, acid: { color: 0x58e07a, r: 0.18, stretch: 1.3 },
  lightning: { color: 0xffe14a, r: 0.14, stretch: 3 }, laser: { color: 0xff4a3d, r: 0.12, stretch: 3 },
  ruby_laser: { color: 0xdc143c, r: 0.12, stretch: 3 }, homing: { color: 0xeef2f4, r: 0.2, stretch: 1 },
};
const ENEMY_LIFE = fr(150), ENEMY_HOMING_ACCEL = pxa(0.15), ENEMY_HOMING_MAX = pxs(4);

// Rotates velocity (vs,vx,vy) toward direction (ds,dx,dy) by at most `turn*dt` radians, then sets speed.
function steer(p, ds, dx, dy, turn, dt, speed) {
  const dl = Math.hypot(ds, dx, dy) || 1, cl = Math.hypot(p.vs, p.vx, p.vy) || 1;
  const a = ds / dl, b = dx / dl, c = dy / dl, u = p.vs / cl, v = p.vx / cl, w = p.vy / cl;
  const ang = Math.acos(Math.min(1, Math.max(-1, a * u + b * v + c * w)));
  const k = ang < 1e-4 ? 1 : Math.min(1, (turn * dt) / ang);
  let nu = u + (a - u) * k, nv = v + (b - v) * k, nw = w + (c - w) * k;
  const nl = Math.hypot(nu, nv, nw) || 1; nu /= nl; nv /= nl; nw /= nl;
  p.vs = nu * speed; p.vx = nv * speed; p.vy = nw * speed;
}

export function createProjectiles(ctx, scene, track) {
  const mk = () => ({ on: false, kind: 'normal', s: 0, x: 0, y: 0, vs: 0, vx: 0, vy: 0, life: 0, hit: 0.2, dmg: 1, pierce: false, target: null, ang: 0, spd: 0, size: 5, exploded: false });
  const P = Array.from({ length: PCAP }, mk);
  const E = Array.from({ length: ECAP }, () => ({ on: false, style: 'bomb', s: 0, x: 0, y: 0, vs: 0, vx: 0, vy: 0, life: 0, homing: false }));
  const geo = new THREE.SphereGeometry(1, 6, 4), mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pb = createBatch(scene, track, geo, mat, PCAP), eb = createBatch(scene, track, geo, mat, ECAP);
  let cursorP = 0, cursorE = 0;
  const api = { player: P, enemy: E, shots: 0 };

  const take = (arr, cur, n) => { // free slot, scanning from the cursor
    for (let i = 0; i < n; i++) { const k = (cur + i) % n; if (!arr[k].on) return k; }
    return -1;
  };

  // Spawns a player projectile. kind is a PROJ key. Returns it (or null when the pool is full).
  api.fire = (kind, s, x, y, vs, vx, vy, sizeBonus = 0, target = null) => {
    const k = take(P, cursorP, PCAP); if (k < 0) return null; cursorP = k + 1;
    const d = PROJ[kind], p = P[k];
    p.on = true; p.kind = kind; p.s = s; p.x = x; p.y = y; p.vs = vs; p.vx = vx; p.vy = vy;
    p.life = d.life * (d.drag === false && kind !== 'lasso' ? 1 : RANGE_MUL); // piercing/ballistic types keep their longer base life
    p.size = d.size + sizeBonus; p.hit = (p.size * 2) / 46.67; p.dmg = d.dmg; p.pierce = d.pierce;
    p.target = target; p.exploded = false; p.spd = Math.hypot(vs, vx, vy); p.ang = Math.atan2(vx, vs);
    api.shots++;
    return p;
  };
  api.fireEnemy = (style, s, x, y, vs, vx, vy, homing = false) => {
    const k = take(E, cursorE, ECAP); if (k < 0) return null; cursorE = k + 1;
    const p = E[k]; p.on = true; p.style = style; p.s = s; p.x = x; p.y = y; p.vs = vs; p.vx = vx; p.vy = vy; p.life = ENEMY_LIFE; p.homing = homing;
    return p;
  };

  // Grenade burst: 8 shards in a ring around the blast (original: 8 normal shots at 10 px/frame, size >= 3).
  api.explode = (p) => {
    if (p.exploded) return; p.exploded = true; p.life = 0; p.on = false;
    const d = PROJ.grenade;
    ctx.fx.burst(p.s, p.x, p.y, 0xff7a3a, 14, 5, 0.18);
    ctx.combat?.shake(0.25);
    for (let i = 0; i < d.shards; i++) {
      const a = (i / d.shards) * Math.PI * 2, sh = api.fire('normal', p.s, p.x, p.y, Math.cos(a) * d.shardSpeed, Math.sin(a) * d.shardSpeed, 1.5);
      if (sh) { sh.size = Math.max(d.shardMinSize, p.size / 2); sh.hit = (sh.size * 2) / 46.67; }
    }
  };

  const nearestEnemy = (p, range) => {
    let best = null, bd = range * range; const list = ctx.enemies.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i]; if (e.invulnerable) continue;
      const ds = e.s - p.s, dx = e.x - p.x, dy = e.y + e.h * 0.5 - p.y, d = ds * ds + dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  };

  function updatePlayerShot(p, dt) {
    const d = PROJ[p.kind];
    if (p.kind === 'lasso') {
      const t = p.target;
      p.spd = Math.min(p.spd + d.accel * dt, d.maxSpeed);
      if (t && t.hp > 0) steer(p, t.s - p.s, t.x - p.x, t.y + t.h * 0.5 - p.y, d.turn, dt, p.spd);
      else { const l = Math.hypot(p.vs, p.vx, p.vy) || 1; p.vs *= p.spd / l; p.vx *= p.spd / l; p.vy *= p.spd / l; }
    } else if (p.kind === 'homing') {
      const t = nearestEnemy(p, HOMING_SEEK);
      p.spd = Math.min(p.spd + d.accel * dt, d.maxSpeed);
      if (t) steer(p, t.s - p.s, t.x - p.x, t.y + t.h * 0.5 - p.y, d.turn, dt, p.spd);
    } else if (p.kind === 'grenade') {
      p.vy -= d.gravity * dt;
    } else if (p.kind === 'spin') {
      p.ang += d.angRate * dt; p.spd += d.speedGain * dt;
      p.vs = Math.cos(p.ang) * p.spd; p.vx = Math.sin(p.ang) * p.spd;
    }
    p.s += p.vs * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (d.drag) { const k = Math.pow(DRAG_PER_SEC, dt); p.vs *= k; p.vx *= k; p.vy *= k; p.spd *= k; }
    if (p.kind === 'grenade') {
      const g = track.heightUnder(p.s, p.x, 0.05);
      if (p.life <= 0 || (g !== -Infinity && p.y <= g)) { api.explode(p); return; }
    }
    if (p.life <= 0 || p.y < -12) { p.on = false; return; }

    // vs crates, then vs enemies (AABB in track space, box grown by the shot's hit size)
    if (ctx.pickups.hitCrates(p) && !p.pierce) { if (p.kind === 'grenade') api.explode(p); else p.on = false; return; }
    const list = ctx.enemies.list;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (Math.abs(p.s - e.s) > e.hs + p.hit || Math.abs(p.x - e.x) > e.hx + p.hit || p.y < e.y - p.hit || p.y > e.y + e.h + p.hit) continue;
      if (e.invulnerable) { ctx.fx.burst(p.s, p.x, p.y, 0x95a5a6, 2, 2, 0.06); if (!p.pierce) { p.on = false; return; } continue; }
      if (p.kind === 'grenade') api.explode(p);
      ctx.combat.hitEnemy(e, p.dmg, p.s, p.x, p.y);
      if (!p.pierce) { p.on = false; return; }
    }
  }

  function updateEnemyShot(p, dt) {
    if (p.homing) {
      const b = ctx.player.body;
      const ds = b.s - p.s, dx = b.x - p.x, dy = b.y + 1 - p.y, l = Math.hypot(ds, dx, dy) || 1;
      p.vs += (ds / l) * ENEMY_HOMING_ACCEL * dt; p.vx += (dx / l) * ENEMY_HOMING_ACCEL * dt; p.vy += (dy / l) * ENEMY_HOMING_ACCEL * dt;
      const sp = Math.hypot(p.vs, p.vx, p.vy); if (sp > ENEMY_HOMING_MAX) { const k = ENEMY_HOMING_MAX / sp; p.vs *= k; p.vx *= k; p.vy *= k; }
    }
    p.s += p.vs * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (p.life <= 0 || p.y < -12) { p.on = false; return; }
    const g = track.heightUnder(p.s, p.x, 0.05);
    if (g !== -Infinity && p.y < g && p.vy < 0) { ctx.fx.burst(p.s, p.x, g, ENEMY_STYLE[p.style].color, 3, 2, 0.08); p.on = false; }
  }

  api.update = (dt) => {
    for (let i = 0; i < PCAP; i++) if (P[i].on) updatePlayerShot(P[i], dt);
    for (let i = 0; i < ECAP; i++) if (E[i].on) updateEnemyShot(E[i], dt);
  };

  // Enemy shots touching the player: returns the number that hit. `hit(p)` is called for each.
  api.testPlayer = (b, h, onHit) => {
    const R = HIT.projRadius;
    for (let i = 0; i < ECAP; i++) {
      const p = E[i]; if (!p.on) continue;
      if (Math.abs(p.s - b.s) < b.hs - 0.05 + R && Math.abs(p.x - b.x) < b.hx - 0.05 + R && p.y > b.y + 0.15 - R && p.y < b.y + h - 0.1 + R) { p.on = false; onHit(p); }
    }
  };

  // Bomb: remove enemy shots near (s,x). `all` clears everything.
  api.clearEnemyShots = (s, x, r) => {
    let n = 0;
    for (let i = 0; i < ECAP; i++) { const p = E[i]; if (p.on && Math.hypot(p.s - s, p.x - x) <= r) { p.on = false; n++; ctx.fx.burst(p.s, p.x, p.y, 0xffffff, 3, 3, 0.1); } }
    return n;
  };
  api.clear = () => { for (const p of P) p.on = false; for (const p of E) p.on = false; };
  api.count = () => { let n = 0; for (const p of P) if (p.on) n++; return n; };
  api.countEnemy = () => { let n = 0; for (const p of E) if (p.on) n++; return n; };

  api.render = () => {
    pb.begin();
    for (let i = 0; i < PCAP; i++) {
      const p = P[i]; if (!p.on) continue; const d = PROJ[p.kind], r = p.hit * 0.8;
      pb.putDir(p.s, p.x, p.y, p.vs, p.vx, p.vy, r, d.stretch, d.color);
    }
    pb.end();
    eb.begin();
    for (let i = 0; i < ECAP; i++) { const p = E[i]; if (!p.on) continue; const st = ENEMY_STYLE[p.style]; eb.putDir(p.s, p.x, p.y, p.vs, p.vx, p.vy, st.r, st.stretch, st.color); }
    eb.end();
  };
  return api;
}
