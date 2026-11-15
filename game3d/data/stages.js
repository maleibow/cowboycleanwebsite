// ===========================================================================================================
// HOW TO ADD A STAGE
//   1. Copy the STAGE1 object below, change `id`, `name`, `roster`, `obstacle`, `boss`, `weights`...
//      Every field is read by the engine; nothing about a stage lives in engine code (PLAN house rule 5).
//   2. Copy game3d/themes/stage01.js to themes/stageNN.js: palette, sky, fog, lights, colour grade, scatter
//      props, edge props, far layers, set-piece dressing. Register it in themes/index.js.
//      A theme may also supply: hazards { vine | piston | taxi } (geometry for world/haz*.js), beamGap, groundDoubleSide, groundRim, path.dash, edge.lampColor.
//   3. Boss: copy actors/bosses/boss01.js (a `pattern` object using the shared bossKit) and register it in
//      actors/bosses/index.js. Its HP/size live in data/enemies.js (BOSSES).
//   4. Add the stage to STAGES at the bottom. `getStage(n)` is the only lookup the engine uses.
// Field reference (all lengths in metres, times in seconds):
//   length / trackWidth   track length and walkable width (~1100 m = 2 minutes at run speed)
//   roster[act]           enemy types that first appear in act 1/2/3 (an act also gets all earlier tiers)
//   density[act]          share of each template's enemy slots that are kept
//   weights[act]          segment template weights; templates live in world/segments.js
//   act3Special           'chase' (toward-camera set piece) | 'hard' (platforming run) | 'either' | 'setpiece' (stages 2-4: act 3 holds the template named by
//                         setPiece.template: 'vines' | 'reversal' | 'rooftops', defined in world/segmentsX.js)
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

export const STAGES = [STAGE1, STAGE2, STAGE3, STAGE4, STAGE5];
export const IMPLEMENTED = new Set(STAGES.map((s) => s.id));

// Stages with no data yet are stage 1's theme and track under their own name and roster (data/standIns.js).
export function getStage(n) {
  return STAGES.find((s) => s.id === n) || standIn(STAGE1, n);
}
