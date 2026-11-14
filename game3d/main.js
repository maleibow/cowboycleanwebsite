import { createLoop } from './core/loop.js';
import { createInput } from './core/input.js';
import { createQuality } from './core/quality.js';
import { run, newRun } from './core/state.js';
import { events } from './core/events.js';
import { createRenderer } from './render/renderer.js';
import { createTestScene } from './world/testScene.js';
import { createDebugPanel, createFreeCam } from './core/debug.js';

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
const world = createTestScene(quality);
const debugPanel = debug ? createDebugPanel(gfx, quality) : null;
const freeCam = debug ? createFreeCam(world.camera, input, canvas) : null;

// ---- State machine. Only PLAYING is implemented; the rest are stubs that fall through. ----
const stub = (name) => ({ enter() { console.info(`[state] ${name} not implemented`); }, update() {}, render() {} });
const states = {
  BOOT: { enter() { fsm.go('PLAYING'); }, update() {}, render() {} }, // TITLE etc. come later
  TITLE: stub('TITLE'), CUTSCENE: stub('CUTSCENE'), BOSS: stub('BOSS'), STORE: stub('STORE'),
  CASINO: stub('CASINO'), GAMEOVER: stub('GAMEOVER'), VICTORY: stub('VICTORY'),
  PLAYING: {
    enter() { world.camera.aspect = gfx.width / gfx.height; },
    update(dt) {
      world.update(dt);
      if (input.pausePressed) fsm.go('PAUSED');
    },
    render(alpha) {
      world.render(alpha);
      if (freeCam?.active) freeCam.apply(1 / 60);
    },
  },
  PAUSED: { // simulation frozen; scene still renders
    enter() { events.emit('pause', true); },
    exit() { events.emit('pause', false); },
    update() { if (input.pausePressed) fsm.go('PLAYING'); },
    render() {},
  },
};
const fsm = {
  name: null, current: null,
  go(name) {
    if (!states[name]) throw new Error('unknown state ' + name);
    this.current?.exit?.();
    this.name = name; this.current = states[name];
    events.emit('state', name);
    this.current.enter?.();
  },
};

let frameCount = 0, simSteps = 0;
const loop = createLoop({
  update(dt) { input.update(); simSteps++; fsm.current.update(dt); },
  render(alpha) { fsm.current.render(alpha); gfx.render(world.scene, world.camera); },
  onFrame(dt) { frameCount++; quality.sample(dt * 1000); debugPanel?.frame(dt); },
});

// Hook for tests and debugging (house rule 8).
window.__game = {
  ready: false, params: { debug, seed, stage: startStage, god: run.cheats.god, boss: bossJump },
  run, fsm, input, quality, gfx, world, events,
  get frames() { return frameCount; }, get simSteps() { return simSteps; },
  get fps() { return debugPanel ? debugPanel.stats.fps : null; },
  get drawCalls() { return gfx.renderer.info.render.calls; },
  get state() { return fsm.name; },
};

fsm.go('BOOT');
loop.start();
window.__game.ready = true;
