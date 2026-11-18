import { parseCheat } from '../core/cheats.js';
import { fetchLeaderboard } from '../services/leaderboard.js';
import { events } from '../core/events.js';
import { TEXT, MONO, div, el, button, screen, isolateKeys } from './dom.js';
import { createControlsCard } from './controlsCard.js';
import { createJukeboxPanel } from './jukeboxPanel.js';

// Title screen over the stage-1 fly-through: START, LEADERBOARD (global top 5) and ENTER SECRET CODE (the cheat modal).
// onStart() begins a run; onCheat({ stage, vehicle }) starts the cheat run. Cheat parsing lives in core/cheats.js.
export function createTitle(root, { onStart, onCheat, jukebox, onSettings }) {
  const ui = screen(root, `${TEXT}background:linear-gradient(90deg,rgba(15,5,25,.78),rgba(15,5,25,.25) 55%,transparent);align-items:flex-start;padding-left:7%;box-sizing:border-box;`);
  const h = div(ui.el, 'font-size:clamp(46px,9vw,112px);line-height:.9;color:#ffd84a;text-shadow:5px 5px 0 #000,0 0 30px rgba(255,150,50,.6);-webkit-text-stroke:2px #8a4a10', 'COWBOY CLEAN');
  div(ui.el, 'font-size:clamp(20px,3.2vw,40px);margin:4px 0 18px 4px;color:#fff;text-shadow:3px 3px 0 #000', 'ULTIMATE WORLD TOUR');
  const menu = div(ui.el, 'display:flex;flex-direction:column;gap:12px;align-items:stretch;min-width:min(300px,60%)');
  const start = button(menu, 'START', () => go(), { bg: '#2ecc71', border: '#27ae60', size: 34 });
  button(menu, 'LEADERBOARD', () => toggleBoard(true), { bg: '#3498db', border: '#2980b9', size: 24 });
  button(menu, 'SETTINGS', () => onSettings?.(), { bg: '#8e44ad', border: '#6c3483', size: 22 });
  button(menu, 'SECRET CODE', () => openCheat(), { bg: '#34495e', border: '#95a5a6', size: 22 });
  const keys = createControlsCard(ui.el, 'position:absolute;right:3%;top:5%;width:min(300px,34%)'); keys.el.id = 'title-keys';

  createJukeboxPanel(ui.el, jukebox, 'position:absolute;right:3%;bottom:5%;width:min(250px,34%);box-sizing:border-box');

  // ---- leaderboard panel
  const board = screen(ui.el, 'background:rgba(0,0,0,.6);z-index:5;');
  const card = div(board.el, 'min-width:min(360px,80%);padding:14px 18px;border-radius:10px;background:rgba(0,0,0,.8);border:3px solid #34495e;text-align:center');
  div(card, 'font-size:30px;color:#f1c40f;margin-bottom:10px', 'GLOBAL TOP 5');
  const list = div(card, `font-family:${MONO};font-size:11px;line-height:1.9;color:#ecf0f1;text-shadow:none;margin-bottom:12px;min-height:60px`, 'Loading High Scores...');
  button(card, 'BACK', () => toggleBoard(false), { bg: '#95a5a6', border: '#7f8c8d', size: 20 });
  function toggleBoard(on) { if (on) { board.show(); fetchLeaderboard(list); } else board.hide(); }

  // ---- cheat modal (original ids: cheat-modal / cheat-input / cheat-error)
  const modal = screen(ui.el, 'background:rgba(0,0,0,.95);z-index:6;');
  div(modal.el, 'font-size:30px;color:#34dbcc;margin-bottom:18px', 'ENTER SECRET CODE');
  const input = el('input', modal.el, `font-family:${MONO};font-size:16px;padding:14px;text-transform:uppercase;text-align:center;border:4px solid #34dbcc;background:#111;color:#fff;margin-bottom:10px;width:80%;max-width:300px;outline:none;border-radius:8px;box-sizing:border-box`, { type: 'text', autocomplete: 'off', spellcheck: false });
  input.id = 'cheat-input'; isolateKeys(input);
  const err = div(modal.el, `font-family:${MONO};font-size:10px;color:#e74c3c;margin-bottom:18px;height:12px;text-shadow:none`);
  const btns = div(modal.el, 'display:flex;gap:20px');
  button(btns, 'SUBMIT', () => submit(), { bg: '#2ecc71', border: '#27ae60', size: 22 });
  button(btns, 'CANCEL', () => closeCheat(), { bg: '#e74c3c', border: '#c0392b', size: 22 });
  function openCheat() { modal.show(); input.value = ''; err.textContent = ''; setTimeout(() => input.focus(), 50); }
  function closeCheat() { modal.hide(); input.blur(); }
  function submit() {
    const r = parseCheat(input.value);
    if (r === undefined) return;                                  // empty: nothing happens
    if (r === null) { err.textContent = 'INVALID SECRET CODE'; events.emit('error'); return; }
    closeCheat(); ui.hide(); onCheat(r);
  }
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeCheat(); });

  function go() { if (!ui.open || modal.open || board.open) return; ui.hide(); onStart(); }
  addEventListener('keydown', (e) => { if (ui.open && !modal.open && !board.open && !e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) go(); else if (board.open && e.code === 'Escape') toggleBoard(false); });
  return {
    ui, get open() { return ui.open; }, get modalOpen() { return modal.open; },
    show() { keys.refresh(); board.hide(); modal.hide(); ui.show(); }, hide() { ui.hide(); },
    start: go, openCheat, submitCheat: (code) => { input.value = code; submit(); }, openBoard: () => toggleBoard(true),
  };
}
