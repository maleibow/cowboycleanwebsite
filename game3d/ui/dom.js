// Tiny DOM helpers shared by the menu screens (same idea as the ones in hud.js / stageCards.js).
export const FONT = 'Bangers,cursive';
export const MONO = '"Press Start 2P",monospace';
export const TEXT = `font-family:${FONT};color:#fff;letter-spacing:2px;text-shadow:3px 3px 0 #000;`;
export const css = (el, s) => { el.style.cssText = s; return el; };
export const div = (parent, s, text = '') => { const d = css(document.createElement('div'), s); if (text) d.textContent = text; parent?.appendChild(d); return d; };
export const el = (tag, parent, s, props = {}) => { const e = css(document.createElement(tag), s); Object.assign(e, props); parent?.appendChild(e); return e; };

// A big chunky button. Fires on pointerdown-up (click), works with touch; `fn` gets no event.
export function button(parent, label, fn, { bg = '#3498db', border = '#2980b9', size = 28, extra = '' } = {}) {
  const b = div(parent, `${TEXT}font-size:${size}px;padding:8px 26px;border-radius:10px;background:${bg};border:4px solid ${border};cursor:pointer;pointer-events:auto;user-select:none;-webkit-tap-highlight-color:transparent;text-align:center;box-shadow:0 5px 0 rgba(0,0,0,.45);${extra}`, label);
  b.setAttribute('role', 'button'); b.tabIndex = 0;
  b.addEventListener('click', (e) => { e.stopPropagation(); fn(e); });
  b.addEventListener('pointerdown', (e) => e.stopPropagation());
  b.addEventListener('keydown', (e) => { if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) { e.preventDefault(); e.stopPropagation(); fn(e); } });
  b.addEventListener('pointerenter', () => { b.style.filter = 'brightness(1.2)'; });
  b.addEventListener('pointerleave', () => { b.style.filter = ''; });
  return b;
}

// A full-size overlay that is hidden by default. show()/hide() toggle it; `open` mirrors the state.
export function screen(root, s = '', { pointer = true } = {}) {
  const d = div(root, `position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;${pointer ? 'pointer-events:auto;' : ''}${s}`);
  const api = { el: d, open: false, show(flex = 'flex') { d.style.display = flex; api.open = true; }, hide() { d.style.display = 'none'; api.open = false; } };
  return api;
}

// Text inputs inside the game must not leak keystrokes to the game controls (same as the original).
export function isolateKeys(input) { for (const t of ['keydown', 'keyup', 'keypress']) input.addEventListener(t, (e) => e.stopPropagation()); }
