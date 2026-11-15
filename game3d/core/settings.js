// Player settings, saved in localStorage (key cc3d_settings). Read anywhere through `settings`; change through `setSetting` so
// listeners (audio, renderer, input) hear about it. Everything has a safe default and a corrupt / blocked store never throws.
//   reducedMotion  'auto' | true | false   no shake / flash / hit-stop / speed lines / FOV kick (auto follows the OS setting)
//   shapes         true  | false           colour-blind-safe pickups: every power-up has its own silhouette (off = the old coloured orbs)
//   master         0..1                    master volume (music and SFX sliders live in the Jukebox panel)
//   quality        'auto' | 'low' | 'medium' | 'high'   graphics override ( ?quality= in the URL wins)
//   keys           { action: [KeyboardEvent.code, ...] } remapped keys (missing actions use the defaults in core/input.js)
//   touchScale     0.7..1.4                size of the on-screen touch controls
const KEY = 'cc3d_settings';
export const DEFAULTS = { reducedMotion: 'auto', shapes: true, master: 1, quality: 'auto', keys: {}, touchScale: 1 };

const read = () => { try { const o = JSON.parse(localStorage.getItem(KEY)); return o && typeof o === 'object' ? o : {}; } catch { return {}; } };
const write = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* private mode / quota */ } };
const clean = (o) => {
  const s = { ...DEFAULTS, ...o };
  if (![true, false, 'auto'].includes(s.reducedMotion)) s.reducedMotion = 'auto';
  s.shapes = s.shapes !== false;
  s.master = Number.isFinite(+s.master) ? Math.min(1, Math.max(0, +s.master)) : 1;
  if (!['auto', 'low', 'medium', 'high'].includes(s.quality)) s.quality = 'auto';
  s.touchScale = Number.isFinite(+s.touchScale) ? Math.min(1.4, Math.max(0.7, +s.touchScale)) : 1;
  s.keys = s.keys && typeof s.keys === 'object' && !Array.isArray(s.keys) ? Object.fromEntries(Object.entries(s.keys).filter(([, v]) => Array.isArray(v) && v.every((c) => typeof c === 'string')).map(([k, v]) => [k, v.slice(0, 3)])) : {};
  return s;
};

export const settings = clean(read());
const listeners = new Set();
export const onSetting = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export function setSetting(k, v) {
  settings[k] = v; Object.assign(settings, clean(settings)); write(settings);
  for (const f of listeners) f(k, settings[k]);
}
export function resetSettings() { Object.assign(settings, clean({})); write(settings); for (const f of listeners) f('*', null); }

// Reduced motion: the explicit choice, else the operating system's "reduce motion" preference.
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
export const reducedMotion = () => (settings.reducedMotion === 'auto' ? !!mq?.matches : settings.reducedMotion === true);
