import { Story } from '../data/story.js';
import { SPEAKER_COLOR } from '../render/busts.js';
import { events } from '../core/events.js';
import { TEXT, div, button, screen } from './dom.js';

// Cutscene player: 3D busts (scenes/bustStage.js) + a dialogue box with a typewriter. Tap / click / Enter finishes the
// line, then moves to the next (original advanceCutscene); the SKIP button (or Esc) ends the whole scene. The scene
// only needs update(dt) each step. Calls onDone() exactly once.
const CPS = 42;                                     // typed characters per second
const ADVANCE_KEYS = new Set(['Enter', 'NumpadEnter', 'KeyZ', 'ArrowRight']);

export function createCutscene(root, stage) {
  const ui = screen(root, 'justify-content:flex-end;');
  const box = div(ui.el, `${TEXT}position:relative;width:min(86%,980px);margin-bottom:3.5%;padding:16px 26px 20px;border-radius:16px;background:rgba(14,6,24,.86);border:4px solid #fff;box-shadow:0 0 0 4px #000,0 10px 30px rgba(0,0,0,.6);min-height:112px;box-sizing:border-box;cursor:pointer`);
  const name = div(box, 'position:absolute;left:22px;top:-24px;font-size:30px;padding:2px 16px;border-radius:8px;background:#000;border:3px solid #fff'), text = div(box, 'font-size:30px;line-height:1.25;letter-spacing:1px;margin-top:12px;min-height:76px;text-shadow:2px 2px 0 #000');
  const more = div(box, 'position:absolute;right:18px;bottom:6px;font-size:22px;color:#ffd84a;opacity:0');
  const skip = button(ui.el, 'SKIP  ▶▶', () => api.skip(), { bg: 'rgba(0,0,0,.6)', border: '#fff', size: 20, extra: 'position:absolute;right:16px;top:14px;padding:4px 16px;' });
  let lines = [], idx = 0, shown = 0, acc = 0, done = null, tickAt = 0;
  const api = { get active() { return ui.open; }, ui };

  const showLine = () => {
    const l = lines[idx]; shown = 0; acc = 0; tickAt = 0; text.textContent = ''; more.style.opacity = 0;
    name.textContent = l.s; name.style.color = SPEAKER_COLOR[l.s] || '#fff'; stage.setSpeaker(l.s); stage.talking = true;
  };
  const finish = () => { if (!ui.open) return; ui.hide(); stage.talking = false; const f = done; done = null; f?.(); };
  // id: key of Story. Skips straight to onDone when there is no script for it (original startCutscene).
  api.start = (id, onDone) => {
    if (!Story[id]) { onDone?.(); return; }
    lines = Story[id]; idx = 0; done = onDone; stage.clear(); ui.show(); showLine();
  };
  api.advance = () => {
    if (!ui.open) return;
    const l = lines[idx];
    if (shown < l.t.length) { shown = l.t.length; text.textContent = l.t; stage.talking = false; more.style.opacity = 1; return; }
    idx++; if (idx >= lines.length) finish(); else showLine();
  };
  api.skip = () => finish();
  api.update = (dt, input) => {
    if (!ui.open) return;
    if (input && (input.jumpPressed || input.bombPressed)) api.advance();
    if (input && input.pausePressed) api.skip();
    if (!ui.open) return;
    const l = lines[idx]; if (shown < l.t.length) {
      acc += dt * CPS; const n = Math.min(l.t.length, Math.floor(acc));
      if (n !== shown) { shown = n; text.textContent = l.t.slice(0, n); if (n - tickAt >= 2 && l.t[n - 1] !== ' ') { tickAt = n; events.emit('typeTick', l.s); } if (n >= l.t.length) { stage.talking = false; more.style.opacity = 1; } }
    }
    more.textContent = shown >= l.t.length ? (idx === lines.length - 1 ? '▶' : '▼') : '';
  };
  ui.el.addEventListener('pointerdown', (e) => { e.preventDefault(); api.advance(); });
  addEventListener('keydown', (e) => { if (!ui.open || e.repeat) return; if (ADVANCE_KEYS.has(e.code)) api.advance(); });
  return api;
}
