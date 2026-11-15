import { run, newRun } from './core/state.js';
import { events } from './core/events.js';
import { setStageLook } from './render/materials.js';
import { storyIdFor, Story } from './data/story.js';
import { getStage } from './data/stages.js';
import { createBustStage } from './scenes/bustStage.js';
import { createSaloon } from './scenes/saloon.js';
import { createSlotRoom } from './scenes/slotRoom.js';
import { createTitleFly } from './scenes/titleFly.js';
import { createCutscene } from './ui/cutscene.js';
import { createTitle } from './ui/title.js';
import { createStore } from './ui/store.js';
import { createCasino } from './ui/casino.js';
import { createPauseMenu } from './ui/pauseMenu.js';
import { createGameOver } from './ui/gameOver.js';
import { createVictory } from './ui/victory.js';
import { createSettingsPanel } from './ui/settingsPanel.js';
import { stepHitStop, hitStopActive, clearHitStop } from './core/hitstop.js';
import { testConnection } from './services/leaderboard.js';

// The game-flow state machine (PLAN 10, prompt 5):
//   TITLE -> CUTSCENE(intro) -> INTRO -> PLAYING -> STAGECLEAR -> STORE -> CUTSCENE(stageN, loop 1 only) -> INTRO -> PLAYING ...
//   after stage 10: STAGECLEAR -> CUTSCENE(ending) -> VICTORY -> STORE -> stage 1 with stageLoop + 1.
//   PLAYING <-> PAUSED, PLAYING <-> CASINO (the side-door), PLAYING -> GAMEOVER -> (retry stage | TITLE).
// env = { gfx, input, hud, cards, sfx, ui (DOM root), makeWorld(opts?) -> level, debug }.
const LAST_STAGE = 10;
const HUD_STATES = new Set(['INTRO', 'PLAYING', 'PAUSED', 'STAGECLEAR', 'GAMEOVER']);   // states that show the in-game HUD
const IDLE = { moveX: 0, moveY: 0, jump: false, spray: false, bomb: false, slide: false, pause: false, jumpPressed: false, bombPressed: false, pausePressed: false, anyPressed: false, keys: new Set() };

