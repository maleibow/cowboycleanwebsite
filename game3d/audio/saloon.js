import { SALOON_TUNE, BASS, STEP } from '../data/saloonTune.js';

// Plays the saloon jingle on the shared synth (no files): a tinkling lead over a bass, looped until stop().
export function createSaloonMusic(synth) {
  let timer = 0, i = 0;
  const tick = () => {
    if (!synth.ready) return;
    const n = SALOON_TUNE[i % SALOON_TUNE.length], bs = BASS[i % BASS.length];
    if (n) synth.tone({ f: n, type: 'triangle', dur: STEP * 1.6, vol: 0.07 });
    if (n && i % 2 === 0) synth.tone({ f: n * 2, type: 'sine', dur: STEP, vol: 0.02 });
    if (bs) synth.tone({ f: bs, type: 'square', dur: STEP * 1.2, vol: 0.035 });
    i++;
  };
  return { start() { if (timer) return; i = 0; tick(); timer = setInterval(tick, STEP * 1000); }, stop() { clearInterval(timer); timer = 0; }, get playing() { return !!timer; } };
}
