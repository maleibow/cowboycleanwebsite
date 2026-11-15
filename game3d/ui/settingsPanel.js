import { settings, setSetting, resetSettings, onSetting } from '../core/settings.js';
import { ACTIONS, DEFAULT_KEYS, KEYS } from '../core/input.js';
import { TEXT, MONO, div, el, button, screen, isolateKeys } from './dom.js';

// Settings screen (title + pause menu): master volume, graphics quality, accessibility (reduced motion, colour-blind-safe
// pickup shapes, touch control size) and remappable keys. Everything saves to localStorage through core/settings.js.
// Music / SFX volumes and the music source stay in the Jukebox panel.
const M = `font-family:${MONO};text-shadow:none;`;
const CHIP = `${M}font-size:9px;padding:10px 12px;min-height:40px;box-sizing:border-box;border:2px solid #8e8e9a;border-radius:6px;cursor:pointer;user-select:none;text-align:center;background:rgba(0,0,0,.6);color:#fff;display:flex;align-items:center;justify-content:center;`;
const ON = 'background:#f1c40f;color:#000;border-color:#f1c40f;';
const LABELS = { left: 'LEFT', right: 'RIGHT', up: 'FORWARD', down: 'BACK', jump: 'JUMP', spray: 'SPRAY', bomb: 'BOMB', slide: 'SLIDE', pause: 'PAUSE' };
const RESERVED = new Set(['Escape', 'Enter', 'NumpadEnter', 'Tab', 'KeyM', 'MetaLeft', 'MetaRight', 'ContextMenu', 'F5', 'F11', 'F12']);
export const keyName = (c) => (c.startsWith('Key') ? c.slice(3) : c.startsWith('Digit') ? c.slice(5) : ({ Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Escape: 'ESC', Backspace: 'BKSP' })[c] || c.replace('Numpad', 'NUM ').toUpperCase());

