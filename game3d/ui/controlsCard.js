import { KEYS } from '../core/input.js';
import { keyName } from './settingsPanel.js';
import { TEXT, MONO, div } from './dom.js';

// "How to play" card for the title and pause screens. Rows read the live key map, so remapped keys show correctly.
// SLIDE is highlighted: it is the move players forget, and the low gates need it. Hidden on touch devices, which show
// their own on-screen buttons.
const ROWS = [
  ['MOVE', ['left', 'right', 'up', 'down'], '#3498db'], ['JUMP', ['jump'], '#2ecc71'], ['SPRAY (HOLD)', ['spray'], '#e67e22'],
  ['BOMB', ['bomb'], '#e74c3c'], ['SLIDE', ['slide'], '#9b59b6'], ['PAUSE', ['pause'], '#95a5a6'],
];
const label = (a) => (a === 'left' || a === 'right' || a === 'up' || a === 'down' ? null : [...new Set(KEYS[a].map((c) => keyName(c).replace(/^[LR]-/, '')))].slice(0, 2).join(' / '));
const moveKeys = () => ['up', 'left', 'down', 'right'].map((a) => keyName(KEYS[a][0])).join(' ');

export function createControlsCard(parent, style) {
  const card = div(parent, `${TEXT}box-sizing:border-box;background:rgba(8,4,16,.78);border:3px solid #ffd84a;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:5px;pointer-events:none;${style}`);
  const rows = ROWS.map(([name, actions, hue]) => {
    const slide = actions[0] === 'slide';
    const r = div(card, `display:flex;justify-content:space-between;align-items:center;gap:10px;${slide ? `background:${hue};border-radius:8px;padding:6px 8px;margin:2px -4px;font-size:21px` : 'font-size:17px'}`);
    div(r, '', name); const k = div(r, `font:${slide ? 11 : 10}px ${MONO};background:#000;border:2px solid ${hue};border-radius:6px;padding:5px 7px;text-shadow:none;white-space:nowrap`);
    return [actions, k];
  });
  div(card, `font-size:14px;color:#ffd84a;text-align:center;margin-top:2px`, 'SLIDE DUCKS YOU UNDER LOW GATES');
  const touch = matchMedia('(pointer:coarse)');
  return { el: card, refresh() { card.style.display = touch.matches ? 'none' : 'flex'; for (const [actions, k] of rows) k.textContent = actions.length > 1 ? moveKeys() : label(actions[0]); } };
}
