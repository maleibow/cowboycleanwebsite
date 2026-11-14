import { createLoop } from './core/loop.js';
import { createInput } from './core/input.js';
import { createQuality } from './core/quality.js';
import { run, newRun } from './core/state.js';
import { events } from './core/events.js';
import { createRenderer } from './render/renderer.js';
import { createLevel } from './world/level.js';
import { createLookdev } from './world/lookdev.js';
import { createStageCards } from './ui/stageCards.js';
import { createHud } from './ui/hud.js';
import { createFullscreenButton } from './ui/fullscreen.js';
import { initSfx } from './audio/sfx.js';
import { createJukebox } from './audio/jukebox.js';
import { createBeatFx } from './audio/beatFx.js';
import { createNowPlaying } from './ui/jukeboxPanel.js';
import { createDebugPanel, createFreeCam } from './core/debug.js';
import { createFlow } from './flow.js';

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const seed = params.has('seed') ? Number(params.get('seed')) : null;
const startStage = Math.min(10, Math.max(1, Number(params.get('stage')) || 1));
newRun(startStage);
run.cheats.god = params.get('god') === '1';
const bossJump = params.get('boss') === '1';

const canvas = document.getElementById('game');
const box = document.getElementById('game-scale-box');
const quality = createQuality(params);
const gfx = createRenderer(canvas, box, quality);
const input = createInput();
const hud = createHud(document.getElementById('hud'));
const sfx = initSfx();   // synth sound effects: listens to the event bus, unlocks on the first key / tap
const jukebox = createJukebox({ sfx, box });   // music: Game mix / Spotify / synth, volumes, beat analysis (PLAN 8)
createNowPlaying(document.getElementById('hud'), jukebox);
const foes = params.get('foes') !== '0'; // ?foes=0: no enemies/obstacles (pure platformer, used by the platformer tests)
// ?lookdev=1 shows the art-kit stage 1 scene (new toon look + animated hero) instead of the grey-box level.
const lookdev = params.get('lookdev') === '1';
const cards = createStageCards(document.getElementById('hud'));
const uiRoot = document.getElementById('ui');
createFullscreenButton(uiRoot, box);
// The title screen shows by default. Dev parameters that name a stage / skip screens start straight in the game (house rule 8).
const skipIntro = params.get('intro') === '0' || bossJump || lookdev;
const skipTitle = params.get('title') === '0' || params.has('stage') || params.get('intro') === '0' || bossJump || lookdev;

const beatFx = createBeatFx({ jukebox, gfx, quality });
const debugPanel = debug ? createDebugPanel(gfx, quality) : null;
let freeCam = null;
const makeWorld = (opts = {}) => (lookdev
  ? createLookdev(quality, gfx, input, params)
  : createLevel(quality, { stage: run.stage, seed, debug, hud, foes, gfx, cards, ...opts }));
const flow = createFlow({
  gfx, input, hud, cards, sfx, jukebox, makeWorld, ui: uiRoot, skipTitle, skipIntro,
  onWorld(world) { window.__game && (window.__game.world = world); if (bossJump && skipTitle && world.jumpToGate) world.jumpToGate(); if (debug) freeCam = createFreeCam(world.camera, input, canvas); },
  afterRender() { if (freeCam?.active) freeCam.apply(1 / 60); },
});
if (debug) { // debug spawn keys: 1 = 10 enemies, 2 = 50 shots, 3 = every powerup, 4 = kill all, 5 = stress (30 enemies + 200 shots)
  addEventListener('keydown', (e) => {
    if (e.repeat || !flow.G.world?.debug) return; const d = flow.G.world.debug;
    if (e.code === 'Digit1') d.spawnEnemies(10); else if (e.code === 'Digit2') d.shoot(50); else if (e.code === 'Digit3') d.allPowerups();
    else if (e.code === 'Digit4') d.killAll(); else if (e.code === 'Digit5') { d.spawnEnemies(30); d.shoot(200); }
  });
}

let frameCount = 0, simSteps = 0;
const loop = createLoop({
  update(dt) { simSteps++; flow.update(dt); },
  render(alpha) { flow.render(alpha); },
  onFrame(dt) { frameCount++; quality.sample(dt * 1000); debugPanel?.frame(dt); jukebox.frame(dt); beatFx.update(flow.name === 'PLAYING' || flow.name === 'INTRO' || flow.name === 'PAUSED' || flow.name === 'TITLE' ? flow.G.world : null, dt); },
});

// Hook for tests and debugging (house rule 8).
window.__game = {
  ready: false, params: { debug, seed, stage: startStage, god: run.cheats.god, boss: bossJump },
  run, flow, fsm: flow.fsm, input, quality, gfx, world: null, events, sfx, jukebox,
  get frames() { return frameCount; }, get simSteps() { return simSteps; },
  get fps() { return debugPanel ? debugPanel.stats.fps : null; },
  get drawCalls() { return gfx.renderer.info.render.calls; },
  get state() { return flow.name; },
};

flow.go('BOOT');
loop.start();
window.__game.ready = true;
