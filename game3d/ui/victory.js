import { TEXT, div, button, screen } from './dom.js';
import { createTrackList } from './jukeboxPanel.js';

// "THE END" over the hero line-up (scenes/bustStage.js lineup), then CONTINUE into the next loop.
export function createVictory(root, { onContinue, jukebox }) {
  const ui = screen(root, `${TEXT}justify-content:space-between;pointer-events:none;padding:5% 0 6%;box-sizing:border-box;`, { pointer: false });
  div(ui.el, 'font-size:clamp(56px,10vw,120px);color:#e74c3c;text-shadow:4px 4px 0 #000,8px 8px 0 #fff');
  ui.el.firstChild.textContent = 'THE END';
  const row = div(ui.el, 'display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:auto');
  div(row, 'font-size:24px;color:#ffd84a', 'The world sparkles again... but the filth always comes back.');
  const heard = createTrackList(row, jukebox, 'max-width:340px;font-size:8px');
  button(row, 'CONTINUE', () => go(), { bg: '#3498db', border: '#2980b9', size: 28, extra: 'padding:12px 40px' });
  function go() { if (!ui.open) return; ui.hide(); onContinue(); }
  addEventListener('keydown', (e) => { if (ui.open && !e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space')) go(); });
  return { ui, get open() { return ui.open; }, show() { heard.refresh(); ui.show(); }, hide() { ui.hide(); }, continue: go };
}
