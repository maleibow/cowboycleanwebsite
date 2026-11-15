// ===========================================================================================================
// HOW TO ADD A STAGE
//   1. Copy the STAGE1 object below, change `id`, `name`, `roster`, `obstacle`, `boss`, `weights`...
//      Every field is read by the engine; nothing about a stage lives in engine code (PLAN house rule 5).
//   2. Copy game3d/themes/stage01.js to themes/stageNN.js: palette, sky, fog, lights, colour grade, scatter
//      props, edge props, far layers, set-piece dressing. Register it in themes/index.js.
//      A theme may also supply: hazards { vine | piston | taxi | plank }, chase (a custom chaser) (geometry for world/haz*.js), beamGap, groundDoubleSide, groundRim, path.dash, edge.lampColor.
//   3. Boss: copy actors/bosses/boss01.js (a `pattern` object using the shared bossKit) and register it in
//      actors/bosses/index.js. Its HP/size live in data/enemies.js (BOSSES).
//   4. Add the stage to STAGES at the bottom. `getStage(n)` is the only lookup the engine uses.
// Field reference (all lengths in metres, times in seconds):
//   length / trackWidth   track length and walkable width (~1100 m = 2 minutes at run speed)
//   roster[act]           enemy types that first appear in act 1/2/3 (an act also gets all earlier tiers)
//   density[act]          share of each template's enemy slots that are kept
//   weights[act]          segment template weights; templates live in world/segments.js
//   act3Special           'chase' (toward-camera set piece) | 'hard' (platforming run) | 'either' | 'setpiece' (stages 2-7: act 3 holds the template named by
//                         setPiece.template: 'vines' | 'reversal' | 'rooftops' | 'awnings' | 'lavaChase' | 'rainbowSlide' | 'cloudRide' | 'lightsOut' | 'risingTide', defined in world/segmentsX.js, Y, V, I, C, G, K)
//   obstacle              rolling obstacle type (actors/obstacles.js)
//   setPiece              the stage's set-piece: { id, template, name, warning (shouted when the player enters it), color } plus, for the chase, its speed / lag / damage.
//                         Moving parts of a set-piece or hazard (vines, belts, pistons, traffic) live in world/haz*.js and read lists the template returns.
//   boss                  { id, name, intro line, arena size, phase threshold }
//   (the stage's track title, Spotify link and audio file live in data/music.js, slot `stageN`)
//   checkpoints           names shown on the checkpoint toasts, one per act boundary
//   palette               grey-box fallback colours for the track builder (the theme overrides them)
// ===========================================================================================================
import { standIn } from './standIns.js';
export const POWERUP_TYPES = ['health', 'super', 'spread', 'shield', 'fourway', 'homing', 'grenade', 'spin', 'bomb_refill'];

const STAGE1 = {
  id: 1, name: 'Desert Scrub', tagline: 'The dust bowl is filthy. Somebody has to clean it.',
  theme: 'stage01',
  length: 1100,                 // metres of track, ~2 minutes at run speed
  trackWidth: 8,
  obstacle: 'sand_pile',        // rolling obstacle (original: the sand_pile that rolls in from the right)
  roster: [['dirt'], ['ice', 'vulture'], ['rabbit', 'dirty_ice', 'spider']], // enemies by act (tier 1/2/3)
  density: [0.6, 0.85, 1],      // share of a template's enemy slots kept per act
  act3Special: 'chase',         // the runaway dust-ball chase
  weights: [                    // template weights per act
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, quicksand: 1.5, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 2, gap: 3, doubleGap: 2, steps: 2, beam: 1.5, barrier: 2, quicksand: 2 },
    { flat: 1, curve: 2, climb: 1, drop: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3, quicksand: 1 },
  ],
  setPiece: { id: 'dustChase', name: 'RUN!', warning: 'A RUNAWAY DUST BALL!', speed: 8, lag: 16, damage: 15 },
  boss: { id: 'boss1', name: 'BIG DIRT', intro: 'The filthiest thing in the desert', phaseAt: 0.5, arena: { radius: 13 } },
  checkpoints: ['DRY WASH', 'GHOST TOWN'],
  palette: { ground: 0xc9a066, platform: 0xe0b872, ledge: 0xb88a4e, beam: 0x9a6b43, barrier: 0xd94a3d, wall: 0x6b5b7a, quicksand: 0xd7a05a },
};

