import { SALOON_TUNE, BASS, STEP } from '../data/saloonTune.js';

// The original saloon jingle on the shared synth (no files), looped until stop(). It plays through the synth's MUSIC bus,
// so the Jukebox's music volume and Spotify mode (which silences the bus) govern it like any other game music.
export function createSaloonMusic(synth) {
  let timer = 0, i = 0;
  const tick = () => {
    if (!synth.ready) return;
    const out = synth.musicBus;
    synth.tone({ f: SALOON_TUNE[i % SALOON_TUNE.length], type: 'square', dur: 0.15, vol: 0.05, out });
    synth.tone({ f: BASS[i % BASS.length], type: 'triangle', dur: 0.2, vol: 0.08, out });
    i++;
  };
  return { start() { if (timer) return; i = 0; tick(); timer = setInterval(tick, STEP * 1000); }, stop() { clearInterval(timer); timer = 0; }, get playing() { return !!timer; } };
}
