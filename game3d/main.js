import { createLoop } from './core/loop.js';
import { createInput } from './core/input.js';
import { createQuality, pickTier } from './core/quality.js';
import { onSetting, settings } from './core/settings.js';
import { run, newRun } from './core/state.js';
import { events } from './core/events.js';
import { createRenderer } from './render/renderer.js';
import { createLevelSteps } from './world/level.js';
import { createLookdev } from './world/lookdev.js';
import { createStageCards } from './ui/stageCards.js';
import { createHud } from './ui/hud.js';
import { createFullscreenButton } from './ui/fullscreen.js';
import { createTouchControls } from './ui/touch.js';
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
onSetting((k) => { if ((k === 'quality' || k === '*') && !params.get('quality')) { quality.setTier(pickTier(params)); } });   // Settings > Quality (shadows switch on / off from the next stage)
// HUD and menus are laid out for a 540 px tall screen; on a short phone (a 16:9 box only 390 px tall) they are scaled down to fit.
const fitUi = () => {
  const k = Math.max(0.62, Math.min(1, box.clientHeight / 540));
  for (const id of ['hud', 'ui']) { const e = document.getElementById(id); e.style.transformOrigin = '0 0'; e.style.transform = k < 1 ? `scale(${k.toFixed(3)})` : ''; e.style.width = k < 1 ? `${(100 / k).toFixed(2)}%` : ''; e.style.height = k < 1 ? `${(100 / k).toFixed(2)}%` : ''; }
};
new ResizeObserver(fitUi).observe(box); fitUi();
const hud = createHud(document.getElementById('hud'));
const sfx = initSfx();   // synth sound effects: listens to the event bus, unlocks on the first key / tap
const jukebox = createJukebox({ sfx, box });   // music: Game mix / Spotify / synth, volumes, beat analysis (PLAN 8)
createNowPlaying(document.getElementById('hud'), jukebox);
const foes = params.get('foes') !== '0'; // ?foes=0: no enemies/obstacles (pure platformer, used by the platformer tests)
// ?lookdev=1 shows the art-kit stage 1 scene (new toon look + animated hero) instead of the grey-box level.
const lookdev = params.get('lookdev') === '1';
const cards = createStageCards(document.getElementById('hud'));
const uiRoot = document.getElementById('ui');
createFullscreenButton(uiRoot);
const touch = createTouchControls(input, { params });   // on-screen joystick + buttons: shown on touch devices while playing (ui/touch.js)
// The title screen shows by default. Dev parameters that name a stage / skip screens start straight in the game (house rule 8).
const skipIntro = params.get('intro') === '0' || bossJump || lookdev;
const skipTitle = params.get('title') === '0' || params.has('stage') || params.get('intro') === '0' || bossJump || lookdev;

const beatFx = createBeatFx({ jukebox, gfx, quality });
const debugPanel = debug ? createDebugPanel(gfx, quality) : null;
let freeCam = null;
const makeWorldSteps = (opts = {}) => (lookdev
  ? (function* () { return createLookdev(quality, gfx, input, params); })()
  : createLevelSteps(quality, { stage: run.stage, seed, debug, hud, foes, gfx, cards, ...opts }));
// Stages build in slices behind the intro card (flow.js). Automated browsers (navigator.webdriver) build them at once so the older smoke
// tests, which expect the new stage the instant it is requested, keep working; ?load=slice / ?load=sync force either way.
const sliced = params.get('load') ? params.get('load') !== 'sync' : !navigator.webdriver;
const flow = createFlow({
  sliced, gfx, input, hud, cards, sfx, jukebox, makeWorldSteps, ui: uiRoot, skipTitle, skipIntro,
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
  run, flow, fsm: flow.fsm, input, touch, loop, quality, gfx, world: null, events, sfx, jukebox,
  get frames() { return frameCount; }, get simSteps() { return simSteps; },
  get fps() { return debugPanel ? debugPanel.stats.fps : null; },
  get drawCalls() { return gfx.renderer.info.render.calls; },
  get state() { return flow.name; },
};

// ---- robustness: the game pauses itself when it cannot be seen or drawn, and recovers on its own
const pausePlaying = () => { if (flow.name === 'PLAYING') flow.go('PAUSED'); };
events.on('orientation', ({ portrait }) => { if (portrait) pausePlaying(); });                 // phone turned upright: rotate prompt + pause
document.addEventListener('visibilitychange', () => { if (document.hidden) { pausePlaying(); jukebox.setActive(false); } else jukebox.setActive(true); });   // (the loop itself stops while hidden: core/loop.js)
const lostEl = document.createElement('div');                                                   // WebGL context lost (GPU reset, tab backgrounded on a phone)
lostEl.id = 'gl-lost'; lostEl.style.cssText = 'position:absolute;inset:0;z-index:60;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:rgba(8,4,16,.92);color:#fff;font-family:Bangers,cursive;letter-spacing:2px;text-align:center;pointer-events:auto';
lostEl.innerHTML = '<div style="font-size:48px;color:#ffd84a;text-shadow:3px 3px 0 #000">GRAPHICS RESET</div><div style="font-size:22px">Getting the picture back...</div>';
box.appendChild(lostEl);
events.on('glLost', () => { pausePlaying(); lostEl.style.display = 'flex'; });
events.on('glRestored', () => { lostEl.style.display = 'none'; });
const keysHint = document.getElementById('title-keys'); if (keysHint && touch.enabled) keysHint.textContent = 'LEFT THUMB: MOVE   RIGHT THUMB: JUMP · SPRAY · BOMB · SLIDE';
const splash = document.getElementById('splash');   // the plain-HTML first-paint card (cleaningup3d.html): goes as soon as a real screen is up
events.on('state', (n) => { if (splash && n !== 'BOOT') { splash.style.pointerEvents = 'none'; splash.style.opacity = 0; setTimeout(() => splash.remove(), 400); } });
events.on('worldReady', () => { window.__game.ready = true; });   // tests wait for this: the first stage is built and playable
flow.go('BOOT');
loop.start();