const STAGE2 = {
  id: 2, name: 'Toxic Jungle', tagline: 'The jungle is oozing. Hose it down.',
  theme: 'stage02',
  length: 1100, trackWidth: 8,
  obstacle: 'log',              // rolling obstacle (original: a log)
  roster: [['slime', 'bloom'], ['bat'], ['frog', 'sludge', 'centipede']],   // PLAN 6: slime, bloom -> bat -> frog, sludge, centipede
  density: [0.6, 0.85, 1],
  act3Special: 'setpiece',      // act 3 holds the stage's own set-piece instead of the dust-ball chase
  weights: [
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, quicksand: 2, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 1, gap: 3, doubleGap: 2, steps: 3, beam: 2, barrier: 2, quicksand: 2 },
    { flat: 1, curve: 2, climb: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3, quicksand: 1.5 },
  ],
  setPiece: { id: 'vineSwing', template: 'vines', name: 'SWING!', warning: 'VINES! JUMP AND GRAB ON!', color: '#7dff9a' },
  boss: { id: 'boss2', name: 'BIG SLUDGE', intro: 'The slimiest thing in the jungle', phaseAt: 0.5, arena: { radius: 14 } },
  checkpoints: ['SLUDGE RIVER', 'TEMPLE RUINS'],
  palette: { ground: 0x6f9a52, platform: 0x7a5a38, ledge: 0x5d4037, beam: 0x5d4037, barrier: 0x6a4a2e, wall: 0x6f8a6a, quicksand: 0x6f8a2b },
};

const STAGE3 = {
  id: 3, name: 'Neo-Scrap City', tagline: 'A city made of trash needs a very big mop.',
  theme: 'stage03',
  length: 1100, trackWidth: 8,
  obstacle: 'barrel',          // rolling obstacle (original: a toxic barrel)
  roster: [['smog', 'slag'], ['drone'], ['rat', 'trash', 'roach']],   // PLAN 6: smog, slag -> drone -> rat, trash, roach
  density: [0.6, 0.85, 1],
  act3Special: 'setpiece',
  weights: [
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, conveyor: 2.5, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 1, gap: 3, doubleGap: 2, steps: 2.5, beam: 2, barrier: 2, conveyor: 3 },
    { flat: 1, curve: 2, climb: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3, conveyor: 2.5 },
  ],
  setPiece: { id: 'conveyorReversal', template: 'reversal', name: 'REVERSE!', warning: 'CONVEYOR! WATCH THE CRUSHERS!', color: '#25ffe6' },
  boss: { id: 'boss3', name: 'TRASH KING', intro: 'The biggest heap in the city', phaseAt: 0.5, arena: { radius: 14 } },
  checkpoints: ['SCRAPYARD', 'NEON ALLEY'],
  palette: { ground: 0x4a4e68, platform: 0x59617a, ledge: 0x4a5068, beam: 0x6a6a7e, barrier: 0x4a5068, wall: 0x3e4660, quicksand: 0x4a5068 },
};

const STAGE4 = {
  id: 4, name: 'New York City', tagline: 'The city that never sleeps is also never clean.',
  theme: 'stage04',
  length: 1100, trackWidth: 8,
  obstacle: 'trash_can',       // rolling obstacle (original: a trash can)
  roster: [['pizza', 'rat'], ['pigeon'], ['police']],   // PLAN 6: pizza, rat -> pigeon -> police
  density: [0.6, 0.85, 1],
  act3Special: 'setpiece',
  weights: [
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, manholes: 2.5, crossing: 2.5, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 1, gap: 3, doubleGap: 2, steps: 2.5, beam: 2, barrier: 2, manholes: 2.5, crossing: 3 },
    { flat: 1, curve: 2, climb: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3, manholes: 2, crossing: 3 },
  ],
  setPiece: { id: 'rooftopDrop', template: 'rooftops', name: 'ROOFTOPS!', warning: 'UP THE FIRE ESCAPE! RUN THE ROOFTOPS!', color: '#ffd23a' },
  boss: { id: 'boss4', name: 'PIZZA RAT', intro: 'The hungriest thing in the city', phaseAt: 0.5, arena: { radius: 14 } },
  checkpoints: ['5TH AVENUE', 'TIMES SQUARE'],
  palette: { ground: 0x4a4e5c, platform: 0x7a808e, ledge: 0x6a7080, beam: 0x9a7a4a, barrier: 0x8a4a3a, wall: 0x3a4252, quicksand: 0x4a4e5c },
};