export function createSettingsPanel(root, { onClose } = {}) {
  const ui = screen(root, `${TEXT}background:rgba(8,4,16,.94);z-index:8;overflow:auto;justify-content:flex-start;padding:12px 0 16px;box-sizing:border-box;gap:8px;`);
  ui.el.dataset.scroll = '1'; ui.el.style.touchAction = 'pan-y';   // finger scrolling inside the panel (the page itself blocks panning)
  div(ui.el, 'font-size:clamp(34px,6vw,56px);color:#ffd84a;margin-top:auto', 'SETTINGS');
  const card = div(ui.el, 'display:flex;flex-direction:column;gap:12px;width:min(640px,94%);box-sizing:border-box;padding:12px 14px;border-radius:10px;background:rgba(0,0,0,.55);border:2px solid #8e44ad');
  const head = (t) => div(card, 'font-size:22px;color:#d9b3ff;margin-top:2px', t);
  const row = (label, parent = card) => { const r = div(parent, `${M}display:flex;align-items:center;gap:8px;font-size:9px;color:#fff;flex-wrap:wrap`); div(r, 'min-width:128px;line-height:1.5', label); return r; };
  const choice = (r, opts, get, set) => {
    const els = opts.map(([v, t]) => { const c = div(r, CHIP + 'flex:1;min-width:58px', t); c.setAttribute('role', 'button'); c.tabIndex = 0; const pick = () => set(v); c.addEventListener('click', (e) => { e.stopPropagation(); pick(); }); c.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); pick(); } }); return [v, c]; });
    return () => els.forEach(([v, c]) => { c.style.cssText = CHIP + 'flex:1;min-width:58px;' + (get() === v ? ON : ''); });
  };
  const slider = (r, min, max, step, get, set, label) => {
    const i = el('input', r, 'flex:1;min-width:120px;height:32px;accent-color:#f1c40f;cursor:pointer', { type: 'range', min, max, step }); isolateKeys(i); i.setAttribute('aria-label', label);
    i.addEventListener('input', () => set(+i.value)); return () => { i.value = get(); };
  };
  const syncs = [];

  head('SOUND');
  syncs.push(slider(row('MASTER VOLUME'), 0, 100, 1, () => Math.round(settings.master * 100), (v) => setSetting('master', v / 100), 'Master volume'));
  head('GRAPHICS');
  syncs.push(choice(row('QUALITY'), [['auto', 'AUTO'], ['low', 'LOW'], ['medium', 'MEDIUM'], ['high', 'HIGH']], () => settings.quality, (v) => setSetting('quality', v)));
  div(card, `${M}font-size:8px;color:#aaa;line-height:1.6`, 'Auto picks a tier for your device and lowers the resolution if it ever drops below 30 fps.');
  head('ACCESSIBILITY');
  syncs.push(choice(row('REDUCED MOTION'), [['auto', 'FOLLOW DEVICE'], [true, 'ON'], [false, 'OFF']], () => settings.reducedMotion, (v) => setSetting('reducedMotion', v)));
  div(card, `${M}font-size:8px;color:#aaa;line-height:1.6`, 'On: no screen shake, flashes, hit-stop, speed lines or camera kick.');
  syncs.push(choice(row('PICKUP SHAPES'), [[true, 'SHAPES'], [false, 'COLOUR ONLY']], () => settings.shapes, (v) => setSetting('shapes', v)));
  syncs.push(slider(row('TOUCH BUTTON SIZE'), 70, 140, 5, () => Math.round(settings.touchScale * 100), (v) => setSetting('touchScale', v / 100), 'Touch control size'));

  head('KEYS');
  const keyRows = {}; let capture = null;
  const cap = div(card, `${M}font-size:9px;color:#f1c40f;min-height:14px`);
  const rebuild = (a) => {
    const r = keyRows[a]; r.replaceChildren(); const list = KEYS[a];
    list.forEach((code, i) => {
      const c = div(r, CHIP + 'min-width:62px', keyName(code)); c.setAttribute('role', 'button'); c.tabIndex = 0; c.title = 'Click, then press the new key';
      const go = () => listen(a, i); c.addEventListener('click', (e) => { e.stopPropagation(); go(); }); c.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); go(); } });
    });
    if (list.length < 3) { const p = div(r, CHIP + 'min-width:40px;border-style:dashed', '+'); p.setAttribute('role', 'button'); p.tabIndex = 0; p.title = 'Add another key'; p.addEventListener('click', (e) => { e.stopPropagation(); listen(a, list.length); }); p.addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); e.stopPropagation(); listen(a, list.length); } }); }
  };
  for (const a of ACTIONS) { const r = row(LABELS[a]); keyRows[a] = div(r, 'display:flex;gap:6px;flex:1;flex-wrap:wrap'); rebuild(a); }
  const save = (a, list) => { const keys = { ...settings.keys }; keys[a] = list; setSetting('keys', keys); };
  function listen(a, i) {
    stop(); capture = { a, i }; cap.textContent = `Press a key for ${LABELS[a]}   (Esc cancels, Backspace removes)`;
    addEventListener('keydown', onKey, true);
  }
  function stop() { capture = null; cap.textContent = ''; removeEventListener('keydown', onKey, true); }
  function onKey(e) {
    if (!capture) return; e.preventDefault(); e.stopPropagation();
    const { a, i } = capture, code = e.code;
    if (code === 'Escape') return stop();
    const list = [...KEYS[a]];
    if (code === 'Backspace' || code === 'Delete') { if (list.length > 1 && i < list.length) { list.splice(i, 1); save(a, list); } stop(); return; }
    if (RESERVED.has(code) || /^F\d+$/.test(code)) { cap.textContent = `${keyName(code)} is reserved. Press another key.`; return; }
    for (const o of ACTIONS) if (o !== a && KEYS[o].includes(code)) { const left = KEYS[o].filter((c) => c !== code); save(o, left.length ? left : [DEFAULT_KEYS[o].find((c) => c !== code)]); }   // a key does one thing: take it from its old action
    const at = list.indexOf(code); if (at >= 0 && at !== i) list.splice(at, 1);
    list[Math.min(i, list.length)] = code; save(a, [...new Set(list)]); stop();
  }
  const reset = div(card, '', ''); reset.style.cssText = 'display:flex;gap:10px;margin-top:4px;flex-wrap:wrap';
  button(reset, 'RESET KEYS', () => { stop(); setSetting('keys', {}); }, { bg: '#34495e', border: '#95a5a6', size: 16, extra: 'padding:6px 14px' });
  button(reset, 'RESET ALL', () => { stop(); resetSettings(); }, { bg: '#c0392b', border: '#e74c3c', size: 16, extra: 'padding:6px 14px' });
  button(ui.el, 'DONE', () => close(), { bg: '#2ecc71', border: '#27ae60', size: 28, extra: 'min-width:220px;margin-bottom:auto;margin-top:6px' });

  const refresh = () => { for (const a of ACTIONS) rebuild(a); syncs.forEach((f) => f()); };
  onSetting(refresh); refresh();
  let closedAt = -1e9;
  function close() { stop(); ui.hide(); closedAt = performance.now(); onClose?.(); }
  addEventListener('keydown', (e) => { if (ui.open && !capture && e.code === 'Escape') { e.preventDefault(); close(); } });
  return { ui, get open() { return ui.open; }, get justClosed() { return performance.now() - closedAt < 250; }, show() { refresh(); ui.show(); }, hide() { stop(); ui.hide(); }, get capturing() { return !!capture; } };
}
