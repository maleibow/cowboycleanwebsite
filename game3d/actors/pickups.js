import * as THREE from 'three';
import { run } from '../core/state.js';
import { events } from '../core/events.js';
import { POWERUPS, POWERUP_LIST, DROPS } from '../data/weapons.js';
import { createBatch, shapes } from './instanced.js';
import { groundAt } from './enemyAI.js';
import { coinGeo, crateGeo, coinMaterial, pickupMaterial } from './propModels.js';
import { powerShapes } from './pickupShapes.js';
import { settings } from '../core/settings.js';

// Coins (magnet to the player), the nine powerups, and breakable soap crates that hold coins or a powerup.
// Original: coin pickup +5, powerup drop 15%/kill, dropped powerups hop and last 400 frames (3041-3108, 7435-7490).
// Crates are new (PLAN 1.1). ctx = { player, weapon, combat, hud, fx, enemies }.
const MAGNET = 3.2, MAGNET_MIN = 6, MAGNET_MAX = 20, COIN_LIFE = 20, G = 30;
const rnd = (a, b) => a + Math.random() * (b - a);

export function createPickups(ctx, scene, track) {
  const coins = Array.from({ length: 256 }, () => ({ on: false, s: 0, x: 0, y: 0, vs: 0, vx: 0, vy: 0, ph: 0, t: 0, fixed: false, pull: 0, rest: false }));
  const pows = Array.from({ length: 48 }, () => ({ on: false, type: 'health', s: 0, x: 0, y: 0, vs: 0, vx: 0, vy: 0, t: 0, drop: false, ph: 0 }));
  const crates = Array.from({ length: 48 }, () => ({ on: false, s: 0, x: 0, y: 0, hitT: 0, loot: '', coinsN: 0 }));
  const pg = new THREE.SphereGeometry(0.5, 14, 10), basic = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cb = createBatch(scene, track, coinGeo(), coinMaterial(), 256), pb = createBatch(scene, track, pg, basic, 96), xb = createBatch(scene, track, crateGeo(), pickupMaterial(), 48);
  const shapeGeo = powerShapes(), sb = {}; for (const t of POWERUP_LIST) sb[t] = createBatch(scene, track, shapeGeo[t], basic, 16);   // one silhouette batch per power-up type
  const api = { coins, powerups: pows, crates };
  let time = 0, coinAcc = 0, coinTimer = 0;
  const P = () => ctx.player.body;

  api.spawnCoin = (s, x, y, o = {}) => {
    const c = coins.find((q) => !q.on); if (!c) return null;
    c.on = true; c.s = s; c.x = x; c.y = y; c.vs = o.vs || 0; c.vx = o.vx || 0; c.vy = o.vy || 0; c.fixed = !!o.fixed; c.t = COIN_LIFE; c.ph = Math.random() * 6.28; c.pull = 0; c.rest = false;
    return c;
  };
  api.dropCoins = (s, x, y, n) => { for (let i = 0; i < n; i++) api.spawnCoin(s, x, y + 0.5, { vs: rnd(-2.5, 2.5), vx: rnd(-2.5, 2.5), vy: rnd(3.5, 7) }); };
  api.spawnPowerup = (type, s, x, y, o = {}) => {
    const p = pows.find((q) => !q.on); if (!p) return null;
    p.on = true; p.type = type; p.s = s; p.x = x; p.y = y; p.drop = !!o.drop; p.ph = Math.random() * 6.28;
    p.vs = o.drop ? 0 : 0; p.vx = o.drop ? rnd(-1.5, 1.5) * 1.3 : 0; p.vy = o.drop ? DROPS.dropHop : 0; // original vy -4, vx +-1.5 px/frame
    p.t = o.drop ? DROPS.dropLife : Infinity;
    return p;
  };
  api.randomPowerup = () => POWERUP_LIST[Math.floor(Math.random() * POWERUP_LIST.length)];
  // contents: a powerup type, 'crate' (random: coins or a powerup) or 'coins'
  api.spawnCrate = (s, x, y, contents = 'crate') => {
    const c = crates.find((q) => !q.on); if (!c) return null;
    c.on = true; c.s = s; c.x = x; c.y = y; c.hitT = 0;
    if (POWERUPS[contents]) { c.loot = contents; c.coinsN = 0; }
    else if (Math.random() < DROPS.crateLootPowerup) { c.loot = api.randomPowerup(); c.coinsN = 0; }
    else { c.loot = ''; c.coinsN = Math.round(rnd(DROPS.crateCoins[0], DROPS.crateCoins[1])); }
    return c;
  };
  api.breakCrate = (c) => {
    if (!c.on) return; c.on = false; events.emit('crateBreak', c);
    ctx.fx.burst(c.s, c.x, c.y + 0.5, 0xd6f6ff, 14, 4, 0.16, true);
    if (c.loot) api.spawnPowerup(c.loot, c.s, c.x, c.y + 0.7); else api.dropCoins(c.s, c.x, c.y, c.coinsN);
    ctx.combat.shake(0.12);
  };
  // Player shots: a hit breaks the crate and (non-piercing) the shot stops there.
  api.hitCrates = (p) => {
    for (let i = 0; i < crates.length; i++) {
      const c = crates[i]; if (!c.on) continue;
      if (Math.abs(p.s - c.s) < 0.5 + p.hit && Math.abs(p.x - c.x) < 0.5 + p.hit && p.y > c.y - p.hit && p.y < c.y + 1 + p.hit) { api.breakCrate(c); return true; }
    }
    return false;
  };
  api.breakNear = (s, x, r) => { for (const c of crates) if (c.on && Math.hypot(c.s - s, c.x - x) <= r) api.breakCrate(c); };

  api.update = (dt) => {
    time += dt; const b = P(), cy = b.y + b.h * 0.5;
    for (let i = 0; i < coins.length; i++) {
      const c = coins[i]; if (!c.on) continue;
      c.t -= dt; if (c.t <= 0 || c.s < b.s - 40) { c.on = false; continue; }
      const ds = b.s - c.s, dx = b.x - c.x, dy = cy - c.y, d = Math.hypot(ds, dx, dy);
      if (d < MAGNET) { // magnet: accelerate straight at the player
        c.pull = Math.min(MAGNET_MAX, Math.max(c.pull, MAGNET_MIN) + 30 * dt); c.fixed = false;
        c.vs = (ds / d) * c.pull; c.vx = (dx / d) * c.pull; c.vy = (dy / d) * c.pull; c.rest = false;
        c.s += c.vs * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      } else if (!c.fixed && !c.rest) {
        c.vy -= G * dt; c.s += c.vs * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        const g = groundAt(track, c.s, c.x, c.y + 0.5, 1);
        if (g !== -Infinity && c.y < g + 0.25 && c.vy < 0) { c.y = g + 0.25; c.vy = -c.vy * 0.4; c.vs *= 0.7; c.vx *= 0.7; if (Math.abs(c.vy) < 1) c.rest = true; }
        if (c.y < -10) c.on = false;
      }
      if (d < 0.75 + b.hs && c.y > b.y - 0.4 && c.y < b.y + b.h + 0.4) {
        c.on = false; run.coins += DROPS.coinValue; coinAcc += DROPS.coinValue; ctx.combat.onCoin?.(c); events.emit('coin');
      }
    }
    coinTimer -= dt;
    if (coinAcc > 0 && coinTimer <= 0) { ctx.hud?.floatTrack(b.s, b.x, b.y + b.h + 0.4, '+' + coinAcc, '#f1c40f'); coinAcc = 0; coinTimer = 0.35; }

    for (let i = 0; i < pows.length; i++) {
      const p = pows[i]; if (!p.on) continue;
      p.t -= dt; if (p.t <= 0 || p.s < b.s - 40) { p.on = false; continue; }
      if (p.drop || p.vy !== 0) { // dropped powerups hop (gravity x0.6 in the original) and bounce at half speed
        p.vy -= G * DROPS.dropGravityMul * dt; p.s += p.vs * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const g = groundAt(track, p.s, p.x, p.y + 0.5, 1);
        if (g !== -Infinity && p.y < g + 0.3 && p.vy < 0) { p.y = g + 0.3; p.vy = Math.abs(p.vy) > 1.2 ? -p.vy * 0.5 : 0; p.vx *= 0.8; }
        if (p.y < -10) p.on = false;
      }
      if (Math.abs(p.s - b.s) < 0.9 + b.hs && Math.abs(p.x - b.x) < 0.9 + b.hx && p.y > b.y - 0.5 && p.y < b.y + b.h + 0.4) {
        p.on = false; ctx.weapon.give(p.type); events.emit('powerup', p.type); ctx.hud?.floatTrack(p.s, p.x, p.y + 0.8, POWERUPS[p.type].label, '#2ecc71');
        ctx.fx.burst(p.s, p.x, p.y, POWERUPS[p.type].color, 10, 4, 0.12, true);
      }
    }

    for (let i = 0; i < crates.length; i++) {
      const c = crates[i]; if (!c.on) continue;
      c.hitT = Math.max(0, c.hitT - dt);
      if (c.s < b.s - 40) { c.on = false; continue; }
      if (Math.abs(c.s - b.s) < 0.45 + b.hs && Math.abs(c.x - b.x) < 0.45 + b.hx && b.y < c.y + 1 && b.y + b.h > c.y) api.breakCrate(c); // running into one smashes it
    }
  };

  api.render = () => {
    cb.begin();
    const V = cb.v; for (let i = 0; i < coins.length; i++) { const c = coins[i]; if (!c.on) continue; V[0] = c.s; V[1] = c.x; V[2] = c.y + Math.sin(time * 3 + c.ph) * (c.fixed ? 0.08 : 0); V[3] = V[4] = V[5] = 1; V[6] = time * 4 + c.ph; V[7] = 0; cb.putA(0xffffff); }   // typed-array arguments: no boxing, no garbage (actors/instanced.js)
    cb.end();
    const shaped = settings.shapes;
    pb.begin(); for (const t of POWERUP_LIST) sb[t].begin();
    for (const p of pows) if (p.on) {
      const blink = p.t < 1 && Math.floor(time * 10) % 2 === 0; if (blink) continue;
      const k = 0.55 + Math.sin(time * 5 + p.ph) * 0.06, col = POWERUPS[p.type].color, y = p.y + 0.2 + Math.sin(time * 3 + p.ph) * 0.12;
      if (shaped) { const q = k * 1.5; sb[p.type].put(p.s, p.x, y, q, q, q, col, time * 1.6 + p.ph); }
      else pb.put(p.s, p.x, y, k, k, k, col);
      pb.put(p.s, p.x, y, k, k * 0.12, k, 0xffffff, time * 2);
    }
    for (const c of crates) if (c.on && c.loot) { const y = c.y + 1.25 + Math.sin(time * 3 + c.s) * 0.08; if (shaped) sb[c.loot].put(c.s, c.x, y, 0.42, 0.42, 0.42, POWERUPS[c.loot].color, time * 1.6); else pb.put(c.s, c.x, y, 0.28, 0.28, 0.28, POWERUPS[c.loot].color); }   // what is inside
    pb.end(); for (const t of POWERUP_LIST) { sb[t].end(); sb[t].mesh.visible = sb[t].count > 0; }
    xb.begin();
    for (const c of crates) if (c.on) xb.put(c.s, c.x, c.y, 0.9 + c.hitT * 0.4, 0.9 - c.hitT * 0.3, 0.9 + c.hitT * 0.4, 0xffffff, 0.3 + Math.sin(c.hitT * 60) * 0.2 * c.hitT);
    xb.end();
  };
  api.clear = () => { for (const a of [coins, pows, crates]) for (const o of a) o.on = false; coinAcc = 0; };
  api.counts = () => ({ coins: coins.filter((c) => c.on).length, powerups: pows.filter((p) => p.on).length, crates: crates.filter((c) => c.on).length });
  return api;
}
