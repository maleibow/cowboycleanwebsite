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
};
