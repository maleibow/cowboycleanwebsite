import { run } from '../core/state.js';
import { events } from '../core/events.js';
import { HIT, BOMB, DROPS, COMBO } from '../data/weapons.js';

// Rules that tie the actors together: damage in both directions, kills (score, coins, drops, combo),
// the bomb, shield / vehicle / invulnerability handling. Values from cleaningup.html 7226-7510 and 3290-3333.
// ctx = { player, enemies, projectiles, pickups, weapon, fx, hud, rig }.
export function createCombat(ctx) {
  const combo = { n: 0, t: 0, best: 0 };
  const api = { combo, kills: 0, hurtCount: 0 };

  api.shake = (a) => ctx.rig?.addTrauma(a);

  // Enemy contact / projectile hit on the player.
  api.damagePlayer = (dmg) => {
    const pl = ctx.player, b = pl.body;
    if (pl.invuln > 0 || run.cheats.god || pl.dead) return false;
    if (!run.upgrades.vehicle && ctx.weapon.shield) { // shield eats one hit
      ctx.weapon.shield = false; pl.invuln = HIT.invuln;
      ctx.fx.burst(b.s, b.x, b.y + 0.9, 0x3498db, 20, 5, 0.14); api.shake(0.2); events.emit('shieldHit');
      return true;
    }
    pl.hurt(dmg, HIT.invuln); api.hurtCount++;
    if (!pl.dead) { b.vy = HIT.vehicleBounce; b.grounded = false; pl.jumping = false; } // original: knock up at 8 px/frame
    ctx.fx.burst(b.s, b.x, b.y + 0.9, 0xe74c3c, 10, 4, 0.12);
    api.shake(HIT.shake);
    combo.n = 0; combo.t = 0;
    return true;
  };

  api.killEnemy = (e) => {
    const def = e.def, pts = def.pts, boss = e.type.startsWith('boss');
    run.score += pts; api.kills++;
    combo.n++; combo.t = COMBO.window; combo.best = Math.max(combo.best, combo.n);
    ctx.hud?.floatTrack(e.s, e.x, e.y + e.h + 0.5, '+' + pts, '#f1c40f');
    ctx.fx.burst(e.s, e.x, e.y + e.h * 0.5, 0xffffff, 8, 4, 0.14);
    ctx.fx.burst(e.s, e.x, e.y + e.h * 0.5, def.color, 10, 5, 0.2, true); // soap-bubble burst: grime is cleaned
    ctx.pickups.dropCoins(e.s, e.x, e.y + e.h * 0.4, boss ? DROPS.bossCoins : DROPS.coinsPerKill(pts));
    if (Math.random() > 1 - DROPS.powerupChance || boss) ctx.pickups.spawnPowerup(ctx.pickups.randomPowerup(), e.s, e.x, e.y + e.h * 0.5, { drop: true });
    api.shake(boss ? 0.6 : 0.12);
    ctx.enemies.remove(e);
    events.emit('enemyKilled', e);
  };

  api.hitEnemy = (e, dmg, s, x, y) => {
    e.hp -= dmg; e.hitT = 3 / 60; e.active = true;
    ctx.fx.burst(s, x, y, 0xffffff, 3, 3, 0.07);
    ctx.hud?.floatTrack(s, x, y + 0.3, String(Math.round(dmg * 10) / 10), '#ffffff', 0.7);
    if (e.hp <= 0) api.killEnemy(e);
  };

  // Bomb: kills every normal enemy in range, 20 damage to bosses, clears enemy shots and smashes crates.
  api.bomb = () => {
    const b = ctx.player.body, R = BOMB.radius, list = ctx.enemies.list;
    api.shake(BOMB.shake);
    ctx.fx.burst(b.s, b.x, b.y + 1, 0xf39c12, 30, 10, 0.3);
    for (let i = 0; i < 10; i++) ctx.fx.burst(b.s + (Math.random() - 0.3) * R, b.x + (Math.random() - 0.5) * 8, b.y + Math.random() * 4, 0xe74c3c, 4, 4, 0.25);
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i]; if (e.hp <= 0 || i >= list.length) continue;
      if (Math.hypot(e.s - b.s, e.x - b.x) > R) continue;
      if (e.type.startsWith('boss')) { e.hp -= BOMB.bossDamage; e.hitT = 5 / 60; if (e.hp <= 0) api.killEnemy(e); } else { e.hp = 0; api.killEnemy(e); }
    }
    ctx.projectiles.clearEnemyShots(b.s, b.x, R);
    ctx.pickups.breakNear(b.s, b.x, R);
    events.emit('bomb');
  };

  api.step = (dt) => {
    if (combo.t > 0) { combo.t -= dt; if (combo.t <= 0) combo.n = 0; }
    const pl = ctx.player, b = pl.body; if (pl.dead || pl.invuln > 0) return;
    const list = ctx.enemies.list;
    for (let i = 0; i < list.length; i++) { // contact: player rect inset like the original (15 px)
      const e = list[i];
      if (Math.abs(e.s - b.s) < e.hs + b.hs - 0.08 && Math.abs(e.x - b.x) < e.hx + b.hx - 0.08 && e.y < b.y + b.h - 0.15 && e.y + e.h > b.y + 0.12) {
        api.damagePlayer(HIT.contact); break;
      }
    }
    if (pl.invuln > 0) return;
    ctx.projectiles.testPlayer(b, b.h, (p) => { api.damagePlayer(HIT.projectile); ctx.fx.burst(p.s, p.x, p.y, 0x8d6e63, 6, 3, 0.1); });
  };

  api.reset = () => { combo.n = 0; combo.t = 0; combo.best = 0; api.kills = 0; api.hurtCount = 0; };
  return api;
}
