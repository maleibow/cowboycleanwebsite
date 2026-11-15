import { reducedMotion } from './settings.js';

// Hit-stop: the whole simulation freezes for a few hundredths of a second on a kill, a hit taken or a bomb, which is what makes
// impacts feel heavy. A short cooldown stops a swarm of kills from stalling the game, and reduced motion switches it off.
const H = { t: 0, cool: 0 };
export const hitStopActive = () => H.t > 0;
export function addHitStop(sec) {
  if (reducedMotion() || (H.cool > 0 && sec < 0.1)) return;
  H.t = Math.max(H.t, sec); H.cool = 0.22;
}
// Call once per simulation step with the step length; true = skip this step.
export function stepHitStop(dt) {
  if (H.cool > 0) H.cool -= dt;
  if (H.t > 0) { H.t -= dt; return true; }
  return false;
}
export const clearHitStop = () => { H.t = 0; H.cool = 0; };
