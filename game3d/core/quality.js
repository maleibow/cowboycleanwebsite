import { settings } from './settings.js';

// Three quality tiers, auto-picked, with dynamic resolution scaling (PLAN 4.1).
// Override with ?quality=low|medium|high. Disable scaling with ?dynres=0.
export const TIERS = {
  // density: how much scenery is scattered. enemyOutline: inverted-hull outlines on enemies (the lowest tier skips them: they double
  // the triangles and draw calls of every enemy; the hero keeps his). slowMs / fastMs: smoothed frame time above / below which resolution steps down / up. Low is a 30 fps tier: a display locked
  // at 33.3 ms (every second vsync) is on target and must not be pushed lower, so its slow line sits just above 33.3.
  high:   { name: 'high',   pixelCap: 2,   shadowMap: 2048, bloom: 1,   bloomScale: 1,   grade: 1, vignette: 1, grain: 1, density: 1, enemyOutline: 1, beat: 1, targetMs: 16.7, slowMs: 21, fastMs: 14, minScale: 0.75 },
  medium: { name: 'medium', pixelCap: 1.5, shadowMap: 0,    bloom: 1,   bloomScale: 0.5, grade: 1, vignette: 1, grain: 0, density: 0.6, enemyOutline: 1, beat: 1, targetMs: 20,   slowMs: 25, fastMs: 16, minScale: 0.7 },
  low:    { name: 'low',    pixelCap: 1.25, shadowMap: 0,   bloom: 0,   bloomScale: 0.5, grade: 1, vignette: 1, grain: 0, density: 0.4, enemyOutline: 0, beat: 0, targetMs: 33.3, slowMs: 34.5, fastMs: 26, minScale: 0.7 },
};

export function pickTier(params = new URLSearchParams(location.search)) {
  const forced = params.get('quality');                         // ?quality= wins over the saved Settings choice
  if (forced && TIERS[forced]) return TIERS[forced];
  if (TIERS[settings.quality]) return TIERS[settings.quality];
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (matchMedia && matchMedia('(pointer: coarse)').matches);
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (mobile) return cores >= 8 && mem >= 6 ? TIERS.medium : TIERS.low;
  return cores <= 2 || mem <= 2 ? TIERS.medium : TIERS.high;
}

// Dynamic resolution (PLAN 4.1): the target for the low tier is a steady 30 fps. When the smoothed frame time stays over the
// target the render scale drops in 5% steps down to the tier's minScale; if the device is STILL too slow, effects are shed one
// by one (bloom, then grade / vignette / grain, then the scale floor drops to 0.5). Sustained headroom brings everything back,
// last shed first, one step at a time. Frame times come from requestAnimationFrame deltas, so a 60 Hz screen that can only
// manage 30 fps reads 33 ms and is held there rather than judged against 60.
export const SLOW_FRAMES = 24, FAST_FRAMES = 150, PROBE_FRAMES = 900, PROBE_MAX = 7200, SHED = ['bloom', 'post', 'floor'];

export function createQuality(params = new URLSearchParams(location.search)) {
  const base = pickTier(params);
  const q = {
    base,
    tier: { ...base },             // a private copy: shedding effects never edits the shared tier table
    scale: 1,                      // dynamic resolution multiplier, minScale..1
    dynamic: params.get('dynres') !== '0',
    avgMs: base.targetMs,
    shed: 0,                       // how many of SHED are switched off
    onChange: null,
  };
  let slow = 0, fast = 0, calm = 0, probing = 0, probeWait = PROBE_FRAMES;
  const applyShed = () => {          // effects switched off so far: 1 bloom, 2 + grade / vignette / grain, 3 + the scale floor drops
    const t = q.tier, b = q.base, post = q.shed >= 2;
    t.bloom = q.shed >= 1 ? 0 : b.bloom;
    t.grade = post ? 0 : b.grade; t.vignette = post ? 0 : b.vignette; t.grain = post ? 0 : b.grain;
    t.minScale = q.shed >= 3 ? 0.5 : b.minScale;
  };
  q.setTier = (t) => { q.base = TIERS[t] || t; q.tier = { ...q.base }; q.scale = 1; q.shed = 0; slow = fast = 0; q.onChange?.(true); };
  const stepUp = () => {
    if (q.shed > 0) { q.shed--; applyShed(); q.onChange?.(true); return true; }
    if (q.scale < 1) { q.scale = Math.min(1, +(q.scale + 0.05).toFixed(2)); q.onChange?.(false); return true; }
    return false;
  };
  // Feed the real frame time (ms) each rendered frame. A display locked to every second vsync shows 33.3 ms however much headroom
  // there is, so besides clear headroom (fast) the controller PROBES: after a long calm spell it tries one step up, and backs
  // off (doubling the wait) if that step made it slow again.
  q.sample = (ms) => {
    q.avgMs += (Math.min(ms, 250) - q.avgMs) * 0.1;
    if (!q.dynamic) return;
    const t = q.tier;
    if (probing > 0) probing--;
    if (q.avgMs > t.slowMs) { slow++; fast = 0; calm = 0; } else if (q.avgMs < t.fastMs) { fast++; slow = 0; calm = 0; } else { slow = fast = 0; calm++; }
    if (slow > SLOW_FRAMES) {
      slow = 0;
      if (probing > 0) probeWait = Math.min(PROBE_MAX, probeWait * 2);       // the step we just tried was too much: wait longer next time
      probing = 0;
      if (q.scale > t.minScale + 1e-6) { q.scale = Math.max(t.minScale, +(q.scale - 0.05).toFixed(2)); q.onChange?.(false); }
      else if (q.shed < SHED.length) { q.shed++; applyShed(); q.onChange?.(true); }
    } else if (fast > FAST_FRAMES) { fast = 0; stepUp(); }
    else if (calm > probeWait && (q.scale < 1 || q.shed > 0)) { calm = 0; if (stepUp()) probing = 240; }
    else if (probing === 1) probeWait = PROBE_FRAMES;                           // the probe held for 4 s: keep it, probe again at the normal pace
  };
  return q;
}
