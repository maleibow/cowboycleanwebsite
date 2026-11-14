// Three quality tiers, auto-picked, with dynamic resolution scaling (PLAN 4.1).
// Override with ?quality=low|medium|high. Disable scaling with ?dynres=0.
export const TIERS = {
  high:   { name: 'high',   pixelCap: 2,   shadowMap: 2048, bloom: 1,   bloomScale: 1,   targetMs: 16.7, minScale: 0.75 },
  medium: { name: 'medium', pixelCap: 1.5, shadowMap: 0,    bloom: 1,   bloomScale: 0.5, targetMs: 20,   minScale: 0.7 },
  low:    { name: 'low',    pixelCap: 1.25, shadowMap: 0,   bloom: 0,   bloomScale: 0.5, targetMs: 33,   minScale: 0.7 },
};

export function pickTier(params = new URLSearchParams(location.search)) {
  const forced = params.get('quality');
  if (forced && TIERS[forced]) return TIERS[forced];
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (matchMedia && matchMedia('(pointer: coarse)').matches);
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if (mobile) return cores >= 8 && mem >= 6 ? TIERS.medium : TIERS.low;
  return cores <= 2 || mem <= 2 ? TIERS.medium : TIERS.high;
}

export function createQuality(params = new URLSearchParams(location.search)) {
  const q = {
    tier: pickTier(params),
    scale: 1,                      // dynamic resolution multiplier, minScale..1
    dynamic: params.get('dynres') !== '0',
    avgMs: 16.7,
    onChange: null,
  };
  let slow = 0, fast = 0;
  q.setTier = (t) => { q.tier = TIERS[t] || t; q.scale = 1; q.onChange?.(); };
  // Feed the real frame time (ms) each rendered frame.
  q.sample = (ms) => {
    q.avgMs += (ms - q.avgMs) * 0.1;
    if (!q.dynamic) return;
    const t = q.tier;
    if (q.avgMs > t.targetMs * 1.25) { slow++; fast = 0; }
    else if (q.avgMs < t.targetMs * 0.85) { fast++; slow = 0; }
    else { slow = fast = 0; }
    if (slow > 30 && q.scale > t.minScale) {
      q.scale = Math.max(t.minScale, +(q.scale - 0.05).toFixed(2)); slow = 0; q.onChange?.();
    } else if (fast > 180 && q.scale < 1) {
      q.scale = Math.min(1, +(q.scale + 0.05).toFixed(2)); fast = 0; q.onChange?.();
    }
  };
  return q;
}