export function createFlow(env) {
  const { gfx, input, hud, cards, sfx, jukebox } = env, hudEl = document.getElementById('hud');
  const G = { world: null, fly: null, stats: null, overAge: 0, door: null, then: null };
  const fsm = { name: null, current: null };

  // ---- scenes and screens (built once, lazily where they are heavy)
  const bust = createBustStage(), cutscene = createCutscene(env.ui, bust);
  const lazy = {}, once = (k, f) => lazy[k] || (lazy[k] = f());
  const saloon = () => once('saloon', createSaloon), slotRoom = () => once('slot', createSlotRoom);
  let store, casino;
  const settingsPanel = createSettingsPanel(env.ui), openSettings = () => settingsPanel.show();
  const title = createTitle(env.ui, { onStart: () => startRun(1), onCheat: (c) => startRun(c.stage, c.vehicle), jukebox, onSettings: openSettings });
  const pauseMenu = createPauseMenu(env.ui, { onResume: () => fsm.name === 'PAUSED' && go('PLAYING'), onRestart: () => { G.world.restart(); hud.reset(); cards.reset(); jukebox.bossOff(); go('PLAYING'); }, onQuit: () => toTitle(), onSettings: openSettings, jukebox });
  const gameOver = createGameOver(env.ui, { onRetry: () => retry(), onQuit: () => toTitle(), jukebox });
  const victory = createVictory(env.ui, { onContinue: () => go('STORE'), jukebox });

  const disposeWorld = () => { if (G.fly) { G.fly.dispose(); G.fly = null; } if (G.world) { G.world.dispose?.(); G.world = null; } G.loader = null; hud.reset(); cards.reset(); };
  // Stages are built a slice at a time (world/level.js createLevelSteps): loadStage() starts the build, pump() spends a few ms of
  // each frame on it (behind the title, a cutscene or the stage-intro card), and `worldReady` fires when the stage is playable.
  // { sync: true } builds it all at once (dev URLs and tests that need the world immediately).
  const loadStage = (opts, { sync = false } = {}) => {
    disposeWorld();
    sync = sync || !env.sliced;
    G.loader = { gen: env.makeWorldSteps({ ...opts, warm: !sync }), steps: 0, ms: 0, worst: 0, t0: performance.now() };
    if (sync) pump(Infinity);
  };
  const pump = (budget) => {
    const L = G.loader; if (!L) return;
    const t0 = performance.now(); let r;
    let a = t0;
    do { r = L.gen.next(); L.steps++; const b = performance.now(); L.worst = Math.max(L.worst, b - a); a = b; } while (!r.done && r.value !== 'wait' && a - t0 < budget);   // L.worst = the longest single slice (what the player would feel as a hitch)
    L.ms += performance.now() - t0;
    if (r.done) { G.world = r.value; G.loader = null; G.loadMs = L.ms; G.loadSteps = L.steps; G.loadWorst = L.worst; env.onWorld?.(G.world); fitCamera(); events.emit('worldReady', G.world); }
  };
  const loading = () => (G.loader ? 1 - 1 / (1 + G.loader.steps / 10) : null);   // a progress feel for the bar: the exact step count is not known up front
  const fitCamera = () => { if (G.world) { G.world.camera.aspect = gfx.width / gfx.height; G.world.camera.updateProjectionMatrix(); } };
  const restoreLook = () => { const w = G.world; if (w) { setStageLook(w.theme.look); gfx.post.setStage(w.theme.grade); w.camera.aspect = gfx.width / gfx.height; w.camera.updateProjectionMatrix(); } };

  // ---- transitions
  function startRun(stage = 1, vehicle = false) {            // startGame(forceStage): fresh run, then the stage's cutscene
    newRun(stage); jukebox.resetHeard(); if (vehicle) run.upgrades.vehicle = true;
    loadStage(); go('CUTSCENE', { id: storyIdFor(stage), then: 'INTRO' });
  }
  function toTitle() { newRun(1); input.keys.clear(); go('TITLE'); }
  function retry() { gameOver.hide(); input.keys.clear(); hud.reset(); cards.reset(); G.world.restart(); go('PLAYING'); }
  // After the saloon: next stage (stage 10 wraps to stage 1 of the next loop). Story plays only on loop 1 (original nxtStageFn).
  function leaveStore() {
    const wrap = run.stage >= LAST_STAGE, next = wrap ? 1 : run.stage + 1, id = 'stage' + next;
    const story = !wrap && run.stageLoop === 1 && Story[id];
    if (wrap) run.stageLoop += 1;
    run.stage = next; loadStage();
    go('CUTSCENE', { id: story ? id : null, then: 'INTRO' });
  }
  function afterClear() { run.stage >= LAST_STAGE ? go('CUTSCENE', { id: 'ending', then: 'VICTORY' }) : go('STORE'); }

  const idle = (dt) => G.world.update(dt, IDLE);
  const worldView = () => G.world;
  const states = {
    BOOT: { enter() { if (env.skipTitle) { loadStage(undefined, { sync: env.skipIntro }); go(env.skipIntro ? 'PLAYING' : 'INTRO'); } else go('TITLE'); } },   // dev params (?stage, ?intro=0, ?boss=1, ?lookdev=1) start straight on a stage
    TITLE: {
      enter() { title.show(); loadStage({ foes: false }); },     // the menu is up at once; the fly-through appears when its stage has been built
      exit() { title.hide(); },
      update(dt) { G.fly?.update(dt); }, render() { G.fly?.render(); }, view: worldView,
    },
    CUTSCENE: {
      enter({ id, then }) { bust.enter(gfx); G.then = then; cutscene.start(id, () => go(G.then)); },
      exit() { cutscene.ui.hide(); },
      update(dt) { cutscene.update(dt, input); bust.update(dt); }, view: () => bust,
    },
    INTRO: {
      enter() { fitCamera(); cards.showIntro(getStage(run.stage), () => go('PLAYING')); },   // the card waits for the stage to finish building
      update(dt) { cards.pollPad(input); cards.setLoading(loading()); if (G.world) idle(dt); }, render(a) { G.world?.render(a); }, view: worldView,
    },
    PLAYING: {
      enter() { G.world.camera.aspect = gfx.width / gfx.height; },
      update(dt) { if (!stepHitStop(dt)) G.world.update(dt, input); if (input.pausePressed) go('PAUSED'); },
      render(a) { G.world.render(hitStopActive() ? 1 : a); env.afterRender?.(); }, view: worldView,
    },
    PAUSED: {
      enter() { events.emit('pause', true); pauseMenu.show(); }, exit() { events.emit('pause', false); pauseMenu.hide(); },
      update() { if (input.pausePressed && !settingsPanel.open && !settingsPanel.justClosed) go('PLAYING'); }, view: worldView,
    },
    STAGECLEAR: {
      enter() { cards.showClear(getStage(run.stage), G.stats, afterClear); },
      exit() { cards.hideClear(); }, update: idle, render(a) { G.world.render(a); }, view: worldView,
    },
    STORE: {
      enter() { disposeWorld(); const s = saloon(); s.enter(gfx); store ||= createStore(env.ui, run, s); store.show(leaveStore); },
      exit() { store.hide(); }, update(dt) { saloon().update(dt); }, view: () => saloon(),
    },
    CASINO: {
      enter() { const r = slotRoom(); r.enter(gfx); casino ||= createCasino(env.ui, run, r, () => G.world.weapon); casino.show(() => { G.door && (G.door.used = true); go('PLAYING'); }); },
      exit() { casino.ui.hide(); restoreLook(); }, update(dt) { slotRoom().update(dt); casino.update(dt); }, view: () => slotRoom(),
    },
    VICTORY: {
      enter() { bust.enter(gfx); bust.lineup(); victory.show(); },
      exit() { victory.hide(); bust.cheer = false; bust.clear(); }, update(dt) { bust.update(dt); }, view: () => bust,
    },
    GAMEOVER: {
      enter() { G.overAge = 0; gameOver.show(); },
      exit() { gameOver.hide(); input.keys.clear(); },
      update(dt) { G.overAge += dt; G.world.update(dt, input); if (G.overAge > 0.6 && (input.jumpPressed || input.bombPressed) && !gameOver.typing) retry(); },
      render(a) { G.world.render(a); }, view: worldView,
    },
  };

  function go(name, arg) {
    if (!states[name]) throw new Error('unknown state ' + name);
    clearHitStop();
    fsm.current?.exit?.();
    fsm.name = name; fsm.current = states[name];
    hudEl.style.visibility = HUD_STATES.has(name) ? 'visible' : 'hidden';
    events.emit('state', name);
    fsm.current.enter?.(arg);
  }

  // ---- events from the game
  events.on('worldReady', () => { if (fsm.name === 'TITLE' && G.world) { G.fly = createTitleFly(G.world, env.ui, gfx); fitCamera(); } });
  events.on('stageCleared', (stats) => { G.stats = stats; go('STAGECLEAR'); });
  events.on('playerDied', () => go('GAMEOVER'));
  events.on('casinoDoor', (door) => { if (fsm.name === 'PLAYING') { G.door = door; go('CASINO'); } });
  addEventListener('keydown', (e) => { if (fsm.name === 'GAMEOVER' && G.overAge > 0.15 && (e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat) retry(); });   // event-driven: a quick tap must not be missed
  testConnection();    // original: validate the Firestore connection on boot (warns in the console only)

  return {
    fsm, go, startRun, settingsPanel, toTitle, retry, G, title, cutscene, get store() { return store; }, get casino() { return casino; }, gameOver, victory, pauseMenu, bust,
    get name() { return fsm.name; },
    update(dt) {
      input.update();
      if (G.loader) pump(fsm.name === 'INTRO' ? 14 : fsm.name === 'CUTSCENE' ? 8 : 4);
      fsm.current.update?.(dt);
    },
    render(alpha) { fsm.current.render?.(alpha); const v = fsm.current.view?.() ?? G.world; if (v) gfx.render(v.scene, v.camera); },
    dispose() { disposeWorld(); },
  };
}
