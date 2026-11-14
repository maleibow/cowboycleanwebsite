import { events } from '../core/events.js';
import { run } from '../core/state.js';
import { MUSIC } from '../data/music.js';
import { createSynthMusic } from './synthMusic.js';
import { createSpotifyDock } from './spotifyDock.js';

// The Jukebox (PLAN 8): which music plays, from which source, how loud, and what the visuals can read from it.
//   source 'mix'     the artist's files streamed from game3d/music/ (one <audio>, preload="none", per deck) through WebAudio:
//                    loop, crossfade between stage / boss / saloon, duck under cutscene text, an analyser for beat reactivity.
//                    A slot whose file is missing or fails plays the synth loop instead; the game is never silent or in error.
//   source 'synth'   always the procedural loop (audio/synthMusic.js).
//   source 'spotify' the official embed docked in a corner (audio/spotifyDock.js); the game mix is silenced, SFX stay on.
// Graph: decks + synth music -> mix -> duck -> analyser -> synth.musicBus (music volume) -> compressor.  Settings persist in localStorage.
const KEY = 'cc3d_jukebox', FADE = 1.2;
const SOURCES = ['mix', 'spotify', 'synth'], LABEL = { mix: 'Game mix', spotify: 'Spotify', synth: 'Synth' };
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (c) => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode */ } };
const clamp = (v, d) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);
const HOLD = new Set(['CUTSCENE', 'CASINO', 'VICTORY']);        // states that keep whatever is playing

