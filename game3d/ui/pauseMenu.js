import { TEXT, div, button, screen } from './dom.js';
import { createJukeboxPanel } from './jukeboxPanel.js';

// Pause menu: RESUME, RESTART STAGE (back to the stage start with the score it began with), the JUKEBOX panel (music
// source, volumes) and QUIT TO TITLE. Esc / P toggles pause in the state machine; Enter resumes.
export function createPauseMenu(root, { onResume, onRestart, onQuit, onSettings, jukebox }) {
  const ui = screen(root, `${TEXT}background:rgba(8,4,16,.72);gap:12px;`);
  div(ui.el, 'font-size:80px;color:#ffd84a;margin-bottom:6px', 'PAUSED');
  button(ui.el, 'RESUME', () => onResume(), { bg: '#2ecc71', border: '#27ae60', size: 30, extra: 'min-width:290px' });
  button(ui.el, 'RESTART STAGE', () => onRestart(), { bg: '#e67e22', border: '#d35400', size: 24, extra: 'min-width:290px' });
  button(ui.el, 'SETTINGS', () => onSettings?.(), { bg: '#8e44ad', border: '#6c3483', size: 22, extra: 'min-width:290px' });
  createJukeboxPanel(ui.el, jukebox, 'width:290px;box-sizing:border-box;margin-top:4px');
  button(ui.el, 'QUIT TO TITLE', () => onQuit(), { bg: '#34495e', border: '#95a5a6', size: 20, extra: 'min-width:290px' });
  addEventListener('keydown', (e) => { if (ui.open && !e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) onResume(); });
  return { ui, get open() { return ui.open; }, show() { ui.show(); }, hide() { ui.hide(); } };
}
