// Boss pattern tuning as data (PLAN house rule 5). Times in seconds, distances in metres, speeds in m/s.
// Every attack is telegraphed: `windup` is the warning (crouch + a landing marker on the floor that shows exactly
// where the boss will land); `ring` is a shockwave the player jumps over (it is `height` tall (0.9 m, a held jump clears it by a metre and a half)).
// Original boss1 (cleaningup.html 4549-4583): walks left, jumps every 120 frames, lands with a shake and spawns two dirt.
export const BOSS_PATTERNS = {
  boss1: {
    name: 'BIG DIRT', color: 0x8e44ad, size: { hs: 1.5, hx: 1.5, h: 3.0 },
    intro: { dropHeight: 26, dropTime: 1.0, roar: 1.6 },
    walkSpeed: 1.9,                                              // original boss speed 1 px/frame (1.3 m/s), brisker here so the arena feels alive
    leapRange: 13,                                               // never lands further than this from the player (keeps the fight on camera)
    p1: { walk: [1.5, 2.3], windup: 1.0, air: 0.95, peak: 6.5, ring: { speed: 7.5, thick: 1.2, height: 0.9, damage: 20, count: 1 }, stun: 1.6, minions: 2 },
    p2: { walk: [0.7, 1.2], windup: 0.7, air: 0.8, peak: 6.0, ring: { speed: 9, thick: 1.2, height: 0.9, damage: 20, count: 2, gap: 0.55 }, stun: 1.1, minions: 3 },
    rage: { time: 1.5 },                                         // phase-two roar: invulnerable, harmless
    slamRadius: 2.6,                                             // the marker radius: standing in it when the boss lands is a 25-damage stomp
    stompDamage: 25,
  },
  // Original boss2 "SLIME - Bouncing Acid Rain" (cleaningup.html 4586-4620): bounces across the arena, lobbing two acid globs at every landing.
  // 3D: hops at the player in series (each landing marked on the floor for the whole windup + flight), then rears back and rains acid on marked circles.
  boss2: {
    name: 'BIG SLUDGE', color: 0x1e8449, size: { hs: 1.8, hx: 1.8, h: 2.7 },
    intro: { emerge: 1.8, roar: 1.4 },
    walkSpeed: 1.5, hopRange: 9.5,
    p1: { idle: [0.5, 0.9], windup: 1.0, air: 0.8, peak: 4.2, hops: [2, 3], rest: 2.0,
          rain: { count: 4, r: 1.9, delay: [1.1, 1.4], gap: 0.4, windup: 1.2, damage: 20 } },
    p2: { idle: [0.3, 0.6], windup: 0.7, air: 0.7, peak: 4.8, hops: [2, 3], rest: 1.4, minions: 2,
          ring: { speed: 9, thick: 1.1, height: 0.9, damage: 20, count: 1 },
          rain: { count: 6, r: 1.9, delay: [0.95, 1.25], gap: 0.3, windup: 0.9, damage: 20 } },
    rage: { time: 1.5 }, splatR: 2.8, stompDamage: 25,
  },
  // Original boss3 "TRASH - Hover and Charge" (cleaningup.html 4621-4642): hovers, then charges across the screen at 18 px/frame, shakes the screen, returns.
  // 3D: hovers at the arena rim, locks a charge lane on the floor (red chevrons) for `tele` seconds, then runs it at `speed` m/s. Hit the far wall and it crashes.
  boss3: {
    name: 'TRASH KING', color: 0x7f8c8d, size: { hs: 1.9, hx: 2.0, h: 3.0 },
    intro: { dropHeight: 24, dropTime: 1.3, roar: 1.6 },
    hoverY: 1.3, driftSpeed: 6.5, laneW: 4.8,
    p1: { hover: [1.2, 1.8], tele: 1.5, speed: 21, charges: 2, stun: 2.4, rest: 1.0 },
    p2: { hover: [0.7, 1.1], tele: 1.1, speed: 25, charges: 3, stun: 1.6, rest: 0.7, minions: 2, rain: { count: 3, r: 2.0, delay: [1.2, 1.5], gap: 0.45, damage: 20 } },
    rage: { time: 1.5 }, ramDamage: 25,
  },
};