const STAGE5 = {
  id: 5, name: 'Paris Nights', tagline: 'The city of lights, in need of a polish.',
  theme: 'stage05',
  length: 1100, trackWidth: 8,
  obstacle: 'cafe_chair',      // rolling obstacle (original: a bistro chair)
  roster: [['mime'], ['gargoyle'], ['bat']],   // PLAN 6: mime -> gargoyle -> bat
  density: [0.6, 0.85, 1],
  act3Special: 'setpiece',
  weights: [
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, bounceGap: 2.5, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 1, gap: 2, doubleGap: 2, steps: 2.5, beam: 2, barrier: 2, bounceGap: 3 },
    { flat: 1, curve: 2, climb: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3, bounceGap: 3 },
  ],
  setPiece: { id: 'awningRun', template: 'awnings', name: 'BOUNCE!', warning: 'AWNINGS! BOUNCE ACROSS THE STREET!', color: '#ff9a7a' },
  boss: { id: 'boss5', name: 'THE MIME', intro: 'The quietest thing in Paris. Not for long.', phaseAt: 0.5, arena: { radius: 14 } },
  checkpoints: ['PONT NEUF', 'MONTMARTRE'],
  palette: { ground: 0x4a5064, platform: 0xcdbfa4, ledge: 0x6f7f98, beam: 0x8a6a45, barrier: 0x8a4a3a, wall: 0x3a4252, quicksand: 0x4a5064, bounce: 0xc0392b },
};

const STAGE6 = {
  id: 6, name: 'Volcano Peak', tagline: 'Hot, black and filthy. Bring the bleach.',
  theme: 'stage06',
  length: 1100, trackWidth: 8,
  obstacle: 'ash_pile',        // rolling obstacle (original: a smouldering ash pile)
  roster: [['magma'], ['ember'], ['slag']],   // PLAN 6: magma -> ember -> slag
  density: [0.6, 0.85, 1],
  act3Special: 'setpiece',
  weights: [
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, rockfall: 2.5, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 1, gap: 3, doubleGap: 2, steps: 2.5, beam: 2, barrier: 2, rockfall: 2.5, collapse: 3 },
    { flat: 1, curve: 2, climb: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3, rockfall: 2, collapse: 3 },
  ],
  setPiece: { id: 'lavaWave', template: 'lavaChase', name: 'RUN!', warning: 'A WALL OF LAVA! RUN FOR IT!', color: '#ff7a3a', speed: 8, lag: 15, damage: 15 },
  boss: { id: 'boss6', name: 'MAGMA MAW', intro: 'The hottest thing on the mountain', phaseAt: 0.5, arena: { radius: 15 } },
  checkpoints: ['ASH FIELDS', 'THE CALDERA'],
  palette: { ground: 0x3a3236, platform: 0x4a4246, ledge: 0x2a2428, beam: 0x2a1c16, barrier: 0xa83a22, wall: 0x2a2428, quicksand: 0x3a3236 },
};

const STAGE7 = {
  id: 7, name: 'Rainbow Island', tagline: 'Pretty colours, real mud.',
  theme: 'stage07',
  length: 1100, trackWidth: 8,
  obstacle: 'cloud_bump',      // rolling obstacle (original: a soft white cloud bump)
  roster: [['paint_blob'], ['mud_cloud'], ['frog']],   // PLAN 6: paint_blob -> mud_cloud -> frog
  density: [0.6, 0.85, 1],
  act3Special: 'setpiece',
  weights: [
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, mudPool: 3, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 1, gap: 3, doubleGap: 2, steps: 2.5, beam: 3, barrier: 2, mudPool: 3 },
    { flat: 1, curve: 2, climb: 1, gap: 2, doubleGap: 3, steps: 3, beam: 3, barrier: 3, mudPool: 2.5 },
  ],
  setPiece: { id: 'rainbowSlide', template: 'rainbowSlide', name: 'WHEEE!', warning: 'RAINBOW SLIDE! HOLD ON AND JUMP THE CLOUDS!', color: '#ff9ad5' },
  boss: { id: 'boss7', name: 'DOUBLE RAINBOW', intro: 'The prettiest thing on the island. And the angriest.', phaseAt: 0.5, arena: { radius: 14 } },
  checkpoints: ['PALM BEACH', 'CANDY RIDGE'],
  palette: { ground: 0xd8b878, platform: 0xff9ad5, ledge: 0xffffff, beam: 0xaf52de, barrier: 0xff4a7a, wall: 0x8ad0a0, quicksand: 0xf4e2a8, mud: 0x8a5a32, slide: 0xffe135 },
};

