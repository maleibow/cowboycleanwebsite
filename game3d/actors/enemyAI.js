import { ARCH } from '../data/enemies.js';
import { pxs } from '../data/weapons.js';
import { events } from '../core/events.js';

// The six archetype behaviours (PLAN 7), in track space. Each `think` moves one enemy for one step.
// Quirks from the type's data (`fire`, `weave`, `dive`, `climb`, `erratic`, `hop`) layer on top.
const G_HOP = 26, G_FALL = 30, DROP_SPEED = pxs(6); // enemy bombs fall at 6 px/frame in the original
const _q = [];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a); // cosmetic randomness: ambush timing is seeded elsewhere
export const rndRange = rnd;

// Highest walkable top at (s,x) that an enemy standing at fromY can step to; -Infinity = pit / nothing.
export function groundAt(track, s, x, fromY, step = 1.0) {
  const bx = track.query(s - 0.05, s + 0.05, _q); let top = -Infinity;
  for (let i = 0; i < bx.length; i++) {
    const o = bx[i];
    if (o.kind === 'barrier' || o.kind === 'wall' || o.kind === 'obstacle') continue;
    if (o.s1 > s - 0.05 && o.s0 < s + 0.05 && o.x1 > x - 0.05 && o.x0 < x + 0.05 && o.y1 <= fromY + step && o.y1 > top) top = o.y1;
  }
  return top;
}

// Gravity + ground snapping. Walks up small ledges, falls off pits, flags e.grounded.
function settle(e, track, dt) {
  const g = groundAt(track, e.s, e.x, e.y);
  if (g === -Infinity || e.y > g + 0.03) {
    e.vy -= G_FALL * dt; e.y += e.vy * dt; e.grounded = false;
    if (g !== -Infinity && e.y <= g) { e.y = g; e.vy = 0; e.grounded = true; }
  } else { e.y = g; e.vy = 0; e.grounded = true; }
}

// Ground move that refuses to step into a pit (so walkers queue at the edge instead of suiciding).
function groundMove(e, track, dt, vs, vx) {
  const ns = e.s + vs * dt, nx = e.x + vx * dt;
  if (e.grounded && groundAt(track, ns, nx, e.y) === -Infinity) { e.blocked = true; return; }
  e.blocked = false; e.s = ns; e.x = nx;
}

function walker(e, c, dt, heavy) {
  const P = c.P, v = e.speed * c.speedMul, ds = P.s - e.s, dx = P.x - e.x, A = ARCH[e.arch];
  if (heavy) { if (e.lane === null) e.lane = P.x; }
  const lat = heavy ? clamp((e.lane - e.x) * 2, -v, v) : clamp(dx * A.lateral, -v * 0.7, v * 0.7);
  const weave = e.def.weave ? Math.sin(e.t * 3 + e.phase) * e.def.weave * v : 0;
  groundMove(e, c.track, dt, Math.abs(ds) > 0.5 ? Math.sign(ds) * v : 0, lat + weave);
  settle(e, c.track, dt);
}

function crawler(e, c, dt) {
  if (e.state === 'climb') { // spider: climbs in from below the track edge, then crawls
    e.y += 3.2 * dt;
    const g = groundAt(c.track, e.s, e.edgeX, e.y + 3);
    if (g !== -Infinity && e.y >= g) { e.y = g; e.state = 'walk'; e.x = e.edgeX; e.grounded = true; }
    return;
  }
  walker(e, c, dt, false);
}

function hopper(e, c, dt) {
  const P = c.P, v = e.speed * c.speedMul;
  if (e.grounded) {
    e.t2 -= dt;
    if (e.t2 <= 0) {
      const T = (2 * e.def.hop) / G_HOP;
      e.vs = clamp((P.s - e.s) / T, -v * 1.8, v * 1.8); e.vx = clamp((P.x - e.x) / T, -v * 1.8, v * 1.8); e.vy = e.def.hop; e.grounded = false;
      if (Math.hypot(P.s - e.s, P.x - e.x) < 26) events.emit('enemyHop', e.type);
    } else { e.vs = 0; e.vx = 0; settle(e, c.track, dt); }
    return;
  }
  e.vy -= G_HOP * dt; e.s += e.vs * dt; e.x += e.vx * dt; e.y += e.vy * dt;
  if (e.vy <= 0) {
    const g = groundAt(c.track, e.s, e.x, e.y + 0.3);
    if (g !== -Infinity && e.y <= g) { e.y = g; e.vy = 0; e.vs = 0; e.vx = 0; e.grounded = true; e.t2 = rnd(e.def.rest[0], e.def.rest[1]); }
  }
}

