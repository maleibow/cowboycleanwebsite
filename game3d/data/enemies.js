// Enemy stats from the `Enemy` constructor (cleaningup.html 4272-4540), re-expressed per second in metres.
// Original: size in px (default 50x50), speed = 3 px/frame * a per-type multiplier, hp * stageLoop,
// altitude as a canvas y. Archetypes follow PLAN 7. The original behaviour block (4541+) was NOT part of
// the lines this port may read, so type quirks (`fire`, `weave`, `dive`, `climb`) are new design, sized
// to the stat block and the type names.
import { px, pxs, enemyPoints } from './weapons.js';

const BASE = pxs(3);          // 3 px/frame = 3.86 m/s, before the type multiplier
export const MAX_SPEED = 9.5; // 3D cap: nothing outruns a full-speed player

// e(archetype, hp, wPx, hPx, speedMult, extras). `alt` = hover height above the ground in metres (flyers/floaters),
// mapped from the original canvas-y ranges. `color` = grey-box tint (tier colour comes from the art prompt later).
const e = (arch, hp, w, h, mult, color, extra = {}) => ({
  arch, hp, w: px(w), h: px(h), speed: Math.min(MAX_SPEED, BASE * mult), color, ...extra, pts: undefined,
});
const fire = (style, mode, lo, hi, speed) => ({ style, mode, every: [lo, hi], speed: speed ?? 7 });

export const ENEMIES = {
  // ---- Walkers
  dirt:       e('walker', 2, 50, 50, 1.2, 0x8a5a2b),                                   // orig vx*1.2
  slime:      e('walker', 3, 50, 50, 0.9, 0x58d26b, { weave: 0.5 }),                   // vx*0.9
  slag:       e('walker', 5, 50, 50, 1.4, 0x7a7f86, { weave: 0.35 }),                  // vx*1.4
  pizza:      e('walker', 3, 40, 40, 1.5, 0xe8a33d),
  mime:       e('walker', 5, 40, 70, 1.1, 0xf2f2f2, { weave: 0.3 }),
  magma:      e('walker', 8, 70, 50, 0.8, 0xff5a1f),
  paint_blob: e('walker', 5, 50, 50, 1.3, 0xff4fb8, { weave: 0.6 }),
  zombie:     e('walker', 10, 40, 70, 0.6, 0x7fa36b),
  ruby_slime: e('walker', 6, 50, 50, 1.2, 0xc4163a, { weave: 0.5 }),
  police:     e('walker', 8, 80, 40, 2.2, 0x2f5fd0, { fire: fire('laser', 'aim', 2.5, 4) }),
  // ---- Heavies: slow, wide, hold a lane
  dirty_ice:  e('heavy', 6, 70, 70, 1.0, 0xb9d8ee),
  sludge:     e('heavy', 8, 80, 60, 1.0, 0x6b8f2a),
  trash:      e('heavy', 10, 80, 80, 0.7, 0x5b5560),
  // ---- Hoppers: `hop` = jump speed (m/s), `air` = airtime scale
  ice:        e('hopper', 3, 50, 50, 1.5, 0x9fe3ff, { hop: 6.0, rest: [0.35, 0.7] }),
  rabbit:     e('hopper', 4, 50, 50, 1.3, 0xf0e6dc, { hop: 8.0, rest: [0.4, 0.9] }),
  frog:       e('hopper', 4, 50, 50, 1.5, 0x3dbb4f, { hop: 7.0, rest: [0.4, 0.8] }),
  // ---- Flyers (alt = hover height range above the player's ground)
  vulture:    e('flyer', 3, 70, 40, 1.8, 0x4a3a52, { alt: [3.0, 4.5], dive: true }),   // orig y 80-180 px from top
  bat:        e('flyer', 2, 60, 30, 2.0, 0x5a3f7a, { alt: [2.6, 4.0], dive: true, erratic: 1 }),
  drone:      e('flyer', 4, 50, 30, 1.5, 0x37c6d6, { alt: [2.8, 4.0], fire: fire('laser', 'aim', 2.2, 3.5) }),
  pigeon:     e('flyer', 2, 50, 30, 1.6, 0x9aa3ad, { alt: [3.0, 4.5], fire: fire('bomb', 'drop', 1.8, 3) }),
  gargoyle:   e('flyer', 4, 60, 50, 1.4, 0x6d7280, { alt: [2.8, 4.0], dive: true }),
  ember:      e('flyer', 2, 30, 30, 2.2, 0xff7a1a, { alt: [2.4, 3.8], dive: true }),
  shadow_bat: e('flyer', 4, 60, 30, 2.5, 0x2a2438, { alt: [2.6, 4.0], dive: true, erratic: 1, fire: fire('ruby_laser', 'aim', 3, 5) }),
  ghost:      e('flyer', 4, 40, 60, 1.4, 0xcfe8e0, { alt: [2.4, 3.6], fire: fire('homing', 'aim', 3, 4.5, 3.5) }),
  // ---- Crawlers: fast and low
  spider:     e('crawler', 2, 60, 25, 2.0, 0x2c2c34, { climb: true }),                 // orig climbs in from below at 4 px/f
  centipede:  e('crawler', 3, 80, 20, 1.6, 0xb5651d),
  roach:      e('crawler', 2, 40, 15, 2.5, 0x6b3a1e),
  rat:        e('crawler', 5, 60, 35, 1.8, 0x8c8279),
  // ---- Floaters
  bloom:      e('floater', 4, 60, 60, 0.8, 0xd95fe0, { alt: [1.3, 2.0], fire: fire('acid', 'aim', 2.5, 4) }),
  smog:       e('floater', 3, 50, 50, 1.2, 0x6e6a73, { alt: [1.3, 2.0], fire: fire('acid', 'drop', 2.5, 4) }),
  mud_cloud:  e('floater', 4, 60, 40, 1.2, 0x7a5a3a, { alt: [2.0, 3.2], fire: fire('bomb', 'drop', 2.5, 4) }),
  storm_cloud:e('floater', 6, 60, 40, 1.5, 0x56607a, { alt: [2.4, 3.6], fire: fire('lightning', 'drop', 2, 3.2) }),
};
for (const [k, v] of Object.entries(ENEMIES)) v.pts = enemyPoints(k);

