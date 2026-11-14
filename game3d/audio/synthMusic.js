import { createRng } from '../core/rng.js';
import { MUSIC } from '../data/music.js';

// Procedural fallback music (PLAN 8.2): a drum + bass + arpeggio loop per slot, built from a mood (root note, scale, wave,
// drum style) and a seeded pattern, so each stage always sounds the same. Used when a slot has no file or its file fails.
// Notes are scheduled a little ahead on the audio clock; everything goes to `out` (the Jukebox mix), never straight to the speakers.
// mood: root = MIDI note of the key, scale = semitone steps, lead / bass = oscillator types, drums = 'none' | 'soft' | 'march' | 'drive', arp = notes per bar
const SC = { minor: [0, 2, 3, 5, 7, 8, 10], minorPent: [0, 3, 5, 7, 10], major: [0, 2, 4, 5, 7, 9, 11], majorPent: [0, 2, 4, 7, 9], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], harmonic: [0, 2, 3, 5, 7, 8, 11], dim: [0, 2, 3, 5, 6, 8, 9, 11] };
export const MOODS = {
  title:   { root: 50, scale: SC.minorPent, lead: 'triangle', bass: 'triangle', drums: 'soft', arp: 8 },     // hopeful western
  stage1:  { root: 50, scale: SC.minorPent, lead: 'square', bass: 'triangle', drums: 'march', arp: 8 },     // Desert Scrub
  stage2:  { root: 45, scale: SC.phrygian, lead: 'sawtooth', bass: 'square', drums: 'drive', arp: 12 },     // Toxic Jungle
  stage3:  { root: 43, scale: SC.minor, lead: 'square', bass: 'sawtooth', drums: 'drive', arp: 8 },         // Neo-Scrap City
  stage4:  { root: 48, scale: SC.dorian, lead: 'triangle', bass: 'square', drums: 'march', arp: 12 },      // New York City
  stage5:  { root: 53, scale: SC.major, lead: 'sine', bass: 'triangle', drums: 'soft', arp: 12 },            // Paris Nights
  stage6:  { root: 40, scale: SC.harmonic, lead: 'sawtooth', bass: 'sawtooth', drums: 'drive', arp: 8 },   // Volcano Peak
  stage7:  { root: 55, scale: SC.majorPent, lead: 'square', bass: 'triangle', drums: 'march', arp: 16 },    // Rainbow Island
  stage8:  { root: 52, scale: SC.lydian, lead: 'sine', bass: 'sine', drums: 'none', arp: 8 },               // Cloud Dream
  stage9:  { root: 46, scale: SC.dim, lead: 'triangle', bass: 'sine', drums: 'none', arp: 4 },              // Haunted Village
  stage10: { root: 41, scale: SC.minor, lead: 'sawtooth', bass: 'square', drums: 'march', arp: 8 },        // Charcoal Streets
  boss:    { root: 38, scale: SC.phrygian, lead: 'sawtooth', bass: 'sawtooth', drums: 'drive', arp: 16 },  // boss fights
  saloon:  { root: 48, scale: SC.majorPent, lead: 'triangle', bass: 'triangle', drums: 'none', arp: 8 },
};
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const AHEAD = 0.18, TICK = 40;                       // schedule this far ahead (s), every TICK ms

export function createSynthMusic(synth, out) {
  let timer = 0, key = null, nextT = 0, step = 0, mood = null, bpm = 100, lead = [], bassLine = [];
  const note = (deg, oct = 0) => { const sc = mood.scale; return mood.root + 12 * (oct + Math.floor(deg / sc.length)) + sc[((deg % sc.length) + sc.length) % sc.length]; };
  const build = (k) => {                              // a 4-bar (64 step) pattern, seeded by the slot so it never changes
    const r = createRng([...k].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)); lead = []; bassLine = [];
    const prog = [0, 0, 3, 4].map((d) => d % mood.scale.length), per = 16 / mood.arp;
    for (let bar = 0; bar < 4; bar++) for (let i = 0; i < 16; i++) {
      const on = i % per === 0, root = prog[bar];
      lead.push(on && r.next() > 0.18 ? note(root + [0, 2, 4, 5, 7, 4, 2, 1][Math.floor(r.next() * 8)], 1 + (r.next() > 0.8 ? 1 : 0)) : 0);
      bassLine.push(i % 4 === 0 ? note(root, -1) : i % 8 === 6 ? note(root + 4, -1) : 0);
    }
  };
  const play = (t, s) => {
    const at = Math.max(0, t - synth.now), i = s % 64, d = mood.drums, q = (s % 16);
    if (lead[i]) synth.tone({ f: hz(lead[i]), type: mood.lead, dur: 0.22, vol: 0.05, at, out });
    if (bassLine[i]) synth.tone({ f: hz(bassLine[i]), type: mood.bass, dur: 0.3, vol: 0.075, at, out });
    if (d === 'none') return;
    const kick = d === 'drive' ? q % 4 === 0 : q === 0 || q === 8 || (d === 'march' && q === 10);
    if (kick) synth.tone({ f: 150, f2: 42, type: 'sine', dur: 0.16, vol: 0.2, at, out });
    if (q === 4 || q === 12) synth.noise({ dur: 0.12, vol: d === 'soft' ? 0.04 : 0.08, filter: 'bandpass', f: 1800, q: 0.8, at, out });
    if (d !== 'soft' ? q % 2 === 0 : q % 4 === 2) synth.noise({ dur: 0.04, vol: 0.025, filter: 'highpass', f: 6500, at, out });
  };
  const pump = () => {
    if (!synth.ready) return;
    const stepLen = 60 / bpm / 4, now = synth.now;
    if (nextT < now) nextT = now + 0.05;             // fell behind (tab was hidden): restart the clock, never burst
    while (nextT < now + AHEAD) { play(nextT, step); step++; nextT += stepLen; }
  };
  return {
    get playing() { return !!timer; }, get key() { return key; },
    start(k) {
      this.stop(); key = k; mood = MOODS[k] || MOODS.stage1; bpm = MUSIC[k]?.bpm || 100; step = 0; nextT = 0; build(k);
      timer = setInterval(pump, TICK); pump();
    },
    stop() { clearInterval(timer); timer = 0; key = null; },
  };
}
