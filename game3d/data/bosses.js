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
  // Original boss4 "PIZZA - Hover bomb drop + Swoop" (cleaningup.html 4643-4678): hovers near the top, dropping a bomb every 40 frames, then swoops to the player's position.
  // 3D: PIZZA RAT orbits the arena on his flying pizza box, dropping pepperoni bombs onto marked circles; then locks a target (a marker for the whole telegraph + dive) and swoops.
  boss4: {
    name: 'PIZZA RAT', color: 0x4b5320, size: { hs: 1.7, hx: 1.9, h: 2.6 },
    intro: { swoopTime: 1.8, roar: 1.4, startHeight: 24 },
    hoverY: 4.4, orbitR: 7.5, orbitSpeed: 0.55, flySpeed: 14,
    p1: { bombs: 6, every: 0.95, bombDelay: 1.15, bombR: 1.8, tele: 1.3, dive: 0.45, recover: 2.2, swoops: 1 },
    p2: { bombs: 8, every: 0.7, bombDelay: 1.0, bombR: 1.8, tele: 1.0, dive: 0.4, recover: 1.5, swoops: 2, minions: 2 },
    rage: { time: 1.5 }, swoopR: 2.7, swoopDamage: 25, bombDamage: 20,
  },
  // Original boss5 "MIME - Teleport and rapid fire" (cleaningup.html 4681-4716): walks in, fires a bomb every 20 frames, vanishes (invulnerable) and reappears at a random x.
  // 3D: THE MIME teleports around the arena edge. The destination is marked before he appears; once there he locks the line to the player (a lane on the floor for
  // 1 s), then fires a burst of rounds down it. Between acts he is open to fire. Phase two: three lanes per burst, two teleports in a row, mimes at the rage.
  boss5: {
    name: 'THE MIME', color: 0xecf0f1, size: { hs: 0.9, hx: 0.9, h: 3.0 },
    intro: { dropTime: 1.2, roar: 1.4, startHeight: 18 },
    edgeR: 11, vanish: 0.5, appearTele: 1.0, appear: 0.5, open: 2.4,
    p1: { aim: 1.0, shots: 5, every: 0.14, speed: 15, fan: 0, teleports: 1 },
    p2: { aim: 0.9, shots: 5, every: 0.12, speed: 17, fan: 0.3, teleports: 2, minions: 2 },
    rage: { time: 1.5 }, laneW: 1.2,
  },
  // Original boss6 "MAGMA - Submerge and Erupt" (cleaningup.html 4717-4775): slides in lobbing two bombs every 40 frames, sinks (invulnerable) for 60 frames, reappears under the
  // player's x and bursts out with a fan of five acid globs.
  // 3D: MAGMA MAW lobs bombs onto marked circles, sinks into the floor, burrows (a marker follows the player, then LOCKS for >= 1.1 s) and erupts under the marker with a lava pillar,
  // a jumpable shock ring and a rain of globs on marked circles; then he is open to fire for a few seconds. Phase two: two burrows in a row, more bombs and globs, magmas at the rage.
  boss6: {
    name: 'MAGMA MAW', color: 0x34495e, size: { hs: 2.0, hx: 2.2, h: 3.8 },
    intro: { emerge: 1.8, roar: 1.5 },
    walkSpeed: 2.4, lobRange: 12,
    p1: { volleys: 2, lobs: 2, every: 0.95, lobDelay: 1.2, lobR: 1.8, lobDamage: 20, sink: 0.8, burrow: 2.0, lock: 1.3, burrows: 1, eruptR: 2.7, eruptDamage: 25,
          ring: { speed: 8, thick: 1.1, height: 0.9, damage: 20 }, globs: 4, globR: 1.7, globDelay: 1.2, globDamage: 20, recover: 2.6 },
    p2: { volleys: 3, lobs: 3, every: 0.75, lobDelay: 1.1, lobR: 1.8, lobDamage: 20, sink: 0.6, burrow: 1.8, lock: 1.15, burrows: 2, eruptR: 2.7, eruptDamage: 25,
          ring: { speed: 9, thick: 1.1, height: 0.9, damage: 20 }, globs: 6, globR: 1.7, globDelay: 1.1, globDamage: 20, recover: 1.8, minions: 2 },
    rage: { time: 1.5 },
  },
};
