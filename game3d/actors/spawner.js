import { run } from '../core/state.js';
import { ENEMY_TYPES, ENEMIES } from '../data/enemies.js';

// Turns the generator's slots into actors as the player approaches, and adds ambushes on a timer.
// Original pacing (7125-7195): interval = max(30, 120 - diff) frames, diff = min(60, localScore/80) + 3*(stage-1) + 10*(loop-1);
// 30% of ground spawns came from the left. Roster by act replaces the original score thresholds (PLAN 1.1).
// ctx = { player, track, layout, stageData, enemies, pickups, obstacles, level }.
const WINDOW = 70, AMBUSH_SCALE = 4, AMBUSH_CAP = 12, STATIC_SHARE = 0.35;
const NO_AMBUSH = new Set(['checkpoint', 'bossGate', 'rest']);

export function createSpawner(ctx) {
  const slots = ctx.layout.slots.filter((s) => s.kind !== 'door').sort((a, b) => a.s - b.s);
  const api = { next: 0, enabled: true, ambushes: 0, slotSpawns: 0, timer: 3 };
  const P = () => ctx.player.body;

  const hash = (id) => ((id * 2654435761) >>> 0) / 4294967296;
  const spawnSlot = (sl) => {
    const seg = ctx.track.segmentAt(sl.s);
    if (sl.kind === 'enemy') {
      if (!api.enabled) return;
      const def = ENEMIES[sl.type]; if (!def) return;
      const y = sl.air ? sl.y - 3 : sl.y; // generator lifts air slots 3 m; flyers add their own hover height
      const o = { tier: sl.tier, slot: sl.id };
      if (def.climb) o.edgeX = (sl.x >= 0 ? 1 : -1) * (seg.width / 2 - 0.6);
      ctx.enemies.spawn(sl.type, sl.s, sl.x, y, o);
    } else if (sl.kind === 'pickup') {
      if (sl.role === 'coin') ctx.pickups.spawnCoin(sl.s, sl.x, sl.y, { fixed: true });
      else ctx.pickups.spawnCrate(sl.s, sl.x, sl.y - 0.8, sl.item || 'crate');
    } else if (sl.kind === 'obstacle') {
      ctx.obstacles.spawn(sl.type, sl.s, sl.x, sl.y, hash(sl.id) >= STATIC_SHARE, sl.id);
    }
    api.slotSpawns++;
  };

  const rosterFor = (act) => ctx.stageData.roster.slice(0, act).flat();
  const interval = () => {
    const diff = Math.min(60, (run.score - run.stageStartScore) / 80) + (run.stage - 1) * 3 + (run.stageLoop - 1) * 10;
    return (Math.max(30, 120 - diff) / 60) * AMBUSH_SCALE;
  };

  // Side / air ambush near the player. Returns the enemy or null if no sensible spot was found.
  api.ambush = (type) => {
    const b = P(), seg = ctx.track.segmentAt(b.s);
    type = type || ctx.rng.pick(rosterFor(seg.act)); const def = ENEMIES[type];
    const half = seg.width / 2;
    if (def.arch === 'flyer' || def.arch === 'floater') {
      return ctx.enemies.spawn(type, b.s + 30, b.x + ctx.rng.range(-3, 3), b.y, { active: true, tier: seg.act });
    }
    const behind = !def.climb && ctx.rng.chance(0.3), s = behind ? b.s - 14 : b.s + 20 + ctx.rng.range(0, 6);
    const side = ctx.rng.sign(), x = side * (half - 0.8);
    if (ctx.enemies.groundAt(s, x, b.y + 1) === -Infinity) return null;
    const y = ctx.enemies.groundAt(s, x, b.y + 1);
    return ctx.enemies.spawn(type, s, x, y, { active: true, tier: seg.act, edgeX: def.climb ? side * (half - 0.6) : undefined });
  };

  api.update = (dt) => {
    const b = P();
    while (api.next < slots.length && slots[api.next].s < b.s + WINDOW) spawnSlot(slots[api.next++]);
    if (!api.enabled || ctx.level.finished) return;
    api.timer -= dt;
    if (api.timer > 0) return;
    api.timer = interval();
    const seg = ctx.track.segmentAt(b.s);
    if (NO_AMBUSH.has(seg.name) || ctx.enemies.count >= AMBUSH_CAP) return;
    if (api.ambush()) api.ambushes++;
  };

  // Debug: n enemies spread over all archetypes, 4-30 m ahead of the player.
  api.spawnDebug = (n) => {
    const b = P(); let made = 0;
    for (let i = 0; i < n; i++) {
      const type = ENEMY_TYPES[(i * 7 + api.slotSpawns) % ENEMY_TYPES.length], def = ENEMIES[type];
      const e = ctx.enemies.spawn(type, b.s + 4 + Math.random() * 26, b.x + (Math.random() - 0.5) * 6, b.y, { active: true, edgeX: def.climb ? 2 : undefined });
      if (e) made++;
    }
    return made;
  };
  api.reset = () => { api.next = 0; api.timer = 3; api.ambushes = 0; api.slotSpawns = 0; };
  return api;
}
