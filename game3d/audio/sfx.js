import { events } from '../core/events.js';
import { createSynth } from './synth.js';
import { createSaloonMusic } from './saloon.js';

// Every sound effect, synthesised (no files). Part 1 is the original game's `Sound` object (cleaningup.html 1416-1475)
// ported one for one: same oscillator type, start / end frequency, length and volume. Part 2 is what the 3D game needs
// and the original lacks. Gameplay never calls this: it emits events, and the table at the bottom maps events to sounds.
// Repeats get a small random pitch shift and a per-sound minimum gap, and the synth caps simultaneous voices.
const KEY = 'cc3d_muted';
const store = { get() { try { return localStorage.getItem(KEY); } catch { return null; } }, set(v) { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } } };

export function initSfx() {
  const S = createSynth(), last = {};
  S.setMuted(store.get() === '1');

  // Original `Sound.play(id, freq, type, duration, vol, slideFreq)` as a recipe.
  const P = (freq, type, dur, vol, slide = null, o = {}) => ({ dur, pv: 0.04, gap: 0.05, ...o, fn: (k) => S.tone({ f: freq * k, f2: slide && slide * k, type, dur, vol }) });
  const arp = (notes, step, type, dur, vol, k) => notes.forEach((f, i) => S.tone({ f: f * k, type, dur, vol, at: i * step }));

  const SOUNDS = {
    // ---- 1. the original Sound object
    shoot: P(800, 'sawtooth', 0.15, 0.1, 100),
    jump: P(250, 'square', 0.2, 0.08, 400),
    hit: P(100, 'sawtooth', 0.3, 0.2, 40, { prio: 1, pv: 0.02 }),
    enemyHit: P(300, 'triangle', 0.1, 0.08, 100),
    enemyDie: P(150, 'square', 0.2, 0.15, 50),
    bombDrop: P(400, 'triangle', 0.5, 0.1, 100, { pv: 0 }),
    powerupBlip: P(400, 'sine', 0.1, 0.1),
    shieldHit: P(600, 'sine', 0.3, 0.2, 200, { prio: 1 }),
    bossSpawn: P(60, 'sawtooth', 1.5, 0.3, null, { prio: 2, pv: 0 }),
    warp: P(100, 'sine', 2.0, 0.3, 800, { prio: 1, pv: 0 }),
    coinBlip: P(1200, 'sine', 0.1, 0.1, 2000, { pv: 0.05 }),
    buy: { dur: 0.3, pv: 0, gap: 0.05, fn: (k) => { S.tone({ f: 800 * k, f2: 1200 * k, type: 'square', dur: 0.1, vol: 0.1 }); S.tone({ f: 1200 * k, type: 'square', dur: 0.2, vol: 0.1, at: 0.1 }); } },
    error: P(150, 'sawtooth', 0.2, 0.2, 100, { pv: 0 }),

    // ---- 2. new for the 3D game
    footstep: { dur: 0.07, pv: 0.3, gap: 0.12, fn: (k) => S.noise({ dur: 0.06, vol: 0.05, filter: 'lowpass', f: 1100 * k, f2: 350 * k }) },
    land: { dur: 0.2, pv: 0.08, gap: 0.08, fn: (k, a) => { const v = Math.min(1, 0.4 + (a || 6) / 16); S.tone({ f: 130 * k, f2: 45, type: 'sine', dur: 0.15, vol: 0.16 * v }); S.noise({ dur: 0.09, vol: 0.07 * v, filter: 'lowpass', f: 900, f2: 250 }); } },
    slide: { dur: 0.4, pv: 0.05, gap: 0.2, fn: (k) => S.noise({ dur: 0.38, vol: 0.08, filter: 'bandpass', f: 1300 * k, f2: 450 * k, q: 1.4, attack: 0.03 }) },
    crateBreak: { dur: 0.3, pv: 0.08, gap: 0.05, prio: 1, fn: (k) => { S.noise({ dur: 0.18, vol: 0.16, filter: 'highpass', f: 1800 * k, f2: 900 }); S.tone({ f: 330 * k, f2: 70, type: 'square', dur: 0.12, vol: 0.09 }); S.tone({ f: 520 * k, f2: 180, type: 'triangle', dur: 0.14, vol: 0.07, at: 0.04 }); } },
    coin: { dur: 0.22, pv: 0.06, gap: 0.045, fn: (k) => { S.tone({ f: 1200 * k, f2: 2000 * k, type: 'sine', dur: 0.1, vol: 0.1 }); S.tone({ f: 1800 * k, f2: 2600 * k, type: 'sine', dur: 0.12, vol: 0.05, at: 0.05 }); } },
    powerup: { dur: 0.45, pv: 0.02, gap: 0.1, prio: 1, fn: (k) => { S.tone({ f: 400 * k, type: 'sine', dur: 0.1, vol: 0.1 }); arp([523, 659, 784, 1047], 0.065, 'triangle', 0.16, 0.09, k); } },
    overheat: { dur: 0.7, pv: 0.03, gap: 0.5, prio: 1, fn: (k) => { S.noise({ dur: 0.65, vol: 0.12, filter: 'highpass', f: 3500 * k, f2: 1800, attack: 0.02 }); S.tone({ f: 95, f2: 55, type: 'sawtooth', dur: 0.3, vol: 0.06 }); } },
    gateWhoosh: { dur: 0.45, pv: 0.05, gap: 0.3, prio: 1, fn: (k) => { S.noise({ dur: 0.2, vol: 0.12, filter: 'bandpass', f: 400 * k, f2: 2600 * k, q: 1.2, attack: 0.05 }); S.noise({ dur: 0.22, vol: 0.1, filter: 'bandpass', f: 2600 * k, f2: 350 * k, q: 1.2, at: 0.2, attack: 0.01 }); } },
    pitFall: { dur: 0.9, pv: 0, gap: 0.5, prio: 1, fn: () => { S.tone({ f: 700, f2: 60, type: 'sine', dur: 0.8, vol: 0.13 }); S.tone({ f: 350, f2: 40, type: 'triangle', dur: 0.8, vol: 0.06 }); } },
    checkpoint: { dur: 0.7, pv: 0, gap: 0.3, prio: 1, fn: () => { arp([784, 988, 1175, 1568], 0.08, 'sine', 0.3, 0.09, 1); arp([392, 494, 587, 784], 0.08, 'triangle', 0.3, 0.05, 1); } },
    bossSlam: { dur: 0.7, pv: 0.03, gap: 0.3, prio: 2, fn: (k) => { S.tone({ f: 95 * k, f2: 28, type: 'sine', dur: 0.6, vol: 0.38 }); S.noise({ dur: 0.5, vol: 0.3, filter: 'lowpass', f: 700, f2: 120 }); } },
    shockwave: { dur: 0.9, pv: 0.03, gap: 0.3, prio: 1, fn: (k) => { S.tone({ f: 220 * k, f2: 55, type: 'sawtooth', dur: 0.8, vol: 0.1 }); S.noise({ dur: 0.8, vol: 0.12, filter: 'bandpass', f: 1800, f2: 200, q: 0.8, attack: 0.05 }); } },
    bomb: { dur: 0.8, pv: 0.02, gap: 0.2, prio: 2, fn: (k) => { S.tone({ f: 400 * k, f2: 100, type: 'triangle', dur: 0.5, vol: 0.1 }); S.tone({ f: 80, f2: 30, type: 'sine', dur: 0.6, vol: 0.3, at: 0.05 }); S.noise({ dur: 0.7, vol: 0.28, filter: 'lowpass', f: 1500, f2: 150, at: 0.05 }); } },
    stageClear: { dur: 1.7, pv: 0, gap: 1, prio: 2, fn: () => { arp([523, 659, 784, 1047], 0.13, 'square', 0.2, 0.09, 1); [523, 659, 784, 1047].forEach((f) => S.tone({ f, type: 'triangle', dur: 1.0, vol: 0.07, at: 0.6 })); } },
    playerDied: { dur: 1.0, pv: 0, gap: 1, prio: 2, fn: () => { S.tone({ f: 330, f2: 50, type: 'sawtooth', dur: 0.9, vol: 0.18 }); S.tone({ f: 165, f2: 35, type: 'square', dur: 0.9, vol: 0.08 }); } },
    // game-flow screens: typewriter blip per speaker (cutscenes), reel stop uses the original `hit`
    blip: { dur: 0.06, pv: 0.08, gap: 0.035, fn: (k, who) => S.tone({ f: (BLIP[who] || 300) * k, type: 'square', dur: 0.05, vol: 0.035 }) },
    shootSuper: P(520, 'sawtooth', 0.12, 0.12, 70, { pv: 0.05 }),
    shootLaser: P(1500, 'square', 0.12, 0.07, 260, { pv: 0.04 }),
    shootHoming: P(900, 'triangle', 0.18, 0.1, 380),
    shootGrenade: P(220, 'triangle', 0.16, 0.14, 80),
    shootSpin: P(700, 'sine', 0.14, 0.1, 480),
    // ---- stage 2: Toxic Jungle (vines, Big Sludge, jungle enemies)
    vineGrab: { dur: 0.35, pv: 0.06, gap: 0.2, prio: 1, fn: (k) => { S.noise({ dur: 0.3, vol: 0.1, filter: 'bandpass', f: 900 * k, f2: 2200 * k, q: 2, attack: 0.02 }); S.tone({ f: 180 * k, f2: 120 * k, type: 'triangle', dur: 0.25, vol: 0.07 }); } },
    vineRelease: { dur: 0.4, pv: 0.05, gap: 0.2, prio: 1, fn: (k) => { S.noise({ dur: 0.35, vol: 0.09, filter: 'bandpass', f: 500 * k, f2: 2400 * k, q: 1.1, attack: 0.04 }); S.tone({ f: 300 * k, f2: 700 * k, type: 'sine', dur: 0.25, vol: 0.06 }); } },
    bossHop: { dur: 0.5, pv: 0.04, gap: 0.2, prio: 2, fn: (k) => { S.tone({ f: 190 * k, f2: 45, type: 'sine', dur: 0.4, vol: 0.34 }); S.noise({ dur: 0.35, vol: 0.2, filter: 'lowpass', f: 1400, f2: 180 }); S.tone({ f: 420 * k, f2: 120, type: 'triangle', dur: 0.12, vol: 0.1, at: 0.02 }); } },
    bossSpit: { dur: 1.0, pv: 0.03, gap: 0.5, prio: 2, fn: (k) => { for (let i = 0; i < 6; i++) S.tone({ f: (110 + i * 26) * k, f2: (150 + i * 30) * k, type: 'sawtooth', dur: 0.14, vol: 0.09, at: i * 0.1 }); S.noise({ dur: 0.9, vol: 0.07, filter: 'bandpass', f: 400 * k, f2: 900 * k, q: 3, attack: 0.1 }); } },
    bossEmerge: { dur: 1.6, pv: 0.02, gap: 1, prio: 2, fn: () => { for (let i = 0; i < 9; i++) S.tone({ f: 160 + i * 55 + (i % 2) * 40, f2: 120 + i * 80, type: 'sine', dur: 0.12, vol: 0.12, at: i * 0.15 }); S.tone({ f: 55, f2: 35, type: 'sawtooth', dur: 1.5, vol: 0.18 }); } },
    strikeLand: { dur: 0.35, pv: 0.12, gap: 0.05, fn: (k) => { S.noise({ dur: 0.18, vol: 0.14, filter: 'highpass', f: 2200 * k, f2: 1000 }); S.tone({ f: 640 * k, f2: 180, type: 'triangle', dur: 0.16, vol: 0.1 }); S.tone({ f: 110 * k, f2: 50, type: 'sine', dur: 0.2, vol: 0.12 }); } },
    // ---- stage 3: Neo-Scrap City (conveyors, crushers, the Trash King)
    beltWarn: { dur: 0.7, pv: 0.02, gap: 0.5, prio: 1, fn: () => { for (let i = 0; i < 3; i++) S.tone({ f: i % 2 ? 660 : 880, type: 'square', dur: 0.1, vol: 0.07, at: i * 0.2 }); } },
    beltReverse: { dur: 0.7, pv: 0.03, gap: 0.5, prio: 1, fn: (k) => { S.tone({ f: 190 * k, f2: 70, type: 'sawtooth', dur: 0.5, vol: 0.12 }); S.noise({ dur: 0.45, vol: 0.1, filter: 'lowpass', f: 1200, f2: 200 }); S.tone({ f: 90, f2: 40, type: 'square', dur: 0.12, vol: 0.14, at: 0.45 }); } },
    pistonWarn: { dur: 0.7, pv: 0.02, gap: 0.3, fn: () => { for (let i = 0; i < 4; i++) S.tone({ f: 520 + i * 90, type: 'square', dur: 0.08, vol: 0.05, at: i * 0.22 }); S.noise({ dur: 0.5, vol: 0.05, filter: 'highpass', f: 3000, f2: 2000, at: 0.1 }); } },
    pistonSlam: { dur: 0.7, pv: 0.04, gap: 0.12, prio: 2, fn: (k) => { S.tone({ f: 80 * k, f2: 28, type: 'sine', dur: 0.5, vol: 0.4 }); S.noise({ dur: 0.35, vol: 0.28, filter: 'bandpass', f: 900, f2: 160, q: 0.9 }); S.tone({ f: 1300 * k, f2: 900, type: 'triangle', dur: 0.4, vol: 0.06, at: 0.02 }); S.tone({ f: 1950 * k, f2: 1500, type: 'triangle', dur: 0.3, vol: 0.04, at: 0.02 }); } },
    bossSiren: { dur: 1.2, pv: 0.02, gap: 0.6, prio: 2, fn: (k) => { for (let i = 0; i < 4; i++) S.tone({ f: (i % 2 ? 560 : 820) * k, type: 'sawtooth', dur: 0.25, vol: 0.09, at: i * 0.28 }); } },
    bossCharge: { dur: 1.0, pv: 0.03, gap: 0.4, prio: 2, fn: (k) => { S.tone({ f: 70 * k, f2: 260 * k, type: 'sawtooth', dur: 0.8, vol: 0.2 }); S.noise({ dur: 0.9, vol: 0.18, filter: 'bandpass', f: 300, f2: 2200, q: 0.9, attack: 0.15 }); } },
    bossCrash: { dur: 0.9, pv: 0.03, gap: 0.3, prio: 2, fn: (k) => { S.tone({ f: 70 * k, f2: 24, type: 'sine', dur: 0.7, vol: 0.42 }); S.noise({ dur: 0.7, vol: 0.34, filter: 'lowpass', f: 2000, f2: 150 }); S.tone({ f: 1100, f2: 400, type: 'square', dur: 0.2, vol: 0.08 }); } },
    junkLand: { dur: 0.4, pv: 0.15, gap: 0.05, fn: (k) => { S.noise({ dur: 0.22, vol: 0.2, filter: 'bandpass', f: 1500 * k, f2: 500, q: 1.2 }); S.tone({ f: 140 * k, f2: 60, type: 'square', dur: 0.15, vol: 0.12 }); S.tone({ f: 2100 * k, f2: 1400, type: 'triangle', dur: 0.15, vol: 0.05 }); } },
    // ---- stage 4: New York City (traffic, manholes, Pizza Rat)
    carHorn: { dur: 0.5, pv: 0.04, gap: 0.3, prio: 1, fn: (k) => { S.tone({ f: 330 * k, type: 'square', dur: 0.4, vol: 0.06 }); S.tone({ f: 415 * k, type: 'square', dur: 0.4, vol: 0.06 }); S.tone({ f: 660 * k, type: 'sawtooth', dur: 0.4, vol: 0.02 }); } },
    carHit: { dur: 0.4, pv: 0.05, gap: 0.2, prio: 1, fn: (k) => { S.noise({ dur: 0.25, vol: 0.22, filter: 'bandpass', f: 1200 * k, f2: 300, q: 0.9 }); S.tone({ f: 120 * k, f2: 50, type: 'square', dur: 0.2, vol: 0.14 }); S.tone({ f: 1800 * k, f2: 700, type: 'triangle', dur: 0.15, vol: 0.05 }); } },
    manholeSteam: { dur: 0.7, pv: 0.1, gap: 1.5, fn: (k) => S.noise({ dur: 0.65, vol: 0.035, filter: 'highpass', f: 2500 * k, f2: 1500, attack: 0.1 }) },
    bossDrop: { dur: 0.6, pv: 0.1, gap: 0.12, fn: (k) => { S.tone({ f: 1000 * k, f2: 260, type: 'triangle', dur: 0.5, vol: 0.07 }); S.noise({ dur: 0.1, vol: 0.06, filter: 'highpass', f: 2500, f2: 1200 }); } },
    bossSwoop: { dur: 0.9, pv: 0.03, gap: 0.4, prio: 2, fn: (k) => { S.tone({ f: 300 * k, f2: 1300 * k, type: 'sawtooth', dur: 0.6, vol: 0.14 }); S.noise({ dur: 0.7, vol: 0.14, filter: 'bandpass', f: 600, f2: 3000, q: 1.2, attack: 0.1 }); S.tone({ f: 90, f2: 40, type: 'sine', dur: 0.4, vol: 0.28, at: 0.5 }); } },
    bossLock: { dur: 0.6, pv: 0.02, gap: 0.4, prio: 1, fn: () => { for (let i = 0; i < 3; i++) S.tone({ f: 600 + i * 220, type: 'square', dur: 0.09, vol: 0.06, at: i * 0.16 }); } },
    // ---- stage 5: Paris Nights (awning springs, the Mime's vanishing act, gargoyles)
    bounce: { dur: 0.5, pv: 0.04, gap: 0.1, prio: 1, fn: (k) => { S.tone({ f: 180 * k, f2: 720 * k, type: 'sine', dur: 0.32, vol: 0.2 }); S.tone({ f: 360 * k, f2: 1100 * k, type: 'triangle', dur: 0.26, vol: 0.08, at: 0.03 }); S.noise({ dur: 0.1, vol: 0.06, filter: 'bandpass', f: 1800, f2: 900, q: 1.2 }); } },
    mimeVanish: { dur: 0.6, pv: 0.03, gap: 0.3, prio: 2, fn: (k) => { S.noise({ dur: 0.5, vol: 0.16, filter: 'bandpass', f: 2600 * k, f2: 500, q: 0.8, attack: 0.02 }); for (let i = 0; i < 4; i++) S.tone({ f: (1500 - i * 260) * k, type: 'triangle', dur: 0.08, vol: 0.06, at: i * 0.06 }); } },
    mimeAppear: { dur: 0.6, pv: 0.03, gap: 0.3, prio: 2, fn: (k) => { S.noise({ dur: 0.4, vol: 0.14, filter: 'bandpass', f: 600, f2: 2600 * k, q: 0.8, attack: 0.15 }); for (let i = 0; i < 4; i++) S.tone({ f: (700 + i * 260) * k, type: 'triangle', dur: 0.08, vol: 0.06, at: 0.1 + i * 0.06 }); S.tone({ f: 1800 * k, f2: 900, type: 'square', dur: 0.1, vol: 0.05, at: 0.35 }); } },
    mimeShot: { dur: 0.15, pv: 0.12, gap: 0.05, fn: (k) => { S.tone({ f: 900 * k, f2: 260, type: 'square', dur: 0.09, vol: 0.06 }); S.noise({ dur: 0.05, vol: 0.05, filter: 'highpass', f: 3000, f2: 2000 }); } },
    // ---- stage 6: Volcano Peak (rockfall, collapsing planks, the lava wave, Magma Maw)
    plankFall: { dur: 0.6, pv: 0.12, gap: 0.08, fn: (k) => { S.noise({ dur: 0.3, vol: 0.16, filter: 'bandpass', f: 500 * k, f2: 180, q: 1.1 }); S.tone({ f: 160 * k, f2: 60, type: 'square', dur: 0.2, vol: 0.08 }); S.noise({ dur: 0.35, vol: 0.06, filter: 'highpass', f: 3000, f2: 1200, at: 0.2 }); } },
    lavaWave: { dur: 1.4, pv: 0.02, gap: 1.0, prio: 2, fn: () => { S.noise({ dur: 1.3, vol: 0.22, filter: 'lowpass', f: 500, f2: 120, attack: 0.3 }); S.tone({ f: 48, f2: 34, type: 'sawtooth', dur: 1.2, vol: 0.2 }); for (let i = 0; i < 4; i++) S.tone({ f: 80 + i * 20, type: 'square', dur: 0.12, vol: 0.05, at: 0.3 + i * 0.2 }); } },
    magmaSink: { dur: 0.9, pv: 0.03, gap: 0.5, prio: 2, fn: (k) => { S.noise({ dur: 0.8, vol: 0.2, filter: 'lowpass', f: 900 * k, f2: 120, attack: 0.05 }); for (let i = 0; i < 5; i++) S.tone({ f: 200 - i * 22, f2: 90, type: 'sine', dur: 0.1, vol: 0.1, at: i * 0.12 }); } },
    magmaErupt: { dur: 1.0, pv: 0.03, gap: 0.4, prio: 2, fn: (k) => { S.tone({ f: 90 * k, f2: 30, type: 'sine', dur: 0.8, vol: 0.45 }); S.noise({ dur: 0.7, vol: 0.32, filter: 'bandpass', f: 800, f2: 200, q: 0.8 }); S.noise({ dur: 0.5, vol: 0.1, filter: 'highpass', f: 2500, f2: 1500, at: 0.05 }); S.tone({ f: 600 * k, f2: 200, type: 'sawtooth', dur: 0.3, vol: 0.08 }); } },
    magmaLob: { dur: 0.5, pv: 0.08, gap: 0.15, fn: (k) => { S.tone({ f: 140 * k, f2: 420 * k, type: 'sawtooth', dur: 0.3, vol: 0.1 }); S.noise({ dur: 0.3, vol: 0.12, filter: 'bandpass', f: 500 * k, f2: 1500, q: 1.2, attack: 0.05 }); } },
    enemyHop: { dur: 0.2, pv: 0.2, gap: 0.12, fn: (k, type) => { if (type === 'frog') { S.tone({ f: 140 * k, f2: 240 * k, type: 'sawtooth', dur: 0.1, vol: 0.06 }); S.tone({ f: 260 * k, f2: 130 * k, type: 'square', dur: 0.09, vol: 0.04, at: 0.09 }); } else S.tone({ f: 300 * k, f2: 520 * k, type: 'sine', dur: 0.1, vol: 0.05 }); } },
    enemyDive: { dur: 0.3, pv: 0.15, gap: 0.2, fn: (k, type) => { if (type === 'gargoyle') { S.tone({ f: 420 * k, f2: 1100 * k, type: 'sawtooth', dur: 0.14, vol: 0.05 }); S.noise({ dur: 0.25, vol: 0.06, filter: 'bandpass', f: 700 * k, f2: 300, q: 1.4 }); } else if (type === 'bat') { S.tone({ f: 1500 * k, f2: 2600 * k, type: 'square', dur: 0.1, vol: 0.035 }); S.tone({ f: 2400 * k, f2: 1300 * k, type: 'square', dur: 0.1, vol: 0.03, at: 0.1 }); } else S.noise({ dur: 0.26, vol: 0.06, filter: 'bandpass', f: 900 * k, f2: 2200 * k, q: 1.5, attack: 0.02 }); } },
  };
  const BLIP = { 'Cowboy Clean': 220, 'Miss Cowboy': 420, 'Grime Overlord': 95, Ghost: 160 };
const SHOOT = { super: 'shootSuper', charcoal: 'shootSuper', laser: 'shootLaser', homing: 'shootHoming', grenade: 'shootGrenade', spin: 'shootSpin' };

  const play = (name, arg) => {
    const r = SOUNDS[name]; if (!r || !S.ready) return;
    const t = S.now; if (last[name] !== undefined && t - last[name] < r.gap) return;
    if (!S.take(r.dur, r.prio || 0)) return;
    last[name] = t; r.fn(1 + (Math.random() - 0.5) * 2 * r.pv, arg);
  };

  // ---- events -> sounds: gameplay emits, this table listens
  const MAP = {
    shoot: (kind) => play(SHOOT[kind] || 'shoot'), jump: () => play('jump'), land: (v) => play('land', v), slide: () => play('slide'), footstep: () => play('footstep'),
    hurt: () => play('hit'), shieldHit: () => play('shieldHit'), enemyHit: () => play('enemyHit'), enemyKilled: () => play('enemyDie'),
    bomb: () => play('bomb'), crateBreak: () => play('crateBreak'), coin: () => play('coin'), powerup: () => play('powerup'), overheat: () => play('overheat'),
    gateWhoosh: () => play('gateWhoosh'), pitFall: () => play('pitFall'), checkpoint: () => play('checkpoint'),
    vineGrab: () => play('vineGrab'), vineRelease: () => play('vineRelease'), bossHop: () => play('bossHop'), bossSpit: () => play('bossSpit'), bossEmerge: () => play('bossEmerge'),
    plankFall: () => play('plankFall'), lavaWave: () => play('lavaWave'), magmaSink: () => play('magmaSink'), magmaErupt: () => play('magmaErupt'), magmaLob: () => play('magmaLob'),
    bounce: () => play('bounce'), mimeVanish: () => play('mimeVanish'), mimeAppear: () => play('mimeAppear'), mimeShot: () => play('mimeShot'),
    carHorn: () => play('carHorn'), carHit: () => play('carHit'), manholeSteam: () => play('manholeSteam'), bossDrop: () => play('bossDrop'), bossSwoop: () => play('bossSwoop'), bossLock: () => play('bossLock'),
    strikeLand: (kind) => play(kind === 'junk' ? 'junkLand' : 'strikeLand'), beltWarn: () => play('beltWarn'), beltReverse: () => play('beltReverse'), pistonWarn: () => play('pistonWarn'), pistonSlam: () => play('pistonSlam'),
    bossSiren: () => play('bossSiren'), bossCharge: () => play('bossCharge'), bossCrash: () => play('bossCrash'), enemyHop: (t) => play('enemyHop', t), enemyDive: (t) => play('enemyDive', t),
    bossIntro: () => play('bossSpawn'), bossRage: () => play('bossSpawn'), bossSlam: () => play('bossSlam'), shockwave: () => play('shockwave'),
    stageCleared: () => play('stageClear'), playerDied: () => play('playerDied'), warp: () => play('warp'), buy: () => play('buy'), error: () => play('error'),
    typeTick: (who) => play('blip', who), reelStop: () => play('hit'),
    jackpot: () => { play('coin'); setTimeout(() => play('coin'), 100); setTimeout(() => play('powerup'), 200); },   // original checkCasinoWin
  };
  for (const [ev, fn] of Object.entries(MAP)) events.on(ev, fn);

  // ---- unlock on the first key press or tap, mute toggle (HUD button emits 'toggleMute', M key), remembered
  const unlock = () => { S.unlock(); if (S.ready) off(); };   // resume() lands a moment later: keep listening until it has
  const unlockEvents = ['keydown', 'pointerdown', 'touchstart'], off = () => unlockEvents.forEach((e) => removeEventListener(e, unlock, true));
  unlockEvents.forEach((e) => addEventListener(e, unlock, true));
  const setMuted = (m) => { S.setMuted(m); store.set(m ? '1' : '0'); events.emit('muteChanged', S.muted); };
  events.on('toggleMute', () => setMuted(!S.muted));
  addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.repeat && !/^(INPUT|TEXTAREA)$/.test(e.target?.tagName || '')) setMuted(!S.muted); });
  events.emit('muteChanged', S.muted);
  // `saloon` is the original store jingle (audio/saloon.js); it plays on the synth's music bus, so the Jukebox volume governs it.
  return { synth: S, saloon: createSaloonMusic(S), play, get muted() { return S.muted; }, setMuted };
}