export function createJukebox({ sfx, box }) {
  const synth = sfx.synth, saved = load();
  const cfg = { source: SOURCES.includes(saved.source) ? saved.source : 'mix', music: clamp(saved.music, 0.7), sfx: clamp(saved.sfx, 1) };
  const energy = { bass: 0, mid: 0, high: 0, pulse: 0 };
  const api = { cfg, energy, heard: [], SOURCES, LABEL, get slotKey() { return key; }, get source() { return cfg.source; } };
  const dock = createSpotifyDock(box), failed = new Set(), synthMusic = { m: null };
  let key = null, spotKey = 'title', bossOn = false, stateName = 'BOOT', voice = { kind: 'none', key: null, deck: null };
  let ac = null, mix, duck, analyser, synthGain, decks, bins, avg = 0, cool = 0, retryAt = 0;

  // ---- the audio graph, built once the browser lets the AudioContext run (first key / tap)
  function ensureGraph() {
    if (ac || !synth.ready) return !!ac; ac = synth.ctx;
    mix = ac.createGain(); duck = ac.createGain(); analyser = ac.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.55;
    mix.connect(duck); duck.connect(analyser); analyser.connect(synth.musicBus); bins = new Uint8Array(analyser.frequencyBinCount);
    synthGain = ac.createGain(); synthGain.gain.value = 0; synthGain.connect(mix); synthMusic.m = createSynthMusic(synth, synthGain);
    decks = [0, 1].map(() => {
      const audio = new Audio(); audio.preload = 'none'; audio.loop = true;
      const d = { audio, gain: ac.createGain(), key: null, token: 0 }; d.gain.gain.value = 0;
      ac.createMediaElementSource(audio).connect(d.gain); d.gain.connect(mix);
      audio.addEventListener('error', () => { if (d.key && audio.error?.code === 4) { failed.add(d.key); sync(); } });   // 404 / unsupported file: this slot uses synth from now on
      return d;
    });
    return true;
  }
  const fade = (g, to, sec = FADE) => g.gain.setTargetAtTime(to, ac.currentTime, sec / 4);

  // ---- which slot should be playing, and from what
  const wantedKey = () => {
    if (stateName === 'TITLE') return 'title';
    if (stateName === 'STORE') return 'saloon';
    if (HOLD.has(stateName)) return stateName === 'CUTSCENE' && key === 'saloon' ? 'stage' + run.stage : key || 'title';
    return bossOn ? 'boss' : 'stage' + run.stage;
  };
  const kindFor = (k) => {
    if (cfg.source === 'synth') return k === 'saloon' ? 'jingle' : 'synth';
    if (MUSIC[k]?.file && !failed.has(k)) return 'file';
    return k === 'saloon' ? 'jingle' : 'synth';           // a missing saloon track keeps the original jingle
  };
  function stopVoice(v) {
    if (v.kind === 'file') { const d = v.deck, t = ++d.token; fade(d.gain, 0); setTimeout(() => { if (d.token === t) d.audio.pause(); }, FADE * 1000 + 300); }
    else if (v.kind === 'synth') { synthMusic.m.stop(); synthGain.gain.value = 0; }
    else if (v.kind === 'jingle') sfx.saloon.stop();
  }
  function startVoice(kind, k) {
    const v = { kind, key: k, deck: null };
    if (kind === 'file') {
      const d = decks.find((x) => x !== voice.deck) || decks[0]; d.key = k; v.deck = d; const t = ++d.token;
      d.audio.src = new URL('../' + MUSIC[k].file, import.meta.url).href; d.gain.gain.value = 0; fade(d.gain, 1);
      d.audio.play().catch((e) => { if (e?.name === 'NotAllowedError') retryAt = performance.now() + 700; else if (d.token === t) { failed.add(k); sync(); } });
    } else if (kind === 'synth') { synthMusic.m.start(k); synthGain.gain.value = 0; fade(synthGain, 1, 0.6); }
    else sfx.saloon.start();
    return v;
  }
  function note(k) { if (k !== 'title' && !api.heard.includes(k)) api.heard.push(k); }
  function sync() {
    const k = wantedKey();
    if (cfg.source === 'spotify') {                         // the embed follows the stage, never a mid-fight boss swap
      if (voice.kind !== 'none' && ac) { stopVoice(voice); voice = { kind: 'none', key: null, deck: null }; }
      dock.show(MUSIC[spotKey]); note(spotKey); announce(spotKey); return;
    }
    dock.hide();
    if (!ensureGraph()) { announce(k); return; }            // before the first key press: nothing can sound yet
    const kind = kindFor(k);
    if (voice.kind === kind && voice.key === k) { announce(k); return; }
    stopVoice(voice); voice = startVoice(kind, k); key = k; note(k); announce(k);
  }
  const announce = (k) => { key = cfg.source === 'spotify' ? spotKey : k; events.emit('musicChanged', api.nowPlaying); };

  // ---- public settings
  const apply = () => { synth.setLevels({ sfx: cfg.sfx, music: cfg.music, musicAudible: cfg.source !== 'spotify' }); };
  api.set = (patch) => {
    if (patch.source && SOURCES.includes(patch.source)) cfg.source = patch.source;
    if ('music' in patch) cfg.music = clamp(patch.music, cfg.music);
    if ('sfx' in patch) cfg.sfx = clamp(patch.sfx, cfg.sfx);
    save(cfg); apply(); if (patch.source) { if (voice.kind !== 'none' && ac) { stopVoice(voice); voice = { kind: 'none', key: null, deck: null }; } sync(); }
    events.emit('jukeboxChanged', cfg);
  };
  api.info = () => ({ voice: voice.kind, key: voice.key, source: cfg.source, spotifyShown: dock.visible, failed: [...failed], src: voice.deck?.audio.src || null, playing: voice.deck ? !voice.deck.audio.paused : voice.kind === 'synth' ? !!synthMusic.m?.playing : voice.kind === 'jingle' ? sfx.saloon.playing : false });   // for tests
  api.resetHeard = () => { api.heard.length = 0; };
  api.bossOff = () => { bossOn = false; sync(); };
  Object.defineProperty(api, 'nowPlaying', { get() {
    const k = cfg.source === 'spotify' ? spotKey : key || 'title', slot = MUSIC[k] || MUSIC.title;
    return { key: k, title: slot.title, source: cfg.source, label: LABEL[cfg.source], voice: voice.kind, slot };
  } });
  api.beatActive = () => cfg.source !== 'spotify' && (voice.kind === 'file' || voice.kind === 'synth');

  // ---- analysis, once per rendered frame: bass / mid / high energy (0..1) and a beat pulse that jumps to 1 on a bass onset
  api.frame = (dt) => {
    if (ac && retryAt && performance.now() > retryAt) { retryAt = 0; if (voice.kind === 'file' && voice.deck.audio.paused) voice.deck.audio.play().catch(() => { retryAt = performance.now() + 1500; }); }
    if (!ac) { if (synth.ready && cfg.source !== 'spotify') sync(); else return; }
    energy.pulse = Math.max(0, energy.pulse - dt * 4.5);
    if (!api.beatActive()) { energy.bass = energy.mid = energy.high = 0; return; }
    analyser.getByteFrequencyData(bins);
    const mean = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += bins[i]; return s / ((b - a) * 255); };
    const bass = mean(0, 3), mid = mean(3, 30), high = mean(30, 200), k = Math.min(1, dt * 12);
    energy.bass += (bass - energy.bass) * k; energy.mid += (mid - energy.mid) * k; energy.high += (high - energy.high) * k;
    avg += (bass - avg) * Math.min(1, dt * 1.5); cool -= dt;
    if (cool <= 0 && bass > avg * 1.22 + 0.04 && bass > 0.2) { energy.pulse = 1; cool = 0.16; }
  };

  // ---- game events
  events.on('state', (name) => {
    stateName = name;
    if (name === 'TITLE') { spotKey = 'title'; bossOn = false; }
    if (name === 'INTRO') bossOn = false;
    if (name === 'INTRO' || (spotKey === 'title' && name !== 'TITLE' && !HOLD.has(name) && name !== 'STORE' && name !== 'BOOT')) spotKey = 'stage' + run.stage;   // the embed follows the stage (also when a dev URL skips the intro card)
    if (name === 'GAMEOVER' || name === 'STORE') bossOn = false;
    if (ac) fade(duck, name === 'CUTSCENE' ? 0.3 : 1, 0.6);             // duck under cutscene text
    sync();
  });
  events.on('bossFight', () => { bossOn = true; sync(); });
  apply(); sync();
  return api;
}