// Bosses: stats only (behaviour is the boss prompts). hp * stageLoop; speed is the arena entry walk.
export const BOSSES = {
  boss1: { hp: 60, w: px(160), h: px(160), speed: pxs(1) }, boss2: { hp: 80, w: px(180), h: px(140), speed: pxs(1.2) },
  boss3: { hp: 100, w: px(150), h: px(200), speed: pxs(0.8) }, boss4: { hp: 120, w: px(160), h: px(180), speed: pxs(0.9) },
  boss5: { hp: 150, w: px(140), h: px(200), speed: pxs(1) }, boss6: { hp: 200, w: px(220), h: px(200), speed: pxs(0.7) },
  boss7: { hp: 180, w: px(200), h: px(120), speed: pxs(1) }, boss8: { hp: 220, w: px(140), h: px(140), speed: pxs(1.2) },
  boss9: { hp: 250, w: px(160), h: px(220), speed: pxs(0.8) }, boss10: { hp: 300, w: px(160), h: px(240), speed: pxs(0.5) },
};

// Bosses are spawned into the enemy list like anything else (so shots, bombs, aim-assist and contact all work), with a
// controller from actors/bosses/ that replaces the archetype AI. Defined here as plain records.
export const BOSS_DEFS = Object.fromEntries(Object.entries(BOSSES).map(([k, v]) => [k, { arch: 'boss', color: 0x8e44ad, pts: enemyPoints(k), ...v }]));

// Per-archetype grey-box shape and behaviour defaults.
export const ARCH = {
  walker:  { shape: 'box',  aggro: 28, lateral: 1.5 },
  heavy:   { shape: 'cyl',  aggro: 26, lateral: 0 },
  hopper:  { shape: 'ball', aggro: 28 },
  flyer:   { shape: 'oct',  aggro: 36, standoff: 11, diveEvery: [3, 5], diveSpeed: 1.7 },
  crawler: { shape: 'flat', aggro: 26, lateral: 2.5 },
  floater: { shape: 'ico',  aggro: 34, standoff: 8 },
  boss:    { shape: 'box',  aggro: 1e9 },
};
export const ENEMY_TYPES = Object.keys(ENEMIES);
