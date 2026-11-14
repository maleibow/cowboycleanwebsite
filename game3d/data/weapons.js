// Weapon, heat, bomb, powerup and damage numbers ported from cleaningup.html (lines 3041-3108,
// 3200-3460, 3865-4270, 7224-7510). The original is per-frame at 60 fps in canvas pixels; every value
// is converted ONCE here (house rule 6) with the original written beside it.
//   run speed 7 px/frame = 420 px/s = 9 m/s  =>  PX = 46.67 px per metre.
export const PX = 420 / 9;
export const px = (v) => v / PX;                 // px            -> m
export const pxs = (v) => (v * 60) / PX;         // px/frame      -> m/s
export const pxa = (v) => (v * 3600) / PX;       // px/frame^2    -> m/s^2
export const fr = (v) => v / 60;                 // frames        -> s
export const perSec = (v) => v * 60;             // per-frame rate -> per-second rate

// Player projectile types. `hit` is the half-extent of the hit box (original: size * 2 px).
// drag: original multiplies velocity by 0.98 every frame except laser/lasso/spin/charcoal.
export const DRAG_PER_SEC = Math.pow(0.98, 60);  // 0.98 per frame
export const RANGE_MUL = 1.5;                    // 3D TUNING (not original): lifetime x1.5 ...
export const SPEED_TUNE = 1.35;                  // ... and x1.35 speed on the drag shots. Original reach was ~11 m on a 17 m screen; with drag a
                                                 // shot now reaches ~18 m, so the 30 m aim-assist cone has something to hit.
export const PROJ = {
  normal:   { speed: pxs(15) * SPEED_TUNE, life: fr(60), size: 5, dmg: 1,   drag: true,  pierce: false, color: 0x9fe9ff, stretch: 1 },
  super:    { speed: pxs(15) * SPEED_TUNE, life: fr(60), size: 8, dmg: 2,   drag: true,  pierce: false, color: 0xff5a4a, stretch: 1 },
  laser:    { speed: pxs(22.5), life: fr(80), size: 5, dmg: 1.5, drag: false, pierce: true,  color: 0xff2bd6, stretch: 3 }, // 15 * 1.5
  charcoal: { speed: pxs(22.5), life: fr(80), size: 8, dmg: 3,   drag: false, pierce: true,  color: 0xdc143c, stretch: 1 }, // stage 10 only
  lasso:    { speed: pxs(8),    life: fr(80), size: 5, dmg: 1,   drag: false, pierce: false, color: 0xffc933, stretch: 2.4,
              maxSpeed: pxs(14), accel: pxa(0.2) /* per frame -> m/s^2 */ , turn: perSec(0.15) /* rad/s */ },
  homing:   { speed: pxs(15) * SPEED_TUNE, life: fr(60), size: 5, dmg: 1,   drag: true,  pierce: false, color: 0xe056fd, stretch: 1,
              maxSpeed: pxs(15) * SPEED_TUNE, accel: pxa(0.5), turn: perSec(0.2), seekRange: px(400) },
  grenade:  { speed: pxs(15),   life: fr(50), size: 5, dmg: 1,   drag: true,  pierce: false, color: 0x2ecc71, stretch: 1,
              gravity: pxa(0.4), shards: 8, shardSpeed: pxs(10), shardMinSize: 3 },
  spin:     { speed: 0,         life: fr(80), size: 5, dmg: 1,   drag: false, pierce: false, color: 0xf1c40f, stretch: 1,
              angRate: perSec(0.2), speedGain: pxa(0.3) },
};

// Heat and rate of fire (lines 3330-3350). Cooling happens on every frame a shot is not fired.
export const GUN = {
  rate:      { normal: fr(10), super: fr(4), laser: fr(6) },
  heatShot:  { normal: 15, super: 8 },        // laser uses the normal 15
  maxHeat: 100,
  coolPerSec: perSec(1.5), coolOverheated: perSec(0.6), // overheated until heat reaches 0
  superRecoil: pxs(1),                          // airborne shot nudges the player back
  jitter: 0.1,                                  // rad: original spX/spY random spread (values read, rolls not visible)
  spreadAngle: 0.2,                             // rad, +/- for the two extra streams
  fourwayMinSpeed: pxs(10),
  aimCone: (30 * Math.PI) / 180, aimRange: 30,  // PLAN 5
  aimStrength: 0.9,
};

export const BOMB = {
  perStage: 3, cooldown: fr(60), bossDamage: 20, shake: 0.9,
  radius: 21,  // original hit everything on screen (~1000 px wide); 21 m is the 3D equivalent
};

export const LASSO = { cooldown: fr(45), range: px(800), muzzleBack: px(15), vehicleLift: px(20) };

export const HIT = {                   // lines 7336-7395
  contact: 25, projectile: 15, invuln: fr(60), vehicleBounce: pxs(8), shake: 0.6,
  projRadius: 0.3,                     // original 10x10 px box; 3D needs a little forgiveness
};

// Powerups (3041-3108, 7450-7466). All timers 500 frames = 8.33 s; health +30 (cap 100); refill +1 bomb.
export const POWERUPS = {
  health:      { color: 0x2ecc71, label: 'HEALTH', heal: 30 },
  super:       { color: 0xe74c3c, label: 'SUPER',  time: fr(500) },
  spread:      { color: 0x3498db, label: 'SPREAD', time: fr(500) },
  shield:      { color: 0x5d7a99, label: 'SHIELD' },
  fourway:     { color: 0xe67e22, label: '4-WAY',  time: fr(500) },
  homing:      { color: 0x9b59b6, label: 'HOMING', time: fr(500) },
  grenade:     { color: 0x27ae60, label: 'GRENADE', time: fr(500) },
  spin:        { color: 0xf1c40f, label: 'SPIN',   time: fr(500) },
  bomb_refill: { color: 0xff8c1a, label: '+BOMB' },
};
export const POWERUP_LIST = Object.keys(POWERUPS);
export const DROPS = {
  powerupChance: 0.15,                 // Math.random() > 0.85; bosses always drop one
  dropLife: fr(400), dropHop: pxs(4), dropGravityMul: 0.6,
  coinValue: 5, coinsPerKill: (pts) => Math.max(1, Math.floor(pts / 25)), bossCoins: 25,
  crateCoins: [6, 10], crateLootPowerup: 0.45, // NEW (crates are not in the original)
};
export const SCORE = { enemy: 50, heavy: 150, hopperNamed: 100, boss: 2500 };
export const HEAVY = ['dirty_ice', 'sludge', 'trash'];
export const HOP_SCORE = ['rabbit', 'frog', 'rat'];
export const enemyPoints = (type) => (type.startsWith('boss') ? SCORE.boss : HEAVY.includes(type) ? SCORE.heavy : HOP_SCORE.includes(type) ? SCORE.hopperNamed : SCORE.enemy);

export const COMBO = { window: 2.0 };  // NEW: the original juice layer (8750-8780) is outside the lines this port may read
