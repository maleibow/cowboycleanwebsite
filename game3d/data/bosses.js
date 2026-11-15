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
  // Original boss7 "RAINBOW - Figure-8 Sweep" (cleaningup.html 4776-4800): flies a figure of eight (x = sin t * 150, y = 150 + sin 2t * 100) and drops a fan of three bombs every 60 frames.
  // 3D: DOUBLE RAINBOW (a storm-cloud with a rainbow halo) flies a figure of eight over the arena trailing a rainbow beam that scorches the floor under him. The whole path is
  // drawn on the floor (a chain of markers) for >= 1.6 s before he starts, and the beam only lights once he is moving. Between sweeps he hovers and drops fans of three bombs on
  // marked circles, then sinks low and rests (open to fire). Phase two: a second beam from the mirrored side of the eight, a faster sweep, five-bomb fans.
  boss7: {
    name: 'DOUBLE RAINBOW', color: 0xbdc3c7, size: { hs: 1.9, hx: 2.2, h: 2.4 },
    intro: { dropTime: 1.8, roar: 1.4, startHeight: 22 },
    hoverY: 4.6, restY: 2.3, pathA: 8.5, pathB: 5.2, beamR: 1.5, beamDamage: 20,
    p1: { tele: 1.7, sweep: 6.5, bombs: 3, volleys: 3, every: 1.1, bombDelay: 1.2, bombR: 1.7, bombDamage: 20, rest: 2.6, sweeps: 1, beams: 1 },
    p2: { tele: 1.5, sweep: 5.0, bombs: 5, volleys: 3, every: 0.9, bombDelay: 1.1, bombR: 1.7, bombDamage: 20, rest: 1.8, sweeps: 1, beams: 2, minions: 2 },
    rage: { time: 1.5 },
  },
  // Original boss8 "CLOUD - Invincible Shield Eye" (cleaningup.html 4793-4827): hovers shielded and invulnerable for 200 frames calling lightning down around the player (every 40 frames),
  // then opens for 100 frames (hittable) firing a laser every 15 frames, then shuts again.
  // 3D: THE EYE hangs in a pearly shield bubble while storm bolts come down on marked circles at the player's feet; then the eyelids tremble and a laser lane is locked on the floor (>= 0.9 s);
  // the shield pops, the eye opens (the ONLY time he can be hurt) and fires rounds down the lane at chest height. Phase two: five bolts a volley, three lanes, a shorter window, storm clouds at the rage.
  boss8: {
    name: 'THE EYE', color: 0xecf0f1, size: { hs: 1.5, hx: 1.5, h: 3.0 },
    intro: { dropTime: 1.7, roar: 1.4, startHeight: 22 },
    shieldY: 2.2, openY: 1.0, orbitR: 4.5, orbitSpeed: 0.4, laneW: 1.3,
    p1: { shield: 2.8, bolts: 3, every: 0.9, boltDelay: 1.1, boltR: 1.7, boltDamage: 20, tele: 1.0, open: 4.0, shots: 8, shotEvery: 0.34, shotSpeed: 15, fan: 0 },
    p2: { shield: 2.6, bolts: 5, every: 0.55, boltDelay: 1.0, boltR: 1.7, boltDamage: 20, tele: 0.85, open: 3.4, shots: 8, shotEvery: 0.26, shotSpeed: 17, fan: 0.3, minions: 2 },
    rage: { time: 1.5 },
  },
  // Original boss9 "GHOST - Homing & Phasing" (cleaningup.html 4828-4861): drifts at the player at 1.5 px/frame; solid for 150 frames (a homing shot every 60), then phased out at 30% opacity and
  // invulnerable for 150 frames, then solid again.
  // 3D: HOLLOW GHOST glides after the player keeping 3 m off, charging a green wisp in his lantern (a lane on the floor points the way) and loosing a homing wisp (slow enough to outrun).
  // Then his outline flickers (a marker shows where he will return), he goes translucent and invulnerable and slips across the arena while spectral hands burst from marked circles, then he
  // re-forms. Phase two: three wisps a volley, five bursts, a jumpable wail ring when he re-forms, two ghosts at the rage.
  boss9: {
    name: 'HOLLOW GHOST', color: 0x2c3e50, size: { hs: 1.3, hx: 1.3, h: 3.6 },
    intro: { rise: 2.0, roar: 1.5 },
    drift: 1.9, standoff: 3.2, hoverY: 0.5,
    p1: { haunt: 4.2, wisps: 1, fan: 0, wispEvery: 1.5, charge: 0.55, wispSpeed: 5, fade: 0.9, phase: 2.2, bursts: 3, burstEvery: 0.6, burstDelay: 1.2, burstR: 1.8, burstDamage: 20, appear: 0.5 },
    p2: { haunt: 3.8, wisps: 3, fan: 0.35, wispEvery: 1.6, charge: 0.55, wispSpeed: 5.5, fade: 0.8, phase: 2.0, bursts: 5, burstEvery: 0.4, burstDelay: 1.1, burstR: 1.8, burstDamage: 20, appear: 0.5,
          ring: { speed: 9, thick: 1.1, height: 0.9, damage: 20 }, minions: 2 },
    rage: { time: 1.5 },
  },
  // Original boss10 "VACANT SAVIOR - Charcoal Entity" (cleaningup.html 4862-4925): flies a hovering figure of eight (y = 100 + sin * 60, x drifting on a cosine), firing three ruby lasers every 50 frames;
  // every 120 frames it swoops at the player's position (locked when the swoop starts), shedding acid every 10 frames, then returns. 300 HP.
  // 3D: the SAVIOR weaves a figure of eight over the arena; every couple of seconds he stops, locks a fan of ruby-laser lanes on the floor and fires them. Then he rises, a reticle follows you,
  // it locks, the dive line is drawn on the floor, and he swoops down it at speed, shedding acid that lands on marked circles along the line. He lands and rests (open to fire).
  // Phase two: a faster eight, five-lane fans, two swoops in a row with a jumpable wail ring at each landing, shadow bats at the rage. He is hittable the whole time except in the rage.
  boss10: {
    name: 'VACANT SAVIOR', color: 0x36454f, size: { hs: 1.3, hx: 1.4, h: 3.8 },
    intro: { dropTime: 1.8, roar: 1.6, startHeight: 24 },
    hoverY: 2.4, restY: 0.7, pathA: 8.0, pathB: 4.8, laneW: 1.0,
    p1: { weave: 5.0, period: 6.4, volleys: 2, volleyEvery: 2.2, fan: 0.4, lanes: 3, tele: 0.95, pulses: 3, pulseEvery: 0.22, laserSpeed: 14, swoops: 1, track: 0.7, lock: 1.0, swoopSpeed: 20, drips: 6, dripDelay: 1.0, dripR: 1.5, dripDamage: 15, rest: 2.8 },
    p2: { weave: 4.2, period: 4.8, volleys: 3, volleyEvery: 1.5, fan: 0.34, lanes: 5, tele: 0.8, pulses: 3, pulseEvery: 0.2, laserSpeed: 16, swoops: 2, track: 0.55, lock: 0.85, swoopSpeed: 22, drips: 7, dripDelay: 0.95, dripR: 1.5, dripDamage: 15, rest: 2.2,
          ring: { speed: 9, thick: 1.1, height: 0.9, damage: 20 }, minions: 2 },
    rage: { time: 1.6 },
  },
};
