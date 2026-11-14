// ===========================================================================================================
// HOW TO ADD A STAGE
//   1. Copy the STAGE1 object below, change `id`, `name`, `roster`, `obstacle`, `boss`, `music`, `weights`...
//      Every field is read by the engine; nothing about a stage lives in engine code (PLAN house rule 5).
//   2. Copy game3d/themes/stage01.js to themes/stageNN.js: palette, sky, fog, lights, colour grade, scatter
//      props, edge props, far layers, set-piece dressing. Register it in themes/index.js.
//   3. Boss: copy actors/bosses/boss01.js (a `pattern` object using the shared bossKit) and register it in
//      actors/bosses/index.js. Its HP/size live in data/enemies.js (BOSSES).
//   4. Add the stage to STAGES at the bottom. `getStage(n)` is the only lookup the engine uses.
// Field reference (all lengths in metres, times in seconds):
//   length / trackWidth   track length and walkable width (~1100 m = 2 minutes at run speed)
//   roster[act]           enemy types that first appear in act 1/2/3 (an act also gets all earlier tiers)
//   density[act]          share of each template's enemy slots that are kept
//   weights[act]          segment template weights; templates live in world/segments.js
//   act3Special           'chase' (toward-camera set piece) | 'hard' (platforming run) | 'either'
//   obstacle              rolling obstacle type (actors/obstacles.js)
//   setPiece              tuning for the stage's set-piece segment (the chase's speed, lag and damage)
//   boss                  { id, name, intro line, arena size, phase threshold }
//   music                 intro-card track credit; `placeholder: true` until the Jukebox prompt fills data/music.js
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
  music: { title: 'Track title to be announced', artist: 'Cowboy Clean', placeholder: true },
  checkpoints: ['DRY WASH', 'GHOST TOWN'],
  palette: { ground: 0xc9a066, platform: 0xe0b872, ledge: 0xb88a4e, beam: 0x9a6b43, barrier: 0xd94a3d, wall: 0x6b5b7a, quicksand: 0xd7a05a },
};

export const STAGES = [STAGE1];
export const IMPLEMENTED = new Set(STAGES.map((s) => s.id));

// Stages with no data yet are stage 1's theme and track under their own name and roster (data/standIns.js).
export function getStage(n) {
  return STAGES.find((s) => s.id === n) || standIn(STAGE1, n);
}