const STAGE8 = {
  id: 8, name: 'Cloud Dream', tagline: 'Soft, fluffy and secretly grimy.',
  theme: 'stage08',
  length: 1100, trackWidth: 8,
  obstacle: 'sleep_sheep',     // rolling obstacle (original: a sleeping sheep, Zzz)
  roster: [['storm_cloud'], ['bat'], ['pigeon']],   // PLAN 6: storm_cloud -> bat -> pigeon
  density: [0.6, 0.85, 1],
  act3Special: 'setpiece',
  weights: [
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, cloudHop: 3, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 1, gap: 3, doubleGap: 2, steps: 2.5, beam: 2, barrier: 2, cloudHop: 3 },
    { flat: 1, curve: 2, climb: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3, cloudHop: 3 },
  ],
  setPiece: { id: 'cloudRide', template: 'cloudRide', name: 'RIDE!', warning: 'MOVING CLOUDS! STEER ONTO THE MIDDLE!', color: '#ffc2dc' },
  boss: { id: 'boss8', name: 'THE EYE', intro: 'It sees everything. It never blinks. Only when it wants to.', phaseAt: 0.5, arena: { radius: 14 } },
  checkpoints: ['SLUMBER ROW', 'PILLOW PEAKS'],
  palette: { ground: 0xfff3f8, platform: 0xe6d4f5, ledge: 0xffffff, beam: 0xf4eefc, barrier: 0xc2e4ff, wall: 0xd9c2ff, quicksand: 0xfff3f8 },
};

const STAGE9 = {
  id: 9, name: 'Haunted Village', tagline: 'The dead stay dirty. Not on your watch.',
  theme: 'stage09',
  length: 1100, trackWidth: 8,
  obstacle: 'gravestone',      // rolling obstacle (original: a gravestone with a cross)
  roster: [['zombie'], ['ghost'], ['bat', 'spider']],   // PLAN 6: zombie -> ghost -> bat, spider
  density: [0.6, 0.85, 1],
  act3Special: 'setpiece',
  weights: [
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, bog: 2.5, swingGate: 2.5, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 1, gap: 3, doubleGap: 2, steps: 2.5, beam: 2, barrier: 2, bog: 2.5, swingGate: 3 },
    { flat: 1, curve: 2, climb: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3, bog: 2, swingGate: 3 },
  ],
  setPiece: { id: 'lightsOut', template: 'lightsOut', name: 'LIGHTS OUT!', warning: 'LIGHTS OUT! SPRAY TO SEE!', color: '#7affb0' },
  boss: { id: 'boss9', name: 'HOLLOW GHOST', intro: 'There is nobody home. That is the problem.', phaseAt: 0.5, arena: { radius: 14 } },
  checkpoints: ['THE CHURCHYARD', 'BONE ALLEY'],
  palette: { ground: 0x3a3c44, platform: 0x4a4e58, ledge: 0x5a5e66, beam: 0x3d322a, barrier: 0x2a2e34, wall: 0x2a2e34, quicksand: 0x3a3c44, mud: 0x10201a },
};

const STAGE10 = {
  id: 10, name: 'Charcoal Streets', tagline: 'Ruby water runs through the ash. End it here.',
  theme: 'stage10',
  length: 1100, trackWidth: 8,
  obstacle: 'coal_pile',       // rolling obstacle (original: a heap of coal)
  roster: [['ghost', 'shadow_bat', 'ruby_slime'], ['ember', 'zombie'], ['storm_cloud']],   // PLAN 6: ghost, shadow_bat, ruby_slime -> ember, zombie -> storm_cloud
  density: [0.6, 0.85, 1],
  act3Special: 'setpiece',
  weights: [
    { flat: 4, curve: 3, climb: 2, drop: 2, gap: 3, barrier: 2, canalStones: 3, rest: 0.6 },
    { flat: 2, curve: 2, climb: 2, drop: 1, gap: 3, doubleGap: 2, steps: 3, beam: 2, barrier: 2, canalStones: 3 },
    { flat: 1, curve: 2, climb: 1, gap: 2, doubleGap: 3, steps: 3, beam: 2, barrier: 3, canalStones: 3 },
  ],
  setPiece: { id: 'risingTide', template: 'risingTide', name: 'CLIMB!', warning: 'THE TIDE IS RISING! CLIMB!', color: '#ff4a6a' },
  boss: { id: 'boss10', name: 'VACANT SAVIOR', intro: 'Nobody is coming to save you. It is already here.', phaseAt: 0.5, arena: { radius: 15 } },
  checkpoints: ['THE HIGH STREET', 'THE FLOODED AVENUE'],
  palette: { ground: 0x4a4a54, platform: 0x5a5a66, ledge: 0x6a6a76, beam: 0x3a3a44, barrier: 0x2a2a32, wall: 0x2a2a32, quicksand: 0x4a4a54 },
};

export const STAGES = [STAGE1, STAGE2, STAGE3, STAGE4, STAGE5, STAGE6, STAGE7, STAGE8, STAGE9, STAGE10];
export const IMPLEMENTED = new Set(STAGES.map((s) => s.id));

// Stages with no data yet are stage 1's theme and track under their own name and roster (data/standIns.js).
export function getStage(n) {
  return STAGES.find((s) => s.id === n) || standIn(STAGE1, n);
}