function flyer(e, c, dt) {
  const P = c.P, v = e.speed * c.speedMul, A = ARCH.flyer, d = e.def;
  const bob = Math.sin(e.t * (d.erratic ? 5 : 2.2) + e.phase) * (d.erratic ? 0.8 : 0.35);
  const hoverY = P.y + e.alt + bob;
  if (e.state === 'dive') {
    const ds = e.aimS - e.s, dx = e.aimX - e.x, dy = e.aimY - e.y, l = Math.hypot(ds, dx, dy) || 1, sp = v * A.diveSpeed;
    e.s += (ds / l) * sp * dt; e.x += (dx / l) * sp * dt; e.y += (dy / l) * sp * dt; e.diveT -= dt;
    if (l < 0.9 || e.diveT <= 0) { e.state = 'recover'; e.t2 = rnd(A.diveEvery[0], A.diveEvery[1]); }
    return;
  }
  const tS = P.s + A.standoff + (e.state === 'recover' ? 4 : 0), tX = P.x + Math.sin(e.t * 1.3 + e.phase) * 3.2;
  const ds = tS - e.s, dx = tX - e.x;
  e.s += clamp(ds, -v, v) * Math.min(1, Math.abs(ds) * 0.5) * dt; e.x += clamp(dx, -v, v) * Math.min(1, Math.abs(dx) * 0.5) * dt;
  e.y += clamp(hoverY - e.y, -6, 6) * Math.min(1, dt * 4);
  if (e.state === 'recover' && Math.abs(hoverY - e.y) < 0.4) e.state = 'approach';
  e.t2 -= dt;
  if (d.dive && e.state === 'approach' && e.t2 <= 0 && Math.abs(P.s - e.s) < 16) {
    e.state = 'dive'; e.diveT = 1.8; e.aimS = P.s; e.aimX = P.x; e.aimY = P.y + 0.9; events.emit('enemyDive', e.type);
  }
}

function floater(e, c, dt) {
  const P = c.P, v = e.speed * c.speedMul * 0.8, A = ARCH.floater;
  const bob = Math.sin(e.t * 1.6 + e.phase) * 0.4;
  const tS = P.s + A.standoff, tX = P.x + Math.sin(e.t * 0.9 + e.phase) * 2.4, ds = tS - e.s, dx = tX - e.x;
  e.s += clamp(ds, -v, v) * Math.min(1, Math.abs(ds) * 0.5) * dt; e.x += clamp(dx, -v, v) * Math.min(1, Math.abs(dx)) * dt;
  e.y += clamp(P.y + e.alt + bob - e.y, -3, 3) * Math.min(1, dt * 3);
}

const THINK = { boss: (e, c, dt) => e.ctrl.update(e, c, dt), walker: (e, c, dt) => walker(e, c, dt, false), heavy: (e, c, dt) => walker(e, c, dt, true), crawler, hopper, flyer, floater };

// Enemy shots: aimed at the player, or dropped straight down when the player is under the shooter.
function shoot(e, c, dt) {
  const f = e.def.fire, P = c.P; if (!f) return;
  e.fireCd -= dt; if (e.fireCd > 0) return;
  const ds = P.s - e.s, dx = P.x - e.x;
  if (e.s < P.s - 1.5 || Math.abs(ds) > 26) { e.fireCd = 0.3; return; }
  if (f.mode === 'drop') {
    if (Math.abs(ds) > 7 || Math.abs(dx) > 3) { e.fireCd = 0.2; return; }
    c.projectiles.fireEnemy(f.style, e.s, e.x, e.y + e.h * 0.4, 0, 0, -DROP_SPEED);
  } else {
    const dy = P.y + 1 - (e.y + e.h * 0.5), l = Math.hypot(ds, dx, dy) || 1;
    c.projectiles.fireEnemy(f.style, e.s, e.x, e.y + e.h * 0.5, (ds / l) * f.speed, (dx / l) * f.speed, (dy / l) * f.speed, f.style === 'homing');
  }
  e.fireCd = rnd(f.every[0], f.every[1]);
}

// One step for one enemy. c = { P (player body), track, projectiles, speedMul }.
export function think(e, c, dt) {
  e.t += dt;
  if (!e.active) {
    const d = Math.hypot(c.P.s - e.s, c.P.x - e.x);
    if (d < ARCH[e.arch].aggro) { e.active = true; e.lane = null; } else {
      if (e.arch === 'walker' || e.arch === 'heavy' || e.arch === 'crawler') settle(e, c.track, dt);
      else if (e.arch !== 'hopper') e.y += Math.sin(e.t * 2 + e.phase) * 0.2 * dt; // idle bob
      else settle(e, c.track, dt);
      return;
    }
  }
  THINK[e.arch](e, c, dt);
  if (e.def.fire && e.state !== 'climb' && !e.ctrl) shoot(e, c, dt);
}
